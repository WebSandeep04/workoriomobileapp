import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert, Image } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
    const [pendingAction, setPendingAction] = useState(null);
    const [loadingAction, setLoadingAction] = useState(null); // 'office' | 'field' | 'break'

    // --- Effects ---
    useEffect(() => {
        if (!isFocused) return;

        if (successMessage) {
            Alert.alert("Success", successMessage);
            dispatch(clearMessages());
            setLateModalVisible(false);
            setLateReason('');
            setPendingAction(null);
            setLoadingAction(null);
        }

        if (error) {
            Alert.alert("Error", error);
            dispatch(clearMessages());
            setLoadingAction(null);
        }

        if (validationError) {
            if (validationError.require_late_reason) {
                setLateModalVisible(true);
                // Don't clear loadingAction yet, as we are entering modal flow? 
                // Actually, the initial action failed, so spinner should stop.
                setLoadingAction(null);
            } else {
                Alert.alert("Action Failed", validationError.message || "Validation Error");
                setLoadingAction(null);
            }
            dispatch(clearMessages());
        }
    }, [successMessage, error, validationError, dispatch, isFocused]);

    // --- Handlers ---

    // 1. Office Punch
    const handlePunchAction = () => {
        if (officeStatus.can_start) {
            setLoadingAction('office');
            setPendingAction({ type: 'office' });
            dispatch(punchIn({ type: 'office' }));
        } else if (officeStatus.can_end) {
            setLoadingAction('office');
            dispatch(punchOut({ type: 'office' }));
        } else {
            // If already done or not allowed, maybe just do nothing or show info
            // Logic in slice might restrict valid transitions
        }
    };

    // 2. Field Action
    const handleFieldAction = () => {
        if (fieldStatus.can_start) {
            setLoadingAction('field');
            setPendingAction({ type: 'field' });
            dispatch(punchIn({ type: 'field' }));
        } else if (fieldStatus.can_end) {
            setLoadingAction('field');
            dispatch(punchOut({ type: 'field' }));
        } else {
            // Already completed or not allowed
        }
    };

    // 3. Break Action
    const handleBreakAction = () => {
        if (breakStatus.can_start) {
            setLoadingAction('break');
            dispatch(toggleBreak({ action: 'start' }));
        } else if (breakStatus.can_end) {
            setLoadingAction('break');
            dispatch(toggleBreak({ action: 'end' }));
        }
    };


    const submitLateReason = () => {
        if (!lateReason.trim()) {
            Alert.alert('Validation', 'Please enter a reason.');
            return;
        }
        if (pendingAction?.type) {
            setLoadingAction(pendingAction.type); // Re-trigger loading for the modal submit
            dispatch(punchIn({ type: pendingAction.type, reason: lateReason }));
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
                    <Image
                        source={{ uri: 'https://i.pravatar.cc/100?img=5' }}
                        style={styles.avatar}
                    />
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
                        <TextInput
                            style={styles.input}
                            placeholder="Reason for late..."
                            value={lateReason}
                            onChangeText={setLateReason}
                        />
                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setLateModalVisible(false)}>
                                <Text>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, styles.submitBtn]} onPress={submitLateReason}>
                                <Text style={{ color: '#fff' }}>Submit</Text>
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
});

export default AttendanceActionCard;
