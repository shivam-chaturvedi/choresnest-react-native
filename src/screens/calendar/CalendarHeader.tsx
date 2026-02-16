import React from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { AppIcon } from "../../components/ui/AppIcon";
import { useThemeRadius } from "../../contexts/ThemeContext";
import { styles } from "./styles";

type CalendarHeaderProps = {
  colors: ReturnType<typeof useThemeRadius> extends infer T ? any : any;
  radius: ReturnType<typeof useThemeRadius>;
  activeView: string;
  setActiveView: (view: string) => void;
  selectedDate: Date;
  openSidebar: () => void;
  navigateDate: (direction: number) => void;
  showSearch: boolean;
  setShowSearch: (value: boolean) => void;
  quickAddText: string;
  setQuickAddText: (value: string) => void;
  handleQuickAdd: () => void;
  onAddEvent: () => void;
  formatZoned: (value: Date | undefined, pattern: string) => string;
};

const views = ["Day", "Week", "Month"];

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  colors,
  radius,
  activeView,
  setActiveView,
  selectedDate,
  openSidebar,
  navigateDate,
  showSearch,
  setShowSearch,
  quickAddText,
  setQuickAddText,
  handleQuickAdd,
  onAddEvent,
  formatZoned,
}) => {
  return (
    <View style={[styles.header, { backgroundColor: colors.primary }]}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <Pressable onPress={openSidebar} style={[styles.iconButton, { borderRadius: radius.sm }]}>
            <AppIcon name="menu" size={20} color="#fff" />
          </Pressable>
          {!showSearch && (
            <View style={styles.monthSelector}>
              <Pressable onPress={() => navigateDate(-1)} style={{ padding: 4 }}>
                <AppIcon name="chevronLeft" size={20} color="#fff" />
              </Pressable>
              <Text style={[styles.monthTitle, { marginHorizontal: 8 }]}>{formatZoned(selectedDate, "MMMM yyyy")}</Text>
              <Pressable onPress={() => navigateDate(1)} style={{ padding: 4 }}>
                <AppIcon name="chevronRight" size={20} color="#fff" />
              </Pressable>
            </View>
          )}
        </View>

        <View style={styles.headerRight}>
          {showSearch ? (
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: radius.sm, paddingHorizontal: 8, marginRight: 8 }}>
              <TextInput
                style={{ flex: 1, color: '#fff', height: 40, fontSize: 14 }}
                placeholder="Quick add: 'Task at 2pm'"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={quickAddText}
                onChangeText={setQuickAddText}
                onSubmitEditing={handleQuickAdd}
                autoFocus
              />
              <Pressable onPress={() => setShowSearch(false)}>
                <AppIcon name="x" size={20} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <>
              <Pressable
                onPress={() => setShowSearch(true)}
                style={[styles.iconButton, { borderRadius: radius.sm }]}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <AppIcon name="search" size={20} color="#fff" />
              </Pressable>

              <Pressable
                style={[styles.addBtn, { backgroundColor: "#fff", borderRadius: radius.sm }]}
                onPress={onAddEvent}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <AppIcon name="plus" size={20} color={colors.primary} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      <View style={[styles.segmentContainer, { borderRadius: radius.md }]}>
        {views.map(view => (
          <Pressable
            key={view}
            onPress={() => setActiveView(view)}
            style={[
              styles.segmentBtn,
              { borderRadius: radius.sm },
              activeView === view && [styles.segmentBtnActive, { backgroundColor: "#fff" }]
            ]}
          >
            <Text style={[
              styles.segmentText,
              activeView === view ? { color: colors.primary } : { color: "rgba(255,255,255,0.8)" }
            ]}>{view}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};
