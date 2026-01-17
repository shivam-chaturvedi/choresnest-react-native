
import { createSound, RecordBackType, PlayBackType } from 'react-native-nitro-sound';

// Match library's PlaybackEndType
export interface PlaybackEndType {
    duration: number;
    currentPosition: number;
}

// Safe interface for the recorder matching the latest documentation
export interface SafeAudioRecorderType {
    // Recording
    startRecorder: (uri?: string, audioSet?: any, meteringEnabled?: boolean) => Promise<string>;
    stopRecorder: () => Promise<string>;
    pauseRecorder: () => Promise<string>;
    resumeRecorder: () => Promise<string>;
    addRecordBackListener: (callback: (e: RecordBackType) => void) => void;
    removeRecordBackListener: () => void;

    // Playback
    startPlayer: (path?: string, headers?: Record<string, string>) => Promise<string>;
    stopPlayer: () => Promise<string>;
    pausePlayer: () => Promise<string>;
    resumePlayer: () => Promise<string>;
    seekToPlayer: (ms: number) => Promise<string>;
    setVolume: (value: number) => Promise<string>;
    setPlaybackSpeed: (speed: number) => Promise<string>;

    // Listeners
    addPlayBackListener: (callback: (e: PlayBackType) => void) => void;
    removePlayBackListener: () => void;
    addPlaybackEndListener: (callback: (e: PlaybackEndType) => void) => void;
    removePlaybackEndListener: () => void;

    // Utils
    mmss: (seconds: number) => string;
    mmssss: (ms: number) => string;
    setSubscriptionDuration: (duration: number) => void;
    dispose: () => void;
}

/**
 * Safely creates a sound instance. Returns null if the native module is missing or fails.
 */
export const createSafeSound = (): SafeAudioRecorderType | null => {
    try {
        const sound = createSound();
        return sound as SafeAudioRecorderType;
    } catch (error) {
        console.warn('[SafeAudioRecorder] Failed to initialize native sound module:', error);
        return null;
    }
};

/**
 * A helper to get or initialize the recorder instance safely
 */
export const getAudioRecorder = (ref: React.MutableRefObject<SafeAudioRecorderType | null>) => {
    if (!ref.current) {
        ref.current = createSafeSound();
    }
    return ref.current;
};
