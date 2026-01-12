import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Dimensions,
    Platform,
    Pressable,
} from "react-native";
import { AppIcon } from "../ui/AppIcon";
import { theme } from "../../theme";

interface AddNewRecipeModalProps {
    open: boolean;
    onClose: () => void;
}

type TabType = "Text" | "Image" | "Link" | "Audio";

export const AddNewRecipeModal: React.FC<AddNewRecipeModalProps> = ({
    open,
    onClose,
}) => {
    const [activeTab, setActiveTab] = useState<TabType>("Text");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [prepTime, setPrepTime] = useState("");
    const [cookTime, setCookTime] = useState("");
    const [servings, setServings] = useState("");
    const [ingredients, setIngredients] = useState<string[]>(["", ""]);
    const [instructions, setInstructions] = useState<string[]>([""]);
    const [tagInput, setTagInput] = useState("");
    const [linkUrl, setLinkUrl] = useState("");

    const handleAddIngredient = () => setIngredients([...ingredients, ""]);
    const handleRemoveIngredient = (index: number) => {
        const newIngredients = [...ingredients];
        newIngredients.splice(index, 1);
        setIngredients(newIngredients);
    };
    const handleIngredientChange = (text: string, index: number) => {
        const newIngredients = [...ingredients];
        newIngredients[index] = text;
        setIngredients(newIngredients);
    };

    const handleAddInstruction = () => setInstructions([...instructions, ""]);
    const handleRemoveInstruction = (index: number) => {
        const newInstructions = [...instructions];
        newInstructions.splice(index, 1);
        setInstructions(newInstructions);
    };
    const handleInstructionChange = (text: string, index: number) => {
        const newInstructions = [...instructions];
        newInstructions[index] = text;
        setInstructions(newInstructions);
    };

    const handleClear = () => {
        setName("");
        setDescription("");
        setPrepTime("");
        setCookTime("");
        setServings("");
        setIngredients(["", ""]);
        setInstructions([""]);
        setLinkUrl("");
    };

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            {(["Text", "Image", "Link", "Audio"] as TabType[]).map((tab) => {
                const icons: Record<TabType, any> = {
                    Text: "file",
                    Image: "image",
                    Link: "link",
                    Audio: "mic"
                };
                const isActive = activeTab === tab;
                return (
                    <Pressable
                        key={tab}
                        style={[styles.tabItem, isActive && styles.tabItemActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <AppIcon
                            name={icons[tab]}
                            size={16}
                            color={isActive ? theme.colors.foreground : theme.colors.mutedForeground}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                    </Pressable>
                )
            })}
        </View>
    );

    const renderTextTab = () => (
        <View style={styles.formContainer}>
            <Text style={styles.label}>Recipe Name *</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g., Grandma's Apple Pie"
                placeholderTextColor={theme.colors.mutedForeground}
                value={name}
                onChangeText={setName}
            />

            <Text style={[styles.label, { marginTop: 16 }]}>Description</Text>
            <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="A brief description of your recipe..."
                placeholderTextColor={theme.colors.mutedForeground}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
            />

            {/* Meta Row */}
            <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                    <Text style={styles.miniLabel}><AppIcon name="clock" size={12} color={theme.colors.mutedForeground} /> Prep</Text>
                    <TextInput
                        style={styles.miniInput}
                        placeholder="15 min"
                        placeholderTextColor={theme.colors.mutedForeground}
                        value={prepTime}
                        onChangeText={setPrepTime}
                    />
                </View>
                <View style={styles.metaCol}>
                    <Text style={styles.miniLabel}><AppIcon name="clock" size={12} color={theme.colors.mutedForeground} /> Cook</Text>
                    <TextInput
                        style={styles.miniInput}
                        placeholder="30 min"
                        placeholderTextColor={theme.colors.mutedForeground}
                        value={cookTime}
                        onChangeText={setCookTime}
                    />
                </View>
                <View style={styles.metaCol}>
                    <Text style={styles.miniLabel}><AppIcon name="users" size={12} color={theme.colors.mutedForeground} /> Serves</Text>
                    <TextInput
                        style={styles.miniInput}
                        placeholder="4"
                        placeholderTextColor={theme.colors.mutedForeground}
                        value={servings}
                        onChangeText={setServings}
                    />
                </View>
            </View>

            {/* Ingredients */}
            <Text style={[styles.label, { marginTop: 20 }]}>Ingredients</Text>
            <View style={styles.dynamicList}>
                {ingredients.map((ing, i) => (
                    <View key={i} style={styles.dynamicRow}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            placeholder={`Ingredient ${i + 1}`}
                            placeholderTextColor={theme.colors.mutedForeground}
                            value={ing}
                            onChangeText={(t) => handleIngredientChange(t, i)}
                        />
                        <TouchableOpacity onPress={() => handleRemoveIngredient(i)} style={styles.trashBtn}>
                            <AppIcon name="trash" size={18} color={theme.colors.danger} />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={handleAddIngredient}>
                    <AppIcon name="plus" size={16} color={theme.colors.foreground} style={{ marginRight: 6 }} />
                    <Text style={styles.addButtonText}>Add Ingredient</Text>
                </TouchableOpacity>
            </View>

            {/* Instructions */}
            <Text style={[styles.label, { marginTop: 20 }]}>Instructions</Text>
            <View style={styles.dynamicList}>
                {instructions.map((inst, i) => (
                    <View key={i} style={styles.dynamicRow}>
                        <View style={styles.stepBadge}><Text style={styles.stepText}>{i + 1}</Text></View>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0 }]}
                            placeholder={`Step ${i + 1}`}
                            placeholderTextColor={theme.colors.mutedForeground}
                            value={inst}
                            onChangeText={(t) => handleInstructionChange(t, i)}
                        />
                        {/* Only show delete if > 1 step or clear */}
                    </View>
                ))}
                <TouchableOpacity style={styles.addButton} onPress={handleAddInstruction}>
                    <AppIcon name="plus" size={16} color={theme.colors.foreground} style={{ marginRight: 6 }} />
                    <Text style={styles.addButtonText}>Add Step</Text>
                </TouchableOpacity>
            </View>

            {/* Tags */}
            <Text style={[styles.label, { marginTop: 20 }]}>Tags</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Add tag (e.g., Vegetarian)"
                    placeholderTextColor={theme.colors.mutedForeground}
                    value={tagInput}
                    onChangeText={setTagInput}
                />
                <TouchableOpacity style={styles.tagAddBtn}>
                    <AppIcon name="plus" size={20} color={theme.colors.foreground} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderImageTab = () => (
        <View style={styles.formContainer}>
            <Text style={styles.label}>Recipe Name *</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g., Grandma's Apple Pie"
                placeholderTextColor={theme.colors.mutedForeground}
                value={name}
                onChangeText={setName}
            />
            <Text style={[styles.label, { marginTop: 16 }]}>Upload Recipe Image</Text>

            <View style={styles.uploadArea}>
                <View style={styles.uploadIconCircle}>
                    <AppIcon name="download" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.uploadTextMain}>Click to upload</Text>
                <Text style={styles.uploadTextSub}>JPG, PNG, GIF up to 10MB</Text>
            </View>

            <View style={styles.tipBox}>
                <Text style={{ fontSize: 20, marginRight: 12 }}>📸</Text>
                <Text style={styles.tipText}>Upload a photo of a handwritten recipe, cookbook page, or food magazine. We'll help you extract the recipe details!</Text>
            </View>
        </View>
    );

    const renderLinkTab = () => (
        <View style={styles.formContainer}>
            <Text style={styles.label}>Recipe Name *</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g., Grandma's Apple Pie"
                placeholderTextColor={theme.colors.mutedForeground}
                value={name}
                onChangeText={setName}
            />
            <Text style={[styles.label, { marginTop: 16 }]}>Paste Recipe URL</Text>
            <TextInput
                style={styles.input}
                placeholder="https://example.com/recipe or YouTube link"
                placeholderTextColor={theme.colors.mutedForeground}
                value={linkUrl}
                onChangeText={setLinkUrl}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <View style={styles.importCard}>
                    <AppIcon name="globe" size={32} color={theme.colors.primary} style={{ marginBottom: 8 }} />
                    <Text style={styles.importCardTitle}>Recipe Articles</Text>
                    <Text style={styles.importCardDesc}>Import from any website</Text>
                </View>
                <View style={styles.importCard}>
                    <AppIcon name="youtube" size={32} color={theme.colors.danger} style={{ marginBottom: 8 }} />
                    {/* Fallback for Youtube if missing: PlayCircle or Video */}
                    <Text style={styles.importCardTitle}>YouTube Videos</Text>
                    <Text style={styles.importCardDesc}>Save cooking tutorials</Text>
                </View>
            </View>
        </View>
    );

    const renderAudioTab = () => (
        <View style={styles.formContainer}>
            <Text style={styles.label}>Recipe Name *</Text>
            <TextInput
                style={styles.input}
                placeholder="e.g., Grandma's Apple Pie"
                placeholderTextColor={theme.colors.mutedForeground}
                value={name}
                onChangeText={setName}
            />
            <Text style={[styles.label, { marginTop: 16 }]}>Record Your Recipe</Text>

            <View style={styles.audioArea}>
                <Text style={styles.timerText}>00 : 00</Text>
                <TouchableOpacity style={styles.recordButton}>
                    <AppIcon name="mic" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.recordHint}>Tap the mic to start recording your recipe</Text>
            </View>

            <View style={styles.tipBox}>
                <Text style={{ fontSize: 20, marginRight: 12 }}>🎙️</Text>
                <Text style={styles.tipText}>Speak your recipe aloud - ingredients, steps, and tips! Perfect for capturing family recipes passed down verbally.</Text>
            </View>
        </View>
    );

    return (
        <Modal visible={open} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Add New Recipe</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <AppIcon name="x" size={24} color={theme.colors.foreground} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    {renderTabs()}

                    {/* Content */}
                    <ScrollView contentContainerStyle={styles.contentScroll}>
                        {activeTab === "Text" && renderTextTab()}
                        {activeTab === "Image" && renderImageTab()}
                        {activeTab === "Link" && renderLinkTab()}
                        {activeTab === "Audio" && renderAudioTab()}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.btnSecondary} onPress={handleClear}>
                            <Text style={styles.btnSecondaryText}>Clear</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.btnPrimary} onPress={onClose}>
                            <Text style={styles.btnPrimaryText}>Save Recipe</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
    },
    modalContainer: {
        width: "90%",
        height: "90%",
        backgroundColor: "#F1F5F9", // Using a light grayish background similar to image
        borderRadius: 20,
        overflow: "hidden",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: "700",
        color: "#0F172A",
    },
    closeButton: {
        padding: 4,
    },
    tabContainer: {
        flexDirection: "row",
        backgroundColor: "#E2E8F0",
        marginHorizontal: 20,
        borderRadius: 16, // Pill shape container
        padding: 4,
        marginBottom: 20,
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 12,
    },
    tabItemActive: {
        backgroundColor: "#fff",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontWeight: '600',
        color: theme.colors.mutedForeground,
        fontSize: 14,
    },
    tabTextActive: {
        color: "#0F172A",
    },
    contentScroll: {
        paddingHorizontal: 20,
        paddingBottom: 24,
    },
    formContainer: {
        gap: 0,
    },
    label: {
        fontSize: 14,
        fontWeight: '700',
        color: "#334155",
        marginBottom: 8,
    },
    input: {
        backgroundColor: "#E2E8F0",
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 15,
        color: "#0F172A",
        borderWidth: 1,
        borderColor: "#CBD5E1",
        marginBottom: 0,
    },
    textArea: {
        height: 80,
    },
    metaRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    metaCol: {
        flex: 1,
    },
    miniLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: "#475569",
        marginBottom: 6,
    },
    miniInput: {
        backgroundColor: "#F1F5F9",
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 12,
        padding: 10,
        fontSize: 14,
        color: "#0F172A",
        textAlign: 'center',
    },
    dynamicList: {
        gap: 12,
    },
    dynamicRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    trashBtn: {
        padding: 8,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: "#E2E8F0",
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 12,
        paddingVertical: 12,
        marginTop: 8,
    },
    addButtonText: {
        fontWeight: '600',
        color: "#0F172A",
    },
    stepBadge: {
        width: 28,
        height: 28,
        backgroundColor: "#CBD5E1",
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepText: {
        fontWeight: '700',
        color: "#334155",
    },
    tagAddBtn: {
        width: 48,
        backgroundColor: "#E2E8F0",
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        padding: 20,
        paddingTop: 16,
        backgroundColor: "#F1F5F9",
        flexDirection: 'row',
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: "rgba(0,0,0,0.05)",
    },
    btnSecondary: {
        flex: 1,
        backgroundColor: "#F1F5F9",
        borderWidth: 1,
        borderColor: "#CBD5E1",
        borderRadius: 16, // Pill/rounded
        paddingVertical: 14,
        alignItems: 'center',
    },
    btnSecondaryText: {
        fontWeight: '700',
        color: "#334155",
        fontSize: 16,
    },
    btnPrimary: {
        flex: 1,
        backgroundColor: "#2E5E99", // Adjusted to match 'Save Recipe' blue
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
    },
    btnPrimaryText: {
        fontWeight: '700',
        color: "#fff",
        fontSize: 16,
    },
    // Image Tab
    uploadArea: {
        height: 200,
        borderWidth: 2,
        borderColor: "#CBD5E1",
        borderStyle: 'dashed',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: "#F8FAFC",
        marginBottom: 24,
    },
    uploadIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#DBEAFE",
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    uploadTextMain: {
        fontSize: 16,
        fontWeight: '700',
        color: "#0F172A",
        marginBottom: 4,
    },
    uploadTextSub: {
        fontSize: 13,
        color: "#64748B",
    },
    tipBox: {
        flexDirection: 'row',
        backgroundColor: "#E2E8F0",
        padding: 16,
        borderRadius: 16,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
        color: "#475569",
    },
    // Link Tab
    importCard: {
        flex: 1,
        backgroundColor: "#E2E8F0",
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    importCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: "#0F172A",
        marginBottom: 4,
    },
    importCardDesc: {
        fontSize: 11,
        color: "#64748B",
        textAlign: 'center',
    },
    // Audio Tab
    audioArea: {
        backgroundColor: "#E2E8F0",
        borderRadius: 24,
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    timerText: {
        fontSize: 40,
        fontWeight: '700',
        color: "#475569", // Gray timer
        marginBottom: 24,
        fontVariant: ['tabular-nums'],
        letterSpacing: 2,
    },
    recordButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: "#DC2626",
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: "#DC2626",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    recordHint: {
        fontSize: 14,
        color: "#64748B",
    },
});
