import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Pressable,
    Text,
    View,
    StyleSheet,
    Modal,
    TouchableWithoutFeedback,
    ScrollView,
    ViewStyle,
    TextStyle,
} from "react-native";
import { useThemeColors, useThemeRadius } from "../../contexts/ThemeContext";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react-native";

interface SimpleDatePickerProps {
    value: string; // ISO date string YYYY-MM-DD
    onChange: (date: string) => void;
    placeholder?: string;
    buttonStyle?: ViewStyle;
    textStyle?: TextStyle;
    onOpenRequested?: (open: () => void) => void;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const parseLocalDate = (str: string): Date | null => {
    if (!str) return null;
    const parts = str.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    const [year, month, day] = parts;
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
};

const toLocalISO = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const friendlyDate = (str: string, placeholder: string): string => {
    const d = parseLocalDate(str);
    if (!d) return placeholder;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const buildCalendarCells = (year: number, month: number): (number | null)[] => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_LIST = Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - 5 + i); // -5 to +24 from now

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
    const [showYearPicker, setShowYearPicker] = useState(false);

    // Pending selection — only committed to onChange when user taps OK
    const [pendingDate, setPendingDate] = useState<Date | null>(null);
    const [viewYear, setViewYear] = useState<number>(CURRENT_YEAR);
    const [viewMonth, setViewMonth] = useState<number>(new Date().getMonth());

    const yearScrollRef = useRef<ScrollView>(null);

    const openPicker = useCallback(() => {
        const d = parseLocalDate(value) ?? new Date();
        setPendingDate(parseLocalDate(value)); // null if empty → no day highlighted yet
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
        setShowYearPicker(false);
        setShow(true);
    }, [value]);

    const closePicker = () => {
        setShow(false);
        setShowYearPicker(false);
    };

    const handleOk = () => {
        if (pendingDate) {
            onChange(toLocalISO(pendingDate));
        }
        closePicker();
    };

    const handleCancel = () => {
        closePicker();
    };

    useEffect(() => {
        onOpenRequested?.(openPicker);
    }, [onOpenRequested, openPicker]);

    // Scroll year picker to selected year on open
    useEffect(() => {
        if (showYearPicker && yearScrollRef.current) {
            const idx = YEAR_LIST.indexOf(viewYear);
            if (idx >= 0) {
                setTimeout(() => {
                    yearScrollRef.current?.scrollTo({ y: Math.max(0, (idx - 2) * 52), animated: false });
                }, 50);
            }
        }
    }, [showYearPicker, viewYear]);

    const prevMonth = () => {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    };

    const nextMonth = () => {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    };

    const cells = buildCalendarCells(viewYear, viewMonth);
    const today = new Date();

    // Header display values
    const headerYear = pendingDate ? pendingDate.getFullYear() : viewYear;
    const headerLabel = pendingDate
        ? `${DAYS_SHORT[pendingDate.getDay()]}, ${MONTHS_SHORT[pendingDate.getMonth()]} ${pendingDate.getDate()}`
        : "Pick a date";

