import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';

const StatCard = ({ title, value, iconName, color }) => {
    return (
        <View style={styles.card}>
            <View style={[styles.iconCircle, { backgroundColor: `${color}15` }]}>
                <Ionicons name={iconName} size={18} color={color} />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardValue}>{value}</Text>
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
        </View>
    );
};

const DashboardStats = () => {
    const { workingHours, completedHours, cycles } = useSelector(state => state.attendance);

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <StatCard
                    title="Worked Today"
                    value={completedHours || '0h 0m'}
                    iconName="time-outline"
                    color="#4F46E5" // Indigo
                />
                <StatCard
                    title="Total Elapsed"
                    value={workingHours || '0h 0m'}
                    iconName="hourglass-outline"
                    color="#10B981" // Green
                />
            </View>
            <View style={styles.row}>
                <StatCard
                    title="Office Cycles"
                    value={cycles?.office_cycles || '0'}
                    iconName="business-outline"
                    color="#EC4899" // Pink
                />
                <StatCard
                    title="Field Visits"
                    value={cycles?.field_cycles || '0'}
                    iconName="navigate-circle-outline"
                    color="#F59E0B" // Amber
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 20,
        paddingBottom: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        gap: 12,
    },
    card: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    iconCircle: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    cardValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
});

export default DashboardStats;
