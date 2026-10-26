import Phaser from 'phaser';

/**
 * 16-bit Retro Resolution: 480 x 270 (16:9 widescreen pixel art)
 */
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;
export const DEFAULT_CONTAINER_ID = 'phaser-match-container';

/**
 * Creates the Phaser 3 Game Configuration adhering strictly to:
 * - 480 x 270 resolution
 * - Phaser.Scale.FIT with Phaser.Scale.CENTER_BOTH
 * - pixelArt: true, antialias: false, roundPixels: true
 * - Minimal arcade physics
 */
export function createGameConfig(
  scene: Phaser.Types.Scenes.SceneType | Phaser.Types.Scenes.SceneType[],
  parent: string | HTMLElement = DEFAULT_CONTAINER_ID,
  customConfig?: Partial<Phaser.Types.Core.GameConfig>
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    backgroundColor: '#1E5E34', // Pitch border turf color
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene,
    ...customConfig,
  };
}
