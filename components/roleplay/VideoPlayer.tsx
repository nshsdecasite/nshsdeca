"use client";

import { useRef, useState, useCallback, useEffect, memo } from "react";
import type { TimestampedComment } from "@/lib/roleplay/types";
import {
  COMMENT_TAG_LABELS,
  formatTime,
  parseDurationInput,
  toDriveEmbedUrl,
} from "@/lib/roleplay/types";
import { extractYouTubeId } from "@/lib/roleplay/video";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";

interface VideoPlayerProps {
  videoUrl: string;
  videoSource: 'youtube' | 'google-drive';
  comments?: TimestampedComment[];
  manualDuration?: number;
  onManualDurationChange?: (seconds: number) => void;
  onTimelineClick?: (time: number) => void;
  interactive?: boolean;
  activeCommentId?: string;
  onCommentClick?: (comment: TimestampedComment) => void;
  onActiveCommentChange?: (comment: TimestampedComment | null) => void;
  /** When true, comments are shown by parent (no overlay / inline card) */
  externalComments?: boolean;
  /** When false, parent renders drive duration input below the player */
  showDurationInput?: boolean;
}

export function DriveDurationInput({
  onSave,
  initialMinutes = 0,
  initialSeconds = 0,
}: {
  onSave: (seconds: number) => void;
  initialMinutes?: number;
  initialSeconds?: number;
}) {
  const [minutes, setMinutes] = useState(String(initialMinutes));
  const [seconds, setSeconds] = useState(String(initialSeconds));

  const handleSave = () => {
    const total = parseDurationInput(Number(minutes) || 0, Number(seconds) || 0);
    if (total <= 0) return;
    onSave(total);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-slate-800 mb-1">Video Length</h3>
      <p className="text-xs text-slate-500 mb-3">
        Google Drive doesn&apos;t report video duration. Enter the length so you can
        place timestamped comments on the timeline.
      </p>
      <div className="flex items-end gap-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1">Minutes</label>
          <input
            type="number"
            min={0}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            className="w-20 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="text-xs text-slate-500 block mb-1">Seconds</label>
          <input
            type="number"
            min={0}
            max={59}
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
            className="w-20 border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="button"
          onClick={handleSave}
          className="bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-lg hover:bg-indigo-700"
        >
          Set Length
        </button>
      </div>
    </div>
  );
}

const Timeline = memo(function Timeline({
  duration,
  currentTime,
  comments,
  interactive,
  manualMode,
  activeCommentId,
  autoPopupId,
  onSeek,
  onTimelineClick,
  onCommentClick,
  onActiveCommentChange,
  setAutoPopup,
}: {
  duration: number;
  currentTime: number;
  comments: TimestampedComment[];
  interactive: boolean;
  manualMode?: boolean;
  activeCommentId?: string;
  autoPopupId?: string;
  onSeek: (t: number) => void;
  onTimelineClick?: (t: number) => void;
  onCommentClick?: (c: TimestampedComment) => void;
  onActiveCommentChange?: (c: TimestampedComment | null) => void;
  setAutoPopup: (c: TimestampedComment | null) => void;
}) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const getTimeFromEvent = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect || duration <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    return ratio * duration;
  };

  const progress = manualMode ? 0 : (currentTime / duration) * 100;
  const canInteract = interactive && duration > 0;

  return (
    <div className="space-y-1.5 pt-2">
      <div className="flex items-center justify-between text-xs text-slate-500 px-0.5">
        <span>{manualMode ? '0:00' : formatTime(currentTime)}</span>
        <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
      </div>

      <div
        ref={timelineRef}
        className={`relative h-8 bg-slate-200 rounded ${
          canInteract ? 'cursor-pointer hover:bg-slate-300' : 'opacity-60'
        }`}
        onClick={
          canInteract
            ? (e) => {
                const time = getTimeFromEvent(e);
                if (!manualMode) onSeek(time);
                onTimelineClick?.(time);
              }
            : undefined
        }
        onMouseMove={
          canInteract ? (e) => setHoverTime(getTimeFromEvent(e)) : undefined
        }
        onMouseLeave={() => setHoverTime(null)}
      >
        {!manualMode && (
          <div
            className="absolute top-0 left-0 h-full bg-indigo-300 rounded"
            style={{ width: `${progress}%` }}
          />
        )}
        {duration > 0 &&
          comments.map((comment) => {
            const pos = (comment.timestamp / duration) * 100;
            const isActive =
              comment.id === activeCommentId || comment.id === autoPopupId;
            return (
              <button
                key={comment.id}
                type="button"
                className={`absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full border border-white shadow transition-transform hover:scale-125 ${
                  isActive ? 'bg-amber-500 scale-125 z-10' : 'bg-indigo-600'
                }`}
                style={{ left: `calc(${pos}% - 5px)` }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!manualMode) onSeek(comment.timestamp);
                  onCommentClick?.(comment);
                  onActiveCommentChange?.(comment);
                  setAutoPopup(comment);
                }}
                title={`${formatTime(comment.timestamp)}: ${comment.text.slice(0, 50)}`}
              />
            );
          })}
        {hoverTime !== null && canInteract && (
          <div
            className="absolute -top-7 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-0.5 rounded pointer-events-none whitespace-nowrap"
            style={{ left: `${(hoverTime / duration) * 100}%` }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>

      {canInteract && (
        <p className="text-xs text-slate-500">
          {manualMode
            ? 'Click the timeline to add a comment at that timestamp'
            : 'Click timeline to add a comment, or use the button below'}
        </p>
      )}

      {canInteract && !manualMode && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => onTimelineClick?.(currentTime)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            + Comment at {formatTime(currentTime)}
          </button>
        </div>
      )}
    </div>
  );
});

