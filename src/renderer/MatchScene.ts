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
import {
  computeTeamTacticalTarget,
  TacticalPlayerInput,
  TacticalContext,
  PlayerTacticalState,
} from './tactics/aiSteering';

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
  texturePrefix: string;
  tacticalState?: PlayerTacticalState;
  animFrame?: number;
  isMoving?: boolean;
  isActionLocked?: boolean;
  jogPhase: number;
}

// Retro Pitch Constants
const PITCH_LEFT = 24;
const PITCH_RIGHT = 456;
const PITCH_WIDTH = 432;
const PITCH_TOP = 22;
const PITCH_BOTTOM = 254;
const PITCH_HEIGHT = 232;
const HALFWAY_X = 240;
const CENTER_Y = 138;

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
  private isSecondHalf = false;
  private currentCarrierId: string | null = null;

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
  private crowdSprites: Array<{
    sprite: Phaser.GameObjects.Sprite;
    baseY: number;
    baseKey: string;
    cheerKey: string;
  }> = [];
  private crowdTimer: Phaser.Time.TimerEvent | null = null;
  private ballSprite!: Phaser.GameObjects.Sprite;
  private ballShadow!: Phaser.GameObjects.Sprite;
  private ballX = HALFWAY_X;
  private ballY = CENTER_Y;

  // Retro Referee on pitch (v0.7.5)
  private refereeContainer?: Phaser.GameObjects.Container;
  private refereeSprite?: Phaser.GameObjects.Sprite;
  private refereeShadow?: Phaser.GameObjects.Sprite;
  private refereeTargetX = HALFWAY_X;
  private refereeTargetY = CENTER_Y + 20;
  private isRefereeWhistling = false;

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
    this.isSecondHalf = false;
    this.currentCarrierId = null;
  }

  preload(): void {
    // Generate all retro pixel-art textures programmatically
    this.generatePixelTextures();
  }

  create(): void {
    // 1. Draw 16-bit pitch
    this.drawPitch();

    // 2. Setup Top Grandstand Spectator Crowd (v0.7.3)
    this.setupCrowd();

    // 3. Create HUD overlays
    this.createHud();

    // 4. Create 22 players on the pitch
    this.setupPlayers();

    // 5. Create ball and shadow
    this.setupBall();

    // 5b. Create on-pitch retro Referee (v0.7.5)
    this.setupReferee();

    // 6. Start ambient player breathing/idling
    this.startAmbientIdling();

    // 7. Setup dynamic weather effects (rain particles or night lights)
    this.setupWeatherEffects();

    // 8. Start ambient stadium crowd background audio (v0.7.1)
    startStadiumAmbience();

    // 9. Begin event playback if events exist and not paused
    if (!this.isPausedState) {
      this.scheduleNextEvent(600);
    }
  }

  /**
   * Main animation loop (v0.7.4)
   * Drives continuous smooth jogging and body bobbing for all 22 players.
   */
  override update(time: number, _delta: number): void {
    if (this.isPausedState || this.isFinished) return;
    this.updateContinuousPlayerJogging(time);
    this.updateReferee(time);
  }

  /**
   * Continuous smooth jogging engine for all 22 players (v0.7.4 / v0.7.5)
   * Retro arcade hopping gallop (Kunio-kun / Sensible Soccer style)
   */
  private updateContinuousPlayerJogging(time: number): void {
    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (!p.container || !p.container.active) continue;

      // Preserve special action poses (kick, slide tackle, diving save)
      if (p.isActionLocked) continue;

      if (p.isMoving) {
        // Fast active jogging stride while repositioning
        const strideCycle = Math.floor((time + p.jogPhase * 100) / 130);
        const frameKey = strideCycle % 2 === 0 ? '_run1' : '_run2';
        p.sprite.setTexture(`${p.texturePrefix}${frameKey}`);

        // Retro arcade hopping gallop bounce (v0.7.5)
        const hopY = -Math.abs(Math.sin((time / 65) + p.jogPhase)) * 2.8;
        p.sprite.setY(hopY);
        // Shadow contracts when player is airborne
        p.shadow.setScale(1 - Math.abs(Math.sin((time / 65) + p.jogPhase)) * 0.28, 0.9);
      } else {
        // Rhythmic in-place jogging / on-toes stance shifting
        const strideCycle = Math.floor((time + p.jogPhase * 150) / 220);
        const frameKey = strideCycle % 2 === 0 ? '_run1' : '_stand';
        p.sprite.setTexture(`${p.texturePrefix}${frameKey}`);

        // Subtle stance vertical spring hop
        const hopY = -Math.abs(Math.sin((time / 110) + p.jogPhase)) * 1.2;
        p.sprite.setY(hopY);
        p.shadow.setScale(1 - Math.abs(Math.sin((time / 110) + p.jogPhase)) * 0.15, 0.95);

        // Body tilts slightly towards ball direction
        const faceDir = this.ballX > p.container.x ? 1.5 : -1.5;
        p.sprite.setAngle(faceDir);
      }
    }
  }

  /**
   * Updates on-pitch referee position, following ball play closely while staying clear (v0.7.5)
   */
  private updateReferee(time: number): void {
    if (!this.refereeContainer || !this.refereeSprite || !this.refereeContainer.active) return;

    if (this.isRefereeWhistling) {
      this.refereeSprite.setTexture('referee_whistle');
      return;
    }

    // Keep safe tactical distance from ball (38px behind or alongside)
    const offsetX = this.ballX > HALFWAY_X ? -38 : 38;
    const offsetY = this.ballY > CENTER_Y ? -24 : 24;
    this.refereeTargetX = Math.max(PITCH_LEFT + 25, Math.min(PITCH_RIGHT - 25, this.ballX + offsetX));
    this.refereeTargetY = Math.max(PITCH_TOP + 20, Math.min(PITCH_BOTTOM - 20, this.ballY + offsetY));

    // Smooth lerp steering towards target
    const dx = this.refereeTargetX - this.refereeContainer.x;
    const dy = this.refereeTargetY - this.refereeContainer.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 3) {
      this.refereeContainer.x += dx * 0.05;
      this.refereeContainer.y += dy * 0.05;

      const strideCycle = Math.floor(time / 130);
      const frame = strideCycle % 2 === 0 ? 'referee_run1' : 'referee_run2';
      this.refereeSprite.setTexture(frame);

      // Hopping gallop for referee
      const hopY = -Math.abs(Math.sin(time / 65)) * 2.5;
      this.refereeSprite.setY(hopY);
      this.refereeShadow?.setScale(1 - Math.abs(Math.sin(time / 65)) * 0.25, 0.9);
      this.refereeSprite.setFlipX(dx < 0);
    } else {
      this.refereeSprite.setTexture('referee_stand');
      const hopY = -Math.abs(Math.sin(time / 110)) * 1.0;
      this.refereeSprite.setY(hopY);
      this.refereeShadow?.setScale(0.95, 0.95);
    }
  }

  /**
   * Resolves a player by ID, Name, or nearest to current ball position (v0.7.4)
   */
  private findPlayer(id?: string, name?: string, team?: 'home' | 'away'): PitchPlayer | null {
    if (id) {
      const p = this.players.find((pl) => pl.id === id);
      if (p) return p;
    }
    if (name) {
      const p = this.players.find((pl) => pl.name === name);
      if (p) return p;
    }
    if (team) {
      return this.findNearestPlayer(this.ballX, this.ballY, team);
    }
    return null;
  }

  /**
   * Intelligently selects a pass receiver teammate in open space ahead (v0.7.4)
   */
  private findPassReceiver(
    passer: PitchPlayer,
    secondaryId?: string,
    secondaryName?: string
  ): PitchPlayer {
    const team = passer.team;
    if (secondaryId) {
      const p = this.players.find((pl) => pl.id === secondaryId && pl.team === team && pl.id !== passer.id);
      if (p) return p;
    }
    if (secondaryName) {
      const p = this.players.find((pl) => pl.name === secondaryName && pl.team === team && pl.id !== passer.id);
      if (p) return p;
    }

    // Filter outfield teammates
    const teammates = this.players.filter((pl) => pl.team === team && pl.id !== passer.id && !pl.isGK);
    if (teammates.length === 0) return passer;

    // Attacking direction check
    const isAttackingRight = (team === 'home' && !this.isSecondHalf) || (team === 'away' && this.isSecondHalf);

    // Candidates in forward direction
    const forwardCandidates = teammates.filter((pl) => {
      const dx = pl.container.x - passer.container.x;
      return isAttackingRight ? dx > -15 : dx < 15;
    });

    const pool = forwardCandidates.length > 0 ? forwardCandidates : teammates;

    // Pick teammate closest to an ideal pass distance (~75px)
    let bestTeammate = pool[0];
    let bestScore = Infinity;
    for (const pl of pool) {
      const dx = pl.container.x - passer.container.x;
      const dy = pl.container.y - passer.container.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const score = Math.abs(dist - 75);
      if (score < bestScore) {
        bestScore = score;
        bestTeammate = pl;
      }
    }

    return bestTeammate;
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
      'crowd_home_stand',
      'crowd_home_cheer',
      'crowd_away_stand',
      'crowd_away_cheer',
      'crowd_neutral_w_stand',
      'crowd_neutral_w_cheer',
      'crowd_neutral_y_stand',
      'crowd_neutral_y_cheer',
      'crowd_neutral_b_stand',
      'crowd_neutral_b_cheer',
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

    this.createTeamTextures(
      'player_home',
      this.homeTeam.primaryColor,
      this.homeTeam.secondaryColor,
      false,
      this.homeTeam.kitPattern || 'solid'
    );
    this.createTeamTextures(
      'player_home_gk',
      '#E4F123', // Bright Neon Yellow
      '#1E293B',
      true,
      'solid'
    );
    this.createTeamTextures(
      'player_away',
      awayPrimary,
      awaySecondary,
      false,
      this.awayTeam.kitPattern || 'solid'
    );
    this.createTeamTextures(
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

    // 7. Turf Grass Particle for slide tackles (2x2)
    const turfCanvas = this.textures.createCanvas('turf_grass_pixel', 2, 2);
    if (turfCanvas) {
      const ctx = turfCanvas.context;
      ctx.fillStyle = '#22C55E';
      ctx.fillRect(0, 0, 2, 2);
      turfCanvas.refresh();
    }

    // 8. Generate retro pixel grandstand spectators (v0.7.3)
    this.createCrowdTextures(this.homeTeam.primaryColor, awayPrimary);

    // 9. Generate on-pitch Referee and Pixel Emote textures (v0.7.5)
    this.createRefereeTextures();
    this.createEmoteTextures();
  }

  /**
   * Generates retro 16-bit referee textures (v0.7.5)
   */
  private createRefereeTextures(): void {
    const poses: Array<'stand' | 'run1' | 'run2' | 'whistle'> = ['stand', 'run1', 'run2', 'whistle'];
    const skinColor = '#F5CBA7';
    const hairColor = '#1F2937';
    const shirtColor = '#0F172A'; // Black referee kit
    const stripeColor = '#F8FAFC'; // White collar/pinstripes
    const shortsColor = '#0F172A';
    const bootColor = '#020617';

    for (const pose of poses) {
      const canvas = this.textures.createCanvas(`referee_${pose}`, 16, 16);
      if (!canvas) continue;
      const ctx = canvas.context;
      ctx.clearRect(0, 0, 16, 16);

      // Head / Hair (4x4)
      ctx.fillStyle = hairColor;
      ctx.fillRect(6, 1, 4, 2);
      ctx.fillStyle = skinColor;
      ctx.fillRect(6, 3, 4, 3);
      ctx.fillStyle = '#0F172A'; // Eyes
      ctx.fillRect(8, 3, 1, 1);

      // Whistle blowing pose
      if (pose === 'whistle') {
        ctx.fillStyle = '#E2E8F0'; // Silver whistle in mouth
        ctx.fillRect(9, 4, 2, 1);
        ctx.fillStyle = skinColor; // Raised arm holding whistle
        ctx.fillRect(9, 6, 2, 2);
      }

      // Torso / Shirt (6x5)
      ctx.fillStyle = shirtColor;
      ctx.fillRect(5, 6, 6, 5);
      // Referee white collar & vertical stripes
      ctx.fillStyle = stripeColor;
      ctx.fillRect(6, 6, 1, 4);
      ctx.fillRect(8, 6, 1, 4);

      // Arms
      if (pose !== 'whistle') {
        ctx.fillStyle = skinColor;
        ctx.fillRect(4, 7, 1, 3);
        ctx.fillRect(11, 7, 1, 3);
      }

      // Shorts (6x3)
      ctx.fillStyle = shortsColor;
      ctx.fillRect(5, 11, 6, 2);

      // Legs & Boots
      if (pose === 'stand' || pose === 'whistle') {
        ctx.fillStyle = skinColor;
        ctx.fillRect(6, 13, 1, 2);
        ctx.fillRect(9, 13, 1, 2);
        ctx.fillStyle = bootColor;
        ctx.fillRect(6, 15, 2, 1);
        ctx.fillRect(9, 15, 2, 1);
      } else if (pose === 'run1') {
        ctx.fillStyle = skinColor;
        ctx.fillRect(5, 13, 2, 2);
        ctx.fillRect(9, 13, 1, 1);
        ctx.fillStyle = bootColor;
        ctx.fillRect(4, 15, 2, 1);
        ctx.fillRect(10, 14, 2, 1);
      } else if (pose === 'run2') {
        ctx.fillStyle = skinColor;
        ctx.fillRect(6, 13, 1, 1);
        ctx.fillRect(9, 13, 2, 2);
        ctx.fillStyle = bootColor;
        ctx.fillRect(5, 14, 2, 1);
        ctx.fillRect(10, 15, 2, 1);
      }

      canvas.refresh();
    }
  }

  /**
   * Generates retro floating pixel emotes: sweat, alert, foul (v0.7.5)
   */
  private createEmoteTextures(): void {
    // 1. Sweat Emote (8x8)
    const sweatCanvas = this.textures.createCanvas('emote_sweat', 8, 8);
    if (sweatCanvas) {
      const ctx = sweatCanvas.context;
      ctx.clearRect(0, 0, 8, 8);
      ctx.fillStyle = '#38BDF8';
      ctx.fillRect(4, 1, 2, 1);
      ctx.fillRect(3, 2, 4, 3);
      ctx.fillRect(4, 5, 2, 1);
      ctx.fillStyle = '#BAE6FD'; // Highlight
      ctx.fillRect(4, 2, 1, 2);
      sweatCanvas.refresh();
    }

    // 2. Alert Emote '!' (8x8)
    const alertCanvas = this.textures.createCanvas('emote_alert', 8, 8);
    if (alertCanvas) {
      const ctx = alertCanvas.context;
      ctx.clearRect(0, 0, 8, 8);
      ctx.fillStyle = '#EF4444'; // Red exclamation
      ctx.fillRect(3, 0, 2, 4);
      ctx.fillRect(3, 5, 2, 2);
      ctx.fillStyle = '#FCA5A5'; // Inner highlight
      ctx.fillRect(3, 1, 1, 2);
      alertCanvas.refresh();
    }

    // 3. Foul Emote '💢' (8x8)
    const foulCanvas = this.textures.createCanvas('emote_foul', 8, 8);
    if (foulCanvas) {
      const ctx = foulCanvas.context;
      ctx.clearRect(0, 0, 8, 8);
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(1, 1, 2, 1);
      ctx.fillRect(5, 1, 2, 1);
      ctx.fillRect(2, 2, 4, 1);
      ctx.fillRect(1, 3, 2, 2);
      ctx.fillRect(5, 3, 2, 2);
      ctx.fillRect(2, 5, 4, 1);
      ctx.fillRect(1, 6, 2, 1);
      ctx.fillRect(5, 6, 2, 1);
      foulCanvas.refresh();
    }
  }

  /**
   * Generates retro pixel spectator textures for the grandstand (v0.7.3)
   */
  private createCrowdTextures(homeColor: string, awayColor: string): void {
    const crowdVariants = [
      { key: 'crowd_home', shirt: homeColor, hair: '#1E293B', skin: '#FCD34D' },
      { key: 'crowd_away', shirt: awayColor, hair: '#78350F', skin: '#FBCFE8' },
      { key: 'crowd_neutral_w', shirt: '#F8FAFC', hair: '#0F172A', skin: '#FDE047' },
      { key: 'crowd_neutral_y', shirt: '#FACC15', hair: '#451A03', skin: '#E2E8F0' },
      { key: 'crowd_neutral_b', shirt: '#0284C7', hair: '#1E1B4B', skin: '#FBBF24' },
    ];

    for (const v of crowdVariants) {
      // 1. Stand pose (4x6)
      const standCanvas = this.textures.createCanvas(`${v.key}_stand`, 4, 6);
      if (standCanvas) {
        const ctx = standCanvas.context;
        ctx.clearRect(0, 0, 4, 6);
        ctx.fillStyle = v.hair;
        ctx.fillRect(1, 0, 2, 1);
        ctx.fillStyle = v.skin;
        ctx.fillRect(1, 1, 2, 2);
        ctx.fillStyle = v.shirt;
        ctx.fillRect(0, 3, 4, 3);
        standCanvas.refresh();
      }

      // 2. Cheer pose (4x6 with raised hands)
      const cheerCanvas = this.textures.createCanvas(`${v.key}_cheer`, 4, 6);
      if (cheerCanvas) {
        const ctx = cheerCanvas.context;
        ctx.clearRect(0, 0, 4, 6);
        // Raised hands
        ctx.fillStyle = v.skin;
        ctx.fillRect(0, 0, 1, 2);
        ctx.fillRect(3, 0, 1, 2);
        ctx.fillStyle = v.hair;
        ctx.fillRect(1, 0, 2, 1);
        ctx.fillStyle = v.skin;
        ctx.fillRect(1, 1, 2, 2);
        ctx.fillStyle = v.shirt;
        ctx.fillRect(0, 3, 4, 3);
        cheerCanvas.refresh();
      }
    }
  }

  /**
   * Sets up animated retro spectators in the grandstand above the pitch (v0.7.3)
   */
  private setupCrowd(): void {
    for (const c of this.crowdSprites) {
      c.sprite.destroy();
    }
    this.crowdSprites = [];
    if (this.crowdTimer) {
      this.crowdTimer.destroy();
      this.crowdTimer = null;
    }

    const crowdKeys = [
      'crowd_home',
      'crowd_away',
      'crowd_neutral_w',
      'crowd_neutral_y',
      'crowd_neutral_b',
    ];

    const startX = PITCH_LEFT + 4;
    const endX = PITCH_RIGHT - 4;
    const stepX = 10;

    for (let x = startX; x <= endX; x += stepX) {
      // Back Row (y = 15)
      const key1 = crowdKeys[Math.floor(Math.random() * crowdKeys.length)];
      const sp1 = this.add.sprite(x, 15, `${key1}_stand`);
      sp1.setDepth(3);
      sp1.setOrigin(0.5, 0.5);
      this.crowdSprites.push({
        sprite: sp1,
        baseY: 15,
        baseKey: `${key1}_stand`,
        cheerKey: `${key1}_cheer`,
      });

      // Front Row (y = 18.5, slightly offset horizontally)
      if (x + 5 <= endX) {
        const key2 = crowdKeys[Math.floor(Math.random() * crowdKeys.length)];
        const sp2 = this.add.sprite(x + 5, 18.5, `${key2}_stand`);
        sp2.setDepth(4);
        sp2.setOrigin(0.5, 0.5);
        this.crowdSprites.push({
          sprite: sp2,
          baseY: 18.5,
          baseKey: `${key2}_stand`,
          cheerKey: `${key2}_cheer`,
        });
      }
    }

    this.startAmbientCrowd();
  }

  private startAmbientCrowd(): void {
    if (this.crowdTimer) this.crowdTimer.destroy();

    this.crowdTimer = this.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        if (this.isPausedState || this.isFinished) return;

        const pickCount = Phaser.Math.Between(4, 8);
        for (let i = 0; i < pickCount; i++) {
          const randIdx = Phaser.Math.Between(0, this.crowdSprites.length - 1);
          const c = this.crowdSprites[randIdx];
          if (!c.sprite.active) continue;

          c.sprite.setY(c.baseY - 1);
          if (Math.random() > 0.5) {
            c.sprite.setTexture(c.cheerKey);
          }

          this.time.delayedCall(250, () => {
            if (c.sprite.active) {
              c.sprite.setY(c.baseY);
              c.sprite.setTexture(c.baseKey);
            }
          });
        }
      },
    });
  }

  /**
   * Animated stadium crowd celebration for goals and exciting attempts (v0.7.3)
   */
  private celebrateCrowd(durationMs: number = 1400): void {
    for (const c of this.crowdSprites) {
      if (!c.sprite.active) continue;
      c.sprite.setTexture(c.cheerKey);

      this.tweens.add({
        targets: c.sprite,
        y: c.baseY - 2.5,
        yoyo: true,
        repeat: Math.floor(durationMs / 180),
        duration: 90,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (c.sprite.active) {
            c.sprite.setY(c.baseY);
            c.sprite.setTexture(c.baseKey);
          }
        },
      });
    }
  }

  /**
   * Generates a complete procedural multi-frame sprite suite for a team (claude-pxl inspiration).
   */
  private createTeamTextures(
    prefix: string,
    shirtColor: string,
    shortsColor: string,
    isGK: boolean,
    pattern: 'solid' | 'stripes' | 'hoops' | 'half' = 'solid'
  ): void {
    // 1. Stand / Neutral ready frame (also aliased as base prefix)
    this.createPlayerTextureVariant(prefix, shirtColor, shortsColor, isGK, pattern, 'stand');
    this.createPlayerTextureVariant(`${prefix}_stand`, shirtColor, shortsColor, isGK, pattern, 'stand');

    // 2. Animated Run Frames (stride 1 & 2)
    this.createPlayerTextureVariant(`${prefix}_run1`, shirtColor, shortsColor, isGK, pattern, 'run1');
    this.createPlayerTextureVariant(`${prefix}_run2`, shirtColor, shortsColor, isGK, pattern, 'run2');

    // 3. Action poses (kick & slide or dive)
    this.createPlayerTextureVariant(`${prefix}_kick`, shirtColor, shortsColor, isGK, pattern, 'kick');
    if (isGK) {
      this.createPlayerTextureVariant(`${prefix}_dive`, shirtColor, shortsColor, isGK, pattern, 'dive');
    } else {
      this.createPlayerTextureVariant(`${prefix}_slide`, shirtColor, shortsColor, isGK, pattern, 'slide');
    }
  }

  /**
   * Programmatically paints a 16x16 pixel player sprite with specific pose.
   */
  private createPlayerTextureVariant(
    key: string,
    shirtColor: string,
    shortsColor: string,
    isGK: boolean,
    pattern: 'solid' | 'stripes' | 'hoops' | 'half' = 'solid',
    pose: 'stand' | 'run1' | 'run2' | 'kick' | 'slide' | 'dive' = 'stand'
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

    if (pose === 'slide') {
      // Horizontal sliding tackle pose
      ctx.fillStyle = hairColor;
      ctx.fillRect(2, 8, 3, 2);
      ctx.fillStyle = skinColor;
      ctx.fillRect(3, 9, 3, 2);

      ctx.fillStyle = shirtColor;
      ctx.fillRect(5, 10, 5, 3);

      ctx.fillStyle = isGK ? gloveColor : skinColor;
      ctx.fillRect(2, 11, 2, 1);

      ctx.fillStyle = shortsColor;
      ctx.fillRect(9, 11, 3, 3);

      ctx.fillStyle = shirtColor;
      ctx.fillRect(12, 13, 2, 2);
      ctx.fillStyle = bootColor;
      ctx.fillRect(14, 13, 2, 2);

      canvas.refresh();
      return;
    }

    if (pose === 'dive' && isGK) {
      // Outstretched diving goalkeeper pose
      ctx.fillStyle = hairColor;
      ctx.fillRect(4, 7, 3, 2);
      ctx.fillStyle = skinColor;
      ctx.fillRect(5, 8, 3, 2);

      ctx.fillStyle = shirtColor;
      ctx.fillRect(7, 7, 5, 4);

      ctx.fillStyle = shirtColor;
      ctx.fillRect(11, 6, 2, 2);
      ctx.fillStyle = gloveColor;
      ctx.fillRect(13, 5, 3, 3);

      ctx.fillStyle = shortsColor;
      ctx.fillRect(3, 8, 3, 3);

      ctx.fillStyle = shirtColor;
      ctx.fillRect(1, 9, 2, 2);
      ctx.fillStyle = bootColor;
      ctx.fillRect(0, 9, 2, 2);

      canvas.refresh();
      return;
    }

    // Upright poses: 'stand', 'run1', 'run2', 'kick'
    const yBob = pose === 'run1' || pose === 'run2' ? 1 : 0;

    // Hair
    ctx.fillStyle = hairColor;
    ctx.fillRect(6, 1 + yBob, 4, 1);
    ctx.fillRect(5, 2 + yBob, 6, 1);

    // Face / Skin
    ctx.fillStyle = skinColor;
    ctx.fillRect(5, 3 + yBob, 6, 2);

    // Eyes
    ctx.fillStyle = eyeColor;
    ctx.fillRect(6, 4 + yBob, 1, 1);
    ctx.fillRect(9, 4 + yBob, 1, 1);

    // Torso / Shirt (Primary Color & Patterns)
    ctx.fillStyle = shirtColor;
    ctx.fillRect(4, 5 + yBob, 8, 5);

    if (!isGK && pattern !== 'solid') {
      ctx.fillStyle = shortsColor;
      if (pattern === 'stripes') {
        ctx.fillRect(5, 5 + yBob, 2, 5);
        ctx.fillRect(9, 5 + yBob, 2, 5);
      } else if (pattern === 'hoops') {
        ctx.fillRect(4, 6 + yBob, 8, 1);
        ctx.fillRect(4, 8 + yBob, 8, 1);
      } else if (pattern === 'half') {
        ctx.fillRect(8, 5 + yBob, 4, 5);
      }
    }

    // Collar
    ctx.fillStyle = shortsColor;
    ctx.fillRect(7, 5 + yBob, 2, 1);

    // Arms
    if (pose === 'run1') {
      // Left arm back, right arm forward
      ctx.fillStyle = shirtColor;
      ctx.fillRect(2, 7 + yBob, 2, 2);
      ctx.fillRect(12, 5 + yBob, 2, 2);
      ctx.fillStyle = isGK ? gloveColor : skinColor;
      ctx.fillRect(2, 9 + yBob, 1, 1);
      ctx.fillRect(13, 7 + yBob, 1, 1);
    } else if (pose === 'run2') {
      // Right arm back, left arm forward
      ctx.fillStyle = shirtColor;
      ctx.fillRect(2, 5 + yBob, 2, 2);
      ctx.fillRect(12, 7 + yBob, 2, 2);
      ctx.fillStyle = isGK ? gloveColor : skinColor;
      ctx.fillRect(2, 7 + yBob, 1, 1);
      ctx.fillRect(13, 9 + yBob, 1, 1);
    } else if (pose === 'kick') {
      // Arms out for balance
      ctx.fillStyle = shirtColor;
      ctx.fillRect(2, 6 + yBob, 2, 2);
      ctx.fillRect(12, 6 + yBob, 2, 2);
      ctx.fillStyle = isGK ? gloveColor : skinColor;
      ctx.fillRect(1, 7 + yBob, 1, 2);
      ctx.fillRect(13, 7 + yBob, 1, 2);
    } else {
      // Stand
      ctx.fillStyle = shirtColor;
      ctx.fillRect(3, 6, 1, 2);
      ctx.fillRect(12, 6, 1, 2);
      ctx.fillStyle = isGK ? gloveColor : skinColor;
      ctx.fillRect(3, 8, 1, 2);
      ctx.fillRect(12, 8, 1, 2);
    }

    // Shorts
    ctx.fillStyle = shortsColor;
    ctx.fillRect(4, 10 + yBob, 8, 3);
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(7, 11 + yBob, 2, 2);

    // Legs & Boots
    if (pose === 'run1') {
      // Left leg forward/down
      ctx.fillStyle = shirtColor;
      ctx.fillRect(4, 13 + yBob, 2, 2);
      ctx.fillStyle = bootColor;
      ctx.fillRect(4, 15, 2, 1);

      // Right leg trailing back
      ctx.fillStyle = shirtColor;
      ctx.fillRect(10, 12 + yBob, 2, 2);
      ctx.fillStyle = bootColor;
      ctx.fillRect(11, 13 + yBob, 2, 1);
    } else if (pose === 'run2') {
      // Left leg trailing back
      ctx.fillStyle = shirtColor;
      ctx.fillRect(4, 12 + yBob, 2, 2);
      ctx.fillStyle = bootColor;
      ctx.fillRect(3, 13 + yBob, 2, 1);

      // Right leg forward/down
      ctx.fillStyle = shirtColor;
      ctx.fillRect(10, 13 + yBob, 2, 2);
      ctx.fillStyle = bootColor;
      ctx.fillRect(10, 15, 2, 1);
    } else if (pose === 'kick') {
      // Plant leg (left)
      ctx.fillStyle = shirtColor;
      ctx.fillRect(5, 13 + yBob, 2, 2);
      ctx.fillStyle = bootColor;
      ctx.fillRect(5, 15, 2, 1);

      // Kicking leg extended high (right)
      ctx.fillStyle = shirtColor;
      ctx.fillRect(10, 11 + yBob, 3, 2);
      ctx.fillStyle = bootColor;
      ctx.fillRect(13, 10 + yBob, 2, 2);
    } else {
      // Stand
      ctx.fillStyle = shirtColor;
      ctx.fillRect(5, 13, 2, 2);
      ctx.fillRect(9, 13, 2, 2);
      ctx.fillStyle = bootColor;
      ctx.fillRect(5, 15, 2, 1);
      ctx.fillRect(9, 15, 2, 1);
    }

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

    // Top Grandstand Terraces & Crowd Seating (y = 12 to 21) (v0.7.3)
    this.pitchGraphics.fillStyle(0x1e293b, 1);
    this.pitchGraphics.fillRect(PITCH_LEFT - 8, 12, PITCH_WIDTH + 16, 9.5);
    // Concrete steps
    this.pitchGraphics.fillStyle(0x334155, 1);
    this.pitchGraphics.fillRect(PITCH_LEFT - 8, 16.5, PITCH_WIDTH + 16, 1);

    // Perimeter Advertising LED Hoardings (y = 20.5 to 22)
    this.pitchGraphics.fillStyle(0x090d16, 1);
    this.pitchGraphics.fillRect(PITCH_LEFT - 4, 20.5, PITCH_WIDTH + 8, 2);
    this.pitchGraphics.lineStyle(1, 0x38bdf8, 0.85);
    this.pitchGraphics.lineBetween(PITCH_LEFT - 4, 21.5, PITCH_RIGHT + 4, 21.5);

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
    const prefix =
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

    // Player Sprite (default stand pose)
    const sprite = this.add.sprite(0, 0, `${prefix}_stand`);
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
      texturePrefix: prefix,
      tacticalState: 'IDLE',
      animFrame: 0,
      isMoving: false,
      isActionLocked: false,
      jogPhase: Math.random() * Math.PI * 2,
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
   * Sets up retro referee on the pitch (v0.7.5)
   */
  private setupReferee(): void {
    if (this.refereeContainer) {
      this.refereeContainer.destroy();
    }

    this.refereeTargetX = HALFWAY_X;
    this.refereeTargetY = CENTER_Y + 22;

    this.refereeContainer = this.add.container(this.refereeTargetX, this.refereeTargetY);
    this.refereeContainer.setDepth(15);

    this.refereeShadow = this.add.sprite(0, 7, 'player_shadow');
    this.refereeShadow.setOrigin(0.5, 0.5);

    this.refereeSprite = this.add.sprite(0, 0, 'referee_stand');
    this.refereeSprite.setOrigin(0.5, 0.5);

    this.refereeContainer.add([this.refereeShadow, this.refereeSprite]);
  }

  /**
   * Shows a floating retro pixel emote above player/coordinates (v0.7.5)
   */
  public showPlayerEmote(x: number, y: number, key: 'emote_sweat' | 'emote_alert' | 'emote_foul'): void {
    const emote = this.add.sprite(x, y - 14, key);
    emote.setDepth(50);
    emote.setScale(1.2);

    this.tweens.add({
      targets: emote,
      y: y - 24,
      scaleX: 1.4,
      scaleY: 1.4,
      alpha: 0,
      duration: 550 / this.speedMultiplier,
      ease: 'Back.easeOut',
      onComplete: () => {
        emote.destroy();
      },
    });
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
   * Accounts for half-time side flipping (v0.7.3)
   */
  public normToScreenX(normX: number): number {
    const effX = this.isSecondHalf
      ? 100 - Math.max(0, Math.min(100, normX))
      : Math.max(0, Math.min(100, normX));
    return PITCH_LEFT + (effX / 100) * PITCH_WIDTH;
  }

  public normToScreenY(normY: number): number {
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

    // Automatic side switch if entering 2nd half without explicit HALFTIME event
    if (this.currentMinute >= 45 && !this.isSecondHalf && event.type !== 'HALFTIME') {
      this.switchSides();
    }

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

    switch (event.type) {
      case 'KICKOFF': {
        playWhistle('kickoff');
        this.animateKickoff(onComplete);
        break;
      }
      case 'PASS': {
        playKick(false);
        this.animatePass(event, isHome, speed, onComplete);
        break;
      }
      case 'ONE_TWO': {
        playKick(false);
        this.animateOneTwo(event, isHome, speed, onComplete);
        break;
      }
      case 'SHOT': {
        playKick(true);
        this.animateShot(event, isHome, false, speed, onComplete);
        break;
      }
      case 'SAVE': {
        playKick(true);
        this.animateShot(event, !isHome, true, speed, onComplete);
        break;
      }
      case 'SHOT_BLOCK': {
        playTackle();
        this.animateShotBlock(event, isHome, speed, onComplete);
        break;
      }
      case 'GOAL': {
        playCheer();
        this.animateGoal(event, isHome, speed, onComplete);
        break;
      }
      case 'TACKLE':
      case 'INTERCEPTION':
      case 'TURNOVER': {
        playTackle();
        this.animateTackle(event, isHome, event.type, speed, onComplete);
        break;
      }
      case 'FOUL': {
        playWhistle('kickoff');
        this.animateFoul(event, speed, onComplete);
        break;
      }
      case 'PENALTY': {
        playWhistle('kickoff');
        this.animatePenalty(event, isHome, speed, onComplete);
        break;
      }
      case 'CORNER': {
        playKick(true);
        this.animateCorner(event, isHome, speed, onComplete);
        break;
      }
      case 'HALFTIME': {
        playWhistle('halftime');
        this.animateWhistle('HALF TIME', 800 / speed, () => {
          this.switchSides(() => {
            if (this.callbacks.onHalftime) {
              this.callbacks.onHalftime();
            }
            onComplete();
          });
        });
        break;
      }
      case 'FULLTIME': {
        playWhistle('fulltime');
        this.animateWhistle('FULL TIME', 1500 / speed, onComplete);
        break;
      }
      case 'YELLOW_CARD':
      case 'RED_CARD': {
        playWhistle('kickoff');
        this.animateCard(event, speed, onComplete);
        break;
      }
      default: {
        // Fallback default pass or movement
        this.animatePass(event, isHome, speed, onComplete);
        break;
      }
    }
  }

  /**
   * Switches sides for both teams at halftime with team relocation march (v0.7.3)
   */
  private switchSides(onComplete?: () => void): void {
    if (this.isSecondHalf) {
      onComplete?.();
      return;
    }
    this.isSecondHalf = true;

    this.showFloatingText('★ 2ND HALF - SWITCH SIDES ★', HALFWAY_X, CENTER_Y - 25, '#38BDF8');

    const duration = 1000 / this.speedMultiplier;

    // Invert baseX for each player across halfway line
    for (const p of this.players) {
      p.baseX = PITCH_LEFT + PITCH_RIGHT - p.baseX;
      p.isMoving = true;
      p.sprite.setTexture(`${p.texturePrefix}_run1`);

      const moveTween = this.tweens.add({
        targets: p.container,
        x: p.baseX,
        y: p.baseY,
        duration,
        ease: 'Sine.easeInOut',
        onUpdate: (tween) => {
          const step = Math.floor(tween.progress * 12);
          const frameKey = step % 2 === 0 ? '_run1' : '_run2';
          p.sprite.setTexture(`${p.texturePrefix}${frameKey}`);
          p.sprite.setY(step % 2 === 0 ? -1.5 : 0.5);
        },
        onComplete: () => {
          p.isMoving = false;
          p.sprite.setTexture(`${p.texturePrefix}_stand`);
          p.sprite.setY(0);
          p.sprite.setAngle(0);
        },
      });
      this.activeTweens.push(moveTween);
    }

    if (onComplete) {
      this.time.delayedCall(duration + 100, onComplete);
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

    // Designate kickoff taker as initial ball carrier
    const kickoffTaker = this.players.find((p) => p.team === 'home' && p.role === 'ATT') || this.players[0];
    this.currentCarrierId = kickoffTaker?.id || null;

    // Reset both teams cleanly to base tactical shape
    this.resetPlayersToFormation(500 / this.speedMultiplier);

    // Whistle pop text
    this.showFloatingText('WHISTLE! KICKOFF', HALFWAY_X, CENTER_Y - 20, '#FACC15');
    this.time.delayedCall(600 / this.speedMultiplier, onComplete);
  }

  /**
   * PASS Animation: Authentic continuous player-to-player passing (v0.7.4)
   * Ball starts directly at passer's feet and travels smoothly to receiver.
   */
  private animatePass(
    event: MatchEvent,
    isHome: boolean,
    speed: number,
    onComplete: () => void
  ): void {
    const duration = Math.max(120, 650 / speed);
    const targetTeam = isHome ? 'home' : 'away';

    // 1. Identify Passer (ball carrier)
    let passer = this.findPlayer(event.playerId, event.playerName, targetTeam);
    if (!passer) {
      passer = (this.currentCarrierId && this.players.find((p) => p.id === this.currentCarrierId && p.team === targetTeam))
        || this.findNearestPlayer(this.ballX, this.ballY, targetTeam);
    }
    if (!passer) {
      passer = this.players.find((p) => p.team === targetTeam && !p.isGK) || this.players[0];
    }

    // 2. Identify Receiver
    const receiver = this.findPassReceiver(passer, event.secondaryPlayerId, event.secondaryPlayerName);

    // 3. Ball starts directly at passer's feet (never teleport to random coords)
    const startX = passer.container.x;
    const startY = passer.container.y + 4;
    this.ballX = startX;
    this.ballY = startY;
    this.ballSprite.setPosition(startX, startY);
    this.ballShadow.setPosition(startX, startY + 3);

    // 4. Passer executes kicking animation pose
    passer.isActionLocked = true;
    passer.sprite.setTexture(`${passer.texturePrefix}_kick`);
    this.time.delayedCall(220 / speed, () => {
      passer.isActionLocked = false;
    });

    // 5. Target is receiver's position with slight lead stride
    const isForward = (targetTeam === 'home' && !this.isSecondHalf) || (targetTeam === 'away' && this.isSecondHalf);
    const leadX = Math.max(PITCH_LEFT + 14, Math.min(PITCH_RIGHT - 14, receiver.container.x + (isForward ? 8 : -8)));
    const leadY = receiver.container.y + 4;

    // Receiver moves slightly to welcome the pass
    const tweenRec = this.tweens.add({
      targets: receiver.container,
      x: leadX,
      y: leadY - 4,
      duration: duration * 0.9,
      ease: 'Sine.easeOut',
    });
    this.activeTweens.push(tweenRec);

    // Dynamic Team Formations: all 22 players smoothly jog in formation
    this.updateTacticalFormations(leadX, leadY, targetTeam, duration, false, receiver.id);

    // 6. Ball Tween with parabolic flight
    const tweenBall = this.tweens.add({
      targets: [this.ballSprite, this.ballShadow],
      x: leadX,
      y: leadY,
      duration,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.ballX = this.ballSprite.x;
        this.ballY = this.ballSprite.y;
        this.ballShadow.setPosition(this.ballX, this.ballY + 3);
      },
      onComplete: () => {
        // Ball arrives at receiver's feet
        this.currentCarrierId = receiver.id;
        this.ballX = leadX;
        this.ballY = leadY;
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
   * SHOT / SAVE Animation: Shooter strikes directly from ball position (v0.7.4)
   */
  /**
   * Realistic penalty box shot execution (v0.7.5)
   * Shooters advance into the box/final third rather than shooting from midfield.
   */
  private animateShot(
    event: MatchEvent,
    isHomeShooting: boolean,
    isSaved: boolean,
    speed: number,
    onComplete: () => void
  ): void {
    const shootingTeam = isHomeShooting ? 'home' : 'away';

    // 1. Identify Shooter
    let shooter = this.findPlayer(event.playerId, event.playerName, shootingTeam)
      || (this.currentCarrierId && this.players.find((p) => p.id === this.currentCarrierId && p.team === shootingTeam))
      || this.findNearestPlayer(this.ballX, this.ballY, shootingTeam);
    if (!shooter) {
      shooter = this.players.find((p) => p.team === shootingTeam && p.role === 'ATT') || this.players[0];
    }

    // Target goal line coordinates (swapped in 2nd half, v0.7.3)
    const homeGoalTarget = this.isSecondHalf ? PITCH_LEFT : PITCH_RIGHT;
    const awayGoalTarget = this.isSecondHalf ? PITCH_RIGHT : PITCH_LEFT;
    const targetGoalX = isHomeShooting ? homeGoalTarget : awayGoalTarget;
    const targetGoalY = CENTER_Y + Phaser.Math.Between(-14, 14);
    const isShootingRight = targetGoalX > HALFWAY_X;

    // Realistic penalty box shooting entry coordinates (v0.7.5)
    // Box bounds: Right goal box is ~380-425, Left goal box is ~55-100
    const penBoxX = isShootingRight
      ? Phaser.Math.Between(382, 422)
      : Phaser.Math.Between(58, 98);
    const penBoxY = CENTER_Y + Phaser.Math.Between(-26, 26);

    const executeShotRelease = () => {
      const duration = Math.max(90, 440 / speed);

      // Dynamic Team Formations: attacking team crashes box, defending team packs box
      this.updateTacticalFormations(
        targetGoalX,
        targetGoalY,
        shootingTeam,
        duration,
        true
      );

      // Set shooter kicking sprite pose
      shooter.isActionLocked = true;
      shooter.sprite.setTexture(`${shooter.texturePrefix}_kick`);
      this.showPlayerEmote(shooter.container.x, shooter.container.y, 'emote_alert');
      this.time.delayedCall(280 / speed, () => {
        shooter.isActionLocked = false;
      });

      // Trigger crowd excitement
      this.celebrateCrowd(600 / speed);

      // Find defending goalkeeper
      const defendingTeam = isHomeShooting ? 'away' : 'home';
      const gk = this.players.find((p) => p.team === defendingTeam && p.isGK);

      if (gk) {
        gk.isActionLocked = true;
        gk.sprite.setTexture(`${gk.texturePrefix}_dive`);
        const diveY = isSaved ? targetGoalY : targetGoalY + (targetGoalY > CENTER_Y ? -8 : 8);
        const tweenGk = this.tweens.add({
          targets: gk.container,
          y: diveY,
          angle: isShootingRight ? -20 : 20,
          duration: duration * 0.85,
          ease: 'Quad.easeOut',
          yoyo: true,
          hold: 200 / speed,
          onComplete: () => {
            gk.isActionLocked = false;
            gk.container.setAngle(0);
          },
        });
        this.activeTweens.push(tweenGk);
      }

      // Fast Ball Tween with Swerve Curve (v0.7.5)
      const endX = isSaved ? targetGoalX + (isShootingRight ? -12 : 12) : targetGoalX;
      const endY = targetGoalY;
      const startX = this.ballX;
      const startY = this.ballY;
      const swerveControlY = startY + (startY > CENTER_Y ? -18 : 18);

      const tweenShot = this.tweens.addCounter({
        from: 0,
        to: 1,
        duration,
        ease: 'Quad.easeIn',
        onUpdate: (tween) => {
          const t = tween.getValue() ?? 0;
          this.ballX = Phaser.Math.Linear(startX, endX, t);
          this.ballY = Phaser.Math.Interpolation.QuadraticBezier(t, startY, swerveControlY, endY);
          this.ballSprite.setPosition(this.ballX, this.ballY);
          this.ballShadow.setPosition(this.ballX, this.ballY + 3);
          if (Math.random() > 0.35) {
            this.emitPixelTrail(this.ballX, this.ballY);
          }
        },
        onComplete: () => {
          if (isSaved) {
            this.showFloatingText('★ SAVED! ★', endX, endY - 14, '#38BDF8');
            // Rebound ball slightly
            const reboundX = endX + (isShootingRight ? -20 : 20);
            const reboundY = endY + Phaser.Math.Between(-15, 15);
            this.tweens.add({
              targets: [this.ballSprite, this.ballShadow],
              x: reboundX,
              y: reboundY,
              duration: 250 / speed,
              ease: 'Sine.easeOut',
              onComplete: () => {
                this.currentCarrierId = gk?.id || null;
                onComplete();
              },
            });
          } else {
            onComplete();
          }
        },
      });
      this.activeTweens.push(tweenShot);
    };

    // If shooter is far from penalty box (>80px), dribble burst forward into the box first (v0.7.5)
    const distToGoal = Math.abs(shooter.container.x - targetGoalX);
    if (distToGoal > 80) {
      const dribbleDuration = Math.max(120, 260 / speed);
      shooter.isMoving = true;
      this.tweens.add({
        targets: shooter.container,
        x: penBoxX,
        y: penBoxY,
        duration: dribbleDuration,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          this.ballX = shooter.container.x + (isShootingRight ? 5 : -5);
          this.ballY = shooter.container.y + 4;
          this.ballSprite.setPosition(this.ballX, this.ballY);
          this.ballShadow.setPosition(this.ballX, this.ballY + 3);
        },
        onComplete: () => {
          shooter.isMoving = false;
          executeShotRelease();
        },
      });
    } else {
      const fromX = shooter.container.x;
      const fromY = shooter.container.y + 4;
      this.ballX = fromX;
      this.ballY = fromY;
      this.ballSprite.setPosition(fromX, fromY);
      this.ballShadow.setPosition(fromX, fromY + 3);
      executeShotRelease();
    }
  }

  /**
   * GOAL Animation strictly executed in vicinity of penalty box (v0.7.5)
   */
  private animateGoal(
    event: MatchEvent,
    isHomeScored: boolean,
    speed: number,
    onComplete: () => void
  ): void {
    const shotDuration = Math.max(100, 450 / speed);
    const homeNetX = this.isSecondHalf ? PITCH_LEFT - 6 : PITCH_RIGHT + 6;
    const awayNetX = this.isSecondHalf ? PITCH_RIGHT + 6 : PITCH_LEFT - 6;
    const netX = isHomeScored ? homeNetX : awayNetX;
    const netY = CENTER_Y + Phaser.Math.Between(-12, 12);
    const isRightGoal = netX > HALFWAY_X;

    const scoringTeam = isHomeScored ? 'home' : 'away';
    let scorer = this.findPlayer(event.playerId, event.playerName, scoringTeam)
      || (this.currentCarrierId && this.players.find((p) => p.id === this.currentCarrierId && p.team === scoringTeam))
      || this.findNearestPlayer(this.ballX, this.ballY, scoringTeam);
    if (!scorer) {
      scorer = this.players.find((p) => p.team === scoringTeam && p.role === 'ATT') || this.players[0];
    }

    const penBoxX = isRightGoal
      ? Phaser.Math.Between(386, 422)
      : Phaser.Math.Between(58, 94);
    const penBoxY = CENTER_Y + Phaser.Math.Between(-24, 24);

    const executeGoalRelease = () => {
      scorer.isActionLocked = true;
      scorer.sprite.setTexture(`${scorer.texturePrefix}_kick`);
      this.showPlayerEmote(scorer.container.x, scorer.container.y, 'emote_alert');
      this.time.delayedCall(300 / speed, () => {
        if (scorer) scorer.isActionLocked = false;
      });

      // 1. Shoot into net from current ball position
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
          this.shakeNet(isRightGoal);

          // 3. Burst Confetti
          this.burstConfetti(netX, netY);

          // 4. Flash GOAL banner
          const scorerName = event.playerName || (isHomeScored ? this.homeTeam.name : this.awayTeam.name);
          this.showGoalBanner(scorerName, event.description);

          // 5. Stadium Grandstand Crowd Celebration Wave (v0.7.3)
          this.celebrateCrowd(1600 / speed);

          // 6. Celebration Bounces for teammates
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

          // 7. Hold celebration then reset for kickoff
          this.time.delayedCall(1500 / speed, () => {
            this.hideGoalBanner();
            // Reset ball to center for subsequent play
            this.ballX = HALFWAY_X;
            this.ballY = CENTER_Y;
            this.currentCarrierId = null;
            this.ballSprite.setPosition(HALFWAY_X, CENTER_Y);
            this.ballShadow.setPosition(HALFWAY_X, CENTER_Y + 3);
            onComplete();
          });
        },
      });
      this.activeTweens.push(tweenGoalBall);
    };

    // If scorer is outside the penalty box, dribble into the box first (v0.7.5)
    const distToNet = Math.abs(scorer.container.x - netX);
    if (distToNet > 80) {
      const dribbleDuration = Math.max(120, 260 / speed);
      scorer.isMoving = true;
      this.tweens.add({
        targets: scorer.container,
        x: penBoxX,
        y: penBoxY,
        duration: dribbleDuration,
        ease: 'Sine.easeOut',
        onUpdate: () => {
          this.ballX = scorer.container.x + (isRightGoal ? 5 : -5);
          this.ballY = scorer.container.y + 4;
          this.ballSprite.setPosition(this.ballX, this.ballY);
          this.ballShadow.setPosition(this.ballX, this.ballY + 3);
        },
        onComplete: () => {
          scorer.isMoving = false;
          executeGoalRelease();
        },
      });
    } else {
      const fromX = scorer.container.x;
      const fromY = scorer.container.y + 4;
      this.ballX = fromX;
      this.ballY = fromY;
      this.ballSprite.setPosition(fromX, fromY);
      this.ballShadow.setPosition(fromX, fromY + 3);
      executeGoalRelease();
    }
  }

  /**
   * Rapid One-Two Give-and-Go Combination (v0.7.5)
   */
  private animateOneTwo(
    event: MatchEvent,
    isHome: boolean,
    speed: number,
    onComplete: () => void
  ): void {
    const targetTeam = isHome ? 'home' : 'away';
    const passer = this.findPlayer(event.playerId, event.playerName, targetTeam)
      || this.findNearestPlayer(this.ballX, this.ballY, targetTeam);
    if (!passer) {
      this.animatePass(event, isHome, speed, onComplete);
      return;
    }

    const receiver = this.findPassReceiver(passer, event.secondaryPlayerId, event.secondaryPlayerName);
    const duration = Math.max(100, 320 / speed);

    const isAttackingRight = !this.isSecondHalf ? isHome : !isHome;
    const forwardX = isAttackingRight ? 35 : -35;
    const returnTargetX = receiver.container.x + forwardX;
    const returnTargetY = receiver.container.y + Phaser.Math.Between(-15, 15);

    // 1. Initial pass to partner
    passer.isActionLocked = true;
    passer.sprite.setTexture(`${passer.texturePrefix}_kick`);
    this.showPlayerEmote(passer.container.x, passer.container.y, 'emote_alert');

    this.tweens.add({
      targets: [this.ballSprite, this.ballShadow],
      x: receiver.container.x,
      y: receiver.container.y + 4,
      duration,
      ease: 'Sine.easeOut',
      onUpdate: () => {
        this.ballX = this.ballSprite.x;
        this.ballY = this.ballSprite.y;
      },
      onComplete: () => {
        passer.isActionLocked = false;

        // 2. Passer makes rapid run past defense
        passer.isMoving = true;
        this.tweens.add({
          targets: passer.container,
          x: returnTargetX,
          y: returnTargetY,
          duration: duration * 1.1,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            passer.isMoving = false;
          },
        });

        // 3. Receiver executes first-time return pass
        receiver.isActionLocked = true;
        receiver.sprite.setTexture(`${receiver.texturePrefix}_kick`);
        this.time.delayedCall(160 / speed, () => {
          receiver.isActionLocked = false;
        });

        this.tweens.add({
          targets: [this.ballSprite, this.ballShadow],
          x: returnTargetX,
          y: returnTargetY + 4,
          duration,
          ease: 'Quad.easeOut',
          onUpdate: () => {
            this.ballX = this.ballSprite.x;
            this.ballY = this.ballSprite.y;
          },
          onComplete: () => {
            this.currentCarrierId = passer.id;
            this.showFloatingText('★ 1-2 COMBINATION! ★', returnTargetX, returnTargetY - 14, '#FACC15');
            onComplete();
          },
        });
      },
    });
  }

  /**
   * Defensive Shot Block in front of goal (v0.7.5)
   */
  private animateShotBlock(
    event: MatchEvent,
    isHomeShooting: boolean,
    speed: number,
    onComplete: () => void
  ): void {
    const defendingTeam = isHomeShooting ? 'away' : 'home';
    const defender = this.findPlayer(event.playerId, event.playerName, defendingTeam)
      || this.findNearestPlayer(this.ballX, this.ballY, defendingTeam);

    const blockX = defender ? defender.container.x : this.ballX;
    const blockY = defender ? defender.container.y : this.ballY;

    if (defender) {
      defender.isActionLocked = true;
      defender.sprite.setTexture(`${defender.texturePrefix}_slide`);
      this.time.delayedCall(350 / speed, () => {
        defender.isActionLocked = false;
      });
    }

    // Ball strikes defender and deflects outwards
    this.tweens.add({
      targets: [this.ballSprite, this.ballShadow],
      x: blockX,
      y: blockY + 4,
      duration: Math.max(90, 240 / speed),
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.burstSparks(blockX, blockY);
        this.burstTurfParticles(blockX, blockY);
        this.showFloatingText('★ SHOT BLOCKED! ★', blockX, blockY - 14, '#F43F5E');
        this.showPlayerEmote(blockX, blockY, 'emote_sweat');

        // Deflect towards corner / sideline
        const deflectX = blockX + (blockX > HALFWAY_X ? -25 : 25);
        const deflectY = blockY > CENTER_Y ? PITCH_BOTTOM + 5 : PITCH_TOP - 5;

        this.tweens.add({
          targets: [this.ballSprite, this.ballShadow],
          x: deflectX,
          y: deflectY,
          duration: Math.max(100, 320 / speed),
          ease: 'Sine.easeOut',
          onUpdate: () => {
            this.ballX = this.ballSprite.x;
            this.ballY = this.ballSprite.y;
          },
          onComplete: () => {
            onComplete();
          },
        });
      },
    });
  }

  /**
   * Referee Whistles Foul with slide tackle and emote (v0.7.5)
   */
  private animateFoul(
    _event: MatchEvent,
    speed: number,
    onComplete: () => void
  ): void {
    const x = this.ballX;
    const y = this.ballY;

    this.burstSparks(x, y);
    this.burstTurfParticles(x, y);
    this.showFloatingText('★ FOUL! ★', x, y - 12, '#F59E0B');
    this.showPlayerEmote(x, y, 'emote_foul');

    // Referee blows whistle
    this.isRefereeWhistling = true;
    if (this.refereeContainer) {
      this.refereeContainer.setPosition(x + (x > HALFWAY_X ? -28 : 28), y + 10);
    }

    this.time.delayedCall(600 / speed, () => {
      this.isRefereeWhistling = false;
      onComplete();
    });
  }

  /**
   * Penalty Kick Animation (v0.7.5)
   */
  private animatePenalty(
    event: MatchEvent,
    isHomeAttacking: boolean,
    speed: number,
    onComplete: () => void
  ): void {
    const isAttackingRight = !this.isSecondHalf ? isHomeAttacking : !isHomeAttacking;
    const spotX = isAttackingRight ? PITCH_RIGHT - 46 : PITCH_LEFT + 46;
    const spotY = CENTER_Y;

    this.showFloatingText('★ PENALTY AWARDED! ★', HALFWAY_X, CENTER_Y - 20, '#EF4444');
    this.showGoalBanner('PENALTY!', event.description);

    this.isRefereeWhistling = true;
    if (this.refereeContainer) {
      this.refereeContainer.setPosition(spotX + (isAttackingRight ? -30 : 30), spotY - 20);
    }

    // Set ball at penalty spot
    this.ballX = spotX;
    this.ballY = spotY;
    this.ballSprite.setPosition(spotX, spotY);
    this.ballShadow.setPosition(spotX, spotY + 3);

    const attackingTeam = isHomeAttacking ? 'home' : 'away';
    const taker = this.findPlayer(event.playerId, event.playerName, attackingTeam)
      || this.players.find((p) => p.team === attackingTeam && p.role === 'ATT')
      || this.players[0];

    if (taker) {
      taker.container.setPosition(spotX + (isAttackingRight ? -14 : 14), spotY);
    }

    this.time.delayedCall(1000 / speed, () => {
      this.isRefereeWhistling = false;
      this.hideGoalBanner();
      onComplete();
    });
  }

  /**
   * Corner Kick Animation (v0.7.5)
   */
  private animateCorner(
    event: MatchEvent,
    isHomeAttacking: boolean,
    speed: number,
    onComplete: () => void
  ): void {
    const isAttackingRight = !this.isSecondHalf ? isHomeAttacking : !isHomeAttacking;
    const cornerFlagX = isAttackingRight ? PITCH_RIGHT : PITCH_LEFT;
    const cornerFlagY = event.fromCoords?.y && event.fromCoords.y > 50 ? PITCH_BOTTOM : PITCH_TOP;

    this.ballX = cornerFlagX;
    this.ballY = cornerFlagY;
    this.ballSprite.setPosition(cornerFlagX, cornerFlagY);
    this.ballShadow.setPosition(cornerFlagX, cornerFlagY + 3);

    this.showFloatingText('CORNER KICK', cornerFlagX + (isAttackingRight ? -25 : 25), cornerFlagY > CENTER_Y ? cornerFlagY - 15 : cornerFlagY + 15, '#38BDF8');

    const attackingTeam = isHomeAttacking ? 'home' : 'away';
    const taker = this.findPlayer(event.playerId, event.playerName, attackingTeam)
      || this.findNearestPlayer(cornerFlagX, cornerFlagY, attackingTeam);
    if (taker) {
      taker.container.setPosition(cornerFlagX + (isAttackingRight ? -8 : 8), cornerFlagY);
      taker.isActionLocked = true;
      taker.sprite.setTexture(`${taker.texturePrefix}_kick`);
      this.time.delayedCall(280 / speed, () => {
        taker.isActionLocked = false;
      });
    }

    // Swerve high-arching cross into danger box
    const targetBoxX = isAttackingRight ? PITCH_RIGHT - 45 : PITCH_LEFT + 45;
    const targetBoxY = CENTER_Y + Phaser.Math.Between(-15, 15);
    const duration = Math.max(120, 500 / speed);

    const tweenCross = this.tweens.addCounter({
      from: 0,
      to: 1,
      duration,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        this.ballX = Phaser.Math.Linear(cornerFlagX, targetBoxX, t);
        // High parabolic 3D arc
        const heightArc = Math.sin(t * Math.PI) * 16;
        this.ballY = Phaser.Math.Linear(cornerFlagY, targetBoxY, t) - heightArc;
        this.ballSprite.setPosition(this.ballX, this.ballY);
        this.ballSprite.setScale(1 + (heightArc / 20));
        this.ballShadow.setPosition(this.ballX, Phaser.Math.Linear(cornerFlagY, targetBoxY, t) + 3);
        this.ballShadow.setScale(Math.max(0.6, 1 - (heightArc / 25)));
      },
      onComplete: () => {
        this.ballSprite.setScale(1);
        this.ballShadow.setScale(1);
        this.ballY = targetBoxY;
        this.ballSprite.setPosition(targetBoxX, targetBoxY);
        this.showPlayerEmote(targetBoxX, targetBoxY, 'emote_alert');
        onComplete();
      },
    });
    this.activeTweens.push(tweenCross);
  }

  /**
   * Disciplinary Card booking animation (v0.7.5)
   */
  private animateCard(
    event: MatchEvent,
    speed: number,
    onComplete: () => void
  ): void {
    const isRed = event.type === 'RED_CARD';
    const cardColor = isRed ? '#DC2626' : '#FACC15';
    const cardText = isRed ? '🟥 RED CARD!' : '🟨 YELLOW CARD';

    this.showFloatingText(cardText, this.ballX, this.ballY - 18, cardColor);
    this.showPlayerEmote(this.ballX, this.ballY, 'emote_foul');

    this.isRefereeWhistling = true;
    this.time.delayedCall(600 / speed, () => {
      this.isRefereeWhistling = false;
      onComplete();
    });
  }

  /**
   * TACKLE / TURNOVER Animation: Tackler closes down carrier and wins possession (v0.7.4)
   */
  private animateTackle(
    _event: MatchEvent,
    _isHome: boolean,
    type: string,
    speed: number,
    onComplete: () => void
  ): void {
    const duration = Math.max(100, 350 / speed);
    const x = this.ballX;
    const y = this.ballY;

    // Star impact sparks & green turf shreds
    this.burstSparks(x, y);
    this.burstTurfParticles(x, y);

    // Pop retro text
    const label = type === 'TACKLE' ? 'TACKLE!' : type === 'INTERCEPTION' ? 'INTERCEPT!' : 'TURNOVER!';
    this.showFloatingText(label, x, y - 12, '#F59E0B');

    // Tackling team is opponent of current carrier
    const currentCarrier = this.currentCarrierId ? this.players.find((p) => p.id === this.currentCarrierId) : null;
    const tacklingTeam = currentCarrier ? (currentCarrier.team === 'home' ? 'away' : 'home') : (x > HALFWAY_X ? 'away' : 'home');

    const tackler = this.findNearestPlayer(x, y, tacklingTeam);
    const squirtX = tackler ? tackler.container.x : Math.max(PITCH_LEFT + 15, Math.min(PITCH_RIGHT - 15, x + Phaser.Math.Between(-15, 15)));
    const squirtY = tackler ? tackler.container.y + 4 : Math.max(PITCH_TOP + 15, Math.min(PITCH_BOTTOM - 15, y + Phaser.Math.Between(-15, 15)));

    if (tackler) {
      tackler.isActionLocked = true;
      tackler.sprite.setTexture(`${tackler.texturePrefix}_slide`);
      this.time.delayedCall(300 / speed, () => {
        tackler.isActionLocked = false;
      });
      this.currentCarrierId = tackler.id;
    }

    // Dynamic Team Transition: counter-attack push & recovery scramble
    this.updateTacticalFormations(squirtX, squirtY, tacklingTeam, duration, false);

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
    const playerInputs: TacticalPlayerInput[] = this.players.map((p) => ({
      id: p.id,
      team: p.team,
      role: p.role,
      isGK: p.isGK,
      baseX: p.baseX,
      baseY: p.baseY,
      currentX: p.container.x,
      currentY: p.container.y,
    }));

    const context: TacticalContext = {
      ballX: targetBallX,
      ballY: targetBallY,
      attackingTeam,
      isShootingPhase,
      isSecondHalf: this.isSecondHalf,
      pitchBounds: {
        left: PITCH_LEFT,
        right: PITCH_RIGHT,
        top: PITCH_TOP,
        bottom: PITCH_BOTTOM,
        centerX: HALFWAY_X,
        centerY: CENTER_Y,
      },
    };

    for (let i = 0; i < this.players.length; i++) {
      const p = this.players[i];
      if (!p.container || !p.container.active) continue;

      const { targetX, targetY, state } = computeTeamTacticalTarget(
        playerInputs[i],
        playerInputs,
        context,
        receivingPlayerId
      );
      p.tacticalState = state;

      const dx = targetX - p.container.x;
      const dy = targetY - p.container.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > 16) {
        p.isMoving = true;

        const moveTween = this.tweens.add({
          targets: p.container,
          x: targetX,
          y: targetY,
          duration: Math.max(120, duration * 0.9),
          ease: 'Sine.easeOut',
          onStart: () => {
            p.sprite.setAngle(dx > 0 ? 3.5 : -3.5);
            if (state === 'SLIDING') {
              p.isActionLocked = true;
              p.sprite.setTexture(`${p.texturePrefix}_slide`);
              this.burstTurfParticles(p.container.x, p.container.y);
            } else if (state === 'DIVING' && p.isGK) {
              p.isActionLocked = true;
              p.sprite.setTexture(`${p.texturePrefix}_dive`);
            }
          },
          onComplete: () => {
            p.isMoving = false;
            p.isActionLocked = false;
            p.sprite.setAngle(0);
          },
        });
        this.activeTweens.push(moveTween);
      } else {
        p.isMoving = false;
      }
    }
  }

  private burstTurfParticles(x: number, y: number): void {
    for (let i = 0; i < 4; i++) {
      const turf = this.add.sprite(
        x + Phaser.Math.Between(-6, 6),
        y + 6 + Phaser.Math.Between(-2, 2),
        'turf_grass_pixel'
      );
      turf.setDepth(24);
      this.tweens.add({
        targets: turf,
        x: turf.x + Phaser.Math.Between(-12, 12),
        y: turf.y + Phaser.Math.Between(-8, -2),
        alpha: 0,
        duration: 250 / this.speedMultiplier,
        ease: 'Quad.easeOut',
        onComplete: () => turf.destroy(),
      });
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
    if (this.crowdTimer) {
      this.crowdTimer.destroy();
      this.crowdTimer = null;
    }
    if (this.weatherTimer) {
      this.weatherTimer.destroy();
      this.weatherTimer = undefined;
    }
  }
}
