import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const HolidayItem = ({ name, date, day }) => {
    return (
        <View style={styles.card}>
            <View style={styles.contentContainer}>
                <Text style={styles.holidayName} numberOfLines={1}>{name}</Text>
                <Text style={styles.holidayDate}>{date}</Text>
                <Text style={styles.holidayDay}>{day}</Text>
            </View>
        </View>
    );
};

const UpcomingHolidays = ({ holidays = [] }) => {
    if (!holidays || holidays.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Upcoming Holidays :</Text>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
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
        marginTop: 16
    },
    title: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 12,
        paddingHorizontal: 24,
        letterSpacing: -0.2
    },
    listContainer: {
        paddingHorizontal: 24,
        paddingBottom: 8
    },
    card: {
        width: width * 0.38, // Slightly narrower for elegant layout
        height: 82,
        backgroundColor: '#F8FAFC', // Clean neutral base
        borderRadius: 12,
        padding: 12,
        marginRight: 12,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9', // Delicate flat border
    },
    contentContainer: {
        justifyContent: 'center',
    },
    holidayName: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 4,
    },
    holidayDate: {
        fontSize: 11,
        fontWeight: '700',
        color: '#434AFA', // Crisp contrast brand highlight
        marginBottom: 1,
    },
    holidayDay: {
        fontSize: 10,
        fontWeight: '600',
        color: '#94A3B8',
    }
});

export default UpcomingHolidays;
