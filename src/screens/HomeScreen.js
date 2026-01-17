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
  // console.log('HomeScreen Birthdays from Store:', JSON.stringify(birthdays, null, 2));

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
    id: b.employee_code || index,
    name: b.name,
    type: "B'DAY",
    dob: b.dob, // Pass DOB
    image: 'https://i.pravatar.cc/100?img=' + (index + 10), // Dummy image for now as requested
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
          title: 'Raise\nTicket',
          icon: 'ticket-outline',
          onPress: () => navigation.navigate('RaiseTicket'),
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