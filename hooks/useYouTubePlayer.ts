"use client";

import { useEffect, useRef, useId } from "react";
import { loadYouTubeApi, type YTPlayer } from "@/lib/roleplay/video";

interface UseYouTubePlayerOptions {
  videoId: string;
  onTimeUpdate?: (time: number, duration: number, silent?: boolean) => void;
  onReady?: (duration: number) => void;
}

const POLL_MS = 500;
const DISPLAY_THROTTLE_MS = 1000;

export function useYouTubePlayer({
  videoId,
  onTimeUpdate,
  onReady,
}: UseYouTubePlayerOptions) {
  const containerId = useId().replace(/:/g, '');
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const callbacksRef = useRef({ onTimeUpdate, onReady });
  const lastDisplayRef = useRef(0);
  callbacksRef.current = { onTimeUpdate, onReady };

  useEffect(() => {
    let cancelled = false;

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return;

      playerRef.current?.destroy();
      playerRef.current = new window.YT.Player(containerId, {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1, enablejsapi: 1 },
        events: {
          onReady: (event) => {
            const duration = event.target.getDuration();
            if (duration > 0) callbacksRef.current.onReady?.(duration);
          },
          onStateChange: (event) => {
            const YT = window.YT!;
            if (event.data === YT.PlayerState.PLAYING) {
              clearInterval(intervalRef.current);
              lastDisplayRef.current = 0;
              intervalRef.current = setInterval(() => {
                const player = playerRef.current;
                if (!player) return;
                const t = player.getCurrentTime();
                const d = player.getDuration();
                const now = Date.now();
                if (now - lastDisplayRef.current >= DISPLAY_THROTTLE_MS) {
                  lastDisplayRef.current = now;
                  callbacksRef.current.onTimeUpdate?.(t, d);
                } else {
                  callbacksRef.current.onTimeUpdate?.(t, d, true);
                }
              }, POLL_MS);
            } else {
              clearInterval(intervalRef.current);
              if (
                event.data === YT.PlayerState.PAUSED ||
                event.data === YT.PlayerState.ENDED
              ) {
                const player = playerRef.current;
                if (player) {
                  callbacksRef.current.onTimeUpdate?.(
                    player.getCurrentTime(),
                    player.getDuration()
                  );
                }
              }
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      clearInterval(intervalRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [videoId, containerId]);

  const seekTo = (seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
  };

  return { containerId, seekTo };
}
