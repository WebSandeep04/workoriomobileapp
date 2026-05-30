import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

const HolidayItem = ({ name, date, day }) => {
    return (
        <View style={styles.card}>
            <View style={styles.contentContainer}>
                <Text style={styles.holidayName} numberOfLines={1}>
                    {name}
                </Text>

                <Text style={styles.holidayDate}>
                    {date}
                </Text>

                <Text style={styles.holidayDay}>
                    {day}
                </Text>
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
        marginTop: 0
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
        paddingBottom: 4
    },
    card: {
    width: 130,
    minHeight: 90,

    backgroundColor: '#FAF5FF',

    borderRadius: 18,

    paddingHorizontal: 14,
    paddingVertical: 12,

    marginRight: 12,

    borderWidth: 1,
    borderColor: '#E9D5FF',

    shadowColor: '#000',
    shadowOffset: {
        width: 0,
        height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
},
    contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
},
    holidayName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',

    minHeight: 34,
},
    holidayDate: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8B5CF6', // Crisp contrast brand highlight
        marginBottom: 1,
    },

    holidayDay: {
    fontSize: 10,
    fontWeight: '700',

    color: '#64748B',

    marginTop: 2,

    textTransform: 'capitalize',
},
});

export default UpcomingHolidays;
