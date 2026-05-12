import React, { useCallback, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
            <View style={{ flex: 1, backgroundColor: COLORS.background }}>
                <Header title="Access Restricted" />
                <ScrollView
                    contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStatus} />}
                >
                    <View style={{
                        backgroundColor: '#FFF',
                        borderRadius: 24,
                        padding: 32,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: '#FEE2E2',
                        shadowColor: '#EF4444',
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.05,
                        shadowRadius: 20,
                        elevation: 4
                    }}>
                        <View style={{
                            width: 64,
                            height: 64,
                            borderRadius: 32,
                            backgroundColor: '#FEF2F2',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 20
                        }}>
                            <Ionicons name="alert-circle" size={32} color="#EF4444" />
                        </View>
                        <Text style={{
                            fontSize: 20,
                            fontWeight: '800',
                            color: '#1E293B',
                            marginBottom: 12,
                            textAlign: 'center'
                        }}>Action Required</Text>
                        <Text style={{
                            fontSize: 15,
                            color: '#64748B',
                            textAlign: 'center',
                            lineHeight: 22,
                            marginBottom: 24
                        }}>{worklogValidation.message || 'You need to complete your pending worklogs before continuing.'}</Text>
                    </View>
                </ScrollView>
            </View>
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