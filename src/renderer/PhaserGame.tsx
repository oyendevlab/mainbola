import {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import Phaser from 'phaser';
import { createGameConfig, DEFAULT_CONTAINER_ID } from './config';
import { MatchScene, TeamVisualInfo, MatchSceneCallbacks } from './MatchScene';
import { MatchEvent } from '../types';

export interface PhaserGameRef {
  pause: () => void;
  resume: () => void;
  setSpeed: (speed: 1 | 2 | 4) => void;
  restart: () => void;
  getScene: () => MatchScene | null;
  getGame: () => Phaser.Game | null;
}

export interface PhaserGameProps {
  events: MatchEvent[];
  homeTeam?: Partial<TeamVisualInfo>;
  awayTeam?: Partial<TeamVisualInfo>;
  playbackSpeed?: 1 | 2 | 4;
  isPaused?: boolean;
  weather?: 'Sunny' | 'Rainy' | 'Night';
  onTimeUpdate?: (minute: number) => void;
  onEvent?: (event: MatchEvent) => void;
  onScoreUpdate?: (homeScore: number, awayScore: number) => void;
  onHalftime?: () => void;
  onMatchEnd?: () => void;
  className?: string;
  containerId?: string;
}

export const PhaserGame = forwardRef<PhaserGameRef, PhaserGameProps>(
  (
    {
      events,
      homeTeam,
      awayTeam,
      playbackSpeed = 1,
      isPaused = false,
      weather = 'Night',
      onTimeUpdate,
      onEvent,
      onScoreUpdate,
      onHalftime,
      onMatchEnd,
      className = '',
      containerId = DEFAULT_CONTAINER_ID,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const gameInstanceRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<MatchScene | null>(null);

    // Keep callbacks up-to-date without triggering game reconstruction
    const callbacksRef = useRef<MatchSceneCallbacks>({
      onTimeUpdate,
      onEvent,
      onScoreUpdate,
      onHalftime,
      onMatchEnd,
    });

    useEffect(() => {
      callbacksRef.current = {
        onTimeUpdate,
        onEvent,
        onScoreUpdate,
        onHalftime,
        onMatchEnd,
      };
      if (sceneRef.current) {
        sceneRef.current.setCallbacks(callbacksRef.current);
      }
    }, [onTimeUpdate, onEvent, onScoreUpdate, onHalftime, onMatchEnd]);

    // Imperative Handles
    const pause = useCallback(() => {
      sceneRef.current?.pause();
    }, []);

    const resume = useCallback(() => {
      sceneRef.current?.resume();
    }, []);

    const setSpeed = useCallback((speed: 1 | 2 | 4) => {
      sceneRef.current?.setSpeed(speed);
    }, []);

    const restart = useCallback(() => {
      sceneRef.current?.restart();
    }, []);

    const getScene = useCallback(() => sceneRef.current, []);
    const getGame = useCallback(() => gameInstanceRef.current, []);

    useImperativeHandle(
      ref,
      () => ({
        pause,
        resume,
        setSpeed,
        restart,
        getScene,
        getGame,
      }),
      [pause, resume, setSpeed, restart, getScene, getGame]
    );

    // Initialize Phaser Game instance
    useEffect(() => {
      if (!containerRef.current) return;

      const currentContainer = containerRef.current;
      const scene = new MatchScene();
      sceneRef.current = scene;

      // Pass initial data to scene
      scene.init({
        events,
        homeTeam,
        awayTeam,
        playbackSpeed,
        isPaused,
        weather,
        callbacks: callbacksRef.current,
      });

      const config = createGameConfig(scene, currentContainer);

      // Create Phaser game instance
      const game = new Phaser.Game(config);
      gameInstanceRef.current = game;

      // Handle window/container resizing gracefully
      const handleResize = () => {
        if (game.isBooted && game.scale) {
          game.scale.refresh();
        }
      };
      window.addEventListener('resize', handleResize);

      // Cleanup Phaser on unmount
      return () => {
        window.removeEventListener('resize', handleResize);

        if (sceneRef.current) {
          sceneRef.current = null;
        }

        if (gameInstanceRef.current) {
          gameInstanceRef.current.destroy(true);
          gameInstanceRef.current = null;
        }

        // Clean any leftover canvas elements from container
        if (currentContainer) {
          currentContainer.innerHTML = '';
        }
      };
      // Recreate only when base team identities or core container ID changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerId, homeTeam?.id, awayTeam?.id]);

    // Prop-driven updates to running scene
    useEffect(() => {
      if (sceneRef.current) {
        sceneRef.current.setSpeed(playbackSpeed);
      }
    }, [playbackSpeed]);

    useEffect(() => {
      if (!sceneRef.current) return;
      if (isPaused) {
        sceneRef.current.pause();
      } else {
        sceneRef.current.resume();
      }
    }, [isPaused]);

    useEffect(() => {
      if (sceneRef.current && events) {
        sceneRef.current.setEvents(events);
      }
    }, [events]);

    return (
      <div
        id={containerId}
        ref={containerRef}
        className={`relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950 select-none ${className}`}
        style={{
          imageRendering: 'pixelated',
          aspectRatio: '16/9',
        }}
      />
    );
  }
);

PhaserGame.displayName = 'PhaserGame';
