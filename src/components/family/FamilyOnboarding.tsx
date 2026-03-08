import React, { useMemo, useState, useRef } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { useFamily, FamilyMember } from '../../contexts/FamilyContext';
import { useAuth } from '../../contexts/AuthContext';
import { AppIcon } from '../ui/AppIcon';
import { MemberIcon } from '../ui/MemberIcon';
import {
  useThemeColors,
  useThemeRadius,
  useTheme,
} from '../../contexts/ThemeContext';
import { PROFILE_COLORS } from '../../constants/profileColors';
import {
  MEMBER_ICON_OPTIONS,
  DEFAULT_MEMBER_ICON,
} from '../../constants/memberIcons';
import { useCountry } from '../../contexts/CountryContext';
import { listCountries, CountryConfiguration } from '../../config/countries';
import { AppSettingsService } from '../../services/AppSettingsService';

const permissionOptions = [
  {
    id: 'calendar',
    label: 'Calendar',
    icon: 'calendar' as const,
    description: 'View and add events',
  },
  {
    id: 'grocery',
    label: 'Grocery List',
    icon: 'shoppingCart' as const,
    description: 'Add and check items',
  },
  {
    id: 'mealplan',
    label: 'Meal Planning',
    icon: 'utensils' as const,
    description: 'Plan and view meals',
  },
  {
    id: 'vault',
    label: 'Document Vault',
    icon: 'file' as const,
    description: 'Access family documents',
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: 'bell' as const,
    description: 'Receive alerts',
  },
];

interface FamilyOnboardingProps {
  open: boolean;
  onClose: () => void;
}

interface NewMember {
  id?: string;
  name: string;
  avatar: string;
  color: string;
}

