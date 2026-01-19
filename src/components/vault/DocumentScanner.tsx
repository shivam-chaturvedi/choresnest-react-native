import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    TouchableWithoutFeedback,
    ActivityIndicator,
} from "react-native";
import { Camera, Upload, FileText, X } from "lucide-react-native";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { captureImage, pickDocument, SavedDocument } from "../../utils/DocumentUtils";
import { useToast } from "../ui/Toast";

interface DocumentScannerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDocumentSaved?: (doc: SavedDocument) => void;
}

export const DocumentScanner: React.FC<DocumentScannerProps> = ({
    open,
    onOpenChange,
    onDocumentSaved,
}) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    const handleCamera = async () => {
        setLoading(true);
        try {
            const doc = await captureImage();
            if (doc) {
                showToast({ title: "Success", description: "Image captured and saved successfully.", type: "success" });
                onDocumentSaved?.(doc);
                onOpenChange(false);
            }
        } catch (error) {
            console.error(error);
            showToast({ title: "Error", description: "Failed to capture image.", type: "warning" });
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async () => {
        setLoading(true);
        try {
            const doc = await pickDocument();
            if (doc) {
                showToast({ title: "Success", description: "Document uploaded and saved successfully.", type: "success" });
                onDocumentSaved?.(doc);
                onOpenChange(false);
            }
        } catch (error) {
            console.error(error);
            showToast({ title: "Error", description: "Failed to upload document.", type: "warning" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={open}
            transparent
            animationType="fade"
            onRequestClose={() => onOpenChange(false)}
        >
            <View style={styles.modalContainer}>
                <TouchableWithoutFeedback onPress={() => onOpenChange(false)}>
                    <View style={styles.overlay} />
                </TouchableWithoutFeedback>

                <View style={[styles.contentContainer, { backgroundColor: colors.card, borderRadius: radius.card }]}>
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <Camera size={20} color={colors.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.headerTitle, { color: colors.foreground }]}>Scan Document</Text>
                        </View>
                        <Pressable onPress={() => onOpenChange(false)} hitSlop={8}>
                            <X size={20} color={colors.mutedForeground} />
                        </Pressable>
                    </View>

                    <View style={[styles.dashedContainer, { borderColor: colors.border, backgroundColor: colors.muted }]}>

                        <Text style={[styles.captureTitle, { color: colors.foreground }]}>Capture or Upload</Text>
                        <Text style={[styles.captureDesc, { color: colors.mutedForeground }]}>
                            Take a photo of your document or upload an existing image
                        </Text>

                        {loading ? (
                            <View style={{ padding: 20 }}>
                                <ActivityIndicator size="large" color={colors.primary} />
                                <Text style={{ textAlign: 'center', marginTop: 10, color: colors.mutedForeground }}>Processing...</Text>
                            </View>
                        ) : (
                            <View style={styles.buttonsRow}>
                                <Pressable
                                    style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md }]}
                                    onPress={handleCamera}
                                >
                                    <Camera size={24} color={colors.foreground} style={{ marginBottom: 8 }} />
                                    <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Camera</Text>
                                </Pressable>

                                <Pressable
                                    style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md }]}
                                    onPress={handleUpload}
                                >
                                    <Upload size={24} color={colors.foreground} style={{ marginBottom: 8 }} />
                                    <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Upload</Text>
                                </Pressable>
                            </View>
                        )}
                    </View>

                    {/* OCR Info removed */}

                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.6)",
    },
    contentContainer: {
        width: "100%",
        maxWidth: 400,
        padding: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 24,
    },
    headerTitleRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    dashedContainer: {
        borderWidth: 2,
        borderStyle: "dashed",
        borderRadius: 20,
        padding: 24,
        alignItems: "center",
        marginBottom: 20,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 16,
    },
    captureTitle: {
        fontSize: 18,
        fontWeight: "700",
        marginBottom: 8,
        textAlign: 'center',
    },
    captureDesc: {
        textAlign: "center",
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    buttonsRow: {
        flexDirection: "row",
        gap: 16,
        width: "100%",
    },
    actionButton: {
        flex: 1,
        paddingVertical: 20,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1,
    },
    actionBtnText: {
        fontWeight: "600",
        fontSize: 14,
    },
    ocrInfoBox: {
        flexDirection: "row",
        padding: 16,
        borderWidth: 1,
    },
    ocrTitle: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 4,
    },
    ocrDesc: {
        fontSize: 12,
        lineHeight: 18,
    },
});
