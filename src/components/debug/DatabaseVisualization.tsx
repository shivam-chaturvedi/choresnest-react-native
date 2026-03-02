import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getDatabase } from '../../database';
import { useThemeColors, useThemeRadius } from '../../contexts/ThemeContext';
import { Cloud, Database as DatabaseIcon } from 'lucide-react-native';

const TABLE_NAMES = [
    'users',
    'members',
    'events',
    'tasks',
    'lists',
    'list_items',
    'recipes',
    'collections',
    'collection_recipes',
    'meal_plans',
    'documents',
    'transactions',
    'budgets',
    'notes',
    'folders',
    'app_lock',
    'settings',
    'user_preferences',
    'notification_preferences',
    'quiet_hours',
    'app_settings',
];

const SYNCED_TABLES = ['members', 'settings', 'user_preferences'];

interface TableStat {
    name: string;
    count: number;
    isSynced: boolean;
}

export const DatabaseVisualization: React.FC = () => {
    const colors = useThemeColors();
    const radius = useThemeRadius();
    const [stats, setStats] = useState<TableStat[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            const promises = TABLE_NAMES.map(async (table) => {
                try {
                    const count = await getDatabase().get(table).query().fetchCount();
                    return {
                        name: table,
                        count,
                        isSynced: SYNCED_TABLES.includes(table),
                    };
                } catch (e) {
                    console.warn(`Failed to fetch count for ${table}`, e);
                    return { name: table, count: 0, isSynced: SYNCED_TABLES.includes(table) };
                }
            });

            const results = await Promise.all(promises);
            // Sort: Synced tables first, then alphabetical
            results.sort((a, b) => {
                if (a.isSynced === b.isSynced) return a.name.localeCompare(b.name);
                return a.isSynced ? -1 : 1;
            });
            setStats(results);
        };

        fetchStats();
        // Poll every 5 seconds for updates
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <View style={styles.container}>
            <View style={{ marginBottom: 16 }}>
                <Text style={[styles.title, { color: colors.foreground }]}>Database Visualization</Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                    Real-time status of local WatermelonDB tables and Supabase Sync.
                </Text>
            </View>

            <ScrollView contentContainerStyle={styles.grid}>
                {stats.map((table) => (
                    <View
                        key={table.name}
                        style={[
                            styles.card,
                            {
                                backgroundColor: table.isSynced ? colors.primary + '10' : colors.card,
                                borderColor: table.isSynced ? colors.primary : colors.border,
                                borderRadius: radius.card,
                            },
                        ]}
                    >
                        <View style={styles.cardHeader}>
                            <Text style={[styles.tableName, { color: colors.foreground }]}>{table.name}</Text>
                            {table.isSynced && <Cloud size={16} color={colors.primary} />}
                        </View>

                        <View style={styles.cardBody}>
                            <DatabaseIcon size={14} color={colors.mutedForeground} />
                            <Text style={[styles.count, { color: colors.foreground }]}>{table.count} Records</Text>
                        </View>

                        <View style={[
                            styles.badge,
                            { backgroundColor: table.isSynced ? colors.primary : colors.muted }
                        ]}>
                            <Text style={[styles.badgeText, { color: table.isSynced ? '#FFF' : colors.mutedForeground }]}>
                                {table.isSynced ? 'SYNCED' : 'LOCAL ONLY'}
                            </Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 16,
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    subtitle: {
        fontSize: 14,
        marginTop: 4,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        paddingBottom: 32,
    },
    card: {
        width: '48%', // Roughly 2 columns
        padding: 12,
        borderWidth: 1,
        gap: 8,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tableName: {
        fontWeight: '600',
        fontSize: 14,
        textTransform: 'capitalize',
    },
    cardBody: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    count: {
        fontSize: 18,
        fontWeight: '700',
    },
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
});