export const FamilyOnboarding: React.FC<FamilyOnboardingProps> = ({
  open,
  onClose,
}) => {
  const {
    members,
    addMember,
    updateMember,
    removeMember,
    setFamilyName,
    familyName,
  } = useFamily();
  const { completeOnboarding } = useAuth();
  const { currentCountry, setCountry } = useCountry();
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { appearanceMode } = useTheme();
  const isMidnight = appearanceMode === 'midnight';
  const accentColor = isMidnight ? colors.foreground : colors.primary;

  const [step, setStep] = useState(1);
  const [newFamilyName, setNewFamilyName] = useState(familyName || '');
  const [localMembers, setLocalMembers] = useState<NewMember[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const [currentMember, setCurrentMember] = useState<NewMember>({
    name: '',
    avatar: DEFAULT_MEMBER_ICON,
    color: PROFILE_COLORS[0].value,
  });
  const countries = listCountries();
  const [selectedCountryCode, setSelectedCountryCode] = useState(
    currentCountry.code,
  );
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const selectedCountry =
    countries.find(country => country.code === selectedCountryCode) ??
    currentCountry;
  const normalizedSearch = countrySearch.trim().toLowerCase();
  const filteredCountries = useMemo(() => {
    if (!normalizedSearch) {
      return countries;
    }
    return countries.filter(country => {
      const searchable =
        `${country.name} ${country.code} ${country.locale} ${country.timeZone}`.toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [countries, normalizedSearch]);

  // Initialize localMembers from context when modal opens
  React.useEffect(() => {
    if (open) {
      setLocalMembers(
        members.map((m: any) => ({
          id: m.id,
          name: m.name,
          avatar: m.symbol || DEFAULT_MEMBER_ICON,
          color: m.color,
        })),
      );
      setNewFamilyName(familyName);
      setStep(1);
      setSelectedCountryCode(currentCountry.code);
    }
  }, [open, members, familyName, currentCountry.code]);

  React.useEffect(() => {
    if (!open) {
      setCountryDropdownOpen(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!countryDropdownOpen) {
      setCountrySearch('');
    }
  }, [countryDropdownOpen]);

  const usedColors = localMembers.map((m: any) => m.color);

  React.useEffect(() => {
    setCountry(selectedCountryCode).catch(error =>
      console.warn('Failed to update country during onboarding:', error),
    );
  }, [selectedCountryCode, setCountry]);

  // Auto-select first available color
  React.useEffect(() => {
    if (editingIndex === null) {
      const available = PROFILE_COLORS.find(c => !usedColors.includes(c.value));
      if (
        available &&
        currentMember.color !== available.value &&
        !currentMember.name
      ) {
        setCurrentMember(prev => ({ ...prev, color: available.value }));
      }
    }
  }, [localMembers, editingIndex]);

  const showDuplicateNameAlert = () => {
    Alert.alert(
      'Duplicate name',
      'Another member with that name already exists. Please choose a different name.',
    );
  };

  const handleAddOrUpdateMember = () => {
    const trimmedName = currentMember.name.trim();
    if (!trimmedName) {
      Alert.alert('Missing name', 'Please enter a name before saving.');
      return;
    }

    const hasDuplicate = localMembers.some(
      (member, index) =>
        index !== editingIndex &&
        member.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );

    if (hasDuplicate) {
      showDuplicateNameAlert();
      return;
    }

    if (editingIndex !== null) {
      const updated = [...localMembers];
      updated[editingIndex] = currentMember;
      setLocalMembers(updated);
      setEditingIndex(null);
    } else {
      setLocalMembers([...localMembers, currentMember]);
    }

    setCurrentMember({
      name: '',
      avatar: DEFAULT_MEMBER_ICON,
      color:
        PROFILE_COLORS.find(c => !localMembers.some(lm => lm.color === c.value))
          ?.value || PROFILE_COLORS[0].value,
    });
  };

  const handleEditMember = (index: number) => {
    setEditingIndex(index);
    const member = localMembers[index];
    setCurrentMember({
      name: member.name,
      avatar: member.avatar || DEFAULT_MEMBER_ICON,
      color: member.color,
    });
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  const handleDeleteMember = (index: number) => {
    const member = localMembers[index];
    if (!member) {
      return;
    }

    if (localMembers.length <= 1) {
      Alert.alert(
        'Cannot delete',
        'Every profile requires at least one member. Add another member before removing this one.',
      );
      return;
    }

    Alert.alert(
      'Delete Member',
      `Are you sure you want to remove ${member.name}? This will discard any unsaved changes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setLocalMembers(localMembers.filter((_, i) => i !== index));
            if (editingIndex === index) {
              setEditingIndex(null);
              setCurrentMember({
                name: '',
                avatar: DEFAULT_MEMBER_ICON,
                color: PROFILE_COLORS[0].value,
              });
            }
          },
        },
      ],
    );
  };

  const handleComplete = async () => {
    if (newFamilyName.trim()) {
      setFamilyName(newFamilyName);
    }

    // Apply changes
    // 1. Members to remove (in context but not in local)
    const localIds = new Set(
      localMembers.filter(m => m.id).map((m: any) => m.id),
    );
    members.forEach((m: FamilyMember) => {
      if (!localIds.has(m.id)) removeMember(m.id);
    });

    // 2. Members to update or add
    localMembers.forEach(m => {
      if (m.id) {
        updateMember(m.id, {
          name: m.name,
          symbol: m.avatar,
          color: m.color,
        });
      } else {
        addMember({
          name: m.name,
          symbol: m.avatar,
          color: m.color,
        });
      }
    });

    try {
      await AppSettingsService.completeOnboarding();
    } catch (error) {
      console.error(
        'FamilyOnboarding: failed to persist onboarding flag:',
        error,
      );
    }
    completeOnboarding();
    onClose();
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <AppIcon
              name="users"
              size={24}
              color={accentColor}
              style={{ marginRight: 8 }}
            />
            <Text style={[styles.title, { color: colors.foreground }]}>
              Family Setup
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={[
                styles.subtitle,
                { color: colors.mutedForeground, marginRight: 12 },
              ]}
            >
              Step {step} of 3
            </Text>
            <Pressable onPress={onClose}>
              <AppIcon name="x" size={20} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBar}>
          {[1, 2, 3].map(s => (
            <View
              key={s}
              style={[
                styles.progressSegment,
                { backgroundColor: s <= step ? colors.primary : colors.muted },
              ]}
            />
          ))}
        </View>

        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && (
            <View style={styles.stepContainer}>
              <View
                style={[styles.iconCircle, { backgroundColor: colors.muted }]}
              >
                <AppIcon name="users" size={40} color={accentColor} />
              </View>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Name Your Family
              </Text>
              <Text
                style={[styles.stepDesc, { color: colors.mutedForeground }]}
              >
                This will be displayed at the top of your home screen
              </Text>

              <Text style={[styles.inputLabel, { color: colors.foreground }]}>
                Country / Region
              </Text>
              <Pressable
                onPress={() => setCountryDropdownOpen(prev => !prev)}
                style={[
                  styles.countrySelector,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <View
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <Text style={{ fontSize: 22 }}>{selectedCountry.flag}</Text>
                  <View>
                    <Text
                      style={{ fontWeight: '600', color: colors.foreground }}
                    >
                      {selectedCountry.name}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: colors.mutedForeground }}
                    >
                      {selectedCountry.locale}
                    </Text>
                  </View>
                </View>
                <AppIcon
                  name={countryDropdownOpen ? 'chevronUp' : 'chevronDown'}
                  size={18}
                  color={colors.foreground}
                />
              </Pressable>
              {countryDropdownOpen && (
                <View
                  style={[
                    styles.countryList,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.card,
                      shadowColor: colors.shadow,
                    },
                  ]}
                >
                  <TextInput
                    value={countrySearch}
                    onChangeText={setCountrySearch}
                    placeholder="Search country or region"
                    placeholderTextColor={colors.mutedForeground}
                    style={[
                      styles.countrySearchInput,
                      { borderColor: colors.border, color: colors.foreground },
                    ]}
                    autoCorrect={false}
                    autoCapitalize="words"
                  />
                  <ScrollView
                    nestedScrollEnabled
                    showsVerticalScrollIndicator
                    contentContainerStyle={styles.countryListContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    {filteredCountries.map(country => (
                      <Pressable
                        key={country.code}
                        onPress={() => {
                          setSelectedCountryCode(country.code);
                          setCountryDropdownOpen(false);
                        }}
                        style={[
                          styles.countryItem,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <Text style={{ fontSize: 22 }}>{country.flag}</Text>
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text
                            style={{
                              color: colors.foreground,
                              fontWeight: '600',
                            }}
                          >
                            {country.name}
                          </Text>
                          <Text
                            style={{
                              color: colors.mutedForeground,
                              fontSize: 12,
                            }}
                          >
                            {country.timeZone}
                          </Text>
                        </View>
                        <Text style={{ color: accentColor }}>
                          {country.code}
                        </Text>
                      </Pressable>
                    ))}
                    {filteredCountries.length === 0 && (
                      <Text
                        style={[
                          styles.countryEmptyText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        No countries match your search.
                      </Text>
                    )}
                  </ScrollView>
                </View>
              )}

              <Text style={[styles.inputLabel, { color: colors.foreground }]}>
                Family Name
              </Text>
              <TextInput
                value={newFamilyName}
                onChangeText={setNewFamilyName}
                placeholder="e.g., The Smiths"
                placeholderTextColor={colors.mutedForeground}
                style={[
                  styles.bigInput,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    color: colors.foreground,
                    borderRadius: radius.md,
                  },
                ]}
              />

              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary, borderRadius: radius.md },
                  !newFamilyName.trim() && styles.disabledButton,
                ]}
                onPress={() => setStep(2)}
                disabled={!newFamilyName.trim()}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Continue
                </Text>
                <AppIcon
                  name="arrowRight"
                  size={16}
                  color={colors.primaryForeground}
                  style={{ marginLeft: 8 }}
                />
              </Pressable>
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Manage Family Members
              </Text>
              <Text
                style={[styles.stepDesc, { color: colors.mutedForeground }]}
              >
                Add or edit people in your household
              </Text>

              <View style={{ width: '100%', marginBottom: 24 }}>
                {localMembers.map((member, index) => (
                  <View
                    key={index}
                    style={[
                      styles.memberItem,
                      {
                        backgroundColor: colors.card,
                        borderColor:
                          editingIndex === index
                            ? colors.primary
                            : colors.border,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.memberAvatarSmall,
                        {
                          backgroundColor:
                            PROFILE_COLORS.find(c => c.value === member.color)
                              ?.hex + '20',
                        },
                      ]}
                    >
                      <MemberIcon
                        symbol={member.avatar}
                        size={20}
                        color={colors.foreground}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.memberName,
                          { color: colors.foreground },
                        ]}
                      >
                        {member.name}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center' }}
                      >
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: PROFILE_COLORS.find(
                              c => c.value === member.color,
                            )?.hex,
                            marginRight: 6,
                          }}
                        />
                        <Text
                          style={[
                            styles.memberRole,
                            { color: colors.mutedForeground },
                          ]}
                        >
                          {
                            PROFILE_COLORS.find(c => c.value === member.color)
                              ?.name
                          }
                        </Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Pressable onPress={() => handleEditMember(index)}>
                        <AppIcon name="edit" size={18} color={accentColor} />
                      </Pressable>
                      <Pressable onPress={() => handleDeleteMember(index)}>
                        <AppIcon name="trash" size={18} color={colors.danger} />
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>

              <View
                style={[
                  styles.addMemberForm,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderRadius: radius.card,
                  },
                ]}
              >
                <Text style={[styles.formTitle, { color: colors.foreground }]}>
                  {editingIndex !== null ? 'Edit Member' : 'Add New Member'}
                </Text>

                <TextInput
                  value={currentMember.name}
                  onChangeText={text =>
                    setCurrentMember({ ...currentMember, name: text })
                  }
                  placeholder="Member name"
                  placeholderTextColor={colors.mutedForeground}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.foreground,
                      borderRadius: radius.sm,
                    },
                  ]}
                />

                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  Avatar
                </Text>
                <View style={styles.grid}>
                  {MEMBER_ICON_OPTIONS.map(icon => {
                    const isSelected = currentMember.avatar === icon;
                    return (
                      <Pressable
                        key={icon}
                        onPress={() =>
                          setCurrentMember({ ...currentMember, avatar: icon })
                        }
                        style={[
                          styles.avatarOption,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : colors.muted,
                            borderRadius: radius.xs,
                            borderWidth: isSelected ? 2 : 0,
                            borderColor: isSelected
                              ? colors.primary
                              : 'transparent',
                          },
                        ]}
                      >
                        <AppIcon
                          source={icon}
                          size={24}
                          color={
                            isSelected
                              ? colors.primaryForeground
                              : colors.foreground
                          }
                        />
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                  Profile Color
                </Text>
                <View style={styles.grid}>
                  {PROFILE_COLORS.map(color => {
                    const isTaken =
                      usedColors.includes(color.value) &&
                      (editingIndex === null ||
                        localMembers[editingIndex].color !== color.value);
                    return (
                      <Pressable
                        key={color.id}
                        onPress={() =>
                          !isTaken &&
                          setCurrentMember({
                            ...currentMember,
                            color: color.value,
                          })
                        }
                        style={[
                          styles.colorOption,
                          {
                            backgroundColor: color.hex,
                            borderRadius: radius.xs,
                          },
                          currentMember.color === color.value && {
                            borderWidth: 3,
                            borderColor: colors.foreground,
                          },
                          isTaken && { opacity: 0.1, backgroundColor: '#ccc' },
                        ]}
                      >
                        {isTaken && <AppIcon name="x" size={12} color="#000" />}
                        {currentMember.color === color.value && (
                          <AppIcon name="check" size={14} color="#fff" />
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <Pressable
                  style={[
                    styles.outlineButton,
                    { borderColor: colors.border, borderRadius: radius.sm },
                  ]}
                  onPress={handleAddOrUpdateMember}
                >
                  <Text
                    style={[
                      styles.outlineButtonText,
                      { color: colors.foreground },
                    ]}
                  >
                    {editingIndex !== null ? 'Save Changes' : 'Add Member'}
                  </Text>
                </Pressable>
                {(editingIndex !== null ||
                  currentMember.name.trim() !== '') && (
                  <Pressable
                    style={{ marginTop: 12, alignItems: 'center' }}
                    onPress={() => {
                      setEditingIndex(null);
                      setCurrentMember({
                        name: '',
                        avatar: DEFAULT_MEMBER_ICON,
                        color: PROFILE_COLORS[0].value,
                      });
                    }}
                  >
                    <Text style={{ color: colors.mutedForeground }}>
                      {editingIndex !== null ? 'Cancel Edit' : 'Clear Form'}
                    </Text>
                  </Pressable>
                )}
              </View>

              <View style={styles.row}>
                <Pressable
                  style={[
                    styles.outlineButton,
                    {
                      flex: 1,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                    },
                  ]}
                  onPress={() => setStep(1)}
                >
                  <Text
                    style={[
                      styles.outlineButtonText,
                      { color: colors.foreground },
                    ]}
                  >
                    Back
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.primaryButton,
                    {
                      flex: 1,
                      backgroundColor: colors.primary,
                      borderRadius: radius.md,
                    },
                    localMembers.length === 0 && styles.disabledButton,
                  ]}
                  onPress={() => setStep(3)}
                  disabled={localMembers.length === 0}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    Review
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContainer}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.success + '20' },
                ]}
              >
                <AppIcon name="checkSquare" size={40} color={colors.success} />
              </View>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Review Your Family
              </Text>
              <Text
                style={[styles.stepDesc, { color: colors.mutedForeground }]}
              >
                Everything looks good? Let's get started!
              </Text>

              <View
                style={[
                  styles.reviewCard,
                  {
                    backgroundColor: colors.card,
                    borderRadius: radius.card,
                    width: '100%',
                    padding: 16,
                    marginBottom: 32,
                  },
                ]}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginBottom: 16,
                  }}
                >
                  <AppIcon
                    name="users"
                    size={20}
                    color={accentColor}
                    style={{ marginRight: 8 }}
                  />
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '700',
                      color: colors.foreground,
                    }}
                  >
                    {newFamilyName}
                  </Text>
                </View>
                <View style={[styles.countrySelector, { marginBottom: 16 }]}>
                  <Text style={{ fontSize: 22 }}>{selectedCountry.flag}</Text>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text
                      style={{ color: colors.foreground, fontWeight: '600' }}
                    >
                      {selectedCountry.name}
                    </Text>
                    <Text
                      style={{ color: colors.mutedForeground, fontSize: 12 }}
                    >
                      {selectedCountry.timeZone}
                    </Text>
                  </View>
                  <Text style={{ color: accentColor }}>
                    {selectedCountry.code}
                  </Text>
                </View>
                {localMembers.map((member, index) => (
                  <View
                    key={index}
                    style={[
                      styles.memberItem,
                      { backgroundColor: colors.muted },
                    ]}
                  >
                    <View
                      style={[
                        styles.memberAvatarSmall,
                        {
                          backgroundColor:
                            PROFILE_COLORS.find(c => c.value === member.color)
                              ?.hex || colors.muted,
                        },
                      ]}
                    >
                      <MemberIcon
                        symbol={member.avatar}
                        size={16}
                        color={colors.foreground}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.memberName,
                          { color: colors.foreground },
                        ]}
                      >
                        {member.name}
                      </Text>
                      <Text
                        style={[
                          styles.memberRole,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {
                          PROFILE_COLORS.find(c => c.value === member.color)
                            ?.name
                        }
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary, borderRadius: radius.md },
                ]}
                onPress={handleComplete}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Complete Setup
                </Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  progressBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 4,
    marginBottom: 24,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputLabel: {
    alignSelf: 'flex-start',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  bigInput: {
    width: '100%',
    height: 56,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
  },
  primaryButton: {
    width: '100%',
    height: 50,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  memberItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  memberAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberName: {
    fontWeight: '600',
  },
  memberRole: {
    fontSize: 12,
  },
  addMemberForm: {
    width: '100%',
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
    marginTop: 16,
  },
  input: {
    height: 44,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  avatarOption: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  colorOption: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  outlineButton: {
    width: '100%',
    height: 44,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },

  countrySelector: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  countryList: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 24,
    maxHeight: 240,
    overflow: 'hidden',
  },
  countrySearchInput: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  countryListContent: {
    paddingVertical: 4,
  },
  countryItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  countryEmptyText: {
    padding: 12,
    fontSize: 12,
    textAlign: 'center',
  },
  outlineButtonText: {
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  reviewCard: {
    width: '100%',
    padding: 16,
    marginTop: 24,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
});
