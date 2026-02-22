import React, { useCallback, useEffect, useState, useMemo } from "react";
import { Pressable, Text, View, StyleSheet, Platform, ViewStyle, TextStyle } from "react-native";
import RNDateTimePicker from "@react-native-community/datetimepicker";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { Calendar } from "lucide-react-native";

interface SimpleDatePickerProps {
    value: string; // ISO date string YYYY-MM-DD
    onChange: (date: string) => void;
    placeholder?: string;
    buttonStyle?: ViewStyle;
    textStyle?: TextStyle;
    onOpenRequested?: (open: () => void) => void;
}

export const DateTimePicker: React.FC<SimpleDatePickerProps> = ({
    value,
    onChange,
    placeholder = "Select date",
    buttonStyle,
    textStyle,
    onOpenRequested,
}) => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const [show, setShow] = useState(false);
    const openPicker = useCallback(() => {
        setShow(true);
    }, []);

    const dateValue = useMemo(() => value ? new Date(value) : new Date(), [value]);

    const handleChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === "android") {
            // Only hide the picker and fire onChange if the user actually pressed OK
            // event.type is 'set' for OK, 'dismissed' for Cancel.
            // When navigating months/years, it doesn't trigger these types in the same way.
            if (event.type === "set") {
                setShow(false);
                if (selectedDate) {
                    const isoDate = selectedDate.toISOString().split('T')[0];
                    onChange(isoDate);
                }
            } else if (event.type === "dismissed") {
                setShow(false);
            }
        } else {
            // iOS handles it differently (usually spinner mode)
            if (selectedDate) {
                const isoDate = selectedDate.toISOString().split('T')[0];
                onChange(isoDate);
            }
        }
    };

    const formatDate = (dateStr: string): string => {
        if (!dateStr) return placeholder;
        const date = new Date(dateStr);
        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    useEffect(() => {
        onOpenRequested?.(openPicker);
    }, [onOpenRequested, openPicker]);

    return (
        <View>
            <Pressable
                style={[
                    styles.button,
                    { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md },
                    buttonStyle,
                ]}
                onPress={openPicker}
            >
                <Calendar size={16} color={colors.mutedForeground} style={styles.icon} />
                <Text style={[
                    styles.buttonText,
                    { color: value ? colors.foreground : colors.mutedForeground },
                    textStyle,
                ]}>
                    {value ? formatDate(value) : placeholder}
                </Text>
            </Pressable>

            {show && (
                <RNDateTimePicker
                    value={dateValue}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleChange}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    icon: {
        marginRight: 8,
    },
    buttonText: {
        flex: 1,
        fontSize: 14,
    },
});
