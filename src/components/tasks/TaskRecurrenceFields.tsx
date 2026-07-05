import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useThemeColors, useThemeRadius } from '../../contexts/ThemeContext';
import { AppIcon, CustomDateTimePicker } from '../ui';
import { TaskRecurrenceRule } from '../../utils/taskRecurrence';
import { TaskRecurrenceFormValue } from '../../utils/taskFormUtils';

const recurrenceOptions: Array<{ label: string; value: TaskRecurrenceRule }> = [
  { label: 'Daily', value: 'daily' },
  { label: 'Weekdays', value: 'weekdays' },
  { label: 'Weekends', value: 'weekends' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Every X Days', value: 'every_x_days' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
  { label: 'Custom Days', value: 'custom_days' },
];

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

type TaskRecurrenceFieldsProps = {
  value: TaskRecurrenceFormValue;
  onChange: (value: TaskRecurrenceFormValue) => void;
  dueDate: Date;
  disabled?: boolean;
  sectionStyle?: object;
};

export const TaskRecurrenceFields: React.FC<TaskRecurrenceFieldsProps> = ({
  value,
  onChange,
  dueDate,
  disabled = false,
  sectionStyle,
}) => {
  const colors = useThemeColors();
  const radius = useThemeRadius();

  const toggleWeekday = (dayIndex: number) => {
    if (disabled) return;
    const nextDays = value.recurrenceDaysOfWeek?.includes(dayIndex)
      ? (value.recurrenceDaysOfWeek ?? []).filter(day => day !== dayIndex)
      : [...(value.recurrenceDaysOfWeek ?? []), dayIndex].sort((a, b) => a - b);
    onChange({ ...value, recurrenceDaysOfWeek: nextDays });
  };

  return (
    <View style={[styles.section, sectionStyle]}>
      <View style={styles.labelRow}>
        <AppIcon name="repeat" size={16} color={colors.mutedForeground} />
        <Text style={[styles.label, { color: colors.mutedForeground }]}>Recurring</Text>
      </View>

      <Pressable
        disabled={disabled}
        onPress={() => onChange({ ...value, isRecurring: !value.isRecurring })}
        style={[
          styles.toggleRow,
          { backgroundColor: colors.muted, borderRadius: radius.md },
          value.isRecurring && { backgroundColor: colors.primary + '18' },
          disabled && { opacity: 0.6 },
        ]}
      >
        <Text style={[styles.toggleLabel, { color: colors.foreground }]}>
          {value.isRecurring ? 'Recurring task enabled' : 'One-time task'}
        </Text>
        <View
          style={[
            styles.togglePill,
            { backgroundColor: value.isRecurring ? colors.primary : colors.border },
          ]}
        />
      </Pressable>

      {value.isRecurring && (
        <>
          <View style={styles.recurrenceOptions}>
            {recurrenceOptions.map(option => {
              const selected = value.recurrenceRule === option.value;
              return (
                <Pressable
                  key={option.value}
                  disabled={disabled}
                  onPress={() =>
                    onChange({
                      ...value,
                      recurrenceRule: option.value,
                      recurrenceDaysOfWeek:
                        option.value === 'custom_days'
                          ? value.recurrenceDaysOfWeek?.length
                            ? value.recurrenceDaysOfWeek
                            : [dueDate.getDay()]
                          : [],
                    })
                  }
                  style={[
                    styles.recurrenceChip,
                    { backgroundColor: colors.muted, borderRadius: radius.full },
                    selected && { backgroundColor: colors.primary },
                    disabled && { opacity: 0.6 },
                  ]}
                >
                  <Text
                    style={[
                      styles.recurrenceChipText,
                      { color: selected ? colors.primaryForeground : colors.foreground },
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {value.recurrenceRule === 'every_x_days' && (
            <View style={styles.inlineField}>
              <Text style={[styles.inlineLabel, { color: colors.mutedForeground }]}>
                Repeat every
              </Text>
              <TextInput
                editable={!disabled}
                value={String(value.recurrenceInterval || 1)}
                onChangeText={text =>
                  onChange({
                    ...value,
                    recurrenceInterval: Math.max(
                      1,
                      Number(text.replace(/[^0-9]/g, '')) || 1,
                    ),
                  })
                }
                keyboardType="number-pad"
                style={[
                  styles.intervalInput,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.muted,
                    borderRadius: radius.md,
                  },
                ]}
              />
              <Text style={[styles.inlineLabel, { color: colors.mutedForeground }]}>days</Text>
            </View>
          )}

          {value.recurrenceRule === 'weekly' && (
            <View style={styles.inlineField}>
              <Text style={[styles.inlineLabel, { color: colors.mutedForeground }]}>Every</Text>
              <TextInput
                editable={!disabled}
                value={String(value.recurrenceInterval || 1)}
                onChangeText={text =>
                  onChange({
                    ...value,
                    recurrenceInterval: Math.max(
                      1,
                      Number(text.replace(/[^0-9]/g, '')) || 1,
                    ),
                  })
                }
                keyboardType="number-pad"
                style={[
                  styles.intervalInput,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.muted,
                    borderRadius: radius.md,
                  },
                ]}
              />
              <Text style={[styles.inlineLabel, { color: colors.mutedForeground }]}>weeks</Text>
            </View>
          )}

          {value.recurrenceRule === 'monthly' && (
            <View style={styles.inlineField}>
              <Text style={[styles.inlineLabel, { color: colors.mutedForeground }]}>Every</Text>
              <TextInput
                editable={!disabled}
                value={String(value.recurrenceInterval || 1)}
                onChangeText={text =>
                  onChange({
                    ...value,
                    recurrenceInterval: Math.max(
                      1,
                      Number(text.replace(/[^0-9]/g, '')) || 1,
                    ),
                  })
                }
                keyboardType="number-pad"
                style={[
                  styles.intervalInput,
                  {
                    color: colors.foreground,
                    backgroundColor: colors.muted,
                    borderRadius: radius.md,
                  },
                ]}
              />
              <Text style={[styles.inlineLabel, { color: colors.mutedForeground }]}>months</Text>
            </View>
          )}

          {value.recurrenceRule === 'custom_days' && (
            <View style={styles.weekdayRow}>
              {weekdayLabels.map((label, index) => {
                const selected = value.recurrenceDaysOfWeek?.includes(index) ?? false;
                return (
                  <Pressable
                    key={`${label}-${index}`}
                    disabled={disabled}
                    onPress={() => toggleWeekday(index)}
                    style={[
                      styles.weekdayButton,
                      { backgroundColor: colors.muted, borderRadius: radius.full },
                      selected && { backgroundColor: colors.primary },
                      disabled && { opacity: 0.6 },
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekdayButtonText,
                        { color: selected ? colors.primaryForeground : colors.foreground },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={{ marginTop: 14 }}>
            <CustomDateTimePicker
              mode="date"
              value={value.recurrenceEndDate || dueDate}
              onChange={date => onChange({ ...value, recurrenceEndDate: date })}
              label="Ends on (optional)"
              disabled={disabled}
            />
            {value.recurrenceEndDate && !disabled && (
              <Pressable
                onPress={() => onChange({ ...value, recurrenceEndDate: null })}
                style={styles.clearRecurrenceEnd}
              >
                <Text style={[styles.clearRecurrenceEndText, { color: colors.primary }]}>
                  Clear end date
                </Text>
              </Pressable>
            )}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 12,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  togglePill: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  recurrenceOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  recurrenceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  recurrenceChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inlineField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  inlineLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  intervalInput: {
    minWidth: 56,
    paddingHorizontal: 12,
    paddingVertical: 8,
    textAlign: 'center',
    fontWeight: '700',
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekdayButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  clearRecurrenceEnd: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  clearRecurrenceEndText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
