import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import api from '../api/client';

const AttandanceScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    // Data State
    const [status, setStatus] = useState({
        office: {
            status: "Loading...",
            badge_class: "badge-secondary",
            can_start: false,
            can_end: false,
            last_action_time: null
        },
        field: {
            status: "Loading...",
            badge_class: "badge-secondary",
            can_start: false,
            can_end: false,
            last_action_time: null
        },
        break: {
            status: "Loading...",
            badge_class: "badge-secondary",
            can_start: false,
            can_end: false
        }
    });

    const [worklogValidation, setWorklogValidation] = useState({
        can_perform_attendance: true,
        message: ""
    });

    // Late Reason Modal State
    const [lateModalVisible, setLateModalVisible] = useState(false);
    const [lateReason, setLateReason] = useState('');
    const [pendingAction, setPendingAction] = useState(null); // { type: 'office' | 'field' }

    //--- API Actions ---

    const fetchTodayStatus = async () => {
        try {
            const response = await api.get('/attendance/today-status');
            const data = response.data;
            if (data.status) {
                setStatus(data.status);
            }
            if (data.worklog_validation) {
                setWorklogValidation(data.worklog_validation);
            }
        } catch (error) {
            console.error("Fetch Status Error:", error);
            Alert.alert("Error", "Failed to load attendance status.");
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchTodayStatus();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setLoading(true);
        fetchTodayStatus();
    }, []);

    const handlePunchIn = async (type) => {
        setActionLoading(true);
        try {
            await performPunchIn(type);
        } catch (error) {
            // Error handled in performPunchIn
        } finally {
            setActionLoading(false);
        }
    };

    const performPunchIn = async (type, reason = null) => {
        try {
            const payload = { movement_type: type };
            if (reason) payload.late_reason = reason;

            const response = await api.post('/attendance/punch-in', payload);

            if (response.data?.success) {
                Alert.alert("Success", response.data.message || `Punched In (${type}) successfully!`);
                setLateModalVisible(false);
                setLateReason('');
                setPendingAction(null);
                fetchTodayStatus(); // Refresh UI
            }
        } catch (error) {
            if (error.response?.status === 422) {
                const data = error.response.data;
                // Check if Late Reason is required
                if (data.require_late_reason) {
                    setPendingAction({ type });
                    setLateModalVisible(true);
                    return; // Stop here, wait for modal
                }
                // Check for other 422 errors (e.g. general validation)
                Alert.alert("Action Failed", data.message || "Unable to punch in.");
            } else {
                Alert.alert("Error", error.response?.data?.message || "An unexpected error occurred.");
            }
        }
    };

    const submitLateReason = async () => {
        if (!lateReason.trim()) {
            Alert.alert('Validation', 'Please enter a reason.');
            return;
        }
        setActionLoading(true);
        try {
            await performPunchIn(pendingAction.type, lateReason);
        } finally {
            setActionLoading(false);
        }
    };

    const handlePunchOut = async (type) => {
        setActionLoading(true);
        try {
            const response = await api.post('/attendance/punch-out', { movement_type: type });
            if (response.data?.success) {
                Alert.alert("Success", response.data.message || `Punched Out (${type}) successfully!`);
                fetchTodayStatus();
            }
        } catch (error) {
            if (error.response?.status === 422) {
                // Task Blocker usually comes as 422 with a specific message
                Alert.alert("Cannot Punch Out", error.response.data.message || "Please check your pending tasks.");
            } else {
                Alert.alert("Error", error.response?.data?.message || "An unexpected error occurred.");
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleBreak = async (action) => {
        setActionLoading(true);
        const endpoint = action === 'start' ? '/attendance/break/start' : '/attendance/break/end';

        try {
            const response = await api.post(endpoint);
            if (response.data?.success) {
                Alert.alert("Success", response.data.message || (action === 'start' ? "Break Started" : "Break Ended"));
                fetchTodayStatus();
            }
        } catch (error) {
            Alert.alert("Error", error.response?.data?.message || "Failed to update break status.");
        } finally {
            setActionLoading(false);
        }
    };

    //--- Render Helpers ---

    const StatusCard = ({ title, data, onStart, onEnd, startLabel, endLabel, isBreak = false }) => {
        const isOnBreak = status.break.can_end; // Currently on break
        // Disable Office/Field buttons if user is ON break
        const isDisabled = !isBreak && isOnBreak;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{title}</Text>
                    <View style={[styles.badge, { backgroundColor: getBadgeColor(data.badge_class) }]}>
                        <Text style={styles.badgeText}>{data.status}</Text>
                    </View>
                </View>

                {data.last_action_time && (
                    <Text style={styles.timeText}>Last Action: <Text style={styles.timeValue}>{data.last_action_time}</Text></Text>
                )}

                <View style={styles.buttonContainer}>
                    {data.can_start && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.startBtn, isDisabled && styles.disabledButton]}
                            onPress={onStart}
                            disabled={isDisabled || actionLoading}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.btnText}>{startLabel}</Text>
                        </TouchableOpacity>
                    )}
                    {data.can_end && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.endBtn, isDisabled && styles.disabledButton]}
                            onPress={onEnd}
                            disabled={isDisabled || actionLoading}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.btnText}>{endLabel}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    //--- Main Render ---

    // 1. Loading State
    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={{ marginTop: 10, color: COLORS.textLight }}>Loading Status...</Text>
            </View>
        );
    }

    // 2. Worklog Block State
    if (!worklogValidation.can_perform_attendance) {
        return (
            <ScrollView
                contentContainerStyle={styles.centerContainer}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
            >
                <View style={[styles.card, { alignItems: 'center', width: '100%' }]}>
                    <Text style={[styles.errorText, { marginBottom: 10 }]}>Action Required</Text>
                    <Text style={styles.messageText}>{worklogValidation.message}</Text>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.startBtn, { marginTop: 20, width: '100%' }]}
                        onPress={fetchTodayStatus}
                    >
                        <Text style={styles.btnText}>Refresh Status</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    // 3. Main Attendance Interface
    return (
        <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Attendance</Text>
                <Text style={styles.headerDate}>{new Date().toDateString()}</Text>
            </View>

            {actionLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <Text style={{ color: '#fff', marginTop: 10, fontWeight: 'bold' }}>Processing...</Text>
                </View>
            )}

            <StatusCard
                title="Office"
                data={status.office}
                startLabel="Punch In"
                endLabel="Punch Out"
                onStart={() => handlePunchIn('office')}
                onEnd={() => handlePunchOut('office')}
            />

            <StatusCard
                title="Field Work"
                data={status.field}
                startLabel="Field In"
                endLabel="Field Out"
                onStart={() => handlePunchIn('field')}
                onEnd={() => handlePunchOut('field')}
            />

            <StatusCard
                title="Break"
                data={status.break}
                startLabel="Start Break"
                endLabel="End Break"
                onStart={() => handleBreak('start')}
                onEnd={() => handleBreak('end')}
                isBreak={true}
            />

            {/* Late Reason Modal */}
            <Modal
                visible={lateModalVisible}
                transparent
                animationType="fade"
                statusBarTranslucent
                onRequestClose={() => {
                    setLateModalVisible(false);
                    setPendingAction(null);
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
                                    setPendingAction(null);
                                }}
                            >
                                <Text style={[styles.modalBtnText, { color: '#666' }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.submitBtn]}
                                onPress={submitLateReason}
                                disabled={actionLoading}
                            >
                                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{actionLoading ? "Submitting..." : "Submit"}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </ScrollView>
    );
};

