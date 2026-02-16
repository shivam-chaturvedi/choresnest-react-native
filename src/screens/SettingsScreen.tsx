import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { AppLayout } from "../components/layout";
import { useThemeColors, useThemeRadius } from "../contexts/ThemeContext";
import { listCountries } from "../config/countries";
import { useCountry } from "../contexts/CountryContext";
import { Check, Globe } from "lucide-react-native";

export const SettingsScreen: React.FC = () => {
  const colors = useThemeColors();
  const radius = useThemeRadius();
  const { currentCountry, setCountry, formatDateTime, formatCurrency } = useCountry();

  const countries = useMemo(() => listCountries(), []);

  const handleSetCountry = async (code: string) => {
    await setCountry(code);
  };

  const exampleDate = formatDateTime(new Date(), { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const exampleCurrency = formatCurrency(1234.5);

  return (
    <AppLayout>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, borderRadius: radius.card }]}>
          <View style={styles.currentRow}>
            <Globe size={20} color={colors.primary} />
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.currentTitle, { color: colors.foreground }]}>Country preferences</Text>
              <Text style={[styles.currentSubtitle, { color: colors.mutedForeground }]}>
                {currentCountry.flag} {currentCountry.name} · {currentCountry.currencyCode} · {currentCountry.timeZone}
              </Text>
            </View>
          </View>
          <View style={styles.currentDetails}>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Sample date/time</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{exampleDate}</Text>
            <Text style={[styles.detailLabel, { color: colors.mutedForeground, marginTop: 8 }]}>Sample currency</Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{exampleCurrency}</Text>
          </View>
        </View>

        <View style={[styles.section, { borderRadius: radius.card, borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Available countries</Text>
          {countries.map(country => {
            const isActive = country.code === currentCountry.code;
            return (
              <Pressable
                key={country.code}
                onPress={() => handleSetCountry(country.code)}
                style={[
                  styles.countryRow,
                  { borderColor: colors.border },
                  isActive && { backgroundColor: colors.primary + "15" },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ fontSize: 24 }}>{country.flag}</Text>
                  <View>
                    <Text style={{ color: colors.foreground, fontWeight: "600" }}>{country.name}</Text>
                    <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>
                      {country.locale} · {country.currencySymbol} · {country.timeZone}
                    </Text>
                  </View>
                </View>
                {isActive ? (
                  <Check size={20} color={colors.success} />
                ) : (
                  <Text style={{ color: colors.primary, fontWeight: "600" }}>Switch</Text>
                )}
              </Pressable>
            );
          })}
        </View>

      </ScrollView>
    </AppLayout>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  currentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  currentTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  currentSubtitle: {
    fontSize: 13,
  },
  currentDetails: {
    marginTop: 8,
  },
  detailLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  countryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
