import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert, Image, ScrollView, PermissionsAndroid, Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { punchIn, punchOut, clearMessages } from '../store/slices/attendanceSlice';
import Toast from 'react-native-toast-message';

const COLORS = {
    cardBg: '#434AFA', // Vibrant Blue/Purple from design
    primary: '#434AFA',
    textWhite: '#FFFFFF',
    textGray: '#E0E7FF', // Light blue-ish white for subtitles
    buttonBg: '#FFFFFF',
    buttonText: '#434AFA', // Blue text for button
    inputBg: '#F9FAFB',
    textDark: '#1F2937'
};

const AttendanceCard = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const isFocused = useIsFocused();
    const { status, actionLoading, validationError, successMessage, error } = useSelector(state => state.attendance);
    const { user } = useSelector(state => state.auth);
    const officeStatus = status?.office || {};

    // Local State
    const [lateModalVisible, setLateModalVisible] = useState(false);
    const [lateReason, setLateReason] = useState('');
    const [lateReasonOptions, setLateReasonOptions] = useState([]); // Store reasons locally
    const [pendingAction, setPendingAction] = useState(null);

    // --- Effects ---
    useEffect(() => {
        if (!isFocused) return;

        if (successMessage) {
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: successMessage,
            });
            dispatch(clearMessages());
            setLateModalVisible(false);
            setLateReason('');
            setLateReasonOptions([]);
            setPendingAction(null);
        }

        if (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error,
            });
            dispatch(clearMessages());
        }

        if (validationError) {
            const isLate = validationError.require_late_reason || validationError.data?.require_late_reason;
            const reasons = validationError.late_reasons || validationError.data?.late_reasons || [];

            if (isLate) {
                setLateReasonOptions(reasons);
                setLateModalVisible(true);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Action Failed',
                    text2: validationError.message || validationError.data?.message || "Validation Error",
                });
            }
            dispatch(clearMessages());
        }
    }, [successMessage, error, validationError, dispatch, isFocused]);

    // --- Location Permission Helper ---
    const requestLocationPermission = async () => {
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

    const getCurrentLocation = () => {
        return new Promise((resolve, reject) => {
            Geolocation.getCurrentPosition(
                (position) => {
                    resolve(position.coords);
                },
                (error) => {
                    reject(error);
                },
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
            );
        });
    };

    // --- Handlers ---
    const handlePress = async () => {
        if (officeStatus.can_start) {
            setPendingAction({ type: 'office' }); // Optimistic
            console.log('[AttendanceCard] Starting punch sequence. Checking permissions...');

            // 1. Check Permission
            const hasPermission = await requestLocationPermission();
            if (!hasPermission) {
                Toast.show({ type: 'error', text1: 'Permission Denied', text2: 'Location permission is required to punch in.' });
                setPendingAction(null);
                return;
            }

            // 2. Get Location
            try {
                const coords = await getCurrentLocation();
                if (!coords || !coords.latitude || !coords.longitude) {
                    Toast.show({ type: 'error', text1: 'Location Error', text2: 'Could not fetch valid coordinates.' });
                    setPendingAction(null);
                    return;
                }

                // 3. Dispatch
                console.log(`[AttendanceCard] Punching In. Lat: ${coords.latitude}, Long: ${coords.longitude}`);
                dispatch(punchIn({
                    type: 'office',
                    latitude: coords.latitude,
                    longitude: coords.longitude
                }));
            } catch (error) {
                Toast.show({ type: 'error', text1: 'Location Error', text2: 'Failed to get current location. Please ensure GPS is on.' });
                setPendingAction(null);
            }

        } else if (officeStatus.can_end) {
            dispatch(punchOut({ type: 'office' }));
        }
    };

    const submitLateReason = async () => {
        if (!lateReason.trim()) {
            Toast.show({
                type: 'info',
                text1: 'Validation',
                text2: 'Please enter a reason.'
            });
            return;
        }

        // Retry with location if needed
        let coords = null;
        try {
            const hasPermission = await requestLocationPermission();
            if (hasPermission) {
                coords = await getCurrentLocation();
            }
        } catch (e) {
            console.log("Location retry error", e);
        }

        dispatch(punchIn({
            type: 'office',
            reason: lateReason,
            latitude: coords?.latitude,
            longitude: coords?.longitude
        }));
    };

    const formatDate = (date) => {
        const options = { day: 'numeric', month: 'long', weekday: 'long' };
        // Example: "6 July Saturday"
        return date.toLocaleDateString('en-GB', options);
    };

    const getButtonLabel = () => {
        if (officeStatus.can_start) return "Punch In";
        if (officeStatus.can_end) return "Punch Out";
        return "Completed";
    };

    const isActionable = officeStatus.can_start || officeStatus.can_end;
    const workingHours = officeStatus.last_action_time ? ` | ${officeStatus.working_hours || '0hr 0min'}` : '';

    const formatTime = (timeString) => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        const date = new Date();
        date.setHours(parseInt(hours, 10));
        date.setMinutes(parseInt(minutes, 10));
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true });
    };

    const shift = user?.employee_details?.shift;
    const shiftName = shift?.name ? shift.name.toUpperCase() : "GENERAL";
    const shiftTiming = shift?.start_time && shift?.end_time
        ? `( ${formatTime(shift.start_time)} - ${formatTime(shift.end_time)} )`
        : "( 10:00 AM - 6:35 PM )";

    return (
        <View style={styles.card}>
            {/* Header: Shift Info */}
            <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>
                    Shift Today : <Text style={styles.headerValue}>{shiftName} {shiftTiming}</Text>
                </Text>
            </View>

            {/* User Profile Row */}
            <View style={styles.profileRow}>
                {/* Avatar */}
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

                {/* Name & Time */}
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user?.name || "Sasha Sh."}</Text>
                    <Text style={styles.userDate}>{formatDate(new Date())}{workingHours}</Text>
                </View>

                {/* Arrow */}
                <TouchableOpacity onPress={() => navigation.navigate('Attandance')}>
                    <Ionicons name="chevron-forward" size={24} color={COLORS.textWhite} />
                </TouchableOpacity>
            </View>

            {/* Action Button */}
            <TouchableOpacity
                style={[styles.button, !isActionable && styles.disabledBtn]}
                onPress={handlePress}
                disabled={!isActionable || actionLoading}
                activeOpacity={0.9}
            >
                {actionLoading ? (
                    <ActivityIndicator color={COLORS.primary} />
                ) : (
                    <Text style={styles.buttonText}>{getButtonLabel()}</Text>
                )}
            </TouchableOpacity>

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
                            {lateReasonOptions.length > 0 ? "Please select a reason for late punch-in:" : "Please provide a reason for late punch-in:"}
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
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 12,
        shadowColor: '#434AFA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    headerRow: {
        marginBottom: 20,
    },
    headerLabel: {
        color: COLORS.textGray,
        fontSize: 13,
        fontWeight: '500',
    },
    headerValue: {
        color: COLORS.textWhite,
        fontWeight: '700',
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)'
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
        color: COLORS.textWhite,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    userDate: {
        color: COLORS.textGray,
        fontSize: 13,
    },
    button: {
        backgroundColor: COLORS.buttonBg,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    disabledBtn: {
        opacity: 0.8,
        backgroundColor: '#f0f0f0',
    },
    buttonText: {
        color: COLORS.buttonText,
        fontSize: 16,
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
    }
});

export default AttendanceCard;
