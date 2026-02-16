import React, { useRef } from "react";
import { View, Text, Pressable, Dimensions, Animated } from "react-native";
import { PanGestureHandler, State, PanGestureHandlerStateChangeEvent } from "react-native-gesture-handler";
import ReactNativeHapticFeedback from "react-native-haptic-feedback";
import { PROFILE_COLORS } from "../../constants/profileColors";
import { parseDateTimeInZone, safeFormatInTimeZone } from "../../utils/SafeDateUtils";

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

type DraggableEventProps = {
  event: any;
  dayIndex: number;
  dayColumnWidth: number;
  HOUR_HEIGHT: number;
  isOwner: boolean;
  colors: any;
  members: any[];
  activeView: string;
  timeZone: string;
  onUpdate: (id: string, updates: any) => void;
  onPress: (event: any) => void;
  onPermissionDenied: (type: 'event' | 'task') => void;
};

export const DraggableEvent: React.FC<DraggableEventProps> = ({
  event,
  dayIndex,
  dayColumnWidth,
  HOUR_HEIGHT,
  isOwner,
  colors,
  members,
  activeView,
  timeZone,
  onUpdate,
  onPress,
  onPermissionDenied,
}) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const resizeY = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const member = members.find((m: any) => m.id === event.memberId);
  const profileColor = PROFILE_COLORS.find((c: any) => c.value === member?.color);
  const bgColor = profileColor ? profileColor.hex + "40" : colors.primary + "40";
  const borderColor = profileColor ? profileColor.hex : colors.primary;

  const eventWidth = dayColumnWidth / event.totalCols;
  const eventLeft = (dayIndex * dayColumnWidth) + (event.colIndex * eventWidth);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY, translationX: translateX } }],
    { useNativeDriver: false }
  );

  const onResizeEvent = Animated.event(
    [{ nativeEvent: { translationY: resizeY } }],
    { useNativeDriver: false }
  );

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const onHandlerStateChangeBegan = (eventData: PanGestureHandlerStateChangeEvent) => {
    if (eventData.nativeEvent.state === State.BEGAN && !isOwner) {
      ReactNativeHapticFeedback.trigger("notificationError", hapticOptions);
      triggerShake();
      onPermissionDenied(event.type || 'event');
      return true;
    }
    return false;
  };

  const onHandlerStateChange = (eventData: PanGestureHandlerStateChangeEvent) => {
    try {
      if (!isOwner && eventData.nativeEvent.state === State.END) {
        translateY.setValue(0);
        translateX.setValue(0);
        return;
      }

      if (eventData.nativeEvent.state === State.END) {
        const deltaY = eventData.nativeEvent.translationY;
        const deltaX = eventData.nativeEvent.translationX;

        const totalY = event.top + deltaY;
        let newDate = event.date;

        if (activeView === "Week") {
          const colShift = Math.round(deltaX / (Dimensions.get('window').width / 3));
          if (colShift !== 0) {
            const eventTimeZone = event.timeZone || timeZone;
            const currentZoned = parseDateTimeInZone(event.date, eventTimeZone) || new Date();
            currentZoned.setDate(currentZoned.getDate() + colShift);
            newDate = safeFormatInTimeZone(currentZoned, eventTimeZone, "yyyy-MM-dd");
          }
        }

        const totalMinutes = (totalY / HOUR_HEIGHT) * 60;
        const snappedMinutes = Math.round(totalMinutes / 15) * 15;

        const hours = Math.floor(snappedMinutes / 60);
        const minutes = snappedMinutes % 60;

        if (hours >= 0 && hours < 24) {
          const period = hours >= 12 ? "PM" : "AM";
          const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
          const formattedTime = `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;

          const durationMatch = event.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
          const endMatch = event.endTime?.match(/(\d+):(\d+)\s*(AM|PM)/i);

          if (durationMatch && endMatch) {
            let startH = parseInt(durationMatch[1]);
            if (durationMatch[3].toUpperCase() === "PM" && startH !== 12) startH += 12;
            if (durationMatch[3].toUpperCase() === "AM" && startH === 12) startH = 0;
            const startM = (startH * 60) + parseInt(durationMatch[2]);

            let endH = parseInt(endMatch[1]);
            if (endMatch[3].toUpperCase() === "PM" && endH !== 12) endH += 12;
            if (endMatch[3].toUpperCase() === "AM" && endH === 12) endH = 0;
            const endM = (endH * 60) + parseInt(endMatch[2]);

            const duration = endM - startM;
            const newEndM = snappedMinutes + duration;

            const eHours = Math.floor(newEndM / 60);
            const eMinutes = newEndM % 60;
            const ePeriod = eHours >= 12 ? "PM" : "AM";
            const eDisplayHours = eHours === 0 ? 12 : eHours > 24 ? (eHours % 24) : eHours > 12 ? eHours - 12 : eHours;
            const formattedEndTime = `${eDisplayHours}:${eMinutes.toString().padStart(2, '0')} ${ePeriod}`;

            onUpdate(event.id, { date: newDate, time: formattedTime, endTime: formattedEndTime });
          } else {
            onUpdate(event.id, { date: newDate, time: formattedTime });
          }
        }

        translateY.setValue(0);
        translateX.setValue(0);
      }
    } catch (error) {
      console.error("Error in onHandlerStateChange (drag):", error);
      translateY.setValue(0);
      translateX.setValue(0);
    }
  };

  const onResizeStateChange = (eventData: PanGestureHandlerStateChangeEvent) => {
    if (eventData.nativeEvent.state === State.END) {
      const deltaY = eventData.nativeEvent.translationY;
      const newHeight = Math.max(25, event.height + deltaY);

      const durationMins = (newHeight / HOUR_HEIGHT) * 60;
      const snappedDuration = Math.round(durationMins / 15) * 15;

      const durationMatch = event.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (durationMatch) {
        let startH = parseInt(durationMatch[1]);
        if (durationMatch[3].toUpperCase() === "PM" && startH !== 12) startH += 12;
        if (durationMatch[3].toUpperCase() === "AM" && startH === 12) startH = 0;
        const startM = (startH * 60) + parseInt(durationMatch[2]);

        const newEndM = startM + snappedDuration;
        const eHours = Math.floor(newEndM / 60);
        const eMinutes = newEndM % 60;
        const ePeriod = eHours >= 12 ? "PM" : "AM";
        const eDisplayHours = eHours === 0 ? 12 : eHours > 24 ? (eHours % 24) : eHours > 12 ? eHours - 12 : eHours;
        const formattedEndTime = `${eDisplayHours}:${eMinutes.toString().padStart(2, '0')} ${ePeriod}`;

        onUpdate(event.id, { endTime: formattedEndTime });
      }

      resizeY.setValue(0);
    }
  };

  const isRightMost = event.colIndex === event.totalCols - 1;

  return (
    <View style={{
      position: 'absolute',
      top: event.top,
      left: `${eventLeft}%`,
      width: `${eventWidth}%`,
      height: event.height,
      zIndex: 10,
      paddingHorizontal: 1,
      paddingRight: isRightMost ? 1 : 1,
    }}>
      <PanGestureHandler
        enabled={true}
        onGestureEvent={isOwner ? onGestureEvent : undefined}
        onHandlerStateChange={(e) => {
          onHandlerStateChangeBegan(e);
          if (isOwner) {
            onHandlerStateChange(e);
          }
        }}
        activeOffsetX={[-10, 10]}
        activeOffsetY={[-10, 10]}
      >
        <Animated.View
          style={{
            flex: 1,
            backgroundColor: bgColor,
            borderLeftWidth: 4,
            borderLeftColor: borderColor,
            borderWidth: 1.5,
            borderColor: "#000000",
            borderRadius: 6,
            padding: 4,
            overflow: 'hidden',
            elevation: 3,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 2,
            transform: [
              { translateY: translateY },
              { translateX: Animated.add(translateX, shakeAnim) }
            ]
          }}
        >
          <Pressable
            style={{ flex: 1 }}
            onPress={() => onPress(event)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: event.type === 'task' ? '#ef4444' : '#8b5cf6' }}>
                {event.type === 'task' ? 'TASK' : 'EVENT'}
              </Text>
              <Text style={{ fontSize: 10 }}>{event.icon}</Text>
              <Text numberOfLines={1} style={{ fontSize: 10, fontWeight: '700', color: colors.foreground, flex: 1 }}>
                {event.title}
              </Text>
            </View>
            {event.totalCols < 3 && (
              <Text numberOfLines={1} style={{ fontSize: 9, color: colors.mutedForeground, marginTop: 2 }}>
                {member?.name}
              </Text>
            )}
          </Pressable>
        </Animated.View>
      </PanGestureHandler>

      {isOwner && (
        <PanGestureHandler
          onGestureEvent={onResizeEvent}
          onHandlerStateChange={onResizeStateChange}
        >
          <Animated.View
            style={{
              position: 'absolute',
              bottom: -5,
              left: 0,
              right: 0,
              height: 20,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 20,
              transform: [{ translateY: resizeY }]
            }}
          >
            <View style={{ width: 30, height: 4, borderRadius: 2, backgroundColor: '#00000040' }} />
          </Animated.View>
        </PanGestureHandler>
      )}
    </View>
  );
};