// Colors
const COLORS = {
    primary: '#4F46E5', // Indigo
    background: '#F3F4F6', // Cool Gray
    cardBg: '#FFFFFF',
    textDark: '#1F2937',
    textLight: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    secondary: '#9CA3AF',
    border: '#E5E7EB'
};

const getBadgeColor = (badgeClass) => {
    if (badgeClass?.includes('success')) return COLORS.success;
    if (badgeClass?.includes('warning')) return COLORS.warning;
    if (badgeClass?.includes('danger')) return COLORS.danger;
    return COLORS.secondary;
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: COLORS.background,
        flexGrow: 1,
        paddingBottom: 40,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 20,
    },
    header: {
        marginBottom: 24,
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.textDark,
        letterSpacing: -0.5,
    },
    headerDate: {
        fontSize: 16,
        color: COLORS.textLight,
        marginTop: 4,
        fontWeight: '500',
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        // Soft Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.02)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textDark,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    timeText: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 20,
        backgroundColor: '#F9FAFB',
        padding: 8,
        borderRadius: 8,
        overflow: 'hidden',
    },
    timeValue: {
        color: COLORS.textDark,
        fontWeight: '600',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    startBtn: {
        backgroundColor: COLORS.primary,
    },
    endBtn: {
        backgroundColor: COLORS.danger,
    },
    disabledButton: {
        backgroundColor: '#E5E7EB',
        opacity: 0.7,
    },
    btnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 15,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
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
        color: COLORS.textLight,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 22,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: COLORS.border,
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
        backgroundColor: '#F3F4F6',
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
    },
    modalBtnText: {
        fontWeight: '600',
        fontSize: 16,
    },
    // Error / Blocked
    errorText: {
        fontSize: 22,
        fontWeight: '800',
        color: COLORS.danger,
    },
    messageText: {
        fontSize: 16,
        color: COLORS.textLight,
        textAlign: 'center',
        lineHeight: 24,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        borderRadius: 16 // Matches card if needed, but here it's full screen or container
    }
});

export default AttandanceScreen;