import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Pressable,
    TouchableWithoutFeedback,
    ScrollView,
} from "react-native";
import { X, Filter } from "lucide-react-native";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { DateTimePicker } from "../ui/SimpleDatePicker";
import { IconGlyph } from "../ui/IconGlyph";

export interface FilterOptions {
    categories: string[];
    dateFrom: string;
    dateTo: string;
    expiryStatus: string[];
}

interface FilterModalProps {
    visible: boolean;
    onClose: () => void;
    onApply: (filters: FilterOptions) => void;
    currentFilters: FilterOptions;
}

const CATEGORIES = [
    { id: 'warranty', name: 'Warranty', icon: 'shield-check' },
    { id: 'bill', name: 'Bill', icon: 'file-document-outline' },
    { id: 'insurance', name: 'Insurance', icon: 'shield-account' },
    { id: 'service', name: 'Service', icon: 'tools' },
    { id: 'certificate', name: 'Certificate', icon: 'certificate' },
    { id: 'receipt', name: 'Receipt', icon: 'receipt' },
    { id: 'other', name: 'Other', icon: 'dots-horizontal' },
];

const EXPIRY_STATUS = [
    { id: 'expired', name: 'Expired', color: '#ef4444' },
    { id: 'expiring_soon', name: 'Expiring Soon (15 days)', color: '#f59e0b' },
    { id: 'valid', name: 'Valid', color: '#10b981' },
];

export const FilterModal: React.FC<FilterModalProps> = ({
    visible,
    onClose,
    onApply,
    currentFilters,
}) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();

    const [selectedCategories, setSelectedCategories] = useState<string[]>(currentFilters.categories);
    const [dateFrom, setDateFrom] = useState(currentFilters.dateFrom);
    const [dateTo, setDateTo] = useState(currentFilters.dateTo);
    const [selectedExpiryStatus, setSelectedExpiryStatus] = useState<string[]>(currentFilters.expiryStatus);

    const toggleCategory = (categoryId: string) => {
        setSelectedCategories(prev =>
            prev.includes(categoryId)
                ? prev.filter(id => id !== categoryId)
                : [...prev, categoryId]
        );
    };

    const toggleExpiryStatus = (statusId: string) => {
        setSelectedExpiryStatus(prev =>
            prev.includes(statusId)
                ? prev.filter(id => id !== statusId)
                : [...prev, statusId]
        );
    };

    const handleApply = () => {
        onApply({
            categories: selectedCategories,
            dateFrom,
            dateTo,
            expiryStatus: selectedExpiryStatus,
        });
        onClose();
    };

    const handleClear = () => {
        setSelectedCategories([]);
        setDateFrom('');
        setDateTo('');
        setSelectedExpiryStatus([]);
    };

    const activeFilterCount =
        selectedCategories.length +
        (dateFrom ? 1 : 0) +
        (dateTo ? 1 : 0) +
        selectedExpiryStatus.length;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.overlay} />
                </TouchableWithoutFeedback>

                <View style={[styles.contentContainer, { backgroundColor: colors.card, borderRadius: radius.card }]}>
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <Filter size={20} color={colors.primary} />
                            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                                Advanced Filters
                            </Text>
                            {activeFilterCount > 0 && (
                                <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                                    <Text style={[styles.badgeText, { color: colors.primaryForeground }]}>
                                        {activeFilterCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <Pressable onPress={onClose} hitSlop={8}>
                            <X size={20} color={colors.mutedForeground} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                        {/* Categories */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Categories</Text>
                            <View style={styles.categoryGrid}>
                                {CATEGORIES.map(cat => (
                                    <Pressable
                                        key={cat.id}
                                        style={[
                                            styles.categoryChip,
                                            {
                                                backgroundColor: selectedCategories.includes(cat.id) ? colors.primary : colors.background,
                                                borderColor: selectedCategories.includes(cat.id) ? colors.primary : colors.border,
                                                borderRadius: radius.md,
                                            }
                                        ]}
                                        onPress={() => toggleCategory(cat.id)}
                                    >
                                        <IconGlyph
                                            icon={cat.icon}
                                            size={18}
                                            color={selectedCategories.includes(cat.id) ? colors.primaryForeground : colors.foreground}
                                            style={{ marginRight: 4 }}
                                        />
                                        <Text style={[
                                            styles.categoryChipText,
                                            { color: selectedCategories.includes(cat.id) ? colors.primaryForeground : colors.foreground }
                                        ]}>
                                            {cat.name}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Date Range */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Date Range</Text>
                            <View style={styles.dateRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { color: colors.mutedForeground }]}>From</Text>
                                    <DateTimePicker
                                        value={dateFrom}
                                        onChange={setDateFrom}
                                        placeholder="Start date"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.label, { color: colors.mutedForeground }]}>To</Text>
                                    <DateTimePicker
                                        value={dateTo}
                                        onChange={setDateTo}
                                        placeholder="End date"
                                    />
                                </View>
                            </View>
                        </View>

                        {/* Expiry Status */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Expiry Status</Text>
                            <View style={styles.statusList}>
                                {EXPIRY_STATUS.map(status => (
                                    <Pressable
                                        key={status.id}
                                        style={[
                                            styles.statusChip,
                                            {
                                                backgroundColor: selectedExpiryStatus.includes(status.id) ? status.color + '20' : colors.background,
                                                borderColor: selectedExpiryStatus.includes(status.id) ? status.color : colors.border,
                                                borderRadius: radius.md,
                                            }
                                        ]}
                                        onPress={() => toggleExpiryStatus(status.id)}
                                    >
                                        <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                                        <Text style={[
                                            styles.statusText,
                                            { color: selectedExpiryStatus.includes(status.id) ? status.color : colors.foreground }
                                        ]}>
                                            {status.name}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <Pressable
                            style={[styles.clearButton, { backgroundColor: colors.muted, borderRadius: radius.md }]}
                            onPress={handleClear}
                        >
                            <Text style={[styles.clearButtonText, { color: colors.foreground }]}>Clear All</Text>
                        </Pressable>
                        <Pressable
                            style={[styles.applyButton, { backgroundColor: colors.primary, borderRadius: radius.md }]}
                            onPress={handleApply}
                        >
                            <Text style={[styles.applyButtonText, { color: colors.primaryForeground }]}>Apply Filters</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        justifyContent: "flex-end",
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    contentContainer: {
        maxHeight: '85%',
        paddingTop: 24,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "700",
    },
    badge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    scrollContainer: {
        maxHeight: 500,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    categoryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
    },
    categoryChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
    dateRow: {
        flexDirection: 'row',
        gap: 12,
    },
    label: {
        fontSize: 12,
        marginBottom: 6,
    },
    statusList: {
        gap: 10,
    },
    statusChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10,
    },
    statusText: {
        fontSize: 14,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    clearButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
    },
    clearButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    applyButton: {
        flex: 2,
        paddingVertical: 14,
        alignItems: 'center',
    },
    applyButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
