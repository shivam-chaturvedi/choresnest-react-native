import React, { useState } from "react";
import { Pressable, Text, View, StyleSheet, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { theme } from "../../theme";
import { AppIcon } from "./AppIcon";

interface DateTimePickerProps {
    mode: "date" | "time";
    value: Date;
    onChange: (date: Date) => void;
    label?: string;
    placeholder?: string;
    minimumDate?: Date;
    maximumDate?: Date;
    disabled?: boolean;
}

export const CustomDateTimePicker: React.FC<DateTimePickerProps> = ({
    mode,
    value,
    onChange,
    label,
    placeholder,
    minimumDate,
    maximumDate,
    disabled,
}) => {
    const [show, setShow] = useState(false);

    const handleChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === "android") {
            setShow(false);
        }
        if (selectedDate) {
            onChange(selectedDate);
        }
    };

    const formatDate = (date: Date): string => {
        if (mode === "date") {
            return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } else {
            return date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
            });
        }
    };

    const onPress = () => {
        setShow(true);
    };

    const onDismiss = () => {
        setShow(false);
    };

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <Pressable
                style={[styles.button, disabled && { opacity: 0.5 }]}
                onPress={() => !disabled && onPress()}
            >
                <AppIcon
                    name={mode === "date" ? "calendar" : "clock"}
                    size={16}
                    color={theme.colors.mutedForeground}
                    style={styles.icon}
                />
                <Text style={styles.buttonText}>
                    {value ? formatDate(value) : placeholder || "Select"}
                </Text>
                <AppIcon
                    name="chevronDown"
                    size={16}
                    color={theme.colors.mutedForeground}
                />
            </Pressable>

            {show && (
                <DateTimePicker
                    value={value}
                    mode={mode}
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleChange}
                    minimumDate={minimumDate}
                    maximumDate={maximumDate}
                    {...(Platform.OS === "ios" && {
                        onTouchCancel: onDismiss,
                    })}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    label: {
        fontSize: 12,
        color: theme.colors.mutedForeground,
        marginBottom: 4,
    },
    button: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.03)",
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    icon: {
        marginRight: 4,
    },
    buttonText: {
        flex: 1,
        fontSize: 16,
        color: theme.colors.foreground,
    },
});
