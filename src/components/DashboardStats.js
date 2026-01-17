import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const StatCard = ({ title, value, borderBottomColor }) => {
    return (
        <View style={[styles.card, { borderBottomColor }]}>
            <Text style={styles.cardTitle}>{title}</Text>
            <Text style={styles.cardValue}>{value}</Text>
            {/* Background Icon/Watermark */}
            <View style={styles.watermark}>
                <Ionicons name="stats-chart" size={48} color="#F3F4F6" />
            </View>
        </View>
    );
};

const DashboardStats = ({ stats }) => {
    // Dummy Data if not provided
    const displayData = [
        { id: 1, title: 'Total Entries', value: '60', color: '#D946EF' },   // Magenta
        { id: 2, title: 'Total Hours', value: '43h 20m', color: '#4338ca' }, // Indigo
        { id: 3, title: 'Total Entries', value: '20', color: '#D946EF' },        // Magenta
        { id: 4, title: 'Total Entries', value: '60', color: '#D946EF' },      // Magenta
    ];

    return (
        <View style={styles.container}>
            <View style={styles.row}>
                <StatCard
                    title={displayData[0].title}
                    value={displayData[0].value}
                    borderBottomColor={displayData[0].color}
                />
                <StatCard
                    title={displayData[1].title}
                    value={displayData[1].value}
                    borderBottomColor={displayData[1].color}
                />
            </View>
            <View style={styles.row}>
                <StatCard
                    title={displayData[2].title}
                    value={displayData[2].value}
                    borderBottomColor={displayData[2].color}
                />
                <StatCard
                    title={displayData[3].title}
                    value={displayData[3].value}
                    borderBottomColor={displayData[3].color}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 16,
    },
    card: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderBottomWidth: 4,
        overflow: 'hidden',
        position: 'relative',
        height: 100,
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
        zIndex: 2,
    },
    cardValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111827',
        zIndex: 2,
    },
    watermark: {
        position: 'absolute',
        right: -10,
        bottom: -10,
        opacity: 0.5,
        transform: [{ rotate: '-15deg' }],
        zIndex: 1,
    }
});

export default DashboardStats;
