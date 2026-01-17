import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const HolidayItem = ({ name, date, day }) => {
    // Determine the background color based on the date logic or random/alternating if desired?
    // For now, I'll match the blue reference image provided by the user.
    return (
        <View style={styles.card}>
            <View style={styles.contentContainer}>
                <Text style={styles.holidayName} numberOfLines={1}>{name}</Text>
                <Text style={styles.holidayDate}>{date}</Text>
                <Text style={styles.holidayDay}>{day}</Text>
            </View>
            <View style={styles.decorationCircle} />
        </View>
    );
};

const UpcomingHolidays = ({ holidays = [] }) => {
    if (!holidays || holidays.length === 0) {
        return null; // Or render an empty state if preferred
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Upcoming Holidays :</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContainer}
            >
                {holidays.map((item, index) => (
                    <HolidayItem
                        key={item.id || index}
                        name={item.name}
                        date={item.display_date}
                        day={item.day}
                    />
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
        paddingHorizontal: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 12,
        marginLeft: 4,
    },
    listContainer: {
        paddingRight: 16,
    },
    card: {
        width: width * 0.42, // Approximately 40-45% of screen width
        height: 100,
        backgroundColor: '#434AFA', // Primary blue color
        borderRadius: 12,
        padding: 12,
        marginRight: 12,
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        shadowColor: '#434AFA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    contentContainer: {
        zIndex: 2,
    },
    holidayName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    holidayDate: {
        fontSize: 13,
        fontWeight: '600',
        color: '#E0E7FF',
        marginBottom: 2,
    },
    holidayDay: {
        fontSize: 12,
        color: '#C7D2FE',
    },
    decorationCircle: {
        position: 'absolute',
        bottom: -20,
        right: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        zIndex: 1,
    }
});

export default UpcomingHolidays;
