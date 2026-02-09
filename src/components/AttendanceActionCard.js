import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert, Image, ScrollView, PermissionsAndroid, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { NativeModules } from 'react-native';

const { WorkorioLocation } = NativeModules;
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { punchIn, punchOut, toggleBreak, clearMessages } from '../store/slices/attendanceSlice';

const COLORS = {
    cardBg: '#434AFA',
    primary: '#434AFA',
    textWhite: '#FFFFFF',
    textGray: '#E0E7FF',
    buttonBg: '#FFFFFF',
    buttonText: '#434AFA',
    textDark: '#1F2937'
};

const AttendanceActionCard = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const isFocused = useIsFocused();
    const { status, actionLoading, validationError, successMessage, error } = useSelector(state => state.attendance);
    const { user } = useSelector(state => state.auth);

    // Status selectors
    const officeStatus = status?.office || {};
    const fieldStatus = status?.field || {};
    const breakStatus = status?.break || {};
    const isOnBreak = breakStatus.can_end; // True if break is active (can be ended)

    // Local State
    const [lateModalVisible, setLateModalVisible] = useState(false);
    const [lateReason, setLateReason] = useState('');
    const [lateReasonOptions, setLateReasonOptions] = useState([]);
    const [pendingAction, setPendingAction] = useState(null);
    const [loadingAction, setLoadingAction] = useState(null); // 'office' | 'field' | 'break'

    // --- Effects ---
    useEffect(() => {
        if (!isFocused) return;

        if (successMessage) {
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: successMessage
            });
            dispatch(clearMessages());
            setLateModalVisible(false);
            setLateReason('');
            setLateReasonOptions([]);
            setPendingAction(null);
            setLoadingAction(null);
        }

        if (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error
            });
            dispatch(clearMessages());
            setLoadingAction(null);
        }

        if (validationError) {
            // Check for require_late_reason in direct object OR nested data
            const isLate = validationError.require_late_reason || validationError.data?.require_late_reason;
            const reasons = validationError.late_reasons || validationError.data?.late_reasons || [];

            if (isLate) {
                setLateReasonOptions(reasons);
                setLateModalVisible(true);
                setLoadingAction(null);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Action Failed',
                    text2: validationError.message || validationError.data?.message || "Validation Error"
                });
                setLoadingAction(null);
            }
            dispatch(clearMessages());
        }
    }, [successMessage, error, validationError, dispatch, isFocused]);

    // --- Handlers ---

    // --- Location Permission Helper ---
    const requestLocationPermission = async () => {
        console.log('[AttendanceActionCard] Requesting location permission...');
        if (Platform.OS === 'ios') {
            const auth = await Geolocation.requestAuthorization('whenInUse');
            return auth === 'granted';
        }

        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: "Location Permission",
                    message: "Workorio needs access to your location to verify your punch-in.",
                    buttonNeutral: "Ask Me Later",
                    buttonNegative: "Cancel",
                    buttonPositive: "OK"
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    };

    // --- Handlers ---

    const getCurrentLocation = async () => {
        console.log('[AttendanceActionCard] Getting current location from Native...');
        try {
            const coords = await WorkorioLocation.getCurrentLocation();
            console.log('[AttendanceActionCard] Coords from Native:', coords.latitude, coords.longitude);
            return coords;
        } catch (error) {
            console.error('[AttendanceActionCard] Native Location Error:', error);
            throw error;
        }
    };

    // 1. Office Punch
    const handlePunchAction = async () => {
        console.log('[AttendanceActionCard] handlePunchAction triggered');
        if (officeStatus.can_start) {
            console.log('[AttendanceActionCard] Starting Office Punch In sequence');
            // Punch In Logic with Location
            setLoadingAction('office');
            setPendingAction({ type: 'office' });

            // 1. Check Permission
            const hasPermission = await requestLocationPermission();
            if (!hasPermission) {
                Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Location permission is required to punch in.' });
                setLoadingAction(null);
                return;
            }

            // 2. Get Location
            try {
                const coords = await getCurrentLocation();
                if (!coords || !coords.latitude || !coords.longitude) {
                    console.error('[AttendanceActionCard] Invalid coordinates received:', coords);
                    Toast.show({ type: 'error', text1: 'Location Error', text2: 'Could not fetch valid coordinates.' });
                    setLoadingAction(null);
                    return;
                }

                console.log(`[AttendanceActionCard] Dispatching punchIn. Lat: ${coords.latitude}, Long: ${coords.longitude}`);
                // 3. Dispatch
                dispatch(punchIn({
                    type: 'office',
                    latitude: coords.latitude,
                    longitude: coords.longitude
                }));
            } catch (error) {
                Toast.show({ type: 'error', text1: 'Location Error', text2: 'Failed to get current location. Please ensure GPS is on.' });
                setLoadingAction(null);
            }

        } else if (officeStatus.can_end) {
            setLoadingAction('office');
            // Punch Out with Location
            const hasPermission = await requestLocationPermission();
            if (!hasPermission) {
                // Even if permission denied, maybe we should allow punch out? 
                // User request says "Accept latitude and longitude", usually implies it is required or desired.
                // For consistency, if we require it for Punch In, we likely want it for Punch Out. 
                // However, blocking Punch Out might be bad UX if GPS fails.
                // let's try to get it, but proceed if it fails?
                // The user prompt "implement this also" suggests strict parity with API updates.
                // The API "Accepts" it. It doesn't say "Requires" it. but for Punch In usually it is required.
                // I'll follow the pattern: Try to get location, if permission/fetch fails, warn or fail?
                // In punchIn logic (lines 165-168), it catches error and shows Toast, implying it STOPS.
                // So I will STOP if location fails, to ensure data quality.
                Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Location permission is required to punch out.' });
                setLoadingAction(null);
                return;
            }

            try {
                const coords = await getCurrentLocation();
                dispatch(punchOut({
                    type: 'office',
                    latitude: coords.latitude,
                    longitude: coords.longitude
                }));
            } catch (error) {
                Toast.show({ type: 'error', text1: 'Location Error', text2: 'Failed to get location for punch out.' });
                setLoadingAction(null);
            }
        }
    };

    // 2. Field Action
    const handleFieldAction = async () => {
        console.log('[AttendanceActionCard] handleFieldAction triggered');
        if (fieldStatus.can_start) {
            console.log('[AttendanceActionCard] Starting Field Punch In sequence');
            // Field In Logic with Location
            setLoadingAction('field');
            setPendingAction({ type: 'field' });

            // 1. Check Permission
            const hasPermission = await requestLocationPermission();
            if (!hasPermission) {
                Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Location permission is required for field visit.' });
                setLoadingAction(null);
                return;
            }

            // 2. Get Location
            try {
                const coords = await getCurrentLocation();
                // 3. Dispatch
                dispatch(punchIn({
                    type: 'field',
                    latitude: coords.latitude,
                    longitude: coords.longitude
                }));
            } catch (error) {
                Toast.show({ type: 'error', text1: 'Location Error', text2: 'Failed to get location for field visit.' });
                setLoadingAction(null);
            }
        } else if (fieldStatus.can_end) {
            setLoadingAction('field');
            // Field Out with Location
            const hasPermission = await requestLocationPermission();
            if (!hasPermission) {
                Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Location permission is required to punch out.' });
                setLoadingAction(null);
                return;
            }

            try {
                const coords = await getCurrentLocation();
                dispatch(punchOut({
                    type: 'field',
                    latitude: coords.latitude,
                    longitude: coords.longitude
                }));
            } catch (error) {
                Toast.show({ type: 'error', text1: 'Location Error', text2: 'Failed to get location for field out.' });
                setLoadingAction(null);
            }
        }
    };

    // 3. Break Action
    const handleBreakAction = async () => {
        if (breakStatus.can_start || breakStatus.can_end) {
            const actionType = breakStatus.can_start ? 'start' : 'end';
            setLoadingAction('break');

            // Get Location
            const hasPermission = await requestLocationPermission();
            if (!hasPermission) {
                Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Location permission is required for break.' });
                setLoadingAction(null);
                return;
            }

            try {
                const coords = await getCurrentLocation();
                dispatch(toggleBreak({
                    action: actionType,
                    latitude: coords.latitude,
                    longitude: coords.longitude
                }));
            } catch (error) {
                Toast.show({ type: 'error', text1: 'Location Error', text2: 'Failed to get location for break.' });
                setLoadingAction(null);
            }
        }
    };


    const submitLateReason = async () => {
        console.log(`[AttendanceActionCard] submitLateReason. Reason: ${lateReason}`);
        if (!lateReason.trim()) {
            Toast.show({
                type: 'info',
                text1: 'Validation',
                text2: 'Please enter a reason.'
            });
            return;
        }
        if (pendingAction?.type) {
            setLoadingAction(pendingAction.type);

            try {
                // We retry with location just in case it's needed again
                let coords = null;
                const hasPermission = await requestLocationPermission();
                if (hasPermission) {
                    try {
                        const locationData = await getCurrentLocation();
                        coords = locationData;
                    } catch (locErr) {
                        console.log("Location error on retry:", locErr);
                        // deciding to proceed even if location fails on retry, or maybe not? 
                        // The user is already adding a reason, let's try to send it.
                    }
                }

                dispatch(punchIn({
                    type: pendingAction.type,
                    reason: lateReason,
                    latitude: coords?.latitude,
                    longitude: coords?.longitude,
                    emergency_attendance: pendingAction.isEmergency
                }));
            } catch (e) {
                dispatch(punchIn({
                    type: pendingAction.type,
                    reason: lateReason,
                    emergency_attendance: pendingAction.isEmergency
                }));
            }
        }
    };

    const handleEmergencyPunch = async () => {
        console.log('[AttendanceActionCard] Emergency Attendance Button Clicked');
        if (officeStatus.can_start) {
            setLoadingAction('emergency');
            console.log('[AttendanceActionCard] Requesting Location for Emergency Punch');

            // Try permission
            const hasPermission = await requestLocationPermission();
            let coords = {};
            if (hasPermission) {
                try {
                    coords = await getCurrentLocation();
                    console.log('[AttendanceActionCard] Emergency Location:', coords);
                } catch (e) {
                    console.log('[AttendanceActionCard] Failed to get location for emergency', e);
                }
            } else {
                console.log('[AttendanceActionCard] Permission denied for emergency');
            }

            setPendingAction({ type: 'office', isEmergency: true });

            console.log('[AttendanceActionCard] Dispatching Emergency Punch In');
            dispatch(punchIn({
                type: 'office',
                latitude: coords?.latitude,
                longitude: coords?.longitude,
                emergency_attendance: true
            }));
        } else {
            console.log('[AttendanceActionCard] Emergency Punch blocked: can_start is false');
            Alert.alert('Info', 'You are seemingly already punched in.');
        }
    };

    // Helper for display
    const formatDate = (date) => {
        const options = { day: 'numeric', month: 'long', weekday: 'long' };
        return date.toLocaleDateString('en-GB', options);
    };

    const formatTime = (timeString) => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10));
        date.setMinutes(parseInt(minutes, 10));
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    };

    // Label Helpers
    const getPunchLabel = () => {
        if (officeStatus.can_start) return "Punch In";
        if (officeStatus.can_end) return "Punch Out";
        return "Completed";
    };

    const getFieldLabel = () => {
        if (fieldStatus.can_start) return "Field In";
        if (fieldStatus.can_end || fieldStatus.status === 'Running') return "Field Out";
        // If 'Running' isn't exact status string, rely on can_end
        return "Field Completed";
    };

    const getBreakLabel = () => {
        if (breakStatus.can_start) return "Break";
        if (breakStatus.can_end) return "End Break";
        return "Break Done";
    };

    // Data for View
    const shift = user?.employee_details?.shift;
    const shiftName = shift?.name ? shift.name.toUpperCase() : "GENERAL";
    const shiftTiming = shift?.start_time && shift?.end_time
        ? `( ${formatTime(shift.start_time)} - ${formatTime(shift.end_time)} )`
        : "( 10:00 AM - 6:35 PM )";

    const workingHours = officeStatus.last_action_time ? ` | ${officeStatus.working_hours || '0hr 0min'}` : '';

    return (
        <View>
            <View style={styles.card}>
                {/* Header: Shift Info */}
                <View style={styles.headerRow}>
                    <Text style={styles.headerLabel}>
                        Shift Today : <Text style={styles.headerValue}>{shiftName} {shiftTiming}</Text>
                    </Text>
                </View>

                {/* User Profile Row */}
                <View style={styles.profileRow}>
                    <View style={styles.avatarContainer}>
                        {user?.image ? (
                            <Image
                                source={{ uri: user.image }}
                                style={styles.avatar}
                            />
                        ) : (
                            <Ionicons name="person" size={24} color={COLORS.primary} />
                        )}
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{user?.name || "Employee"}</Text>
                        <Text style={styles.userDate}>{formatDate(new Date())}{workingHours}</Text>
                    </View>
                </View>

                {/* Action Buttons Row */}
                <View style={styles.actionsRow}>
                    {/* 1. Punch In/Out (White) */}
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.btnWhite, (actionLoading || isOnBreak) && styles.disabledBtn]}
                        onPress={handlePunchAction}
                        activeOpacity={0.8}
                        disabled={actionLoading || isOnBreak}
                    >
                        {actionLoading && loadingAction === 'office' ? (
                            <ActivityIndicator color={COLORS.primary} size="small" />
                        ) : (
                            !(actionLoading || isOnBreak) && <Text style={[styles.btnText, { color: COLORS.primary }]}>{getPunchLabel()}</Text>
                        )}
                    </TouchableOpacity>

                    {/* 2. Field Cycle (Red) */}
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.btnRed, (actionLoading || isOnBreak) && styles.disabledBtn]}
                        onPress={handleFieldAction}
                        activeOpacity={0.8}
                        disabled={actionLoading || isOnBreak}
                    >
                        {actionLoading && loadingAction === 'field' ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            !(actionLoading || isOnBreak) && <Text style={[styles.btnText, { color: '#FFF' }]}>{getFieldLabel()}</Text>
                        )}
                    </TouchableOpacity>

                    {/* 3. Break (Orange) */}
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.btnOrange, actionLoading && styles.disabledBtn]}
                        onPress={handleBreakAction}
                        activeOpacity={0.8}
                        disabled={actionLoading}
                    >
                        {actionLoading && loadingAction === 'break' ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            !actionLoading && <Text style={[styles.btnText, { color: '#FFF' }]}>{getBreakLabel()}</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Late Reason Modal */}
                <Modal
                    visible={lateModalVisible}
                    transparent
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={() => setLateModalVisible(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Running Late?</Text>
                            <Text style={{ marginBottom: 12, color: '#6B7280', fontSize: 14 }}>
                                {validationError?.message || "Please select a reason for late punch-in:"}
                            </Text>

                            {lateReasonOptions.length > 0 ? (
                                <View style={{ maxHeight: 300 }}>
                                    <ScrollView showsVerticalScrollIndicator={true}>
                                        {lateReasonOptions.map((item) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={[
                                                    styles.reasonItem,
                                                    lateReason === item.reason && styles.selectedReasonItem
                                                ]}
                                                onPress={() => setLateReason(item.reason)}
                                            >
                                                <Text style={[
                                                    styles.reasonText,
                                                    lateReason === item.reason && styles.selectedReasonText
                                                ]}>
                                                    {item.reason}
                                                </Text>

                                                {lateReason === item.reason && (
                                                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            ) : (
                                // Fallback if no reasons provided
                                <TextInput
                                    style={styles.input}
                                    placeholder="Reason for late..."
                                    value={lateReason}
                                    onChangeText={setLateReason}
                                />
                            )}

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.cancelBtn]}
                                    onPress={() => {
                                        setLateModalVisible(false);
                                        setLateReason('');
                                        setLateReasonOptions([]);
                                    }}
                                >
                                    <Text>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalBtn, styles.submitBtn, !lateReason && { opacity: 0.5 }]}
                                    onPress={submitLateReason}
                                    disabled={!lateReason}
                                >
                                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>Submit</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>

            {(!officeStatus.can_start || !fieldStatus.can_start || isOnBreak) ? null :
                <TouchableOpacity
                    style={[styles.emergencyBtn, actionLoading && { opacity: 0.7 }]}
                    onPress={handleEmergencyPunch}
                    activeOpacity={0.8}
                    disabled={actionLoading}
                >
                    {actionLoading && loadingAction === 'emergency' ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Text style={styles.emergencyText}>Provisional Attendance</Text>
                    )}
                </TouchableOpacity>
            }
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        paddingBottom: 20,
        marginHorizontal: 16,
        marginVertical: 12,
        shadowColor: '#434AFA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    headerRow: {
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingBottom: 12,
    },
    headerLabel: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        fontWeight: '500',
    },
    headerValue: {
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    avatarContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#fff',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    userInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    userName: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    userDate: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
    },
    actionBtn: {
        flex: 1,
        height: 44,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
    },
    btnWhite: { backgroundColor: '#FFFFFF' },
    btnRed: { backgroundColor: '#DC2626' },
    btnOrange: { backgroundColor: '#D97706' },
    disabledBtn: {
        backgroundColor: '#D1D5DB', // Grey
        opacity: 0.7,
        shadowOpacity: 0,
        elevation: 0,
    },
    btnText: {
        fontSize: 13,
        fontWeight: '700',
    },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
    input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16 },
    modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    modalBtn: { padding: 10, borderRadius: 6 },
    cancelBtn: { backgroundColor: '#eee' },
    submitBtn: { backgroundColor: COLORS.primary },
    reasonItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 8,
        backgroundColor: '#F9FAFB'
    },
    selectedReasonItem: {
        borderColor: COLORS.primary,
        backgroundColor: '#EFF6FF'
    },
    reasonText: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
        marginRight: 8
    },
    selectedReasonText: {
        color: COLORS.primary,
        fontWeight: 'bold'
    },
    emergencyBtn: {
        backgroundColor: '#434AFA',
        marginHorizontal: 16,
        marginBottom: 24,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#434AFA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 6,
    },
    emergencyText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 16
    }
});

export default AttendanceActionCard;