function YouTubeVideoPlayer(props: VideoPlayerProps) {
  const videoId = extractYouTubeId(props.videoUrl)!;
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0);
  const commentsRef = useRef(props.comments ?? []);
  const shownRef = useRef<Set<string>>(new Set());
  const prevTimeRef = useRef(0);
  const onActiveRef = useRef(props.onActiveCommentChange);
  const onClickRef = useRef(props.onCommentClick);
  onActiveRef.current = props.onActiveCommentChange;
  onClickRef.current = props.onCommentClick;

  commentsRef.current = props.comments ?? [];

  const checkComments = useCallback((t: number) => {
    const prev = prevTimeRef.current;
    const crossed = commentsRef.current.find(
      (c) =>
        c.timestamp > prev && c.timestamp <= t && !shownRef.current.has(c.id)
    );
    if (crossed) {
      shownRef.current.add(crossed.id);
      onActiveRef.current?.(crossed);
      onClickRef.current?.(crossed);
    }
    prevTimeRef.current = t;
    currentTimeRef.current = t;
  }, []);

  const { containerId, seekTo } = useYouTubePlayer({
    videoId,
    onReady: setDuration,
    onTimeUpdate: (t, d, silent) => {
      if (d > 0) setDuration(d);
      checkComments(t);
      if (!silent) setCurrentTime(t);
    },
  });

  useEffect(() => {
    prevTimeRef.current = 0;
    shownRef.current.clear();
    setCurrentTime(0);
  }, [videoId]);

  const handleSeek = (t: number) => {
    seekTo(t);
    currentTimeRef.current = t;
    setCurrentTime(t);
    commentsRef.current.forEach((c) => {
      if (c.timestamp > t) shownRef.current.delete(c.id);
    });
    prevTimeRef.current = t;
  };

  const activeCommentId = props.activeCommentId;

  return (
    <div className="space-y-0">
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <div id={containerId} className="w-full h-full" />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
          YouTube
        </span>
        <span className="text-xs text-green-600">
          Comments appear in the panel during playback
        </span>
      </div>
      <Timeline
        duration={duration}
        currentTime={currentTime}
        comments={props.comments ?? []}
        interactive={props.interactive ?? false}
        activeCommentId={activeCommentId}
        onSeek={handleSeek}
        onTimelineClick={props.onTimelineClick}
        onCommentClick={props.onCommentClick}
        onActiveCommentChange={props.onActiveCommentChange}
        setAutoPopup={() => {}}
      />
    </div>
  );
}

function DriveVideoPlayer(props: VideoPlayerProps) {
  const embedUrl = toDriveEmbedUrl(props.videoUrl);
  const duration = props.manualDuration ?? 0;
  const [activeLocal, setActiveLocal] = useState<TimestampedComment | null>(null);

  const activeComment =
    props.comments?.find((c) => c.id === props.activeCommentId) ?? activeLocal;

  const handleCommentClick = (comment: TimestampedComment) => {
    setActiveLocal(comment);
    props.onCommentClick?.(comment);
    props.onActiveCommentChange?.(comment);
  };

  return (
    <div className="space-y-3">
      <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
        <iframe
          src={embedUrl}
          className="w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
          title="Roleplay video"
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
          Google Drive
        </span>
        <span className="text-xs text-slate-500">
          Click comment markers to view feedback
        </span>
      </div>

      {props.showDurationInput !== false &&
        props.interactive &&
        props.onManualDurationChange && (
        <DriveDurationInput
          onSave={props.onManualDurationChange}
          initialMinutes={Math.floor(duration / 60)}
          initialSeconds={Math.floor(duration % 60)}
        />
      )}

      {duration > 0 ? (
        <>
          <Timeline
            duration={duration}
            currentTime={0}
            comments={props.comments ?? []}
            interactive={props.interactive ?? false}
            manualMode
            activeCommentId={props.activeCommentId ?? activeLocal?.id}
            onSeek={() => {}}
            onTimelineClick={props.onTimelineClick}
            onCommentClick={handleCommentClick}
            onActiveCommentChange={props.onActiveCommentChange}
            setAutoPopup={setActiveLocal}
          />
          {activeComment && !props.externalComments && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-amber-700">
                  {formatTime(activeComment.timestamp)}
                </span>
                <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded">
                  {COMMENT_TAG_LABELS[activeComment.tag]}
                </span>
              </div>
              <p className="text-sm text-slate-700">{activeComment.text}</p>
            </div>
          )}
        </>
      ) : (
        props.interactive &&
        !props.showDurationInput && (
          <p className="text-xs text-amber-600">
            Set the video length below the player to enable the comment timeline.
          </p>
        )
      )}
    </div>
  );
}

export default memo(function VideoPlayer(props: VideoPlayerProps) {
  if (props.videoSource === 'youtube') return <YouTubeVideoPlayer {...props} />;
  return <DriveVideoPlayer {...props} />;
});
