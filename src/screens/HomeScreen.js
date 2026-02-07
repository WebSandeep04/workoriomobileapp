import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Modal, Linking, TouchableOpacity } from 'react-native';
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
  const { versionMismatch } = useSelector(state => state.auth);

  const handleUpdate = () => {
    Linking.openURL('https://triserv360.com');
  };

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

      <Modal
        transparent={true}
        animationType="fade"
        visible={!!versionMismatch}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center', elevation: 5 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#1f2937' }}>Update Required</Text>
            <Text style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24, lineHeight: 20 }}>
              New version available. Please update the app to continue.
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: '#4f46e5', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, width: '100%', alignItems: 'center' }}
              onPress={handleUpdate}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Update Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView >
  );
};

export default HomeScreen;