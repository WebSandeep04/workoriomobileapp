import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    Alert
} from 'react-native';

const AttandanceScreen = ({ navigation }) => {
    // Mock Data State to simulate API response
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

    // Late Reason Modal State
    const [lateModalVisible, setLateModalVisible] = useState(false);
    const [lateReason, setLateReason] = useState('');
    const [pendingAction, setPendingAction] = useState(null);

    //--- Actions (Mock Logic) ---

    const handlePunchIn = (type) => {
        // Simulate Late Check Logic (Randomly trigger late modal for demo)
        const isLate = Math.random() > 0.7;

        if (isLate) {
            setPendingAction({ type, action: 'in' });
            setLateModalVisible(true);
            return;
        }

        performPunchIn(type);
    };

    const performPunchIn = (type, reason = null) => {
        // Update mock state
        const time = new Date().toLocaleTimeString();
        const newStatus = { ...status };

        if (type === 'office') {
            newStatus.office = {
                status: "Punched In",
                badge_class: "badge-success",
                can_start: false,
                can_end: true,
                last_action_time: time
            };
            // Implicitly auto-switch field out if needed
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
            // Implicitly auto-switch office out if needed
            if (newStatus.office.can_end) {
                newStatus.office = { ...newStatus.office, status: "Punched Out", can_start: true, can_end: false };
            }
        }

        setStatus(newStatus);
        Alert.alert('Success', `Punched In (${type}) successfully! ${reason ? `(Reason: ${reason})` : ''}`);
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
        // Simulate Task Blocker (Randomly trigger task alert)
        const hasPendingTasks = Math.random() > 0.8;

        if (hasPendingTasks) {
            Alert.alert('Pending Tasks', 'Please update your pending tasks before leaving.');
            return;
        }

        const time = new Date().toLocaleTimeString();
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
        Alert.alert('Success', `Punched Out (${type}) successfully!`);
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
            Alert.alert('Success', 'Break Started');
        } else {
            newStatus.break = {
                status: "Not on Break",
                badge_class: "badge-success",
                can_start: true,
                can_end: false
            };
            Alert.alert('Success', 'Break Ended');
        }
        setStatus(newStatus);
    };

    //--- UI Renders ---

    // Worklog Blocker
    if (!worklogValidation.can_perform_attendance) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorText}>Action Required</Text>
                <Text style={styles.messageText}>{worklogValidation.message}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={() => setWorklogValidation({ ...worklogValidation, can_perform_attendance: true })}>
                    <Text style={styles.buttonText}>Simulate Fix Worklog</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const isOnBreak = status.break.can_end;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.headerTitle}>Attendance (UI Demo)</Text>

            {/* Office Section */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Office</Text>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Status:</Text>
                    <View style={[styles.badge, { backgroundColor: getBadgeColor(status.office.badge_class) }]}>
                        <Text style={styles.badgeText}>{status.office.status}</Text>
                    </View>
                </View>
                {status.office.last_action_time && (
                    <Text style={styles.timeText}>Last Action: {status.office.last_action_time}</Text>
                )}

                <View style={styles.buttonRow}>
                    {status.office.can_start && (
                        <TouchableOpacity
                            style={[styles.button, styles.inButton, isOnBreak && styles.disabledButton]}
                            onPress={() => handlePunchIn('office')}
                            disabled={isOnBreak}
                        >
                            <Text style={styles.buttonText}>Punch In</Text>
                        </TouchableOpacity>
                    )}
                    {status.office.can_end && (
                        <TouchableOpacity
                            style={[styles.button, styles.outButton, isOnBreak && styles.disabledButton]}
                            onPress={() => handlePunchOut('office')}
                            disabled={isOnBreak}
                        >
                            <Text style={styles.buttonText}>Punch Out</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Field Section */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Field Work</Text>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Status:</Text>
                    <View style={[styles.badge, { backgroundColor: getBadgeColor(status.field.badge_class) }]}>
                        <Text style={styles.badgeText}>{status.field.status}</Text>
                    </View>
                </View>
                {status.field.last_action_time && (
                    <Text style={styles.timeText}>Last Action: {status.field.last_action_time}</Text>
                )}

                <View style={styles.buttonRow}>
                    {status.field.can_start && (
                        <TouchableOpacity
                            style={[styles.button, styles.inButton, isOnBreak && styles.disabledButton]}
                            onPress={() => handlePunchIn('field')}
                            disabled={isOnBreak}
                        >
                            <Text style={styles.buttonText}>Field In</Text>
                        </TouchableOpacity>
                    )}
                    {status.field.can_end && (
                        <TouchableOpacity
                            style={[styles.button, styles.outButton, isOnBreak && styles.disabledButton]}
                            onPress={() => handlePunchOut('field')}
                            disabled={isOnBreak}
                        >
                            <Text style={styles.buttonText}>Field Out</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Break Section */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Break</Text>
                <View style={styles.statusRow}>
                    <Text style={styles.statusLabel}>Status:</Text>
                    <View style={[styles.badge, { backgroundColor: getBadgeColor(status.break.badge_class) }]}>
                        <Text style={styles.badgeText}>{status.break.status}</Text>
                    </View>
                </View>

                <View style={styles.buttonRow}>
                    {status.break.can_start && (
                        <TouchableOpacity
                            style={[styles.button, styles.breakButton]}
                            onPress={() => handleBreak('start')}
                        >
                            <Text style={styles.buttonText}>Start Break</Text>
                        </TouchableOpacity>
                    )}
                    {status.break.can_end && (
                        <TouchableOpacity
                            style={[styles.button, styles.breakButton]}
                            onPress={() => handleBreak('end')}
                        >
                            <Text style={styles.buttonText}>End Break</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Late Reason Modal */}
            <Modal
                visible={lateModalVisible}
                transparent
                animationType="slide"
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Late Reason Required</Text>
                        <Text style={styles.modalSubtitle}>You are punching in late. Please provide a reason.</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Enter reason (e.g., Traffic)"
                            value={lateReason}
                            onChangeText={setLateReason}
                            multiline
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={() => {
                                    setLateModalVisible(false);
                                    setLateReason('');
                                    setPendingAction(null);
                                }}
                            >
                                <Text style={styles.modalButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.submitButton]}
                                onPress={submitLateReason}
                            >
                                <Text style={styles.modalButtonText}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Demo Controls */}
            <View style={styles.demoControls}>
                <Text style={styles.demoText}>Demo Controls:</Text>
                <TouchableOpacity onPress={() => setWorklogValidation({ can_perform_attendance: false, message: "Demo: Pending Worklogs Block!" })}>
                    <Text style={styles.demoLink}>Simulate Worklog Block</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
    );
};

// Helper for badge colors
const getBadgeColor = (badgeClass) => {
    if (badgeClass?.includes('success')) return '#28a745';
    if (badgeClass?.includes('warning')) return '#ffc107';
    if (badgeClass?.includes('danger')) return '#dc3545';
    if (badgeClass?.includes('secondary')) return '#6c757d';
    return '#007bff';
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: '#f5f5f5',
        flexGrow: 1,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 15,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    statusLabel: {
        fontSize: 16,
        color: '#666',
        marginRight: 10,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 15,
    },
    badgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    timeText: {
        fontSize: 14,
        color: '#888',
        marginBottom: 15,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    inButton: {
        backgroundColor: '#28a745',
    },
    outButton: {
        backgroundColor: '#dc3545',
    },
    breakButton: {
        backgroundColor: '#ffc107',
    },
    retryButton: {
        marginTop: 20,
        backgroundColor: '#007bff',
        padding: 10,
        borderRadius: 5
    },
    disabledButton: {
        backgroundColor: '#ccc',
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    errorText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#dc3545',
        marginBottom: 10,
    },
    messageText: {
        fontSize: 16,
        color: '#333',
        textAlign: 'center',
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        width: '100%',
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
    },
    modalButton: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    submitButton: {
        backgroundColor: '#007bff',
    },
    modalButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    demoControls: {
        marginTop: 20,
        alignItems: 'center',
        paddingTop: 20,
        borderTopWidth: 1,
        borderColor: '#ddd'
    },
    demoText: {
        color: '#999',
        fontSize: 12
    },
    demoLink: {
        color: '#007bff',
        marginTop: 5
    }
});

export default AttandanceScreen;