    return (
        <View>
            {/* Trigger button */}
            <Pressable
                style={[
                    styles.button,
                    { backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md },
                    buttonStyle,
                ]}
                onPress={openPicker}
            >
                <Calendar size={16} color={colors.mutedForeground} style={styles.icon} />
                <Text style={[styles.buttonText, { color: value ? colors.foreground : colors.mutedForeground }, textStyle]}>
                    {friendlyDate(value, placeholder)}
                </Text>
            </Pressable>

            {/* Calendar modal */}
            <Modal transparent visible={show} animationType="fade" onRequestClose={handleCancel}>
                <TouchableWithoutFeedback onPress={handleCancel}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.card, { backgroundColor: colors.card, borderRadius: 4, overflow: "hidden", shadowColor: "#000" }]}>

                                {/* ── Teal header ── */}
                                <View style={[styles.pickerHeader, { backgroundColor: colors.primary }]}>
                                    {/* Tapping year toggles year picker */}
                                    <Pressable onPress={() => setShowYearPicker(v => !v)}>
                                        <Text style={styles.headerYear}>{headerYear}</Text>
                                    </Pressable>
                                    <Text style={styles.headerDate}>{headerLabel}</Text>
                                </View>

                                {showYearPicker ? (
                                    /* ── Year list ── */
                                    <View style={{ flex: 1, minHeight: 280 }}>
                                        <ScrollView ref={yearScrollRef} showsVerticalScrollIndicator={false}>
                                            {YEAR_LIST.map(yr => {
                                                const isActive = yr === viewYear;
                                                return (
                                                    <Pressable
                                                        key={yr}
                                                        style={styles.yearRow}
                                                        onPress={() => {
                                                            setViewYear(yr);
                                                            if (pendingDate) {
                                                                const updated = new Date(pendingDate);
                                                                updated.setFullYear(yr);
                                                                setPendingDate(updated);
                                                            }
                                                            setShowYearPicker(false);
                                                        }}
                                                    >
                                                        <Text style={[
                                                            styles.yearText,
                                                            { color: isActive ? colors.primary : colors.foreground },
                                                            isActive && { fontSize: 26, fontWeight: "700" },
                                                        ]}>
                                                            {yr}
                                                        </Text>
                                                    </Pressable>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>
                                ) : (
                                    /* ── Calendar grid ── */
                                    <View style={styles.calBody}>
                                        {/* Month nav */}
                                        <View style={styles.monthRow}>
                                            <Pressable onPress={prevMonth} hitSlop={12} style={styles.navBtn}>
                                                <ChevronLeft size={20} color={colors.foreground} />
                                            </Pressable>
                                            <Text style={[styles.monthTitle, { color: colors.foreground }]}>
                                                {MONTHS_FULL[viewMonth]} {viewYear}
                                            </Text>
                                            <Pressable onPress={nextMonth} hitSlop={12} style={styles.navBtn}>
                                                <ChevronRight size={20} color={colors.foreground} />
                                            </Pressable>
                                        </View>

                                        {/* Day-of-week labels */}
                                        <View style={styles.dayLabels}>
                                            {DAY_LABELS.map((d, i) => (
                                                <Text key={i} style={[styles.dayLabel, { color: colors.mutedForeground }]}>{d}</Text>
                                            ))}
                                        </View>

                                        {/* Grid */}
                                        <View style={styles.grid}>
                                            {cells.map((day, idx) => {
                                                if (day === null) return <View key={`e-${idx}`} style={styles.cell} />;
                                                const isPending = pendingDate &&
                                                    pendingDate.getFullYear() === viewYear &&
                                                    pendingDate.getMonth() === viewMonth &&
                                                    pendingDate.getDate() === day;
                                                const isTod = today.getFullYear() === viewYear &&
                                                    today.getMonth() === viewMonth &&
                                                    today.getDate() === day;
                                                return (
                                                    <Pressable
                                                        key={`d-${day}`}
                                                        style={styles.cell}
                                                        onPress={() => {
                                                            setPendingDate(new Date(viewYear, viewMonth, day));
                                                        }}
                                                    >
                                                        <View style={[
                                                            styles.dayCircle,
                                                            isPending && { backgroundColor: colors.primary },
                                                            !isPending && isTod && { backgroundColor: colors.primary + "28" },
                                                        ]}>
                                                            <Text style={[
                                                                styles.cellText,
                                                                { color: isPending ? "#fff" : isTod ? colors.primary : colors.foreground },
                                                                isPending && { fontWeight: "700" },
                                                            ]}>
                                                                {day}
                                                            </Text>
                                                        </View>
                                                    </Pressable>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}

                                {/* ── CANCEL / OK buttons ── */}
                                <View style={styles.actions}>
                                    <Pressable onPress={handleCancel} style={styles.actionBtn}>
                                        <Text style={[styles.actionText, { color: colors.foreground }]}>CANCEL</Text>
                                    </Pressable>
                                    <Pressable onPress={handleOk} style={styles.actionBtn}>
                                        <Text style={[styles.actionText, { color: colors.success }]}>OK</Text>
                                    </Pressable>
                                </View>

                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </View>
    );
};

const CELL_SIZE = 36;

const styles = StyleSheet.create({
    button: {
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    icon: { marginRight: 8 },
    buttonText: { flex: 1, fontSize: 14 },

    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.50)",
        justifyContent: "center",
        alignItems: "center",
        padding: 32,
    },
    card: {
        width: "100%",
        maxWidth: 360,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
    },

    /* Header */
    pickerHeader: {
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 16,
    },
    headerYear: {
        color: "rgba(255,255,255,0.75)",
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 4,
    },
    headerDate: {
        color: "#fff",
        fontSize: 28,
        fontWeight: "700",
        letterSpacing: 0.3,
    },

    /* Year picker */
    yearRow: {
        height: 52,
        justifyContent: "center",
        alignItems: "center",
    },
    yearText: {
        fontSize: 18,
        fontWeight: "400",
    },

    /* Calendar */
    calBody: { paddingHorizontal: 12, paddingTop: 8 },
    monthRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    navBtn: { padding: 4 },
    monthTitle: { fontSize: 15, fontWeight: "700" },
    dayLabels: { flexDirection: "row", marginBottom: 2 },
    dayLabel: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600", paddingVertical: 4 },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    // Outer cell takes the full 1/7 width slot; inner circle is fixed size & perfectly centered
    cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: "center", justifyContent: "center" },
    dayCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    cellText: { fontSize: 13, textAlign: "center" },

    /* Actions */
    actions: {
        flexDirection: "row",
        justifyContent: "flex-end",
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 8,
    },
    actionBtn: { paddingHorizontal: 12, paddingVertical: 8 },
    actionText: { fontSize: 14, fontWeight: "700", letterSpacing: 0.5 },
});
