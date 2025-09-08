import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

interface AudioControlsProps {
  isPlaying: boolean;
  isPaused: boolean;
  isLoading: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  className?: string;
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onVolumeChange?: (volume: number) => void;
  onSeek?: (time: number) => void;
  showProgress?: boolean;
  showVolumeControl?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AudioControls({
  isPlaying,
  isPaused,
  isLoading,
  volume,
  currentTime,
  duration,
  className,
  onPlay,
  onPause,
  onStop,
  onVolumeChange,
  onSeek,
  showProgress = true,
  showVolumeControl = true,
  size = 'md',
}: AudioControlsProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  // Format time in MM:SS format
  const formatTime = (time: number): string => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !onSeek || duration === 0) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    
    onSeek(newTime);
  };

  // Get size classes
  const sizeClasses = {
    sm: {
      button: 'w-6 h-6',
      icon: 'w-3 h-3',
      container: 'gap-2',
      text: 'text-xs',
    },
    md: {
      button: 'w-8 h-8',
      icon: 'w-4 h-4',
      container: 'gap-3',
      text: 'text-sm',
    },
    lg: {
      button: 'w-10 h-10',
      icon: 'w-5 h-5',
      container: 'gap-4',
      text: 'text-base',
    },
  };

  const sizes = sizeClasses[size];

  return (
    <div className={cn('flex items-center', sizes.container, className)}>
      {/* Play/Pause/Stop Controls */}
      <div className="flex items-center gap-2">
        {/* Play/Pause Button */}
        <button
          onClick={isPlaying ? onPause : onPlay}
          disabled={isLoading}
          className={cn(
            'flex items-center justify-center rounded-full transition-colors',
            'bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed',
            sizes.button
          )}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isLoading ? (
            <div className={cn('animate-spin rounded-full border-2 border-gray-300 border-t-gray-600', sizes.icon)} />
          ) : isPlaying ? (
            <PauseIcon className={sizes.icon} />
          ) : (
            <PlayIcon className={sizes.icon} />
          )}
        </button>

        {/* Stop Button */}
        {(isPlaying || isPaused) && onStop && (
          <button
            onClick={onStop}
            className={cn(
              'flex items-center justify-center rounded-full transition-colors',
              'bg-gray-100 hover:bg-gray-200',
              sizes.button
            )}
            title="Stop"
          >
            <StopIcon className={sizes.icon} />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {showProgress && duration > 0 && (
        <div className="flex-1 flex items-center gap-2">
          <span className={cn('font-mono text-gray-600', sizes.text)}>
            {formatTime(currentTime)}
          </span>
          
          <div
            ref={progressRef}
            className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative"
            onClick={handleProgressClick}
            title="Seek"
          >
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-150"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
            
            {/* Playhead */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full shadow-sm -translate-x-1/2"
              style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          
          <span className={cn('font-mono text-gray-600', sizes.text)}>
            {formatTime(duration)}
          </span>
        </div>
      )}

      {/* Volume Control */}
      {showVolumeControl && (
        <div className="relative flex items-center">
          <button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            className={cn(
              'flex items-center justify-center rounded-full transition-colors',
              'bg-gray-100 hover:bg-gray-200',
              sizes.button
            )}
            title={`Volume: ${Math.round(volume * 100)}%`}
          >
            {volume === 0 ? (
              <VolumeOffIcon className={sizes.icon} />
            ) : volume < 0.5 ? (
              <VolumeLowIcon className={sizes.icon} />
            ) : (
              <VolumeHighIcon className={sizes.icon} />
            )}
          </button>

          {/* Volume Slider */}
          {showVolumeSlider && (
            <div className="absolute left-0 bottom-full mb-2 bg-white shadow-lg rounded-lg p-2 min-w-[120px]">
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="text-center text-xs text-gray-600 mt-1">
                {Math.round(volume * 100)}%
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audio Status Indicator */}
      {isPlaying && (
        <div className="flex items-center gap-1">
          <div className="flex space-x-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  'w-1 bg-green-500 rounded-full animate-pulse',
                  size === 'sm' ? 'h-2' : size === 'md' ? 'h-3' : 'h-4'
                )}
                style={{
                  animationDelay: `${i * 0.15}s`,
                  animationDuration: '0.6s',
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Icon Components
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}

function VolumeHighIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function VolumeLowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M9 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function VolumeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 5.586L12 12m0 0v7a2 2 0 002-2V9a2 2 0 00-2-2H7.172a2 2 0 00-1.414.586L5.586 5.586zm0 0L5.586 5.586" />
    </svg>
  );
}