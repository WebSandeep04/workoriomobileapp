import React, { useCallback, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { fetchAttendanceStatus, clearMessages } from '../store/slices/attendanceSlice';
import { styles, COLORS } from '../css/AttandanceStyles';
import Header from '../components/Header';
import DashboardStats from '../components/DashboardStats';
import AttendanceActionCard from '../components/AttendanceActionCard';

const AttandanceScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const {
        worklogValidation,
        loading,
    } = useSelector(state => state.attendance);

    //--- Side Effects ---

    useFocusEffect(
        useCallback(() => {
            dispatch(fetchAttendanceStatus());
        }, [dispatch])
    );

    // Handle Messages & Errors - This will now be handled by AttendanceActionCard or other components
    // useEffect(() => {
    //     // Clear any lingering messages from previous screens or actions not handled by specific components
    //     dispatch(clearMessages());
    // }, [dispatch]);


    //--- Actions ---

    const loadStatus = () => {
        dispatch(fetchAttendanceStatus());
    };

    //--- Main Render ---

    // 1. Loading State (Initial or Critical)
    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 10, color: COLORS.textLight }}>Loading Status...</Text>
            </View>
        );
    }

    // 2. Worklog Block State
    if (worklogValidation && !worklogValidation.can_perform_attendance) {
        return (
            <ScrollView
                contentContainerStyle={styles.centerContainer}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStatus} />}
            >
                <View style={[styles.card, { alignItems: 'center', width: '100%' }]}>
                    <Text style={[styles.errorText, { marginBottom: 10 }]}>Action Required</Text>
                    <Text style={styles.messageText}>{worklogValidation.message}</Text>
                    {/* Add a button to navigate to worklog or refresh */}
                </View>
            </ScrollView>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
            <Header title="Attendance" />
            <ScrollView
                contentContainerStyle={[styles.container, { padding: 0 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStatus} />}
            >
                {/* Stats Grid */}
                <DashboardStats />

                {/* New Attendance Card with 3 Buttons */}
                <AttendanceActionCard />

            </ScrollView>
        </View>
    );
};

export default AttandanceScreen;