import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    Alert,
    Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

const AttandanceScreen = ({ navigation }) => {
    // Mock Data State
    const [status, setStatus] = useState({
        office: {
            status: "Punched Out",
            badge_class: "badge-secondary",
            can_start: true,
            can_end: false,
            last_action_time: null
        },
        field: {
            status: "Field Out",
            badge_class: "badge-secondary",
            can_start: true,
            can_end: false,
            last_action_time: null
        },
        break: {
            status: "Not on Break",
            badge_class: "badge-success",
            can_start: true,
            can_end: false
        }
    });

    const [worklogValidation, setWorklogValidation] = useState({
        can_perform_attendance: true,
        message: ""
    });

    const [lateModalVisible, setLateModalVisible] = useState(false);
    const [lateReason, setLateReason] = useState('');
    const [pendingAction, setPendingAction] = useState(null);

    //--- Actions (Mock Logic) ---

    const handlePunchIn = (type) => {
        const isLate = Math.random() > 0.7;
        if (isLate) {
            setPendingAction({ type, action: 'in' });
            setLateModalVisible(true);
            return;
        }
        performPunchIn(type);
    };

    const performPunchIn = (type, reason = null) => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newStatus = { ...status };

        if (type === 'office') {
            newStatus.office = {
                status: "Punched In",
                badge_class: "badge-success",
                can_start: false,
                can_end: true,
                last_action_time: time
            };
            if (newStatus.field.can_end) {
                newStatus.field = { ...newStatus.field, status: "Field Out", can_start: true, can_end: false };
            }
        } else {
            newStatus.field = {
                status: "Field In",
                badge_class: "badge-warning",
                can_start: false,
                can_end: true,
                last_action_time: time
            };
            if (newStatus.office.can_end) {
                newStatus.office = { ...newStatus.office, status: "Punched Out", can_start: true, can_end: false };
            }
        }

        setStatus(newStatus);
        setLateModalVisible(false);
        setLateReason('');
        setPendingAction(null);
    };

    const submitLateReason = () => {
        if (!lateReason.trim()) {
            Alert.alert('Validation', 'Please enter a reason.');
            return;
        }
        performPunchIn(pendingAction.type, lateReason);
    };

    const handlePunchOut = (type) => {
        const hasPendingTasks = Math.random() > 0.8;
        if (hasPendingTasks) {
            Alert.alert('Pending Tasks', 'Please update your pending tasks before leaving.');
            return;
        }

        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newStatus = { ...status };

        if (type === 'office') {
            newStatus.office = {
                status: "Punched Out",
                badge_class: "badge-danger",
                can_start: true,
                can_end: false,
                last_action_time: time
            };
        } else {
            newStatus.field = {
                status: "Field Out",
                badge_class: "badge-danger",
                can_start: true,
                can_end: false,
                last_action_time: time
            };
        }
        setStatus(newStatus);
    };

    const handleBreak = (action) => {
        const newStatus = { ...status };
        if (action === 'start') {
            newStatus.break = {
                status: "On Break",
                badge_class: "badge-warning",
                can_start: false,
                can_end: true
            };
        } else {
            newStatus.break = {
                status: "Not on Break",
                badge_class: "badge-success",
                can_start: true,
                can_end: false
            };
        }
        setStatus(newStatus);
    };

    //--- Render Helpers ---

    const StatusCard = ({ title, data, onStart, onEnd, startLabel, endLabel, isBreak = false }) => {
        const isOnBreak = status.break.can_end;
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
                            disabled={isDisabled}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.btnText}>{startLabel}</Text>
                        </TouchableOpacity>
                    )}
                    {data.can_end && (
                        <TouchableOpacity
                            style={[styles.actionButton, styles.endBtn, isDisabled && styles.disabledButton]}
                            onPress={onEnd}
                            disabled={isDisabled}
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

    if (!worklogValidation.can_perform_attendance) {
        return (
            <View style={styles.centerContainer}>
                <View style={[styles.card, { alignItems: 'center' }]}>
                    <Text style={[styles.errorText, { marginBottom: 10 }]}>Action Required</Text>
                    <Text style={styles.messageText}>{worklogValidation.message}</Text>
                    <TouchableOpacity
                        style={[styles.actionButton, styles.startBtn, { marginTop: 20, width: '100%' }]}
                        onPress={() => setWorklogValidation({ ...worklogValidation, can_perform_attendance: true })}
                    >
                        <Text style={styles.btnText}>Simulate Fix</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Attendance</Text>
                <Text style={styles.headerDate}>{new Date().toDateString()}</Text>
            </View>

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
                            >
                                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Subtle Mock Control */}
            <TouchableOpacity
                style={styles.demoTrigger}
                onPress={() => setWorklogValidation({ can_perform_attendance: false, message: "Use Case: Pending Worklogs from yesterday preventing check-in." })}
            >
                <Text style={styles.demoText}>Simulate Block</Text>
            </TouchableOpacity>

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
    // Demo
    demoTrigger: {
        marginTop: 40,
        alignSelf: 'center',
        padding: 10,
    },
    demoText: {
        color: COLORS.textLight,
        fontSize: 12,
        opacity: 0.5,
    }
});

export default AttandanceScreen;