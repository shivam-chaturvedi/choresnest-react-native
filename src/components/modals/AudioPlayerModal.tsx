import React, { useState, useEffect } from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { AppIcon } from "../ui/AppIcon";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";

interface AudioPlayerModalProps {
    open: boolean;
    onClose: () => void;
    audioSrc: string;
    title?: string;
    duration: number;
}

export const AudioPlayerModal: React.FC<AudioPlayerModalProps> = ({ open, onClose, audioSrc, title, duration }) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);

    // Simulated Playback Interval
    useEffect(() => {
        let interval: any;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentTime(prev => {
                    if (prev >= duration) {
                        setIsPlaying(false);
                        return 0;
                    }
                    return prev + 1; // 1 second update
                });
            }, 1000); // Real-time seconds
        }
        return () => clearInterval(interval);
    }, [isPlaying, duration]);

    // Format seconds to MM:SS
    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
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
                            <TouchableOpacity onPress={() => setCurrentTime(Math.max(0, currentTime - 10))}>
                                <AppIcon name="chevronLeft" size={28} color={colors.foreground} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.playBtn, { backgroundColor: colors.primary }]}
                                onPress={() => setIsPlaying(!isPlaying)}
                            >
                                <AppIcon name={isPlaying ? "pause" : "play"} size={32} color="#fff" />
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setCurrentTime(Math.min(duration, currentTime + 10))}>
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
