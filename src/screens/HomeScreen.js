import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { fetchAttendanceStatus } from '../store/slices/attendanceSlice';
import AttendanceCard from '../components/AttendanceCard';
import QuickActions from '../components/QuickActions';

const HomeScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading } = useSelector(state => state.attendance);

  const loadData = useCallback(() => {
    dispatch(fetchAttendanceStatus());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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
          onPress: () => console.log('Apply Leave'),
        },
        {
          id: 2,
          title: 'Leave\nBalance',
          icon: 'list-outline',
          onPress: () => console.log('Leave Balance'),
        },
        {
          id: 3,
          title: 'Attendance\nSummary',
          icon: 'clipboard-outline',
          onPress: () => console.log('Attendance Summary'),
        },
        {
          id: 4,
          title: 'Raise\nTicket',
          icon: 'ticket-outline',
          onPress: () => console.log('Raise Ticket'),
        }
      ]} />

      <AttendanceCard />

      {/* Other Dashboard Widgets could go here */}

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#f8fafc',
    paddingVertical: 20,
  },
  header: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748b',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
});

export default HomeScreen;