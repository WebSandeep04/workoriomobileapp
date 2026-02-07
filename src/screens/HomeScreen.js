import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { fetchAttendanceStatus, fetchBirthdays, fetchHolidays } from '../store/slices/attendanceSlice';
import AttendanceCard from '../components/AttendanceCard';
import QuickActions from '../components/QuickActions';
import WishThem from '../components/WishThem';
import UpcomingHolidays from '../components/UpcomingHolidays';
import { styles } from '../css/HomeScreenStyles';

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, birthdays, holidays } = useSelector(state => state.attendance);

  // Debug Birthdays & Holidays
  // Debug Birthdays & Holidays

  const loadData = useCallback(() => {
    dispatch(fetchAttendanceStatus());
    dispatch(fetchBirthdays()); // Load birthdays
    dispatch(fetchHolidays()); // Load upcoming holidays
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Map birthdays to wishes format
  const wishes = (birthdays || []).map((b, index) => ({
    id: b.id || index, // Ensure unique ID
    name: b.name,
    type: "B'DAY",
    dob: b.dob, // Pass DOB
    image: b.image, // Use real image from API
  }));

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
    >
      <QuickActions actions={[
        {
          id: 1,
          title: 'Apply\nLeave',
          icon: 'calendar-outline',
          onPress: () => navigation.navigate('ApplyLeave'),
        },
        {
          id: 2,
          title: 'Leave\nBalance',
          icon: 'list-outline',
          onPress: () => navigation.navigate('LeaveBalance'),
        },
        {
          id: 3,
          title: 'Attendance\nSummary',
          icon: 'clipboard-outline',
          onPress: () => navigation.navigate('AttandanceSummary'),
        },
        {
          id: 4,
          title: 'Card\nScanner',
          icon: 'barcode-outline',
          onPress: () => navigation.navigate('Scanner'),
        }
      ]} />

      <AttendanceCard />

      <WishThem
        wishes={wishes}
        onSeeMore={() => console.log('See More Wishes')}
      />

      <UpcomingHolidays holidays={holidays} />

      {/* Other Dashboard Widgets could go here */}

    </ScrollView >
  );
};

export default HomeScreen;