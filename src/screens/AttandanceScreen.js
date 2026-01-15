import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import {
    fetchAttendanceStatus,
    punchIn,
    punchOut,
    toggleBreak,
    clearMessages
} from '../store/slices/attendanceSlice';
import { styles, COLORS } from '../css/AttandanceStyles';

const AttandanceScreen = ({ navigation }) => {
    const dispatch = useDispatch();
    const {
        status,
        worklogValidation,
        loading,
        actionLoading,
        error,
        successMessage,
        validationError
    } = useSelector(state => state.attendance);

    // Local UI State for Modal
    const [lateModalVisible, setLateModalVisible] = useState(false);
    const [lateReason, setLateReason] = useState('');
    const [pendingAction, setPendingAction] = useState(null); // { type: 'office' | 'field' }

    //--- Side Effects ---

    useFocusEffect(
        useCallback(() => {
            dispatch(fetchAttendanceStatus());
        }, [dispatch])
    );

    // Handle Messages & Errors
    useEffect(() => {
        if (successMessage) {
            Alert.alert("Success", successMessage);
            dispatch(clearMessages());
            // Close modal if open
            setLateModalVisible(false);
            setLateReason('');
            setPendingAction(null);
        }

        if (error) {
            Alert.alert("Error", error);
            dispatch(clearMessages());
        }

        if (validationError) {
            // Check for specific 'require_late_reason' flag
            if (validationError.require_late_reason) {
                // If we don't know the type, we might have an issue, but usually we set pendingAction 
                // BEFORE dispatching if we knew. But here the API told us.
                // NOTE: In the Thunk, we caught 422. 
                // Ideally, we should know WHICH action caused this. 
                // Since `punchIn` sets `validationError`, we can assume it triggered the modal requirement.
                // However, our local `handlePunchIn` sets the pendingAction state *optimistically* 
                // or we need to infer it. 

                // Let's rely on the local handler to set the pending action before dispatching?
                // Actually, if the API fails with "Late Reason Required", we need to know for WHICH type.
                // The API response might not say "office" or "field".
                // So, we should handle the logic of "opening modal" inside the local handler 
                // by checking the 422 rejection there OR letting the effect handle it if `pendingAction` is set.

                // REVISION: The previous local logic was better for flow control:
                // try { create } catch (422) { if late_reason open modal }
                // With Redux, the error state updates.
                // Let's simplify: 
                // We'll keep the "intent" locally when calling dispatch.

                if (validationError.require_late_reason) {
                    setLateModalVisible(true);
                } else {
                    Alert.alert("Action Failed", validationError.message || "Validation Error");
                }
            } else {
                Alert.alert("Action Failed", validationError.message || "Validation Error");
            }
            dispatch(clearMessages());
        }
    }, [successMessage, error, validationError, dispatch]);


    //--- Actions ---

    const loadStatus = () => {
        dispatch(fetchAttendanceStatus());
    };

    const handlePunchIn = async (type) => {
        // We set pendingAction here just in case we need it for the Modal later.
        // If the dispatch succeeds, we clear it in the success effect.
        // If it fails with "require_late_reason", we have it ready.
        setPendingAction({ type });
        dispatch(punchIn({ type }));
    };

    const submitLateReason = () => {
        if (!lateReason.trim()) {
            Alert.alert('Validation', 'Please enter a reason.');
            return;
        }
        if (pendingAction?.type) {
            dispatch(punchIn({ type: pendingAction.type, reason: lateReason }));
        }
    };

    const handlePunchOut = (type) => {
        dispatch(punchOut({ type }));
    };

    const handleBreak = (action) => {
        dispatch(toggleBreak({ action }));
    };

    //--- Render Helpers ---

    const StatusCard = ({ title, data, onStart, onEnd, startLabel, endLabel, isBreak = false }) => {
        const isOnBreak = status.break.can_end; // Currently on break
        const isDisabled = !isBreak && isOnBreak;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.badgeText}>{data.status}</Text>
                </View>

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
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStatus} />}
            >
                <View style={[styles.card, { alignItems: 'center', width: '100%' }]}>
                    <Text style={[styles.errorText, { marginBottom: 10 }]}>Action Required</Text>
                    <Text style={styles.messageText}>{worklogValidation.message}</Text>

                    <TouchableOpacity
                        style={[styles.actionButton, styles.startBtn, { marginTop: 20, width: '100%' }]}
                        onPress={loadStatus}
                    >
                        <Text style={styles.btnText}>Refresh Status</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        );
    }

    return (
        <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStatus} />}
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

export default AttandanceScreen;