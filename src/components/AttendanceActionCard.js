import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, TextInput, Alert, Image, ScrollView, PermissionsAndroid, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { NativeModules } from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import { punchIn, punchOut, toggleBreak, clearMessages } from '../store/slices/attendanceSlice';

const { WorkorioLocation } = NativeModules;

const AttendanceActionCard = () => {
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const isFocused = useIsFocused();
    const { status, actionLoading, validationError, successMessage, error, isLocked } = useSelector(state => state.attendance);
    const { user } = useSelector(state => state.auth);

    // Status selectors
    const officeStatus = status?.office || {};
    const fieldStatus = status?.field || {};
    const breakStatus = status?.break || {};
    const isOnBreak = breakStatus.can_end; 

    // Local State
    const [lateModalVisible, setLateModalVisible] = useState(false);
    const [lateReason, setLateReason] = useState('');
    const [lateReasonOptions, setLateReasonOptions] = useState([]);
    const [pendingAction, setPendingAction] = useState(null);
    const [loadingAction, setLoadingAction] = useState(null); // 'office' | 'field' | 'break' | 'emergency' | 'wfh'

    // --- Effects ---
    useEffect(() => {
        if (!isFocused) return;

        if (successMessage) {
            Toast.show({ type: 'success', text1: 'Status Updated', text2: successMessage });
            dispatch(clearMessages());
            cleanupLocals();
        }

        if (error) {
            const errorMsg = String(error);
            if (errorMsg.toLowerCase().includes('pending task')) {
                Alert.alert('Tasks Require Update', errorMsg, [
                    { text: 'Dismiss', style: 'cancel' },
                    { text: 'Go to Tasks', onPress: () => navigation.navigate('Task') }
                ]);
            } else {
                Toast.show({ type: 'error', text1: 'Request Failed', text2: errorMsg });
            }
            dispatch(clearMessages());
            setLoadingAction(null);
        }

        if (validationError) {
            const isLate = validationError.require_late_reason || validationError.data?.require_late_reason;
            const reasons = validationError.late_reasons || validationError.data?.late_reasons || [];

            if (isLate) {
                setLateReasonOptions(reasons);
                setLateModalVisible(true);
                setLoadingAction(null);
            } else {
                Toast.show({ type: 'error', text1: 'Validation Failed', text2: validationError.message || validationError.data?.message || "Unable to proceed." });
                setLoadingAction(null);
            }
            dispatch(clearMessages());
        }
    }, [successMessage, error, validationError, dispatch, isFocused]);

    const cleanupLocals = () => {
        setLateModalVisible(false);
        setLateReason('');
        setLateReasonOptions([]);
        setPendingAction(null);
        setLoadingAction(null);
    };

    // --- Handlers ---
    const requestLocationPermission = async () => {
        if (Platform.OS === 'ios') return true; // Standard practice to assume configured via info.plist
        
        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: "Location Access Required",
                    message: "To secure attendance validation, please allow access to your current location.",
                    buttonPositive: "Confirm"
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
    };

    const getCurrentLocation = async () => {
        try {
            const coords = await WorkorioLocation.getCurrentLocation();
            return coords;
        } catch (e) {
            throw e;
        }
    };

    const performAction = async (type, actionCategory) => {
        if (isLocked) return;
        setLoadingAction(type);
        
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
            Toast.show({ type: 'info', text1: 'Permission Needed', text2: 'Enable location in your settings to proceed.' });
            setLoadingAction(null);
            return;
        }

        try {
            const coords = await getCurrentLocation();
            if (actionCategory === 'break') {
                const subAction = breakStatus.can_start ? 'start' : 'end';
                dispatch(toggleBreak({ action: subAction, latitude: coords.latitude, longitude: coords.longitude }));
            } else if (actionCategory === 'punch-out') {
                dispatch(punchOut({ type, latitude: coords.latitude, longitude: coords.longitude }));
            } else {
                // punch-in
                setPendingAction({ type, isEmergency: type==='emergency', isWFH: type==='wfh' });
                dispatch(punchIn({
                    type: (type === 'emergency' || type === 'wfh') ? 'office' : type,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    emergency_attendance: type === 'emergency',
                    work_from_home: type === 'wfh'
                }));
            }
        } catch (err) {
            Toast.show({ type: 'error', text1: 'Location Error', text2: 'Ensure GPS is enabled on your device.' });
            setLoadingAction(null);
        }
    };

    const submitLateReason = async () => {
        if (!lateReason.trim()) return;
        const dispatchType = pendingAction?.type || 'office';
        setLoadingAction(dispatchType);
        
        let coords = null;
        try {
            coords = await getCurrentLocation();
        } catch (e) {}

        dispatch(punchIn({
            type: (dispatchType === 'emergency' || dispatchType === 'wfh') ? 'office' : dispatchType,
            reason: lateReason,
            latitude: coords?.latitude,
            longitude: coords?.longitude,
            emergency_attendance: pendingAction?.isEmergency,
            work_from_home: pendingAction?.isWFH
        }));
    };

    const formatTime = (timeString) => {
        if (!timeString) return 'N/A';
        try {
            const [hours, minutes] = timeString.split(':');
            const d = new Date();
            d.setHours(parseInt(hours, 10), parseInt(minutes, 10));
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch(e) { return timeString; }
    };

    // Component Builders
    const renderActionBtn = (label, subLabel, isActive, isDisabled, isActionLoading, onPress, themeColor) => {
        // Theme logic: When active, fill with color. When inactive, use strong modern border outline or light fill?
        // Let's use solid bold colors when actionable, light gray when disabled.
        const buttonBg = isDisabled ? '#F1F5F9' : (isActive ? themeColor : '#FFFFFF');
        const textColor = isDisabled ? '#94A3B8' : (isActive ? '#FFFFFF' : themeColor);
        const borderColor = isDisabled ? '#E2E8F0' : themeColor;

        return (
            <TouchableOpacity 
                style={[
                    styles.btnLayout, 
                    { backgroundColor: buttonBg, borderColor: borderColor, borderWidth: isActive ? 0 : 1.5 }
                ]}
                onPress={onPress}
                disabled={isDisabled || isActionLoading}
                activeOpacity={0.85}
            >
                {isActionLoading ? (
                    <ActivityIndicator color={textColor} size="small" />
                ) : (
                    <View style={styles.btnContent}>
                        <Text style={[styles.btnMainText, { color: textColor }]}>{label}</Text>
                        {subLabel ? <Text style={[styles.btnSubText, { color: textColor, opacity: 0.8 }]}>{subLabel}</Text> : null}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    const shift = user?.employee_details?.shift;
    const shiftString = shift ? `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}` : 'General (10AM-6PM)';

    return (
        <View style={styles.wrapper}>
            {/* Overview Sub-Header */}
            <View style={styles.dashMetaRow}>
                <View style={styles.profileBlock}>
                    <View style={styles.imgCircle}>
                        {user?.image ? <Image source={{ uri: user.image }} style={styles.avatar} /> : <Ionicons name="person" size={20} color="#94A3B8" />}
                    </View>
                    <View>
                        <Text style={styles.welcomeText}>Hi, {user?.name?.split(' ')[0] || 'Member'}</Text>
                        <Text style={styles.subDateText}>{new Date().toLocaleDateString('en-US', {weekday:'short', month:'short', day:'numeric'})}</Text>
                    </View>
                </View>

                {isLocked ? (
                    <View style={[styles.chip, styles.chipLocked]}>
                        <Ionicons name="lock-closed" size={12} color="#FFF" style={{marginRight:4}} />
                        <Text style={styles.chipTextLocked}>LOCKED</Text>
                    </View>
                ) : (
                    <View style={styles.chip}>
                        <Text style={styles.chipText}>{shiftString}</Text>
                    </View>
                )}
            </View>

            {/* Primary Interactive Button List */}
            <View style={styles.btnStack}>
                {renderActionBtn(
                    officeStatus.can_start ? "Punch In" : (officeStatus.can_end ? "Punch Out" : "Completed"),
                    "Office Space",
                    officeStatus.can_end, // Active state
                    (isLocked || isOnBreak || (!officeStatus.can_start && !officeStatus.can_end)),
                    (loadingAction === 'office' && actionLoading),
                    () => performAction('office', officeStatus.can_end ? 'punch-out' : 'punch-in'),
                    '#4F46E5'
                )}

                {renderActionBtn(
                    fieldStatus.can_start ? "Field In" : (fieldStatus.can_end ? "Field Out" : "Done"),
                    "Client Side",
                    fieldStatus.can_end, // Active state
                    (isLocked || isOnBreak || (!fieldStatus.can_start && !fieldStatus.can_end)),
                    (loadingAction === 'field' && actionLoading),
                    () => performAction('field', fieldStatus.can_end ? 'punch-out' : 'punch-in'),
                    '#0891B2'
                )}
            </View>

            {/* Break & Auxiliary Section */}
            <View style={styles.secondaryRow}>
                <TouchableOpacity 
                    style={[
                        styles.breakButton, 
                        isOnBreak && styles.breakButtonActive,
                        isLocked && styles.disabledBtnFade
                    ]}
                    disabled={isLocked || actionLoading}
                    onPress={() => performAction('break', 'break')}
                    activeOpacity={0.8}
                >
                    {loadingAction === 'break' && actionLoading ? (
                        <ActivityIndicator color={isOnBreak ? "#FFF" : "#D97706"} size="small" />
                    ) : (
                        <Text style={[styles.breakBtnText, isOnBreak && {color:'#FFF'}]}>{isOnBreak ? 'End Current Break' : 'Take a Break'}</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* Emergency/WFH Minimal Footer Bar - Only show if FIRST PUNCH NOT YET DONE */}
            {(!isLocked && officeStatus.can_start && fieldStatus.can_start && !isOnBreak && !officeStatus.last_action_time && !fieldStatus.last_action_time) && (
                <View style={styles.auxiliaryBar}>
                    <TouchableOpacity style={styles.auxBtn} onPress={() => performAction('emergency', 'punch-in')} disabled={actionLoading}>
                        <Text style={styles.auxBtnText}>Emergency</Text>
                    </TouchableOpacity>
                    <View style={styles.vDivider} />
                    <TouchableOpacity style={styles.auxBtn} onPress={() => performAction('wfh', 'punch-in')} disabled={actionLoading}>
                        <Text style={styles.auxBtnText}>Work from Home</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* Modernized Late Reason Modal */}
            <Modal visible={lateModalVisible} transparent animationType="slide" statusBarTranslucent onRequestClose={cleanupLocals}>
                <View style={styles.modalBackdrop}>
                    <View style={styles.modernModal}>
                        <View style={styles.modalHeader}>
                            <View style={styles.alertIconBox}>
                                <Ionicons name="time" size={24} color="#F59E0B" />
                            </View>
                            <Text style={styles.modalH1}>Report Reason</Text>
                            <Text style={styles.modalH2}>Logging attendance outside scheduled shift times requires a policy reason.</Text>
                        </View>

                        <ScrollView style={styles.modalScroll} bounces={false}>
                            {lateReasonOptions.length > 0 ? (
                                lateReasonOptions.map(item => (
                                    <TouchableOpacity 
                                        key={item.id} 
                                        style={[styles.optionRow, lateReason === item.reason && styles.optionRowSelected]}
                                        onPress={() => setLateReason(item.reason)}
                                    >
                                        <View style={[styles.radio, lateReason === item.reason && styles.radioActive]}>
                                            {lateReason === item.reason && <View style={styles.radioDot} />}
                                        </View>
                                        <Text style={[styles.optionText, lateReason === item.reason && styles.optionTextActive]}>{item.reason}</Text>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <TextInput
                                    style={styles.fancyInput}
                                    placeholder="Briefly explain delay..."
                                    value={lateReason}
                                    onChangeText={setLateReason}
                                    multiline
                                />
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={styles.fBtnCancel} onPress={cleanupLocals}>
                                <Text style={styles.fBtnCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.fBtnSubmit, !lateReason.trim() && {opacity:0.6}]} 
                                onPress={submitLateReason} 
                                disabled={!lateReason.trim() || actionLoading}
                            >
                                {actionLoading ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={styles.fBtnSubmitText}>Confirm Punch In</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        marginHorizontal: 16,
        marginBottom: 20,
    },
    dashMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingHorizontal: 4,
    },
    profileBlock: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    imgCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    welcomeText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        letterSpacing: -0.3,
    },
    subDateText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    chip: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#DBEAFE',
    },
    chipLocked: {
        backgroundColor: '#EF4444',
        borderColor: '#DC2626',
        flexDirection: 'row',
        alignItems: 'center',
    },
    chipText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#3B82F6',
    },
    chipTextLocked: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFF',
    },
    btnStack: {
        gap: 12,
        marginBottom: 16,
    },
    btnLayout: {
        width: '100%',
        borderRadius: 20,
        paddingVertical: 18,
        paddingHorizontal: 24,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    btnContent: {
        alignItems: 'center',
    },
    btnMainText: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    btnSubText: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    secondaryRow: {
        marginBottom: 16,
    },
    breakButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1.5,
        borderColor: '#FEF3C7',
        borderRadius: 16,
        paddingVertical: 14,
        gap: 8,
    },
    breakButtonActive: {
        backgroundColor: '#D97706',
        borderColor: '#B45309',
    },
    breakBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#D97706',
    },
    disabledBtnFade: {
        opacity: 0.5,
        borderColor: '#E2E8F0',
    },
    auxiliaryBar: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    auxBtn: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    auxBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    vDivider: {
        width: 1,
        height: '100%',
        backgroundColor: '#E2E8F0',
    },

    // MODAL DESIGN UPGRADE
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end',
    },
    modernModal: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '85%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 24,
    },
    modalHeader: {
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 20,
    },
    alertIconBox: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalH1: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 8,
    },
    modalH2: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
    modalScroll: {
        paddingHorizontal: 24,
        marginBottom: 20,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1.5,
        borderColor: '#F1F5F9',
    },
    optionRowSelected: {
        borderColor: '#F59E0B',
        backgroundColor: '#FFFBEB',
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    radioActive: {
        borderColor: '#F59E0B',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#F59E0B',
    },
    optionText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#475569',
        flex: 1,
    },
    optionTextActive: {
        color: '#B45309',
        fontWeight: '700',
    },
    fancyInput: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        padding: 16,
        fontSize: 16,
        color: '#1E293B',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    modalFooter: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
    },
    fBtnCancel: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
    },
    fBtnCancelText: {
        fontWeight: '700',
        color: '#475569',
    },
    fBtnSubmit: {
        flex: 2,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: '#1E293B',
        alignItems: 'center',
    },
    fBtnSubmitText: {
        fontWeight: '700',
        color: '#FFF',
    }
});

export default AttendanceActionCard;
