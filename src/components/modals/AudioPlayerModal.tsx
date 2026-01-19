import React, { useState, useEffect, useRef } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { AppIcon } from "../ui/AppIcon";
import { useThemeColors } from "../../contexts/ThemeContext";
import { getAudioRecorder, SafeAudioRecorderType } from "../../utils/AudioRecorder";
import { PlayBackType } from "react-native-nitro-sound";

interface AudioPlayerModalProps {
    open: boolean;
    onClose: () => void;
    audioSrc: string;
    title?: string;
    duration: number;
}

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({ open, onClose, audioSrc, title, duration }) => {
    const colors = useThemeColors();

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const audioRecorderPlayerRef = useRef<SafeAudioRecorderType | null>(null);

    // Get safe recorder instance
    const getLocalRecorder = () => getAudioRecorder(audioRecorderPlayerRef);

    useEffect(() => {
        if (!open) {
            stopPlayback();
        }
    }, [open]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopPlayback();
        };
    }, []);

    const stopPlayback = async () => {
        const recorder = getLocalRecorder();
        if (recorder) {
            try {
                await recorder.stopPlayer();
                recorder.removePlayBackListener();
                recorder.removePlaybackEndListener();
            } catch (error) {
                console.log("Error stopping player:", error);
            }
        }
        setIsPlaying(false);
        setCurrentTime(0);
    };

    const handleTogglePlayback = async () => {
        const recorder = getLocalRecorder();
        if (!recorder) return; // Handle missing native module gracefully

        try {
            if (isPlaying) {
                await recorder.pausePlayer();
                setIsPlaying(false);
            } else {
                // Determine if we are resuming or starting fresh
                // Note: The simple strategy is to just startPlayer with the path. 
                // However, react-native-nitro-sound's startPlayer typically restarts if called with path.
                // If we want resume behavior, we might need check if we are paused. 
                // But typically startPlayer(url) works. 
                // Let's try simple start logic first as per AddNewRecipeModal reference.

                // If we are essentially "paused" (currentTime > 0) but not playing, we might want resume.
                // But AddNewRecipeModal uses startPlayer(path) to start/resume? 
                // Wait, AddNewRecipeModal logic:
                // if (isPlaying) { pause } else { startPlayer(path) ... }
                // Let's stick to that pattern.

                if (currentTime > 0 && currentTime < duration) {
                    await recorder.resumePlayer();
                } else {
                    await recorder.startPlayer(audioSrc);
                }

                recorder.addPlayBackListener((e: PlayBackType) => {
                    // Convert ms to seconds
                    setCurrentTime(e.currentPosition / 1000);
                });

                recorder.addPlaybackEndListener(() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                    recorder.removePlayBackListener();
                });

                setIsPlaying(true);
            }
        } catch (error) {
            console.error("Playback error:", error);
            // Fallback for UI if real playback fails hard
            setIsPlaying(false);
        }
    };

    // Seek handling (Basic skip)
    const handleSkip = async (seconds: number) => {
        // Note: react-native-nitro-sound might not support seekToPlayer easily or it relies on ms.
        // checking AudioRecorder.ts interface: seekToPlayer: (ms: number) => Promise<string>;
        const recorder = getLocalRecorder();
        if (!recorder) return;

        const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
        setCurrentTime(newTime); // Optimistic UI update

        try {
            await recorder.seekToPlayer(newTime * 1000);
        } catch (error) {
            console.log("Seek error:", error);
        }
    };

    // Format seconds to MM:SS
    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = Math.floor(totalSeconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

    if (!open) return null;

    return (
        <Modal visible={open} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} onPress={onClose} />
                <View style={[styles.container, { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 }]}>
                    {/* Handle */}
                    <View style={[styles.handle, { backgroundColor: colors.border }]} />

                    <View style={styles.content}>
                        <View style={[styles.iconBox, { backgroundColor: colors.primary + '20' }]}>
                            <AppIcon name="mic" size={48} color={colors.primary} />
                        </View>

                        <Text style={[styles.title, { color: colors.foreground }]}>{title || "Audio Recipe"}</Text>
                        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Playing audio note</Text>

                        {/* Progress Bar */}
                        <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                            <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
                        </View>
                        <View style={styles.timeRow}>
                            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{formatTime(currentTime)}</Text>
                            <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{formatTime(duration)}</Text>
                        </View>

                        {/* Controls */}
                        <View style={styles.controls}>
                            <TouchableOpacity onPress={() => handleSkip(-10)}>
                                <AppIcon name="chevronLeft" size={28} color={colors.foreground} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.playBtn, { backgroundColor: colors.primary }]}
                                onPress={handleTogglePlayback}
                            >
                                <AppIcon name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => handleSkip(10)}>
                                <AppIcon name="chevronRight" size={28} color={colors.foreground} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    backdrop: {
        flex: 1,
    },
    container: {
        padding: 24,
        paddingBottom: 40,
        alignItems: 'center',
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        marginBottom: 24,
    },
    content: {
        width: '100%',
        alignItems: 'center',
    },
    iconBox: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 32,
    },
    progressBar: {
        width: '100%',
        height: 4,
        borderRadius: 2,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
    },
    timeRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    timeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    controls: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 32,
    },
    playBtn: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    }
});
