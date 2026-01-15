import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Pressable,
    Alert,
} from "react-native";
import { AppIcon } from "../ui/AppIcon";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { useRecipes } from "../../contexts/RecipeContext";
import { useToast } from "../ui/Toast";


import { requestPermission } from "../../utils/permissions";
import { Platform } from "react-native";

interface AddNewRecipeModalProps {
    open: boolean;
    onClose: () => void;
}

type TabType = "Text" | "Image" | "Link" | "Audio";

export const AddNewRecipeModal: React.FC<AddNewRecipeModalProps> = ({
    open,
    onClose,
}) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const { addRecipe } = useRecipes();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<TabType>("Text");
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [prepTime, setPrepTime] = useState("");
    const [cookTime, setCookTime] = useState("");
    const [servings, setServings] = useState("");
    const [ingredients, setIngredients] = useState<string[]>(["", ""]);
    const [instructions, setInstructions] = useState<string[]>([""]);
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState("");
    const [linkUrl, setLinkUrl] = useState("");

    // Nutrition State
    const [kcal, setKcal] = useState("");
    const [protein, setProtein] = useState("");
    const [carbs, setCarbs] = useState("");
    const [fats, setFats] = useState("");

    const handleAddIngredient = () => setIngredients([...ingredients, ""]);

    // Audio Recorder State
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [imagePath, setImagePath] = useState<string | null>(null);
    const [images, setImages] = useState<string[]>([]); // Added for multiple images
    const [audioPath, setAudioPath] = useState<string | null>(null);

    // Helpers
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins < 10 ? '0' : ''}${mins} : ${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleStartRecording = async () => {
        try {
            const hasPermission = await requestPermission('audio');
            if (!hasPermission) return;

            // Placeholder for actual recording logic
            setIsRecording(true);
            setIsPaused(false);
            showToast({ title: "Recording", description: "Recording started...", type: "success" });
        } catch (error) {
            console.error("Error starting recording:", error);
            showToast({ title: "Error", description: "Failed to start recording", type: "warning" });
        }
    };

    const handlePauseRecording = () => {
        try {
            setIsPaused(true);
            // Placeholder for pause logic
        } catch (error) {
            console.error("Error pausing recording:", error);
            showToast({ title: "Error", description: "Failed to pause recording", type: "warning" });
        }
    };

    const handleResumeRecording = () => {
        try {
            setIsPaused(false);
            // Placeholder for resume logic
        } catch (error) {
            console.error("Error resuming recording:", error);
            showToast({ title: "Error", description: "Failed to resume recording", type: "warning" });
        }
    };

    const handleStopRecording = () => {
        try {
            setIsRecording(false);
            setIsPaused(false);
            setAudioPath("dummy_path.mp3"); // Simulate saved file
            showToast({ title: "Success", description: "Audio saved!", type: "success" });
        } catch (error) {
            console.error("Error stopping recording:", error);
            showToast({ title: "Error", description: "Failed to stop recording", type: "warning" });
        }
    };

    const handleDeleteRecording = () => {
        try {
            setAudioPath(null);
            setRecordingTime(0);
            showToast({ title: "Deleted", description: "Recording deleted", type: "success" });
        } catch (error) {
            console.error("Error deleting recording:", error);
            showToast({ title: "Error", description: "Failed to delete recording", type: "warning" });
        }
    };

    const handleImageUpload = async () => {
        try {
            const hasPermission = await requestPermission('photo');
            if (!hasPermission) return;

            // Placeholder for image picker logic
            // In a real app, use react-native-image-picker here
            // Simulate adding multiple images
            const newImage = "dummy_image_" + (images.length + 1) + ".jpg";
            setImages([...images, newImage]);

            showToast({ title: "Success", description: "Image added", type: "success" });
        } catch (error) {
            console.error("Error selecting image:", error);
            showToast({ title: "Error", description: "Failed to select image", type: "warning" });
        }
    };
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
        if (instructions.length > 1) {
            const newInstructions = [...instructions];
            newInstructions.splice(index, 1);
            setInstructions(newInstructions);
        }
    };
    const handleInstructionChange = (text: string, index: number) => {
        const newInstructions = [...instructions];
        newInstructions[index] = text;
        setInstructions(newInstructions);
    };

    const handleAddTag = () => {
        if (tagInput.trim()) {
            setTags([...tags, tagInput.trim()]);
            setTagInput("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleClear = () => {
        setName("");
        setDescription("");
        setPrepTime("");
        setCookTime("");
        setServings("");
        setIngredients(["", ""]);
        setInstructions([""]);
        setTags([]);
        setTagInput("");
        setLinkUrl("");
        setKcal("");
        setProtein("");
        setCarbs("");
        setFats("");
        setAudioPath(null);
        setImagePath(null);
        setImages([]);
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);
    };

    const handleSave = () => {
        try {
            // Common Validation
            if (!name.trim()) {
                showToast({ title: "Error", description: "Recipe name is required", type: "warning" });
                return;
            }

            // Validation by Tab
            if (activeTab === "Text") {
                // Text Mode: strict validation for ingredients and times
                const formattedIngredients = ingredients
                    .filter(i => i.trim())
                    .map(i => ({ name: i, quantity: 1, unit: 'unit' }));

                if (formattedIngredients.length === 0) {
                    showToast({ title: "Error", description: "Please add at least one ingredient", type: "warning" });
                    return;
                }

                // Safely parse numeric values
                const parsedPrepTime = parseInt(prepTime || '0', 10);
                const parsedCookTime = parseInt(cookTime || '0', 10);
                const parsedServings = parseInt(servings || '4', 10);

                if (isNaN(parsedPrepTime) || isNaN(parsedCookTime) || isNaN(parsedServings)) {
                    showToast({ title: "Error", description: "Please enter valid numbers for time and servings", type: "warning" });
                    return;
                }
            } else if (activeTab === "Link") {
                if (!linkUrl.trim()) {
                    showToast({ title: "Error", description: "Recipe URL is required", type: "warning" });
                    return;
                }
            } else if (activeTab === "Image") {
                if (images.length === 0) {
                    showToast({ title: "Error", description: "Please upload at least one image", type: "warning" });
                    return;
                }
            } else if (activeTab === "Audio") {
                if (!audioPath) {
                    showToast({ title: "Error", description: "Please record audio", type: "warning" });
                    return;
                }
            }

            // Prepare Data for Saving
            const formattedIngredients = ingredients
                .filter(i => i.trim())
                .map(i => ({ name: i, quantity: 1, unit: 'unit' }));

            const finalIngredients = formattedIngredients.length > 0 ? formattedIngredients :
                (activeTab !== "Text" ? [{ name: "See details", quantity: 1, unit: "unit" }] : []);

            const parsedPrepTime = parseInt(prepTime || '0', 10);
            const parsedCookTime = parseInt(cookTime || '0', 10);
            const parsedServings = parseInt(servings || '4', 10);


            // Process URL to ensure it has a protocol
            let formattedUrl = linkUrl ? linkUrl.trim() : undefined;
            if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
                formattedUrl = `https://${formattedUrl}`;
            }

            addRecipe({
                name: name.trim(),
                image: images.length > 0 ? images[0] : (activeTab === "Link" ? "LINK_ICON" : activeTab === "Audio" ? "AUDIO_ICON" : "🍲"),
                time: (parsedPrepTime + parsedCookTime) > 0 ? `${parsedPrepTime + parsedCookTime} min` : "15 min", // Default for quick add
                servings: parsedServings > 0 ? parsedServings : 4,
                tags,
                ingredients: finalIngredients,
                nutrition: {
                    kcal: kcal.trim() || "-",
                    protein: protein.trim() || "-",
                    carbs: carbs.trim() || "-",
                    fats: fats.trim() || "-"
                },
                audio: audioPath || undefined,
                duration: recordingTime > 0 ? recordingTime : undefined,
                url: formattedUrl,
                images: images.length > 0 ? images : undefined,
            });

            showToast({ title: "Recipe Added", description: `${name} has been added to your cookbook`, type: "success" });
            handleClear();
            onClose();
        } catch (error) {
            console.error("Error saving recipe:", error);
            showToast({
                title: "Error",
                description: "Failed to save recipe. Please try again.",
                type: "warning"
            });
        }
    };

    // --- RENDER HELPERS ---

    const renderTabs = () => (
        <View style={[styles.tabContainer, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
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
                        style={[
                            styles.tabItem,
                            { borderRadius: radius.md },
                            isActive && {
                                backgroundColor: colors.card,
                                shadowColor: colors.shadow,
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 2,
                            }
                        ]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <AppIcon
                            name={icons[tab]}
                            size={16}
                            color={isActive ? colors.foreground : colors.mutedForeground}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[
                            styles.tabText,
                            { color: isActive ? colors.foreground : colors.mutedForeground }
                        ]}>{tab}</Text>
                    </Pressable>
                )
            })}
        </View>
    );

    // ... (Text Tab updates needed separately if missed, but focusing on Audio/Image structure now)

    const renderTextTab = () => (
        <View style={styles.formContainer}>
            <Text style={[styles.label, { color: colors.foreground }]}>Recipe Name *</Text>
            <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                placeholder="e.g., Grandma's Apple Pie"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
            />

            <Text style={[styles.label, { marginTop: 16, color: colors.foreground }]}>Description</Text>
            <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                placeholder="A brief description of your recipe..."
                placeholderTextColor={colors.mutedForeground}
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
            />

            {/* Meta Row */}
            <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                    <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>
                        <AppIcon name="clock" size={12} color={colors.mutedForeground} /> Prep
                    </Text>
                    <TextInput
                        style={[styles.miniInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                        placeholder="15 min"
                        placeholderTextColor={colors.mutedForeground}
                        value={prepTime}
                        onChangeText={setPrepTime}
                        keyboardType="numeric"
                    />
                </View>
                <View style={styles.metaCol}>
                    <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>
                        <AppIcon name="clock" size={12} color={colors.mutedForeground} /> Cook
                    </Text>
                    <TextInput
                        style={[styles.miniInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                        placeholder="30 min"
                        placeholderTextColor={colors.mutedForeground}
                        value={cookTime}
                        onChangeText={setCookTime}
                        keyboardType="numeric"
                    />
                </View>
                <View style={styles.metaCol}>
                    <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>
                        <AppIcon name="users" size={12} color={colors.mutedForeground} /> Serves
                    </Text>
                    <TextInput
                        style={[styles.miniInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                        placeholder="4"
                        placeholderTextColor={colors.mutedForeground}
                        value={servings}
                        onChangeText={setServings}
                        keyboardType="numeric"
                    />
                </View>
            </View>

            {/* Nutrition Row */}
            <Text style={[styles.label, { marginTop: 16, color: colors.foreground }]}>Nutrition (per serving)</Text>
            <View style={styles.metaRow}>
                <View style={styles.metaCol}>
                    <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Kcal</Text>
                    <TextInput
                        style={[styles.miniInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                        placeholder="350"
                        placeholderTextColor={colors.mutedForeground}
                        value={kcal}
                        onChangeText={setKcal}
                        keyboardType="numeric"
                    />
                </View>
                <View style={styles.metaCol}>
                    <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Protein</Text>
                    <TextInput
                        style={[styles.miniInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                        placeholder="20g"
                        placeholderTextColor={colors.mutedForeground}
                        value={protein}
                        onChangeText={setProtein}
                    />
                </View>
                <View style={styles.metaCol}>
                    <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Carbs</Text>
                    <TextInput
                        style={[styles.miniInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                        placeholder="45g"
                        placeholderTextColor={colors.mutedForeground}
                        value={carbs}
                        onChangeText={setCarbs}
                    />
                </View>
                <View style={styles.metaCol}>
                    <Text style={[styles.miniLabel, { color: colors.mutedForeground }]}>Fats</Text>
                    <TextInput
                        style={[styles.miniInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                        placeholder="12g"
                        placeholderTextColor={colors.mutedForeground}
                        value={fats}
                        onChangeText={setFats}
                    />
                </View>
            </View>

            {/* Ingredients */}
            <Text style={[styles.label, { marginTop: 20, color: colors.foreground }]}>Ingredients</Text>
            <View style={styles.dynamicList}>
                {ingredients.map((ing, i) => (
                    <View key={i} style={styles.dynamicRow}>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                            placeholder={`Ingredient ${i + 1}`}
                            placeholderTextColor={colors.mutedForeground}
                            value={ing}
                            onChangeText={(t) => handleIngredientChange(t, i)}
                        />
                        <TouchableOpacity onPress={() => handleRemoveIngredient(i)} style={styles.trashBtn}>
                            <AppIcon name="trash" size={18} color={colors.danger} />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: radius.md }]}
                    onPress={handleAddIngredient}
                >
                    <AppIcon name="plus" size={16} color={colors.foreground} style={{ marginRight: 6 }} />
                    <Text style={[styles.addButtonText, { color: colors.foreground }]}>Add Ingredient</Text>
                </TouchableOpacity>
            </View>

            {/* Instructions */}
            <Text style={[styles.label, { marginTop: 20, color: colors.foreground }]}>Instructions</Text>
            <View style={styles.dynamicList}>
                {instructions.map((inst, i) => (
                    <View key={i} style={styles.dynamicRow}>
                        <View style={[styles.stepBadge, { backgroundColor: colors.border, borderRadius: radius.xs }]}>
                            <Text style={[styles.stepText, { color: colors.foreground }]}>{i + 1}</Text>
                        </View>
                        <TextInput
                            style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                            placeholder={`Step ${i + 1}`}
                            placeholderTextColor={colors.mutedForeground}
                            value={inst}
                            onChangeText={(t) => handleInstructionChange(t, i)}
                        />
                        <TouchableOpacity onPress={() => handleRemoveInstruction(i)} style={styles.trashBtn}>
                            <AppIcon name="trash" size={18} color={colors.danger} />
                        </TouchableOpacity>
                    </View>
                ))}
                <TouchableOpacity
                    style={[styles.addButton, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: radius.md }]}
                    onPress={handleAddInstruction}
                >
                    <AppIcon name="plus" size={16} color={colors.foreground} style={{ marginRight: 6 }} />
                    <Text style={[styles.addButtonText, { color: colors.foreground }]}>Add Step</Text>
                </TouchableOpacity>
            </View>

            {/* Tags */}
            <Text style={[styles.label, { marginTop: 20, color: colors.foreground }]}>Tags</Text>

            {/* Suggested Tags Chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {["Vegetarian", "Non-Veg", "Breakfast", "Lunch", "Dinner", "Dessert", "Healthy", "Quick"].map(suggestedTag => {
                    const isSelected = tags.includes(suggestedTag);
                    return (
                        <TouchableOpacity
                            key={suggestedTag}
                            onPress={() => {
                                if (isSelected) {
                                    handleRemoveTag(suggestedTag);
                                } else {
                                    // Mutually Exclusive Logic
                                    // 1. Dietary: Veg vs Non-Veg
                                    // 2. Meal Type: Breakfast vs Lunch vs Dinner

                                    let newTags = [...tags];

                                    // Group 1: Dietary
                                    const dietaryGroup = ["Vegetarian", "Non-Veg"];
                                    if (dietaryGroup.includes(suggestedTag)) {
                                        // Remove other dietary tags
                                        newTags = newTags.filter(t => !dietaryGroup.includes(t));
                                    }

                                    // Group 2: Meal Types (as requested: "like if it is breakfast so [remove] diner")
                                    const mealGroup = ["Breakfast", "Lunch", "Dinner"];
                                    if (mealGroup.includes(suggestedTag)) {
                                        newTags = newTags.filter(t => !mealGroup.includes(t));
                                    }

                                    setTags([...newTags, suggestedTag]);
                                }
                            }}
                            style={{
                                backgroundColor: isSelected ? colors.primary : colors.card,
                                borderWidth: 1,
                                borderColor: isSelected ? colors.primary : colors.border,
                                paddingHorizontal: 12,
                                paddingVertical: 6,
                                borderRadius: radius.full
                            }}
                        >
                            <Text style={{
                                color: isSelected ? colors.primaryForeground : colors.mutedForeground,
                                fontWeight: '600',
                                fontSize: 12
                            }}>
                                {suggestedTag}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {tags.map(tag => (
                    <TouchableOpacity key={tag} onPress={() => handleRemoveTag(tag)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '20', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full }}>
                        <Text style={{ color: colors.primary, fontWeight: '600', marginRight: 4 }}>{tag}</Text>
                        <AppIcon name="x" size={14} color={colors.primary} />
                    </TouchableOpacity>
                ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
                <TextInput
                    style={[styles.input, { flex: 1, backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                    placeholder="Add tag (e.g., Vegetarian)"
                    placeholderTextColor={colors.mutedForeground}
                    value={tagInput}
                    onChangeText={setTagInput}
                />
                <TouchableOpacity style={[styles.tagAddBtn, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: radius.md }]} onPress={handleAddTag}>
                    <AppIcon name="plus" size={20} color={colors.foreground} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderImageTab = () => (
        <View style={styles.formContainer}>
            <Text style={[styles.label, { color: colors.foreground }]}>Recipe Name *</Text>
            <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                placeholder="e.g., Grandma's Apple Pie"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
            />
            <Text style={[styles.label, { marginTop: 16, color: colors.foreground }]}>Upload Recipe Images</Text>

            <TouchableOpacity
                style={[styles.uploadArea, { borderColor: colors.border, backgroundColor: colors.background, borderRadius: radius.xl }]}
                onPress={handleImageUpload}
            >
                <View style={[styles.uploadIconCircle, { backgroundColor: images.length > 0 ? colors.success + '20' : colors.primary + '20', borderRadius: radius.full }]}>
                    <AppIcon name={images.length > 0 ? "check" : "download"} size={24} color={images.length > 0 ? colors.success : colors.primary} />
                </View>
                <Text style={[styles.uploadTextMain, { color: colors.foreground }]}>{images.length > 0 ? `${images.length} Images Selected` : "Click to upload"}</Text>
                <Text style={[styles.uploadTextSub, { color: colors.mutedForeground }]}>JPG, PNG, GIF up to 10MB</Text>
            </TouchableOpacity>

            {/* Image Preview List */}
            {images.length > 0 && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {images.map((img, index) => (
                            <View key={index} style={{ width: 60, height: 60, borderRadius: 8, backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }}>
                                <AppIcon name="image" size={24} color={colors.mutedForeground} />
                                <TouchableOpacity
                                    style={{ position: 'absolute', top: -5, right: -5, backgroundColor: colors.danger, borderRadius: 10, padding: 2 }}
                                    onPress={() => setImages(images.filter((_, i) => i !== index))}
                                >
                                    <AppIcon name="x" size={12} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            )}

            <View style={[styles.tipBox, { backgroundColor: colors.muted, borderRadius: radius.lg, marginTop: 16 }]}>
                <Text style={{ fontSize: 20, marginRight: 12 }}>📸</Text>
                <Text style={[styles.tipText, { color: colors.mutedForeground }]}>Upload photos of handwritten recipes, cookbook pages, or food magazines!</Text>
            </View>
        </View>
    );

    const renderAudioTab = () => (
        <View style={styles.formContainer}>
            <Text style={[styles.label, { color: colors.foreground }]}>Recipe Name *</Text>
            <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                placeholder="e.g., Grandma's Apple Pie"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
            />
            <Text style={[styles.label, { marginTop: 16, color: colors.foreground }]}>Record Your Recipe</Text>

            <View style={[styles.audioArea, { backgroundColor: colors.muted, borderRadius: radius.xl }]}>
                {!audioPath ? (
                    <>
                        <Text style={[styles.timerText, { color: colors.foreground }]}>{formatTime(recordingTime)}</Text>

                        {isRecording && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, marginRight: 6 }} />
                                <Text style={{ color: colors.danger, fontWeight: '600' }}>
                                    {isPaused ? "Paused" : "Recording..."}
                                </Text>
                            </View>
                        )}

                        {!isRecording ? (
                            <TouchableOpacity
                                style={[styles.recordButton, { width: 72, height: 72, backgroundColor: colors.danger, shadowColor: colors.danger, borderRadius: radius.full }]}
                                onPress={handleStartRecording}
                            >
                                <AppIcon name="mic" size={32} color="#fff" />
                            </TouchableOpacity>
                        ) : (
                            <View style={{ flexDirection: 'row', gap: 24, alignItems: 'center' }}>
                                {/* Pause/Resume Button */}
                                <TouchableOpacity
                                    style={[styles.controlBtn, { backgroundColor: '#FFB020', borderRadius: radius.full }]}
                                    onPress={isPaused ? handleResumeRecording : handlePauseRecording}
                                >
                                    <AppIcon name={isPaused ? "play" : "pause"} size={24} color="#fff" />
                                </TouchableOpacity>

                                {/* Stop Button */}
                                <TouchableOpacity
                                    style={[styles.controlBtn, { width: 72, height: 72, backgroundColor: '#2E5C8D', borderRadius: radius.full }]}
                                    onPress={handleStopRecording}
                                >
                                    <AppIcon name="stop" size={24} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={[styles.recordHint, { color: colors.mutedForeground, marginTop: 24 }]}>
                            {isRecording
                                ? "Tap stop to finish recording"
                                : "Tap the mic to start recording your recipe"}
                        </Text>
                    </>
                ) : (
                    // Saved State - Player UI
                    <View style={{ width: '100%', paddingHorizontal: 4 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                <AppIcon name="mic" size={20} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={{ color: colors.foreground, fontWeight: '600', fontSize: 16 }}>Voice Recording</Text>
                                <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>{formatTime(recordingTime)}</Text>
                            </View>
                            <TouchableOpacity onPress={handleDeleteRecording}>
                                <AppIcon name="trash" size={20} color={colors.danger} />
                            </TouchableOpacity>
                        </View>

                        {/* Player Controls */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <TouchableOpacity onPress={() => setIsPlaying(!isPlaying)}>
                                <AppIcon name={isPlaying ? "pause" : "play"} size={24} color={colors.foreground} />
                            </TouchableOpacity>
                            <View style={{ flex: 1, height: 4, backgroundColor: colors.border, borderRadius: 2 }}>
                                <View style={{ width: '40%', height: '100%', backgroundColor: colors.foreground, borderRadius: 2 }} />
                            </View>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                <AppIcon name="moreVertical" size={20} color={colors.mutedForeground} />
                            </View>
                        </View>
                    </View>
                )}
            </View>

            <View style={[styles.tipBox, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
                <Text style={{ fontSize: 20, marginRight: 12 }}>🎙️</Text>
                <Text style={[styles.tipText, { color: colors.mutedForeground }]}>Speak your recipe aloud - ingredients, steps, and tips! Perfect for capturing family recipes passed down verbally.</Text>
            </View>
        </View>
    );

    const renderLinkTab = () => (
        <View style={styles.formContainer}>
            <Text style={[styles.label, { color: colors.foreground }]}>Recipe Name *</Text>
            <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                placeholder="e.g., Grandma's Apple Pie"
                placeholderTextColor={colors.mutedForeground}
                value={name}
                onChangeText={setName}
            />
            <Text style={[styles.label, { marginTop: 16, color: colors.foreground }]}>Paste Recipe URL</Text>
            <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground, borderRadius: radius.md }]}
                placeholder="https://example.com/recipe or YouTube link"
                placeholderTextColor={colors.mutedForeground}
                value={linkUrl}
                onChangeText={setLinkUrl}
            />

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
                <View style={[styles.importCard, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
                    <AppIcon name="globe" size={32} color={colors.primary} style={{ marginBottom: 8 }} />
                    <Text style={[styles.importCardTitle, { color: colors.foreground }]}>Recipe Articles</Text>
                    <Text style={[styles.importCardDesc, { color: colors.mutedForeground }]}>Import from any website</Text>
                </View>
                <View style={[styles.importCard, { backgroundColor: colors.muted, borderRadius: radius.lg }]}>
                    <AppIcon name="youtube" size={32} color={colors.danger} style={{ marginBottom: 8 }} />
                    <Text style={[styles.importCardTitle, { color: colors.foreground }]}>YouTube Videos</Text>
                    <Text style={[styles.importCardDesc, { color: colors.mutedForeground }]}>Save cooking tutorials</Text>
                </View>
            </View>
        </View>
    );

    return (
        <Modal visible={open} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
                <View style={[styles.modalContainer, { backgroundColor: colors.card, borderRadius: radius.xl }]}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.foreground }]}>Add New Recipe</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <AppIcon name="x" size={24} color={colors.foreground} />
                        </TouchableOpacity>
                    </View>

                    {/* Tabs */}
                    {renderTabs()}

                    {/* Content */}
                    <ScrollView contentContainerStyle={styles.contentScroll}>
                        {activeTab === "Text" && renderTextTab()}
                        {activeTab === "Image" && renderImageTab()}
                        {activeTab === "Audio" && renderAudioTab()}
                        {activeTab === "Link" && renderLinkTab()}
                    </ScrollView>

                    {/* Footer */}
                    <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.btnSecondary, { backgroundColor: colors.muted, borderColor: colors.border, borderRadius: radius.lg }]}
                            onPress={() => {
                                Alert.alert(
                                    "Discard Changes?",
                                    "Are you sure you want to discard your changes?",
                                    [
                                        { text: "Keep Editing", style: "cancel" },
                                        {
                                            text: "Discard",
                                            style: "destructive",
                                            onPress: () => {
                                                handleClear();
                                                onClose();
                                            }
                                        }
                                    ]
                                );
                            }}
                        >
                            <Text style={[styles.btnSecondaryText, { color: colors.mutedForeground }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.btnPrimary, { backgroundColor: colors.primary, borderRadius: radius.lg }]}
                            onPress={handleSave}
                        >
                            <Text style={[styles.btnPrimaryText, { color: colors.primaryForeground }]}>Save Recipe</Text>
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
    },
    closeButton: {
        padding: 4,
    },
    tabContainer: {
        flexDirection: "row",
        marginHorizontal: 20,
        borderRadius: 16,
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
    tabText: {
        fontWeight: '600',
        fontSize: 14,
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
        marginBottom: 8,
    },
    input: {
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 15,
        borderWidth: 1,
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
        marginBottom: 6,
    },
    miniInput: {
        borderWidth: 1,
        borderRadius: 12,
        padding: 10,
        fontSize: 14,
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
        borderWidth: 1,
        borderRadius: 12,
        paddingVertical: 12,
        marginTop: 8,
    },
    addButtonText: {
        fontWeight: '600',
    },
    stepBadge: {
        width: 28,
        height: 28,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepText: {
        fontWeight: '700',
    },
    tagAddBtn: {
        width: 48,
        borderWidth: 1,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footer: {
        padding: 20,
        paddingTop: 16,
        flexDirection: 'row',
        gap: 16,
        borderTopWidth: 1,
    },
    btnSecondary: {
        flex: 1,
        borderWidth: 1,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
    },
    btnSecondaryText: {
        fontWeight: '700',
        fontSize: 16,
    },
    btnPrimary: {
        flex: 1,
        borderRadius: 16,
        paddingVertical: 14,
        alignItems: 'center',
    },
    btnPrimaryText: {
        fontWeight: '700',
        fontSize: 16,
    },
    // Image Tab
    uploadArea: {
        height: 200,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    uploadIconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    uploadTextMain: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    uploadTextSub: {
        fontSize: 13,
    },
    tipBox: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
    // Link Tab
    importCard: {
        flex: 1,
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    importCardTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    importCardDesc: {
        fontSize: 11,
        textAlign: 'center',
    },
    // Audio Tab
    audioArea: {
        borderRadius: 24,
        height: 220,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    timerText: {
        fontSize: 40,
        fontWeight: '700',
        marginBottom: 24,
        fontVariant: ['tabular-nums'],
        letterSpacing: 2,
    },
    recordButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    recordHint: {
        fontSize: 14,
    },
    controlBtn: {
        width: 60,
        height: 60,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
});
