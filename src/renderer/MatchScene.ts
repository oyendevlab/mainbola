import Phaser from 'phaser';
import { FormationType, MatchEvent, Player, PlayerPosition } from '../types';
import { FORMATION_CONFIGS } from '../types/formations';
import {
  playWhistle,
  playKick,
  playCheer,
  playTackle,
  startStadiumAmbience,
  stopStadiumAmbience,
} from '../engine/audio';

export interface TeamVisualInfo {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  awayPrimaryColor?: string;
  awaySecondaryColor?: string;
  kitPattern?: 'solid' | 'stripes' | 'hoops' | 'half';
  formation: FormationType;
  startingXI?: Player[];
}

export interface MatchSceneCallbacks {
  onTimeUpdate?: (minute: number) => void;
  onEvent?: (event: MatchEvent) => void;
  onScoreUpdate?: (homeScore: number, awayScore: number) => void;
  onHalftime?: () => void;
  onMatchEnd?: () => void;
}

export interface MatchSceneInitData {
  events: MatchEvent[];
  homeTeam?: Partial<TeamVisualInfo>;
  awayTeam?: Partial<TeamVisualInfo>;
  weather?: 'Sunny' | 'Rainy' | 'Night';
  playbackSpeed?: 1 | 2 | 4;
  isPaused?: boolean;
  callbacks?: MatchSceneCallbacks;
}

interface PitchPlayer {
  id: string;
  name: string;
  team: 'home' | 'away';
  role: PlayerPosition;
  isGK: boolean;
  slotId: string;
  baseX: number;
  baseY: number;
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Sprite;
  container: Phaser.GameObjects.Container;
}

// Retro Pitch Constants
const PITCH_LEFT = 24;
const PITCH_RIGHT = 456;
const PITCH_WIDTH = 432;
const PITCH_TOP = 16;
const PITCH_BOTTOM = 254;
const PITCH_HEIGHT = 238;
const HALFWAY_X = 240;
const CENTER_Y = 135;

export class MatchScene extends Phaser.Scene {
  // Config & State
  private matchEvents: MatchEvent[] = [];
  private currentEventIndex = 0;
  private currentMinute = 0;
  private homeScore = 0;
  private awayScore = 0;
  private speedMultiplier: 1 | 2 | 4 = 1;
  private isPausedState = false;
  private isFinished = false;

  private homeTeam: TeamVisualInfo = {
    id: 'home',
    name: 'Home FC',
    primaryColor: '#DC2626', // Red
    secondaryColor: '#FFFFFF',
    formation: '4-3-3',
  };

  private awayTeam: TeamVisualInfo = {
    id: 'away',
    name: 'Away United',
    primaryColor: '#2563EB', // Blue
    secondaryColor: '#FBBF24',
    formation: '4-3-3',
  };

  private weather: 'Sunny' | 'Rainy' | 'Night' = 'Sunny';
  private weatherGraphics?: Phaser.GameObjects.Graphics;
  private weatherTimer?: Phaser.Time.TimerEvent;

  private callbacks: MatchSceneCallbacks = {};

  // Pitch & Game Objects
  private pitchGraphics!: Phaser.GameObjects.Graphics;
  private netGraphicsLeft!: Phaser.GameObjects.Graphics;
  private netGraphicsRight!: Phaser.GameObjects.Graphics;
  private players: PitchPlayer[] = [];
  private ballSprite!: Phaser.GameObjects.Sprite;
  private ballShadow!: Phaser.GameObjects.Sprite;
  private ballX = HALFWAY_X;
  private ballY = CENTER_Y;

  // Active Tweens and Timers for clean teardown/pause
  private activeTweens: Phaser.Tweens.Tween[] = [];
  private nextEventTimer: Phaser.Time.TimerEvent | null = null;
  private ambientTimer: Phaser.Time.TimerEvent | null = null;

