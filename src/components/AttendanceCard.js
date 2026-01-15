import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { punchIn, punchOut, clearMessages } from '../store/slices/attendanceSlice';

const COLORS = {
    cardBg: '#FFFFFF', // White to match app theme
    primary: '#4F46E5', // Indigo to match app theme
    textWhite: '#1F2937', // Dark gray for text on white bg
    textGray: '#6B7280', // Light gray
    success: '#10B981',
    buttonText: '#ffffff',
    border: '#E5E7EB',
    inputBg: '#F9FAFB',
    textDark: '#1F2937'
};

const AttendanceCard = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const isFocused = useIsFocused();
    const { status, actionLoading, validationError, successMessage, error } = useSelector(state => state.attendance);
    const officeStatus = status?.office || {};

    // Local State
    const [lateModalVisible, setLateModalVisible] = useState(false);
    const [lateReason, setLateReason] = useState('');
    const [pendingAction, setPendingAction] = useState(null);

    // --- Effects ---
    useEffect(() => {
        // Only handle specific side effects if this component is focused or we might conflict with other screens
        // However, we need to be careful. If the user acts here, this should handle it.
        // We can check if isFocused.
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
        const options = { day: '2-digit', month: 'short', weekday: 'long' };
        return date.toLocaleDateString('en-GB', options);
    };

    const getButtonLabel = () => {
        if (officeStatus.can_start) return "Clock In";
        if (officeStatus.can_end) return "Clock Out";
        return "Completed"; // Or a checkmark
    };

    const isActionable = officeStatus.can_start || officeStatus.can_end;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <Text style={styles.headerText}>
                    SHIFT TODAY : <Text style={styles.boldText}>GENERAL (09:30 AM - 06:00 PM)</Text>
                </Text>
            </View>

            {/* Content Date Row */}
            <View style={styles.contentRow}>
                <View style={styles.iconPlaceholder}>
                    <View style={styles.innerIcon}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>ID</Text>
                    </View>
                </View>

                <View style={styles.dateContainer}>
                    <Text style={styles.dateText}>{formatDate(new Date())}</Text>
                    <Text style={styles.timeText}>
                        {officeStatus.last_action_time ? `Last: ${officeStatus.last_action_time}` : '0h / 8h'}
                    </Text>
                </View>

                {/* Arrow */}
                <TouchableOpacity
                    style={{ flex: 1, alignItems: 'flex-end' }}
                    onPress={() => navigation.navigate('Attandance')}
                >
                    <Text style={{ color: COLORS.textGray, fontSize: 20 }}>{'>'}</Text>
                </TouchableOpacity>
            </View>

            {/* Button */}
            <TouchableOpacity
                style={[styles.button, !isActionable && styles.disabledBtn]}
                onPress={handlePress}
                disabled={!isActionable || actionLoading}
                activeOpacity={0.9}
            >
                {actionLoading ? (
                    <ActivityIndicator color="#fff" />
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
                onRequestClose={() => {
                    setLateModalVisible(false);
                }}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Running Late?</Text>
                        <Text style={styles.modalSubtitle}>Please provide a reason for the late punch-in.</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Traffic, Doctor's appointment..."
                            placeholderTextColor="#999"
                            value={lateReason}
                            onChangeText={setLateReason}
                            multiline
                            numberOfLines={3}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.cancelBtn]}
                                onPress={() => {
                                    setLateModalVisible(false);
                                    setLateReason('');
                                }}
                            >
                                <Text style={[styles.modalBtnText, { color: '#666' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.submitBtn]}
                                onPress={submitLateReason}
                                disabled={actionLoading}
                            >
                                <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                                    {actionLoading ? "Submitting..." : "Submit"}
                                </Text>
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
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        marginVertical: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    headerRow: {
        marginBottom: 16,
    },
    headerText: {
        color: COLORS.textGray,
        fontSize: 12,
        letterSpacing: 0.5,
    },
    boldText: {
        color: COLORS.textDark,
        fontWeight: 'bold',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    iconPlaceholder: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    innerIcon: {
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,0,0.1)',
        borderRadius: 5,
        paddingHorizontal: 4,
        paddingVertical: 2,
    },
    dateContainer: {
        justifyContent: 'center',
    },
    dateText: {
        color: COLORS.textWhite,
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 4,
    },
    timeText: {
        color: COLORS.textWhite,
        fontSize: 14,
        fontWeight: '500',
        opacity: 0.9
    },
    button: {
        backgroundColor: COLORS.primary, // Violet
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    disabledBtn: {
        backgroundColor: '#475569',
        opacity: 0.8,
        shadowOpacity: 0
    },
    buttonText: {
        color: COLORS.buttonText,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.textDark,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 15,
        color: COLORS.textGray,
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 22,
    },
    input: {
        backgroundColor: COLORS.inputBg,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: COLORS.textDark,
        minHeight: 100,
        textAlignVertical: 'top',
        marginBottom: 24,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: '#f1f5f9',
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
    },
    modalBtnText: {
        fontWeight: '600',
        fontSize: 16,
    },
});

export default AttendanceCard;
