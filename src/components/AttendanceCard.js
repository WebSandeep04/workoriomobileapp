import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert, Image } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { punchIn, punchOut, clearMessages } from '../store/slices/attendanceSlice';

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
    const [pendingAction, setPendingAction] = useState(null);

    // --- Effects ---
    useEffect(() => {
        if (!isFocused) return;

        if (successMessage) {
            Alert.alert("Success", successMessage);
            dispatch(clearMessages());
            setLateModalVisible(false);
            setLateReason('');
            setPendingAction(null);
        }

        if (error) {
            Alert.alert("Error", error);
            dispatch(clearMessages());
        }

        if (validationError) {
            if (validationError.require_late_reason) {
                setLateModalVisible(true);
            } else {
                Alert.alert("Action Failed", validationError.message || "Validation Error");
            }
            dispatch(clearMessages());
        }
    }, [successMessage, error, validationError, dispatch, isFocused]);

    // --- Handlers ---
    const handlePress = () => {
        if (officeStatus.can_start) {
            setPendingAction({ type: 'office' }); // Optimistic
            dispatch(punchIn({ type: 'office' }));
        } else if (officeStatus.can_end) {
            dispatch(punchOut({ type: 'office' }));
        }
    };

    const submitLateReason = () => {
        if (!lateReason.trim()) {
            Alert.alert('Validation', 'Please enter a reason.');
            return;
        }
        dispatch(punchIn({ type: 'office', reason: lateReason }));
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

    return (
        <View style={styles.card}>
            {/* Header: Shift Info */}
            <View style={styles.headerRow}>
                <Text style={styles.headerLabel}>
                    Shift Today : <Text style={styles.headerValue}>GENERAL ( 10:00 AM - 6:30 PM )</Text>
                </Text>
            </View>

            {/* User Profile Row */}
            <View style={styles.profileRow}>
                {/* Avatar */}
                <View style={styles.avatarContainer}>
                    <Image
                        source={{ uri: 'https://i.pravatar.cc/100?img=5' }}
                        style={styles.avatar}
                    />
                    {/* Fallback if image fails or just use icon:
                    <Ionicons name="person" size={24} color={COLORS.primary} /> 
                    */}
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
});

export default AttendanceCard;