  // Retro HUD Elements
  private hudContainer!: Phaser.GameObjects.Container;
  private hudScoreText!: Phaser.GameObjects.Text;
  private hudTimeText!: Phaser.GameObjects.Text;
  private hudTickerText!: Phaser.GameObjects.Text;
  private hudTickerBg!: Phaser.GameObjects.Rectangle;
  private goalBannerContainer!: Phaser.GameObjects.Container;
  private goalBannerText!: Phaser.GameObjects.Text;
  private goalSubText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MatchScene' });
  }

  init(data: MatchSceneInitData): void {
    if (data.events) this.matchEvents = [...data.events];
    if (data.homeTeam) this.homeTeam = { ...this.homeTeam, ...data.homeTeam };
    if (data.awayTeam) this.awayTeam = { ...this.awayTeam, ...data.awayTeam };
    if (data.weather) this.weather = data.weather;
    if (data.playbackSpeed) this.speedMultiplier = data.playbackSpeed;
    if (data.isPaused !== undefined) this.isPausedState = data.isPaused;
    if (data.callbacks) this.callbacks = { ...data.callbacks };

    this.currentEventIndex = 0;
    this.currentMinute = 0;
    this.homeScore = 0;
    this.awayScore = 0;
    this.isFinished = false;
  }

  preload(): void {
    // Generate all retro pixel-art textures programmatically
    this.generatePixelTextures();
  }

  create(): void {
    // 1. Draw 16-bit pitch
    this.drawPitch();

    // 2. Create HUD overlays
    this.createHud();

    // 3. Create 22 players on the pitch
    this.setupPlayers();

    // 4. Create ball and shadow
    this.setupBall();

    // 5. Start ambient player breathing/idling
    this.startAmbientIdling();

    // 6. Setup dynamic weather effects (rain particles or night lights)
    this.setupWeatherEffects();

    // 7. Start ambient stadium crowd background audio (v0.7.1)
    startStadiumAmbience();

    // 8. Begin event playback if events exist and not paused
    if (!this.isPausedState) {
      this.scheduleNextEvent(600);
    }
  }

  /**
   * Configures visual weather ambiance (animated rain particles or floodlit night).
   */
  private setupWeatherEffects(): void {
    if (this.weatherGraphics) {
      this.weatherGraphics.destroy();
      this.weatherGraphics = undefined;
    }
    if (this.weatherTimer) {
      this.weatherTimer.destroy();
      this.weatherTimer = undefined;
    }

    if (this.weather === 'Rainy') {
      this.weatherGraphics = this.add.graphics();
      this.weatherGraphics.setDepth(150);

      const drops: Array<{ x: number; y: number; speed: number; len: number }> = [];
      for (let i = 0; i < 45; i++) {
        drops.push({
          x: Phaser.Math.Between(0, 480),
          y: Phaser.Math.Between(0, 270),
          speed: Phaser.Math.Between(180, 280),
          len: Phaser.Math.Between(4, 9),
        });
      }

      this.weatherTimer = this.time.addEvent({
        delay: 30,
        loop: true,
        callback: () => {
          if (!this.weatherGraphics) return;
          this.weatherGraphics.clear();
          this.weatherGraphics.lineStyle(1, 0x93c5fd, 0.45);

          for (const d of drops) {
            d.y += d.speed * 0.03;
            d.x -= d.speed * 0.008;
            if (d.y > 270) {
              d.y = 0;
              d.x = Phaser.Math.Between(0, 480);
            }
            if (d.x < 0) d.x = 480;

            this.weatherGraphics.lineBetween(d.x, d.y, d.x - 2, d.y + d.len);
          }
        },
      });
    } else if (this.weather === 'Night') {
      this.weatherGraphics = this.add.graphics();
      this.weatherGraphics.setDepth(150);

      this.weatherGraphics.fillStyle(0x020617, 0.15);
      this.weatherGraphics.fillRect(0, 0, 480, 270);

      const lights = [
        { x: PITCH_LEFT + 20, y: PITCH_TOP + 10 },
        { x: PITCH_RIGHT - 20, y: PITCH_TOP + 10 },
        { x: PITCH_LEFT + 20, y: PITCH_BOTTOM - 10 },
        { x: PITCH_RIGHT - 20, y: PITCH_BOTTOM - 10 },
      ];

      for (const light of lights) {
        this.weatherGraphics.fillStyle(0xfef08a, 0.06);
        this.weatherGraphics.fillCircle(light.x, light.y, 45);
        this.weatherGraphics.fillStyle(0xfef08a, 0.12);
        this.weatherGraphics.fillCircle(light.x, light.y, 16);
      }
    }
  }

  /**
   * Helper to compute Euclidean distance between two hex color codes.
   */
  private getColorDistance(colorA: string, colorB: string): number {
    const parse = (hex: string) => {
      let c = hex.replace('#', '');
      if (c.length === 3) {
        c = c.split('').map((x) => x + x).join('');
      }
      const num = parseInt(c, 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
      };
    };

    const rgb1 = parse(colorA);
    const rgb2 = parse(colorB);
    const dr = rgb1.r - rgb2.r;
    const dg = rgb1.g - rgb2.g;
    const db = rgb1.b - rgb2.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  /**
   * Generates programmatic 16-bit pixel textures:
   * - 6x6 ball
   * - 6x3 ball shadow
   * - 12x4 player shadow
   * - 16x16 players (Home outfield, Home GK, Away outfield, Away GK)
   * - Particle textures
   */
  private generatePixelTextures(): void {
    // Clean up existing textures if re-creating
    const texturesToCreate = [
      'ball_pixel',
      'ball_shadow',
      'player_shadow',
      'player_home',
      'player_home_gk',
      'player_away',
      'player_away_gk',
      'spark_pixel',
      'confetti_pixel',
    ];

    for (const key of texturesToCreate) {
      if (this.textures.exists(key)) {
        this.textures.remove(key);
      }
    }

    // 1. Ball Texture (6x6)
    const ballCanvas = this.textures.createCanvas('ball_pixel', 6, 6);
    if (ballCanvas) {
      const ctx = ballCanvas.context;
      ctx.clearRect(0, 0, 6, 6);
      const ballMap = [
        [0, 1, 2, 2, 1, 0],
        [1, 2, 3, 2, 2, 1],
        [2, 3, 2, 3, 2, 2],
        [2, 2, 3, 2, 3, 2],
        [1, 2, 2, 3, 2, 1],
        [0, 1, 2, 2, 1, 0],
      ];
      const colors = [
        'rgba(0,0,0,0)',
        '#334155', // seam dark border
        '#FFFFFF', // white leather
        '#1E293B', // black pentagon patch
      ];
      for (let y = 0; y < 6; y++) {
        for (let x = 0; x < 6; x++) {
          const color = colors[ballMap[y][x]];
          if (color !== 'rgba(0,0,0,0)') {
            ctx.fillStyle = color;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      ballCanvas.refresh();
    }

    // 2. Ball Shadow (6x3)
    const ballShadowCanvas = this.textures.createCanvas('ball_shadow', 6, 3);
    if (ballShadowCanvas) {
      const ctx = ballShadowCanvas.context;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(1, 0, 4, 1);
      ctx.fillRect(0, 1, 6, 1);
      ctx.fillRect(1, 2, 4, 1);
      ballShadowCanvas.refresh();
    }

    // 3. Player Shadow (12x4)
    const playerShadowCanvas = this.textures.createCanvas('player_shadow', 12, 4);
    if (playerShadowCanvas) {
      const ctx = playerShadowCanvas.context;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(2, 0, 8, 1);
      ctx.fillRect(1, 1, 10, 2);
      ctx.fillRect(2, 3, 8, 1);
      playerShadowCanvas.refresh();
    }

    // 4. Kit clash check & Player Sprites (16x16)
    // If home and away primary colors clash (distance < 80), switch away team to away kit
    const colorDist = this.getColorDistance(
      this.homeTeam.primaryColor,
      this.awayTeam.primaryColor
    );
    const useAwayKit = colorDist < 80;
    const awayPrimary = useAwayKit
      ? this.awayTeam.awayPrimaryColor || '#FFFFFF'
      : this.awayTeam.primaryColor;
    const awaySecondary = useAwayKit
      ? this.awayTeam.awaySecondaryColor || this.awayTeam.primaryColor
      : this.awayTeam.secondaryColor;

    this.createPlayerTexture(
      'player_home',
      this.homeTeam.primaryColor,
      this.homeTeam.secondaryColor,
      false,
      this.homeTeam.kitPattern || 'solid'
    );
    this.createPlayerTexture(
      'player_home_gk',
      '#E4F123', // Bright Neon Yellow
      '#1E293B',
      true,
      'solid'
    );
    this.createPlayerTexture(
      'player_away',
      awayPrimary,
      awaySecondary,
      false,
      this.awayTeam.kitPattern || 'solid'
    );
    this.createPlayerTexture(
      'player_away_gk',
      '#FF6B35', // Bright Neon Orange
      '#1E293B',
      true,
      'solid'
    );

    // 5. Spark Particle (2x2)
    const sparkCanvas = this.textures.createCanvas('spark_pixel', 2, 2);
    if (sparkCanvas) {
      const ctx = sparkCanvas.context;
      ctx.fillStyle = '#FDE047';
      ctx.fillRect(0, 0, 2, 2);
      sparkCanvas.refresh();
    }

    // 6. Confetti Particle (3x3)
    const confettiCanvas = this.textures.createCanvas('confetti_pixel', 3, 3);
    if (confettiCanvas) {
      const ctx = confettiCanvas.context;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 3, 3);
      confettiCanvas.refresh();
    }
  }

  /**
   * Programmatically paints a 16x16 pixel player sprite.
   */
  private createPlayerTexture(
    key: string,
    shirtColor: string,
    shortsColor: string,
    isGK: boolean,
    pattern: 'solid' | 'stripes' | 'hoops' | 'half' = 'solid'
  ): void {
    const canvas = this.textures.createCanvas(key, 16, 16);
    if (!canvas) return;

    const ctx = canvas.context;
    ctx.clearRect(0, 0, 16, 16);

    const hairColor = '#3E2723';
    const skinColor = '#F5CBA7';
    const eyeColor = '#1E293B';
    const bootColor = '#111827';
    const gloveColor = '#E2E8F0';

    // Hair
    ctx.fillStyle = hairColor;
    ctx.fillRect(6, 1, 4, 1);
    ctx.fillRect(5, 2, 6, 1);

    // Face / Skin
    ctx.fillStyle = skinColor;
    ctx.fillRect(5, 3, 6, 2);

    // Eyes
    ctx.fillStyle = eyeColor;
    ctx.fillRect(6, 4, 1, 1);
    ctx.fillRect(9, 4, 1, 1);

    // Torso / Shirt (Primary Color & Patterns)
    ctx.fillStyle = shirtColor;
    ctx.fillRect(4, 5, 8, 5);

    if (!isGK && pattern !== 'solid') {
      ctx.fillStyle = shortsColor;
      if (pattern === 'stripes') {
        // Vertical stripes on torso (x: 5, 7, 9)
        ctx.fillRect(5, 5, 2, 5);
        ctx.fillRect(9, 5, 2, 5);
      } else if (pattern === 'hoops') {
        // Horizontal stripes/hoops on torso (y: 6, 8)
        ctx.fillRect(4, 6, 8, 1);
        ctx.fillRect(4, 8, 8, 1);
      } else if (pattern === 'half') {
        // Half / Half split on torso
        ctx.fillRect(8, 5, 4, 5);
      }
    }

    // Collar / Accent Trim
    ctx.fillStyle = shortsColor;
    ctx.fillRect(7, 5, 2, 1);

    // Sleeves / Arms
    ctx.fillStyle = shirtColor;
    ctx.fillRect(3, 6, 1, 2);
    ctx.fillRect(12, 6, 1, 2);

    // Hands or Goalkeeper Gloves
    ctx.fillStyle = isGK ? gloveColor : skinColor;
    ctx.fillRect(3, 8, 1, 2);
    ctx.fillRect(12, 8, 1, 2);

    // Shorts
    ctx.fillStyle = shortsColor;
    ctx.fillRect(4, 10, 8, 3);
    // Dark divider between legs
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(7, 11, 2, 2);

    // Socks (Team primary color)
    ctx.fillStyle = shirtColor;
    ctx.fillRect(5, 13, 2, 2);
    ctx.fillRect(9, 13, 2, 2);

    // Boots
    ctx.fillStyle = bootColor;
    ctx.fillRect(5, 15, 2, 1);
    ctx.fillRect(9, 15, 2, 1);

    canvas.refresh();
  }

  /**
   * Draws the retro 16-bit football pitch with:
   * - Alternating green stripes (#2D8A4E, #247541)
   * - Boundary lines, center circle, halfway line, penalty boxes, 6-yard boxes, arcs, flags, and goals
   */
  private drawPitch(): void {
    if (this.pitchGraphics) this.pitchGraphics.destroy();
    this.pitchGraphics = this.add.graphics();
    this.pitchGraphics.setDepth(1);

    // Outer turf surround
    // Weather lighting: If Night, tint pitch outer turf darker
    const outerColor = this.weather === 'Night' ? 0x0f2918 : 0x1a4d2e;
    this.pitchGraphics.fillStyle(outerColor, 1);
    this.pitchGraphics.fillRect(0, 0, 480, 270);

    // Alternating grass stripes (12 vertical stripes)
    const stripeWidth = PITCH_WIDTH / 12; // 36px each
    let pitchLight = 0x2d8a4e;
    let pitchDark = 0x247541;

    if (this.weather === 'Night') {
      pitchLight = 0x1e6037;
      pitchDark = 0x164c2a;
    } else if (this.weather === 'Rainy') {
      pitchLight = 0x257a44;
      pitchDark = 0x1c6337;
    }

    for (let i = 0; i < 12; i++) {
      const color = i % 2 === 0 ? pitchLight : pitchDark;
      this.pitchGraphics.fillStyle(color, 1);
      this.pitchGraphics.fillRect(
        PITCH_LEFT + i * stripeWidth,
        PITCH_TOP,
        stripeWidth,
        PITCH_HEIGHT
      );
    }

    // Crisp white pitch lines
    const lineWhite = 0xf8fafc;
    const lineAlpha = 0.95;
    this.pitchGraphics.lineStyle(2, lineWhite, lineAlpha);

    // Perimeter boundary line
    this.pitchGraphics.strokeRect(PITCH_LEFT, PITCH_TOP, PITCH_WIDTH, PITCH_HEIGHT);

    // Halfway line
    this.pitchGraphics.beginPath();
    this.pitchGraphics.moveTo(HALFWAY_X, PITCH_TOP);
    this.pitchGraphics.lineTo(HALFWAY_X, PITCH_BOTTOM);
    this.pitchGraphics.strokePath();

    // Center circle
    this.pitchGraphics.strokeCircle(HALFWAY_X, CENTER_Y, 36);

    // Center spot
    this.pitchGraphics.fillStyle(lineWhite, lineAlpha);
    this.pitchGraphics.fillCircle(HALFWAY_X, CENTER_Y, 2.5);

    // Penalty Boxes (64px wide x 132px high)
    const penBoxHeight = 132;
    const penBoxTop = CENTER_Y - penBoxHeight / 2; // 135 - 66 = 69
    const penBoxWidth = 64;

    // Left Penalty Box
    this.pitchGraphics.strokeRect(PITCH_LEFT, penBoxTop, penBoxWidth, penBoxHeight);

    // Right Penalty Box
    this.pitchGraphics.strokeRect(
      PITCH_RIGHT - penBoxWidth,
      penBoxTop,
      penBoxWidth,
      penBoxHeight
    );

    // 6-yard Goal Boxes (24px wide x 72px high)
    const goalBoxHeight = 72;
    const goalBoxTop = CENTER_Y - goalBoxHeight / 2; // 135 - 36 = 99
    const goalBoxWidth = 24;

    // Left Goal Box
    this.pitchGraphics.strokeRect(PITCH_LEFT, goalBoxTop, goalBoxWidth, goalBoxHeight);

    // Right Goal Box
    this.pitchGraphics.strokeRect(
      PITCH_RIGHT - goalBoxWidth,
      goalBoxTop,
      goalBoxWidth,
      goalBoxHeight
    );

    // Penalty Spots
    const penSpotDist = 48; // from goal line
    this.pitchGraphics.fillCircle(PITCH_LEFT + penSpotDist, CENTER_Y, 2);
    this.pitchGraphics.fillCircle(PITCH_RIGHT - penSpotDist, CENTER_Y, 2);

    // Penalty Arcs
    // Left Penalty Arc (outside box, facing right)
    this.pitchGraphics.beginPath();
    this.pitchGraphics.arc(
      PITCH_LEFT + penSpotDist,
      CENTER_Y,
      28,
      Phaser.Math.DegToRad(-46),
      Phaser.Math.DegToRad(46),
      false
    );
    this.pitchGraphics.strokePath();

    // Right Penalty Arc (outside box, facing left)
    this.pitchGraphics.beginPath();
    this.pitchGraphics.arc(
      PITCH_RIGHT - penSpotDist,
      CENTER_Y,
      28,
      Phaser.Math.DegToRad(134),
      Phaser.Math.DegToRad(226),
      false
    );
    this.pitchGraphics.strokePath();

    // Corner Arcs (8px radius)
    this.pitchGraphics.beginPath();
    this.pitchGraphics.arc(
      PITCH_LEFT,
      PITCH_TOP,
      8,
      0,
      Phaser.Math.DegToRad(90),
      false
    );
    this.pitchGraphics.strokePath();

    this.pitchGraphics.beginPath();
    this.pitchGraphics.arc(
      PITCH_RIGHT,
      PITCH_TOP,
      8,
      Phaser.Math.DegToRad(90),
      Phaser.Math.DegToRad(180),
      false
    );
    this.pitchGraphics.strokePath();

    this.pitchGraphics.beginPath();
    this.pitchGraphics.arc(
      PITCH_LEFT,
      PITCH_BOTTOM,
      8,
      Phaser.Math.DegToRad(270),
      Phaser.Math.DegToRad(360),
      false
    );
    this.pitchGraphics.strokePath();

    this.pitchGraphics.beginPath();
    this.pitchGraphics.arc(
      PITCH_RIGHT,
      PITCH_BOTTOM,
      8,
      Phaser.Math.DegToRad(180),
      Phaser.Math.DegToRad(270),
      false
    );
    this.pitchGraphics.strokePath();

    // Corner Flags
    this.drawCornerFlags();

    // Draw Goals & Nets
    this.drawGoalNets();

    // Weather Effects
    this.setupWeatherFX();
  }

  private drawCornerFlags(): void {
    const corners = [
      { x: PITCH_LEFT, y: PITCH_TOP },
      { x: PITCH_RIGHT, y: PITCH_TOP },
      { x: PITCH_LEFT, y: PITCH_BOTTOM },
      { x: PITCH_RIGHT, y: PITCH_BOTTOM },
    ];
    for (const corner of corners) {
      // Flag pole
      this.pitchGraphics.lineStyle(1, 0xfacc15, 1);
      this.pitchGraphics.lineBetween(corner.x, corner.y, corner.x, corner.y - 4);
      // Red pennant
      this.pitchGraphics.fillStyle(0xef4444, 1);
      this.pitchGraphics.fillTriangle(
        corner.x,
        corner.y - 4,
        corner.x + 3,
        corner.y - 3,
        corner.x,
        corner.y - 2
      );
    }
  }

  private drawGoalNets(): void {
    if (this.netGraphicsLeft) this.netGraphicsLeft.destroy();
    if (this.netGraphicsRight) this.netGraphicsRight.destroy();

    const goalDepth = 12;
    const goalHeight = 40;
    const goalTop = CENTER_Y - goalHeight / 2; // 135 - 20 = 115
    const goalBottom = CENTER_Y + goalHeight / 2; // 155

    // Left Goal
    this.netGraphicsLeft = this.add.graphics();
    this.netGraphicsLeft.setDepth(2);
    // Net turf background
    this.netGraphicsLeft.fillStyle(0x164326, 0.9);
    this.netGraphicsLeft.fillRect(PITCH_LEFT - goalDepth, goalTop, goalDepth, goalHeight);
    // Net mesh
    this.netGraphicsLeft.lineStyle(1, 0xffffff, 0.35);
    for (let x = PITCH_LEFT - goalDepth; x <= PITCH_LEFT; x += 3) {
      this.netGraphicsLeft.lineBetween(x, goalTop, x, goalBottom);
    }
    for (let y = goalTop; y <= goalBottom; y += 4) {
      this.netGraphicsLeft.lineBetween(PITCH_LEFT - goalDepth, y, PITCH_LEFT, y);
    }
    // White goal posts
    this.netGraphicsLeft.lineStyle(2, 0xffffff, 1);
    this.netGraphicsLeft.lineBetween(
      PITCH_LEFT - goalDepth,
      goalTop,
      PITCH_LEFT - goalDepth,
      goalBottom
    );
    this.netGraphicsLeft.lineBetween(
      PITCH_LEFT - goalDepth,
      goalTop,
      PITCH_LEFT,
      goalTop
    );
    this.netGraphicsLeft.lineBetween(
      PITCH_LEFT - goalDepth,
      goalBottom,
      PITCH_LEFT,
      goalBottom
    );

    // Right Goal
    this.netGraphicsRight = this.add.graphics();
    this.netGraphicsRight.setDepth(2);
    // Net turf background
    this.netGraphicsRight.fillStyle(0x164326, 0.9);
    this.netGraphicsRight.fillRect(PITCH_RIGHT, goalTop, goalDepth, goalHeight);
    // Net mesh
    this.netGraphicsRight.lineStyle(1, 0xffffff, 0.35);
    for (let x = PITCH_RIGHT; x <= PITCH_RIGHT + goalDepth; x += 3) {
      this.netGraphicsRight.lineBetween(x, goalTop, x, goalBottom);
    }
    for (let y = goalTop; y <= goalBottom; y += 4) {
      this.netGraphicsRight.lineBetween(PITCH_RIGHT, y, PITCH_RIGHT + goalDepth, y);
    }
    // White goal posts
    this.netGraphicsRight.lineStyle(2, 0xffffff, 1);
    this.netGraphicsRight.lineBetween(
      PITCH_RIGHT + goalDepth,
      goalTop,
      PITCH_RIGHT + goalDepth,
      goalBottom
    );
    this.netGraphicsRight.lineBetween(
      PITCH_RIGHT,
      goalTop,
      PITCH_RIGHT + goalDepth,
      goalTop
    );
    this.netGraphicsRight.lineBetween(
      PITCH_RIGHT,
      goalBottom,
      PITCH_RIGHT + goalDepth,
      goalBottom
    );
  }

  /**
   * Procedural weather rendering:
   * - Rainy: animated falling diagonal rain particles across pitch canvas
   * - Night: floodlight lighting cones and ambient pitch glow
   */
  private setupWeatherFX(): void {
    if (this.weatherGraphics) {
      this.weatherGraphics.destroy();
    }
    if (this.weatherTimer) {
      this.weatherTimer.destroy();
    }

    if (this.weather === 'Rainy') {
      this.weatherGraphics = this.add.graphics();
      this.weatherGraphics.setDepth(35); // Above pitch and players, below HUD (50)

      // Animate 60 raindrops falling
      const drops: Array<{ x: number; y: number; speed: number; len: number }> = [];
      for (let i = 0; i < 60; i++) {
        drops.push({
          x: Math.random() * 480,
          y: Math.random() * 270,
          speed: 6 + Math.random() * 4,
          len: 8 + Math.random() * 6,
        });
      }

      this.weatherTimer = this.time.addEvent({
        delay: 30,
        loop: true,
        callback: () => {
          if (!this.weatherGraphics || !this.weatherGraphics.active) return;
          this.weatherGraphics.clear();
          this.weatherGraphics.lineStyle(1, 0xa5b4fc, 0.55);

          for (const d of drops) {
            this.weatherGraphics.lineBetween(d.x, d.y, d.x - 2, d.y + d.len);
            d.y += d.speed;
            d.x -= 1.5;
            if (d.y > 270) {
              d.y = -10;
              d.x = Math.random() * 480;
            }
            if (d.x < 0) {
              d.x = 480;
            }
          }
        },
      });
    } else if (this.weather === 'Night') {
      this.weatherGraphics = this.add.graphics();
      this.weatherGraphics.setDepth(35);

      // Night darkness overlay with floodlight circles
      this.weatherGraphics.fillStyle(0x020617, 0.35);
      this.weatherGraphics.fillRect(0, 0, 480, 270);

      // Four stadium floodlights at corners casting warm/cool glow
      const lights = [
        { x: 30, y: 20 },
        { x: 450, y: 20 },
        { x: 30, y: 250 },
        { x: 450, y: 250 },
      ];

      for (const light of lights) {
        // Outer halo
        this.weatherGraphics.fillStyle(0xfef08a, 0.08);
        this.weatherGraphics.fillCircle(light.x, light.y, 110);
        // Inner bright core
        this.weatherGraphics.fillStyle(0xffffff, 0.18);
        this.weatherGraphics.fillCircle(light.x, light.y, 45);
      }
    }
  }

  /**
   * Sets up all 22 players on the pitch:
   * 11 Home players (left half) & 11 Away players (right half)
   */
  private setupPlayers(): void {
    // Destroy previous players if any
    for (const p of this.players) {
      p.container.destroy();
    }
    this.players = [];

    // Home Formation Slots
    const homeFormation = this.homeTeam.formation || '4-3-3';
    const homeSlots = FORMATION_CONFIGS[homeFormation] || FORMATION_CONFIGS['4-3-3'];

    // Away Formation Slots
    const awayFormation = this.awayTeam.formation || '4-3-3';
    const awaySlots = FORMATION_CONFIGS[awayFormation] || FORMATION_CONFIGS['4-3-3'];

    // Build Home Players
    for (let i = 0; i < homeSlots.length; i++) {
      const slot = homeSlots[i];
      const playerInfo = this.homeTeam.startingXI?.[i];
      const isGK = slot.role === 'GK';

      // Map slot to pitch screen coordinates
      // Lateral: slot.x (0..100) -> 12% to 88% pitch width
      const screenY = PITCH_TOP + (0.1 + (slot.x / 100) * 0.8) * PITCH_HEIGHT;
      // Longitudinal: slot.y (88 GK, 18 ST) -> defend left goal
      const xProgress = (100 - slot.y) / 100; // 0.12 for GK, 0.82 for ST
      const screenX = PITCH_LEFT + (0.05 + xProgress * 0.42) * PITCH_WIDTH;

      const playerObj = this.createPlayerSprite(
        playerInfo?.id || `home_${slot.id}`,
        playerInfo?.name || `H. ${slot.label}`,
        'home',
        slot.role,
        isGK,
        slot.id,
        screenX,
        screenY
      );
      this.players.push(playerObj);
    }

    // Build Away Players
    for (let i = 0; i < awaySlots.length; i++) {
      const slot = awaySlots[i];
      const playerInfo = this.awayTeam.startingXI?.[i];
      const isGK = slot.role === 'GK';

      // Mirrored coordinates for Away
      const screenY = PITCH_TOP + (0.1 + ((100 - slot.x) / 100) * 0.8) * PITCH_HEIGHT;
      const xProgress = (100 - slot.y) / 100;
      const screenX = PITCH_RIGHT - (0.05 + xProgress * 0.42) * PITCH_WIDTH;

      const playerObj = this.createPlayerSprite(
        playerInfo?.id || `away_${slot.id}`,
        playerInfo?.name || `A. ${slot.label}`,
        'away',
        slot.role,
        isGK,
        slot.id,
        screenX,
        screenY
      );
      this.players.push(playerObj);
    }
  }

  private createPlayerSprite(
    id: string,
    name: string,
    team: 'home' | 'away',
    role: PlayerPosition,
    isGK: boolean,
    slotId: string,
    x: number,
    y: number
  ): PitchPlayer {
    const textureKey =
      team === 'home'
        ? isGK
          ? 'player_home_gk'
          : 'player_home'
        : isGK
        ? 'player_away_gk'
        : 'player_away';

    const container = this.add.container(x, y);
    container.setDepth(20 + Math.floor(y / 10)); // Y-sorting

    // Shadow
    const shadow = this.add.sprite(0, 7, 'player_shadow');
    shadow.setOrigin(0.5, 0.5);

    // Player Sprite
    const sprite = this.add.sprite(0, 0, textureKey);
    sprite.setOrigin(0.5, 0.5);

    container.add([shadow, sprite]);

    return {
      id,
      name,
      team,
      role,
      isGK,
      slotId,
      baseX: x,
      baseY: y,
      sprite,
      shadow,
      container,
    };
  }

  /**
   * Sets up the ball and its shadow at the center spot
   */
  private setupBall(): void {
    if (this.ballSprite) this.ballSprite.destroy();
    if (this.ballShadow) this.ballShadow.destroy();

    this.ballX = HALFWAY_X;
    this.ballY = CENTER_Y;

    this.ballShadow = this.add.sprite(this.ballX, this.ballY + 3, 'ball_shadow');
    this.ballShadow.setOrigin(0.5, 0.5);
    this.ballShadow.setDepth(25);

    this.ballSprite = this.add.sprite(this.ballX, this.ballY, 'ball_pixel');
    this.ballSprite.setOrigin(0.5, 0.5);
    this.ballSprite.setDepth(30);
  }

  /**
   * Builds the retro 16-bit arcade HUD overlay:
   * - Top scoreboard and clock
   * - Bottom event commentary ticker
   * - Goal celebration splash banner
   */
  private createHud(): void {
    if (this.hudContainer) this.hudContainer.destroy();
    this.hudContainer = this.add.container(0, 0);
    this.hudContainer.setDepth(60);

    // 1. Top HUD Bar Background
    const topBarBg = this.add.rectangle(240, 7, 480, 14, 0x090d16, 0.85);
    this.hudContainer.add(topBarBg);

    // Score Text
    const homeNameShort = this.homeTeam.name.substring(0, 3).toUpperCase();
    const awayNameShort = this.awayTeam.name.substring(0, 3).toUpperCase();
    this.hudScoreText = this.add.text(
      240,
      7,
      `${homeNameShort}  ${this.homeScore} - ${this.awayScore}  ${awayNameShort}`,
      {
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '10px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      }
    );
    this.hudScoreText.setOrigin(0.5, 0.5);
    this.hudScoreText.setStroke('#000000', 2);
    this.hudContainer.add(this.hudScoreText);

    // Match Time Badge
    this.hudTimeText = this.add.text(32, 7, `00'`, {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '9px',
      color: '#FACC15',
      fontStyle: 'bold',
    });
    this.hudTimeText.setOrigin(0.5, 0.5);
    this.hudTimeText.setStroke('#000000', 2);
    this.hudContainer.add(this.hudTimeText);

    // 2. Bottom Event Commentary Ticker
    this.hudTickerBg = this.add.rectangle(240, 263, 480, 14, 0x090d16, 0.85);
    this.hudTickerText = this.add.text(
      240,
      263,
      'Match Kickoff - Ready to Play!',
      {
        fontFamily: '"Courier New", Courier, monospace',
        fontSize: '9px',
        color: '#E2E8F0',
      }
    );
    this.hudTickerText.setOrigin(0.5, 0.5);
    this.hudContainer.add([this.hudTickerBg, this.hudTickerText]);

    // 3. Goal Splash Banner (hidden by default)
    this.goalBannerContainer = this.add.container(240, 135);
    this.goalBannerContainer.setDepth(100);
    this.goalBannerContainer.setVisible(false);

    const bannerBg = this.add.rectangle(0, 0, 320, 52, 0x090d16, 0.95);
    bannerBg.setStrokeStyle(2, 0xfacc15, 1);

    this.goalBannerText = this.add.text(0, -10, '★ GOAL! ★', {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '24px',
      color: '#FACC15',
      fontStyle: 'bold',
    });
    this.goalBannerText.setOrigin(0.5, 0.5);
    this.goalBannerText.setStroke('#92400E', 4);

    this.goalSubText = this.add.text(0, 14, '', {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '11px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    this.goalSubText.setOrigin(0.5, 0.5);
    this.goalSubText.setStroke('#000000', 2);

    this.goalBannerContainer.add([bannerBg, this.goalBannerText, this.goalSubText]);
  }

  /**
   * Idle ambient animation: players bob slightly and shift toward resting position
   */
  private startAmbientIdling(): void {
    if (this.ambientTimer) this.ambientTimer.destroy();

    this.ambientTimer = this.time.addEvent({
      delay: 800,
      loop: true,
      callback: () => {
        if (this.isPausedState || this.isFinished) return;

        // Subtle bobbing of players
        for (let i = 0; i < this.players.length; i++) {
          const p = this.players[i];
          if (!p.container.active) continue;

          // Bob sprite Y by 1px occasionally
          const bobOffset = (i + this.currentEventIndex) % 2 === 0 ? 1 : 0;
          p.sprite.setY(bobOffset);
        }
      },
    });
  }

  /**
   * Coordinate converter from normalized (0..100) to pitch screen pixels
   */
  private normToScreenX(normX: number): number {
    return PITCH_LEFT + (Math.max(0, Math.min(100, normX)) / 100) * PITCH_WIDTH;
  }

  private normToScreenY(normY: number): number {
    return PITCH_TOP + (Math.max(0, Math.min(100, normY)) / 100) * PITCH_HEIGHT;
  }

  /**
   * Replays the next event in the timeline
   */
  private playNextEvent(): void {
    if (this.isPausedState) return;

    if (this.currentEventIndex >= this.matchEvents.length) {
      this.handleMatchEnd();
      return;
    }

    const event = this.matchEvents[this.currentEventIndex];
    this.currentMinute = event.minute;

    // Call React Callbacks
    this.callbacks.onTimeUpdate?.(this.currentMinute);
    this.callbacks.onEvent?.(event);

    // Update Scores if changed
    if (event.homeScore !== this.homeScore || event.awayScore !== this.awayScore) {
      this.homeScore = event.homeScore;
      this.awayScore = event.awayScore;
      this.updateScoreHud();
      this.callbacks.onScoreUpdate?.(this.homeScore, this.awayScore);
    }

    // Update Clock and Ticker HUD
    this.hudTimeText.setText(`${String(event.minute).padStart(2, '0')}'`);
    this.hudTickerText.setText(
      `${event.minute}' ${event.description || event.type}`
    );

    // Execute event specific animation
    this.executeEventAnimation(event, () => {
      this.currentEventIndex++;
      // Determine pause delay before next event based on playback speed
      const baseDelay = event.type === 'GOAL' ? 1800 : 900;
      const delay = Math.max(150, baseDelay / this.speedMultiplier);
      this.scheduleNextEvent(delay);
    });
  }

  private scheduleNextEvent(delayMs: number): void {
    if (this.nextEventTimer) {
      this.nextEventTimer.destroy();
      this.nextEventTimer = null;
    }

    if (this.isPausedState || this.isFinished || !this.time) return;

    this.nextEventTimer = this.time.delayedCall(delayMs, () => {
      this.playNextEvent();
    });
  }

  /**
   * Executes visual animation for a specific MatchEvent
   */
  private executeEventAnimation(event: MatchEvent, onComplete: () => void): void {
    const isHome = event.teamId === this.homeTeam.id;
    const speed = this.speedMultiplier;

    // Resolve coordinates or fallback
    let fromX = this.ballX;
    let fromY = this.ballY;
    if (event.fromCoords) {
      fromX = this.normToScreenX(event.fromCoords.x);
      fromY = this.normToScreenY(event.fromCoords.y);
    }

    let toX = fromX;
    let toY = fromY;
    if (event.toCoords) {
      toX = this.normToScreenX(event.toCoords.x);
      toY = this.normToScreenY(event.toCoords.y);
    }

    switch (event.type) {
      case 'KICKOFF': {
        playWhistle('kickoff');
        this.animateKickoff(onComplete);
        break;
      }
      case 'PASS': {
        playKick(false);
        this.animatePass(fromX, fromY, toX, toY, isHome, speed, onComplete);
        break;
      }
      case 'SHOT': {
        playKick(true);
        this.animateShot(fromX, fromY, isHome, false, speed, onComplete);
        break;
      }
      case 'SAVE': {
        playKick(true);
        this.animateShot(fromX, fromY, !isHome, true, speed, onComplete);
        break;
      }
      case 'GOAL': {
        playCheer();
        this.animateGoal(fromX, fromY, isHome, event, speed, onComplete);
        break;
      }
      case 'TACKLE':
      case 'INTERCEPTION':
      case 'TURNOVER': {
        playTackle();
        this.animateTackle(fromX, fromY, event.type, speed, onComplete);
        break;
      }
      case 'HALFTIME': {
        playWhistle('halftime');
        this.animateWhistle('HALF TIME', 1000 / speed, () => {
          if (this.callbacks.onHalftime) {
            this.callbacks.onHalftime();
          }
          onComplete();
        });
        break;
      }
      case 'FULLTIME': {
        playWhistle('fulltime');
        this.animateWhistle('FULL TIME', 1500 / speed, onComplete);
        break;
      }
      default: {
        // Fallback default pass or movement
        this.animatePass(fromX, fromY, toX, toY, isHome, speed, onComplete);
        break;
      }
    }
  }

  /**
   * KICKOFF Animation
   */
  private animateKickoff(onComplete: () => void): void {
    this.ballX = HALFWAY_X;
    this.ballY = CENTER_Y;
    this.ballSprite.setPosition(HALFWAY_X, CENTER_Y);
    this.ballShadow.setPosition(HALFWAY_X, CENTER_Y + 3);

    // Reset both teams cleanly to base tactical shape
    this.resetPlayersToFormation(500 / this.speedMultiplier);

    // Whistle pop text
    this.showFloatingText('WHISTLE! KICKOFF', HALFWAY_X, CENTER_Y - 20, '#FACC15');
    this.time.delayedCall(600 / this.speedMultiplier, onComplete);
  }

  /**
   * PASS Animation
   */
  private animatePass(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    isHome: boolean,
    speed: number,
    onComplete: () => void
  ): void {
    const duration = Math.max(120, 650 / speed);

    // Position ball at start if not already there
    this.ballX = fromX;
    this.ballY = fromY;
    this.ballSprite.setPosition(fromX, fromY);
    this.ballShadow.setPosition(fromX, fromY + 3);

    // Find nearest teammate to target
    const targetTeam = isHome ? 'home' : 'away';
    const receiver = this.findNearestPlayer(toX, toY, targetTeam);
    if (receiver) {
      // Receiver moves slightly towards landing spot
      const tweenRec = this.tweens.add({
        targets: receiver.container,
        x: toX,
        y: toY,
        duration: duration * 0.9,
        ease: 'Quad.easeOut',
      });
      this.activeTweens.push(tweenRec);
    }

    // Dynamic Team Formations: attacking forward push, defensive block, active presser
    this.updateTacticalFormations(toX, toY, targetTeam, duration, false, receiver?.id);

    // Ball Tween with slight parabolic scale arc to simulate flight
    const tweenBall = this.tweens.add({
      targets: [this.ballSprite, this.ballShadow],
      x: toX,
      y: toY,
      duration,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.ballX = this.ballSprite.x;
        this.ballY = this.ballSprite.y;
        this.ballShadow.setPosition(this.ballX, this.ballY + 3);
      },
      onComplete: () => {
        onComplete();
      },
    });
    this.activeTweens.push(tweenBall);

    // Ball height flight illusion
    const tweenHeight = this.tweens.add({
      targets: this.ballSprite,
      scaleX: 1.35,
      scaleY: 1.35,
      yoyo: true,
      duration: duration / 2,
      ease: 'Quad.easeOut',
    });
    this.activeTweens.push(tweenHeight);
  }

  /**
   * SHOT / SAVE Animation
   */
  private animateShot(
    fromX: number,
    fromY: number,
    isHomeShooting: boolean,
    isSaved: boolean,
    speed: number,
    onComplete: () => void
  ): void {
    const duration = Math.max(100, 500 / speed);

    // Target goal line coordinates
    // Home shoots at Right Goal (x = 456), Away shoots at Left Goal (x = 24)
    const targetGoalX = isHomeShooting ? PITCH_RIGHT : PITCH_LEFT;
    const targetGoalY = CENTER_Y + Phaser.Math.Between(-14, 14);

    this.ballSprite.setPosition(fromX, fromY);
    this.ballShadow.setPosition(fromX, fromY + 3);

    // Dynamic Team Formations: attacking team crashes box, defending team packs box
    this.updateTacticalFormations(
      targetGoalX,
      targetGoalY,
      isHomeShooting ? 'home' : 'away',
      duration,
      true
    );

    // Find defending goalkeeper
    const defendingTeam = isHomeShooting ? 'away' : 'home';
    const gk = this.players.find((p) => p.team === defendingTeam && p.isGK);

    if (gk) {
      // Goalkeeper dives towards shot Y
      const diveY = isSaved ? targetGoalY : targetGoalY + (targetGoalY > CENTER_Y ? -8 : 8);
      const tweenGk = this.tweens.add({
        targets: gk.container,
        y: diveY,
        angle: isHomeShooting ? -20 : 20,
        duration: duration * 0.85,
        ease: 'Quad.easeOut',
        yoyo: true,
        hold: 200 / speed,
      });
      this.activeTweens.push(tweenGk);
    }

    // Fast Ball Tween
    const endX = isSaved ? targetGoalX + (isHomeShooting ? -12 : 12) : targetGoalX;
    const endY = targetGoalY;

    const tweenShot = this.tweens.add({
      targets: [this.ballSprite, this.ballShadow],
      x: endX,
      y: endY,
      duration,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        this.ballX = this.ballSprite.x;
        this.ballY = this.ballSprite.y;
        this.ballShadow.setPosition(this.ballX, this.ballY + 3);
        // Add tiny trail spark
        if (Math.random() > 0.4) {
          this.emitPixelTrail(this.ballX, this.ballY);
        }
      },
      onComplete: () => {
        if (isSaved) {
          this.showFloatingText('★ SAVED! ★', endX, endY - 14, '#38BDF8');
          // Rebound ball slightly
          const reboundX = endX + (isHomeShooting ? -20 : 20);
          const reboundY = endY + Phaser.Math.Between(-15, 15);
          this.tweens.add({
            targets: [this.ballSprite, this.ballShadow],
            x: reboundX,
            y: reboundY,
            duration: 250 / speed,
            ease: 'Sine.easeOut',
            onComplete: () => onComplete(),
          });
        } else {
          onComplete();
        }
      },
    });
    this.activeTweens.push(tweenShot);
  }

  /**
   * GOAL Animation
   */
  private animateGoal(
    fromX: number,
    fromY: number,
    isHomeScored: boolean,
    event: MatchEvent,
    speed: number,
    onComplete: () => void
  ): void {
    const shotDuration = Math.max(100, 450 / speed);
    const netX = isHomeScored ? PITCH_RIGHT + 6 : PITCH_LEFT - 6;
    const netY = CENTER_Y + Phaser.Math.Between(-12, 12);

    // Position ball at shot start point
    this.ballX = fromX;
    this.ballY = fromY;
    this.ballSprite.setPosition(fromX, fromY);
    this.ballShadow.setPosition(fromX, fromY + 3);

    // 1. Shoot into net
    const tweenGoalBall = this.tweens.add({
      targets: [this.ballSprite, this.ballShadow],
      x: netX,
      y: netY,
      duration: shotDuration,
      ease: 'Quad.easeIn',
      onUpdate: () => {
        this.ballX = this.ballSprite.x;
        this.ballY = this.ballSprite.y;
        this.ballShadow.setPosition(this.ballX, this.ballY + 3);
      },
      onComplete: () => {
        // 2. Shake Net and Screen
        this.cameras.main.shake(180 / speed, 0.006);
        this.shakeNet(isHomeScored);

        // 3. Burst Confetti
        this.burstConfetti(netX, netY);

        // 4. Flash GOAL banner
        const scorerName = event.playerName || (isHomeScored ? this.homeTeam.name : this.awayTeam.name);
        this.showGoalBanner(scorerName, event.description);

        // 5. Celebration Bounces for teammates
        const scoringTeam = isHomeScored ? 'home' : 'away';
        for (const p of this.players) {
          if (p.team === scoringTeam) {
            this.tweens.add({
              targets: p.sprite,
              y: -4,
              yoyo: true,
              repeat: 3,
              duration: 150 / speed,
            });
          }
        }

        // 6. Hold celebration then reset for kickoff
        this.time.delayedCall(1500 / speed, () => {
          this.hideGoalBanner();
          // Reset ball to center for subsequent play
          this.ballX = HALFWAY_X;
          this.ballY = CENTER_Y;
          this.ballSprite.setPosition(HALFWAY_X, CENTER_Y);
          this.ballShadow.setPosition(HALFWAY_X, CENTER_Y + 3);
          onComplete();
        });
      },
    });
    this.activeTweens.push(tweenGoalBall);
  }

  /**
   * TACKLE / TURNOVER Animation
   */
  private animateTackle(
    x: number,
    y: number,
    type: string,
    speed: number,
    onComplete: () => void
  ): void {
    const duration = Math.max(100, 350 / speed);

    this.ballX = x;
    this.ballY = y;
    this.ballSprite.setPosition(x, y);
    this.ballShadow.setPosition(x, y + 3);

    // Star impact sparks
    this.burstSparks(x, y);

    // Pop retro text
    const label = type === 'TACKLE' ? 'TACKLE!' : type === 'INTERCEPTION' ? 'INTERCEPT!' : 'TURNOVER!';
    this.showFloatingText(label, x, y - 12, '#F59E0B');

    // Slight ball squirt
    const squirtX = x + Phaser.Math.Between(-15, 15);
    const squirtY = y + Phaser.Math.Between(-15, 15);

    // Dynamic Team Transition: counter-attack push & recovery scramble
    const transitionTeam = squirtX > HALFWAY_X ? 'home' : 'away';
    this.updateTacticalFormations(squirtX, squirtY, transitionTeam, duration, false);

    const tweenBall = this.tweens.add({
      targets: [this.ballSprite, this.ballShadow],
      x: squirtX,
      y: squirtY,
      duration,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.ballX = squirtX;
        this.ballY = squirtY;
        onComplete();
      },
    });
    this.activeTweens.push(tweenBall);
  }

  private shakeNet(isRightGoal: boolean): void {
    const net = isRightGoal ? this.netGraphicsRight : this.netGraphicsLeft;
    if (!net) return;
    this.tweens.add({
      targets: net,
      x: isRightGoal ? 3 : -3,
      yoyo: true,
      repeat: 4,
      duration: 40,
      onComplete: () => {
        net.x = 0;
      },
    });
  }

  private emitPixelTrail(x: number, y: number): void {
    const spark = this.add.sprite(x, y, 'spark_pixel');
    spark.setDepth(28);
    this.tweens.add({
      targets: spark,
      alpha: 0,
      scale: 0.5,
      duration: 150 / this.speedMultiplier,
      onComplete: () => spark.destroy(),
    });
  }

  private burstSparks(x: number, y: number): void {
    for (let i = 0; i < 6; i++) {
      const spark = this.add.sprite(x, y, 'spark_pixel');
      spark.setDepth(35);
      const angle = Phaser.Math.DegToRad(i * 60 + Phaser.Math.Between(-15, 15));
      const dist = Phaser.Math.Between(8, 16);
      this.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 250 / this.speedMultiplier,
        onComplete: () => spark.destroy(),
      });
    }
  }

  private burstConfetti(x: number, y: number): void {
    const colors = [0xfacc15, 0xef4444, 0x3b82f6, 0x10b981, 0xffffff];
    for (let i = 0; i < 20; i++) {
      const confetti = this.add.sprite(x, y, 'confetti_pixel');
      confetti.setTint(colors[i % colors.length]);
      confetti.setDepth(110);
      const angle = Phaser.Math.DegToRad(Phaser.Math.Between(0, 360));
      const dist = Phaser.Math.Between(15, 55);
      this.tweens.add({
        targets: confetti,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist + 10,
        alpha: 0,
        rotation: 4,
        duration: 900 / this.speedMultiplier,
        ease: 'Quad.easeOut',
        onComplete: () => confetti.destroy(),
      });
    }
  }

  private showFloatingText(text: string, x: number, y: number, color: string): void {
    const t = this.add.text(x, y, text, {
      fontFamily: '"Courier New", Courier, monospace',
      fontSize: '10px',
      color,
      fontStyle: 'bold',
    });
    t.setOrigin(0.5, 0.5);
    t.setStroke('#000000', 3);
    t.setDepth(90);

    this.tweens.add({
      targets: t,
      y: y - 16,
      alpha: 0,
      duration: 650 / this.speedMultiplier,
      ease: 'Sine.easeOut',
      onComplete: () => t.destroy(),
    });
  }

  private showGoalBanner(scorerName: string, description: string): void {
    this.goalBannerContainer.setVisible(true);
    this.goalBannerContainer.setScale(0.7);
    this.goalBannerContainer.setAlpha(0);
    this.goalSubText.setText(scorerName || description);

    this.tweens.add({
      targets: this.goalBannerContainer,
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 200 / this.speedMultiplier,
      ease: 'Back.easeOut',
    });
  }

  private hideGoalBanner(): void {
    if (!this.goalBannerContainer?.visible) return;
    this.tweens.add({
      targets: this.goalBannerContainer,
      alpha: 0,
      duration: 150 / this.speedMultiplier,
      onComplete: () => {
        this.goalBannerContainer.setVisible(false);
      },
    });
  }

  private animateWhistle(title: string, durationMs: number, onComplete: () => void): void {
    this.showFloatingText(`★ ${title} ★`, HALFWAY_X, CENTER_Y - 25, '#FFFFFF');
    this.time.delayedCall(durationMs, onComplete);
  }

  private handleMatchEnd(): void {
    this.isFinished = true;
    stopStadiumAmbience();
    this.hudTickerText.setText(`Full Time! Final Score: ${this.homeScore} - ${this.awayScore}`);
    this.showFloatingText('★ MATCH FINISHED ★', HALFWAY_X, CENTER_Y - 25, '#FACC15');
    this.callbacks.onMatchEnd?.();
  }

  private updateScoreHud(): void {
    const homeNameShort = this.homeTeam.name.substring(0, 3).toUpperCase();
    const awayNameShort = this.awayTeam.name.substring(0, 3).toUpperCase();
    this.hudScoreText?.setText(
      `${homeNameShort}  ${this.homeScore} - ${this.awayScore}  ${awayNameShort}`
    );
  }

  /**
   * Smoothly reset all 22 players to their base formation coordinates
   */
  private resetPlayersToFormation(duration: number = 450): void {
    for (const p of this.players) {
      if (!p.container || !p.container.active) continue;
      this.tweens.add({
        targets: p.container,
        x: p.baseX,
        y: p.baseY,
        duration,
        ease: 'Quad.easeOut',
        onComplete: () => {
          p.sprite.setAngle(0);
          p.sprite.setY(0);
        },
      });
    }
  }

  /**
   * Updates all 22 players with authentic tactical formations, attacking runs,
   * compact defensive blocks, ball-oriented team shifting, and active pressing.
   */
  private updateTacticalFormations(
    targetBallX: number,
    targetBallY: number,
    attackingTeam: 'home' | 'away',
    duration: number,
    isShootingPhase: boolean = false,
    receivingPlayerId?: string
  ): void {
    const defendingTeam = attackingTeam === 'home' ? 'away' : 'home';
    const presser = this.findNearestPlayer(targetBallX, targetBallY, defendingTeam);

    for (const p of this.players) {
      if (!p.container || !p.container.active) continue;
      if (receivingPlayerId && p.id === receivingPlayerId) continue;

      let targetX = p.baseX;
      let targetY = p.baseY;

      if (p.isGK) {
        if (p.team === defendingTeam) {
          // Defending GK guards the goal mouth and shifts on the angle
          targetX = defendingTeam === 'home' ? PITCH_LEFT + 6 : PITCH_RIGHT - 6;
          targetY = Phaser.Math.Clamp(
            CENTER_Y + (targetBallY - CENTER_Y) * 0.32,
            CENTER_Y - 14,
            CENTER_Y + 14
          );
        } else {
          // Attacking GK steps up to act as a sweeper keeper support
          const pushX = attackingTeam === 'home' ? 18 : -18;
          targetX = p.baseX + pushX;
          targetY = CENTER_Y + (targetBallY - CENTER_Y) * 0.15;
        }
      } else if (p.team === attackingTeam) {
        // ==========================================
        // ATTACKING TEAM MOVEMENT
        // ==========================================
        const forwardDirection = attackingTeam === 'home' ? 1 : -1;
        const flankDistance = Math.abs(p.baseY - CENTER_Y);

        if (p.role === 'ATT') {
          if (isShootingPhase) {
            // Surge towards penalty box / 6-yard area for tap-in or rebound
            const boxGoalX = attackingTeam === 'home' ? PITCH_RIGHT - 28 : PITCH_LEFT + 28;
            targetX = boxGoalX + forwardDirection * (Math.random() * 15 - 8);
            targetY = targetBallY + (p.baseY > CENTER_Y ? 12 : -12);
          } else {
            // Forward runs into space / channels
            const pushX = forwardDirection * 48;
            const lateralShift = (targetBallY - p.baseY) * 0.28;
            targetX = p.baseX + pushX + (targetBallX - p.baseX) * 0.30;
            targetY = p.baseY + lateralShift;
          }
        } else if (p.role === 'MID') {
          // Midfielders support the play from behind the ball and offer passing triangles
          const pushX = forwardDirection * 34;
          const lateralShift = (targetBallY - p.baseY) * 0.35;
          targetX = p.baseX + pushX + (targetBallX - p.baseX) * 0.25;
          targetY = p.baseY + lateralShift;
        } else {
          // Defenders push up high to compress team length (high defensive line)
          const pushX = forwardDirection * 28;
          targetX = p.baseX + pushX;
          // Fullback overlap if the ball is on their flank
          if (flankDistance > 45 && Math.sign(p.baseY - CENTER_Y) === Math.sign(targetBallY - CENTER_Y)) {
            targetX += forwardDirection * 20;
          }
          targetY = p.baseY + (targetBallY - p.baseY) * 0.18;
        }
      } else {
        // ==========================================
        // DEFENDING TEAM MOVEMENT
        // ==========================================
        if (p === presser) {
          // The closest outfield defender actively presses and closes down the ball carrier!
          const pressOffsetX = attackingTeam === 'home' ? 18 : -18;
          targetX = targetBallX + pressOffsetX;
          targetY = targetBallY + (p.baseY > CENTER_Y ? -8 : 8);
        } else {
          const dropDirection = defendingTeam === 'home' ? -1 : 1;

          if (p.role === 'DEF') {
            // Deep compact defensive line shielding the 18-yard box
            const dropX = dropDirection * 28;
            targetX = p.baseX + dropX;
            // Compact towards center / ball side
            targetY = CENTER_Y + (p.baseY - CENTER_Y) * 0.65 + (targetBallY - CENTER_Y) * 0.22;
          } else if (p.role === 'MID') {
            // Midfield line forms a tight defensive screen in front of defenders
            const dropX = dropDirection * 32;
            targetX = p.baseX + dropX;
            targetY = CENTER_Y + (p.baseY - CENTER_Y) * 0.70 + (targetBallY - CENTER_Y) * 0.28;
          } else {
            // Strikers drop to near the halfway line as target outlet for counter-attacks
            targetX = (defendingTeam === 'home' ? PITCH_LEFT + 150 : PITCH_RIGHT - 150);
            targetY = p.baseY + (targetBallY - p.baseY) * 0.15;
          }
        }
      }

      // Keep within pitch boundaries
      targetX = Phaser.Math.Clamp(targetX, PITCH_LEFT + 8, PITCH_RIGHT - 8);
      targetY = Phaser.Math.Clamp(targetY, PITCH_TOP + 8, PITCH_BOTTOM - 8);

      const dx = targetX - p.container.x;
      const dy = targetY - p.container.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > 16) {
        // Dynamic running stride & tilt
        const moveTween = this.tweens.add({
          targets: p.container,
          x: targetX,
          y: targetY,
          duration: Math.max(120, duration * 0.9),
          ease: 'Quad.easeOut',
          onStart: () => {
            p.sprite.setAngle(dx > 0 ? 4 : -4);
          },
          onComplete: () => {
            p.sprite.setAngle(0);
          },
        });
        this.activeTweens.push(moveTween);
      }
    }
  }

  private findNearestPlayer(x: number, y: number, team: 'home' | 'away'): PitchPlayer | null {
    let nearest: PitchPlayer | null = null;
    let minDistance = Infinity;

    for (const p of this.players) {
      if (p.team !== team || p.isGK) continue;
      const dx = p.container.x - x;
      const dy = p.container.y - y;
      const dist = dx * dx + dy * dy;
      if (dist < minDistance) {
        minDistance = dist;
        nearest = p;
      }
    }
    return nearest;
  }

  // --- Public Control APIs ---

  public setSpeed(speed: 1 | 2 | 4): void {
    this.speedMultiplier = speed;
  }

  public pause(): void {
    this.isPausedState = true;
    stopStadiumAmbience();
    for (const tw of this.activeTweens) {
      if (tw.isPlaying()) tw.pause();
    }
    if (this.nextEventTimer) {
      this.nextEventTimer.paused = true;
    }
  }

  public resume(): void {
    if (!this.isPausedState) return;
    this.isPausedState = false;
    startStadiumAmbience();
    for (const tw of this.activeTweens) {
      if (tw.isPaused()) tw.resume();
    }
    if (this.nextEventTimer) {
      this.nextEventTimer.paused = false;
    } else if (!this.isFinished) {
      this.scheduleNextEvent(100);
    }
  }

  public restart(): void {
    startStadiumAmbience();
    // Stop all running tweens
    for (const tw of this.activeTweens) {
      tw.stop();
    }
    this.activeTweens = [];

    if (this.nextEventTimer) {
      this.nextEventTimer.destroy();
      this.nextEventTimer = null;
    }

    this.currentEventIndex = 0;
    this.currentMinute = 0;
    this.homeScore = 0;
    this.awayScore = 0;
    this.isFinished = false;

    // Reset scores & HUD
    this.updateScoreHud();
    this.hudTimeText?.setText("00'");
    this.hudTickerText?.setText('Match Kickoff - Ready to Play!');
    this.hideGoalBanner();

    // Reset 22 Players back to formation positions
    for (const p of this.players) {
      p.container?.setPosition(p.baseX, p.baseY);
      p.sprite?.setPosition(0, 0);
      p.container?.setAngle(0);
    }

    // Reset Ball
    this.ballX = HALFWAY_X;
    this.ballY = CENTER_Y;
    this.ballSprite?.setPosition(HALFWAY_X, CENTER_Y);
    this.ballShadow?.setPosition(HALFWAY_X, CENTER_Y + 3);

    // Call callbacks
    this.callbacks.onTimeUpdate?.(0);
    this.callbacks.onScoreUpdate?.(0, 0);

    if (!this.isPausedState && this.time) {
      this.scheduleNextEvent(500);
    }
  }

  public setEvents(events: MatchEvent[]): void {
    this.matchEvents = [...events];
    if (this.time) {
      this.restart();
    }
  }

  public setCallbacks(callbacks: MatchSceneCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getCurrentMinute(): number {
    return this.currentMinute;
  }

  public getScores(): { homeScore: number; awayScore: number } {
    return { homeScore: this.homeScore, awayScore: this.awayScore };
  }

  public shutdown(): void {
    stopStadiumAmbience();
    for (const tw of this.activeTweens) {
      if (tw.isPlaying()) tw.stop();
    }
    this.activeTweens = [];
    if (this.nextEventTimer) {
      this.nextEventTimer.destroy();
      this.nextEventTimer = null;
    }
    if (this.ambientTimer) {
      this.ambientTimer.destroy();
      this.ambientTimer = null;
    }
    if (this.weatherTimer) {
      this.weatherTimer.destroy();
      this.weatherTimer = undefined;
    }
  }
}
