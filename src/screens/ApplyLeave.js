import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Modal, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import Header from '../components/Header';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLeaveTypes, fetchLeaveHistory, applyLeave, clearLeaveMessages, cancelLeave } from '../store/slices/leaveSlice';
import { useFocusEffect } from '@react-navigation/native';
import { styles, COLORS } from '../css/ApplyLeaveStyles';

const ApplyLeave = ({ navigation }) => {
    const dispatch = useDispatch();
    const {
        leaveTypes,
        history,
        loadingTypes,
        loadingHistory,
        submitting,
        error: reduxError,
        successMessage,
        validationErrors
    } = useSelector(state => state.leave);

    // UI/Form State
    const [activeTab, setActiveTab] = useState('apply'); // 'apply' | 'history'
    const [selectedType, setSelectedType] = useState(null); // Full Type Object
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    // Half-Day / Specific Type Extensions
    const [isHalfDay, setIsHalfDay] = useState(false);
    const [halfDayPeriod, setHalfDayPeriod] = useState('pre_lunch'); // 'pre_lunch' | 'post_lunch'
    const [selectedRh, setSelectedRh] = useState(null);

    // UI System State
    const [modalVisible, setModalVisible] = useState(false); // Leave Type Selection Modal
    const [rhModalVisible, setRhModalVisible] = useState(false); // RH selection list modal
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [calendarTarget, setCalendarTarget] = useState('start'); // 'start' | 'end'
    const [pickerDate, setPickerDate] = useState(new Date());
    const [localErrors, setLocalErrors] = useState({});

    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Initial Load & Cleanup
    useEffect(() => {
        dispatch(fetchLeaveTypes());
        return () => {
            dispatch(clearLeaveMessages());
        };
    }, [dispatch]);

    // Handle Tab Changes
    useEffect(() => {
        if (activeTab === 'history') {
            dispatch(fetchLeaveHistory());
        }
    }, [activeTab, dispatch]);

    // Handle Redux Side Effects
    useEffect(() => {
        if (successMessage) {
            Toast.show({
                type: 'success',
                text1: 'Application Successful',
                text2: successMessage
            });
            
            // Auto reset form
            setStartDate('');
            setEndDate('');
            setReason('');
            setSelectedType(null);
            setIsHalfDay(false);
            setSelectedRh(null);
            setActiveTab('history');
            dispatch(clearLeaveMessages());
        }

        if (validationErrors) {
            // Map validation errors from API to local string
            const firstErrorKey = Object.keys(validationErrors)[0];
            const msg = firstErrorKey ? validationErrors[firstErrorKey][0] : 'Please check your inputs';
            
            Toast.show({
                type: 'error',
                text1: 'Validation Failed',
                text2: msg
            });
            dispatch(clearLeaveMessages());
        }

        if (reduxError) {
            Toast.show({
                type: 'error',
                text1: 'Action Failed',
                text2: reduxError
            });
            dispatch(clearLeaveMessages());
        }

    }, [successMessage, validationErrors, reduxError, dispatch]);


    const validate = () => {
        let valid = true;
        let newErrors = {};

        if (!selectedType) {
            newErrors.type = 'Please select a leave type.';
            valid = false;
        }

        // If restricted holiday, we require a selection from the RH dropdown instead of direct calendar
        if (selectedType?.is_restricted) {
            if (!selectedRh) {
                newErrors.rh = 'Please select a Holiday from the list.';
                valid = false;
            }
        } else {
            const regex = /^\d{4}-\d{2}-\d{2}$/;

            if (!startDate) {
                newErrors.startDate = 'Start date is required.';
                valid = false;
            } else if (!regex.test(startDate)) {
                newErrors.startDate = 'Invalid format. Use YYYY-MM-DD.';
                valid = false;
            } else {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                
                const chosen = new Date(startDate);
                chosen.setHours(0, 0, 0, 0);
                
                if (chosen < tomorrow) {
                    newErrors.startDate = 'Leave can only be applied starting from Tomorrow.';
                    valid = false;
                }
            }

            // If not half day, need end date.
            if (!isHalfDay) {
                if (!endDate) {
                    newErrors.endDate = 'End date is required.';
                    valid = false;
                } else if (!regex.test(endDate)) {
                    newErrors.endDate = 'Invalid format. Use YYYY-MM-DD.';
                    valid = false;
                } else if (new Date(endDate) < new Date(startDate)) {
                    newErrors.endDate = 'End date cannot be before start date.';
                    valid = false;
                }
            }
        }

        setLocalErrors(newErrors);
        return valid;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        let finalStart = startDate;
        let finalEnd = isHalfDay ? startDate : endDate;

        // Overrides for Restricted Holiday mapping
        if (selectedType?.is_restricted && selectedRh) {
            finalStart = selectedRh.holiday_date;
            finalEnd = selectedRh.holiday_date;
        }

        const payload = {
            start_date: finalStart,
            end_date: finalEnd,
            leave_type_id: selectedType.id,
            reason: reason,
            is_half_day: isHalfDay,
            half_day_period: isHalfDay ? halfDayPeriod : null
        };

        dispatch(applyLeave(payload));
    };

    const onRefreshHistory = useCallback(() => {
        dispatch(fetchLeaveHistory());
    }, [dispatch]);

    // Calendar Helpers
    const generateDays = () => {
        const year = pickerDate.getFullYear();
        const month = pickerDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let days = [];

        // Empty slots for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    };

    const handleDateSelect = (selectedDate) => {
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;

        if (calendarTarget === 'start') {
            setStartDate(formatted);
            // If user selected a start date but no end date yet, help them by defaulting end date to same initially
            if (!endDate || isHalfDay) setEndDate(formatted);
            if (localErrors.startDate) setLocalErrors(prev => ({ ...prev, startDate: null }));
        } else {
            setEndDate(formatted);
            if (localErrors.endDate) setLocalErrors(prev => ({ ...prev, endDate: null }));
        }

        setCalendarVisible(false);
    };

    const changeMonth = (increment) => {
        const newDate = new Date(pickerDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setPickerDate(newDate);
    };

    const renderCustomCalendar = () => (
        <Modal
            transparent={true}
            visible={calendarVisible}
            animationType="fade"
            onRequestClose={() => setCalendarVisible(false)}
        >
            <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setCalendarVisible(false)}>
                <View style={[styles.modalContent, styles.calendarModal]}>
                    {/* Calendar Header */}
                    <View style={styles.calendarHeader}>
                        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavBtn}>
                            <Ionicons name="chevron-back" size={24} color={COLORS.textDark} />
                        </TouchableOpacity>
                        <Text style={styles.monthTitle}>
                            {months[pickerDate.getMonth()]} {pickerDate.getFullYear()}
                        </Text>
                        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavBtn}>
                            <Ionicons name="chevron-forward" size={24} color={COLORS.textDark} />
                        </TouchableOpacity>
                    </View>

                    {/* Week Days Header */}
                    <View style={styles.weekRow}>
                        {weekDays.map((day, index) => (
                            <Text key={index} style={styles.weekDayText}>{day}</Text>
                        ))}
                    </View>

                    {/* Days Grid */}
                    <View style={styles.daysGrid}>
                        {generateDays().map((dayDate, index) => {
                            if (!dayDate) return <View key={index} style={styles.dayCell} />;

                            const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
                            const activeCompare = calendarTarget === 'start' ? startDate : endDate;
                            const isSelected = activeCompare === dateStr;
                            
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const tomorrow = new Date(today);
                            tomorrow.setDate(today.getDate() + 1);
                            
                            const cellDate = new Date(dayDate);
                            cellDate.setHours(0, 0, 0, 0);

                            // Disable logic: Start from today + 1
                            const isDisabled = cellDate < tomorrow;
                            const isToday = today.toDateString() === cellDate.toDateString();

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.dayCell,
                                        isSelected && styles.selectedDayCell,
                                        isToday && !isSelected && styles.todayCell,
                                        isDisabled && { opacity: 0.4 }
                                    ]}
                                    onPress={() => !isDisabled && handleDateSelect(dayDate)}
                                    disabled={isDisabled}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        isSelected && styles.selectedDayText,
                                        isToday && !isSelected && styles.todayText,
                                        isDisabled && { color: '#CBD5E1' }
                                    ]}>
                                        {dayDate.getDate()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity style={styles.closeBtn} onPress={() => setCalendarVisible(false)}>
                        <Text style={styles.closeBtnText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved': return '#10B981'; // Green
            case 'pending': return '#F59E0B'; // Amber
            case 'rejected': return '#EF4444'; // Red
            default: return COLORS.textGray;
        }
    };

    const handleCancel = (leaveId) => {
        Alert.alert(
            'Cancel Leave',
            'Are you sure you want to cancel this leave request? Any deducted balance will be automatically refunded.',
            [
                { text: 'No', style: 'cancel' },
                { text: 'Yes, Cancel', style: 'destructive', onPress: () => dispatch(cancelLeave(leaveId)) }
            ]
        );
    };

    const renderHistoryItem = ({ item }) => {
        const sDateStr = item.start_date ? new Date(item.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
        const eDateStr = item.end_date ? new Date(item.end_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

        const isSingleDay = item.start_date === item.end_date;
        const rangeDisplay = isSingleDay ? new Date(item.start_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : `${sDateStr} - ${eDateStr}`;

        return (
            <View style={styles.historyCard}>
                <View style={styles.historyRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.historyType}>{item.leave_type?.name || 'Leave'}</Text>
                        <Text style={styles.historyDate}>{rangeDisplay}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                {item.status?.toUpperCase()}
                            </Text>
                        </View>
                        <Text style={{ fontSize: 11, color: COLORS.textGray, marginTop: 4, fontWeight: '600' }}>
                            {parseFloat(item.total_days || 0).toFixed(1)} Days
                        </Text>
                    </View>
                </View>

                {item.reason ? (
                    <View style={{ marginTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 8 }}>
                        <Text style={[styles.historyReason, { fontStyle: 'italic' }]}>"{item.reason}"</Text>
                    </View>
                ) : null}

                {/* Show Cancel Action if Pending */}
                {item.status?.toLowerCase() === 'pending' && (
                    <TouchableOpacity
                        style={{ marginTop: 12, padding: 10, backgroundColor: '#FEF2F2', borderRadius: 8, alignItems: 'center' }}
                        onPress={() => handleCancel(item.id)}
                    >
                        <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 13 }}>Cancel Request</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderTypeItem = ({ item }) => {
        const hasInfBalance = item.is_unlimited;
        const displayBal = hasInfBalance ? 'Unlimited' : parseFloat(item.balance || 0).toFixed(1);

        return (
            <TouchableOpacity
                style={styles.modalItem}
                onPress={() => {
                    setSelectedType(item);
                    setModalVisible(false);
                    setLocalErrors((prev) => ({ ...prev, type: null }));
                    // Auto-reset extra fields when type flips
                    setIsHalfDay(false);
                    setSelectedRh(null);
                }}
            >
                <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemText}>{item.name}</Text>
                    <Text style={{ fontSize: 12, color: COLORS.primary, fontWeight: '600', marginTop: 2 }}>
                        Remaining: {displayBal}
                    </Text>
                </View>
                {selectedType?.id === item.id && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <Header title="Leave Management" />

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'apply' && styles.activeTab]}
                    onPress={() => setActiveTab('apply')}
                >
                    <Text style={[styles.tabText, activeTab === 'apply' && styles.activeTabText]}>New Request</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'apply' ? (
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Leave Type Selector */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Leave Type <Text style={styles.required}>*</Text></Text>
                        <TouchableOpacity
                            style={[styles.input, styles.selector, localErrors.type && styles.inputError]}
                            onPress={() => setModalVisible(true)}
                        >
                            <Text style={selectedType ? styles.inputText : styles.placeholder}>
                                {selectedType ? selectedType.name : 'Select Leave Type'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={COLORS.textGray} />
                        </TouchableOpacity>
                        {localErrors.type && <Text style={styles.errorText}>{localErrors.type}</Text>}
                    </View>

                    {selectedType?.is_restricted ? (
                        /* RESTRICTED HOLIDAY PICKER */
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Select Restricted Holiday <Text style={styles.required}>*</Text></Text>
                            <TouchableOpacity
                                style={[styles.input, styles.selector, localErrors.rh && styles.inputError]}
                                onPress={() => setRhModalVisible(true)}
                            >
                                <View>
                                    <Text style={selectedRh ? styles.inputText : styles.placeholder}>
                                        {selectedRh ? selectedRh.name : 'Select an Available Holiday'}
                                    </Text>
                                    {selectedRh && (
                                        <Text style={{ fontSize: 12, color: COLORS.textGray, marginTop: 2 }}>
                                            {new Date(selectedRh.holiday_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                        </Text>
                                    )}
                                </View>
                                <Ionicons name="calendar" size={20} color={COLORS.textGray} />
                            </TouchableOpacity>
                            {localErrors.rh && <Text style={styles.errorText}>{localErrors.rh}</Text>}
                            <Text style={{ fontSize: 12, color: '#64748B', fontStyle: 'italic', marginTop: 4 }}>
                                * Restricted Holidays are predetermined locked dates.
                            </Text>
                        </View>
                    ) : (
                        /* STANDARD DATE SELECTION */
                        <>
                            {/* Start Date Input */}
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Start Date <Text style={styles.required}>*</Text></Text>
                                <View style={[styles.inputRow, localErrors.startDate && styles.inputError]}>
                                    <TextInput
                                        style={styles.inputField}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={COLORS.textGray}
                                        value={startDate}
                                        onChangeText={(text) => {
                                            setStartDate(text);
                                            if (localErrors.startDate) setLocalErrors(prev => ({ ...prev, startDate: null }));
                                        }}
                                        keyboardType="numbers-and-punctuation"
                                        maxLength={10}
                                    />
                                    <TouchableOpacity onPress={() => { setCalendarTarget('start'); setCalendarVisible(true); }}>
                                        <Ionicons name="calendar-outline" size={20} color={COLORS.textGray} />
                                    </TouchableOpacity>
                                </View>
                                {localErrors.startDate && <Text style={styles.errorText}>{localErrors.startDate}</Text>}
                            </View>

                            {/* Half Day Switch (Only visible if allowed by Type) */}
                            {selectedType?.allow_half_day === 1 && (
                                <View style={{ marginBottom: 16, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                                    <TouchableOpacity
                                        style={{ flexDirection: 'row', alignItems: 'center' }}
                                        onPress={() => {
                                            setIsHalfDay(!isHalfDay);
                                            if (!isHalfDay) setEndDate(startDate); // Lock end date immediately
                                        }}
                                    >
                                        <Ionicons
                                            name={isHalfDay ? "checkbox" : "square-outline"}
                                            size={24}
                                            color={isHalfDay ? COLORS.primary : COLORS.textGray}
                                        />
                                        <Text style={{ marginLeft: 8, fontWeight: '600', color: COLORS.textDark }}>
                                            Apply as Half-Day
                                        </Text>
                                    </TouchableOpacity>

                                    {isHalfDay && (
                                        <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
                                            <TouchableOpacity
                                                style={{ flex: 1, padding: 10, borderWidth: 1, borderColor: halfDayPeriod === 'pre_lunch' ? COLORS.primary : '#CBD5E1', borderRadius: 8, backgroundColor: halfDayPeriod === 'pre_lunch' ? '#EFF6FF' : 'white', alignItems: 'center' }}
                                                onPress={() => setHalfDayPeriod('pre_lunch')}
                                            >
                                                <Text style={{ color: halfDayPeriod === 'pre_lunch' ? COLORS.primary : '#64748B', fontWeight: '600' }}>First Half</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={{ flex: 1, padding: 10, borderWidth: 1, borderColor: halfDayPeriod === 'post_lunch' ? COLORS.primary : '#CBD5E1', borderRadius: 8, backgroundColor: halfDayPeriod === 'post_lunch' ? '#EFF6FF' : 'white', alignItems: 'center' }}
                                                onPress={() => setHalfDayPeriod('post_lunch')}
                                            >
                                                <Text style={{ color: halfDayPeriod === 'post_lunch' ? COLORS.primary : '#64748B', fontWeight: '600' }}>Second Half</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* End Date Input (Hidden if isHalfDay locked) */}
                            {!isHalfDay && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>End Date <Text style={styles.required}>*</Text></Text>
                                    <View style={[styles.inputRow, localErrors.endDate && styles.inputError]}>
                                        <TextInput
                                            style={styles.inputField}
                                            placeholder="YYYY-MM-DD"
                                            placeholderTextColor={COLORS.textGray}
                                            value={endDate}
                                            onChangeText={(text) => {
                                                setEndDate(text);
                                                if (localErrors.endDate) setLocalErrors(prev => ({ ...prev, endDate: null }));
                                            }}
                                            keyboardType="numbers-and-punctuation"
                                            maxLength={10}
                                        />
                                        <TouchableOpacity onPress={() => { setCalendarTarget('end'); setCalendarVisible(true); }}>
                                            <Ionicons name="calendar-outline" size={20} color={COLORS.textGray} />
                                        </TouchableOpacity>
                                    </View>
                                    {localErrors.endDate && <Text style={styles.errorText}>{localErrors.endDate}</Text>}
                                </View>
                            )}
                        </>
                    )}

                    {/* Reason Input */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Reason</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Enter reason for leave..."
                            placeholderTextColor={COLORS.textGray}
                            value={reason}
                            onChangeText={setReason}
                            multiline
                            textAlignVertical="top"
                        />
                    </View>

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.submitButtonText}>Submit Application</Text>
                        )}
                    </TouchableOpacity>

                </ScrollView>
            ) : (
                <View style={styles.listContainer}>
                    {loadingHistory ? (
                        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
                    ) : (
                        <FlatList
                            data={history}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderHistoryItem}
                            contentContainerStyle={styles.listContent}
                            refreshControl={
                                <RefreshControl refreshing={loadingHistory} onRefresh={onRefreshHistory} />
                            }
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>No leave history found.</Text>
                            }
                        />
                    )}
                </View>
            )}

            {/* Type Selection Modal */}
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={() => setModalVisible(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Leave Type</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textDark} />
                            </TouchableOpacity>
                        </View>
                        {loadingTypes ? (
                            <ActivityIndicator size="large" color={COLORS.primary} style={{ margin: 20 }} />
                        ) : (
                            <FlatList
                                data={leaveTypes}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={renderTypeItem}
                            />
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Restricted Holidays Selection Modal */}
            <Modal
                transparent={true}
                visible={rhModalVisible}
                animationType="slide"
                onRequestClose={() => setRhModalVisible(false)}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRhModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Choose Restricted Holiday</Text>
                            <TouchableOpacity onPress={() => setRhModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.textDark} />
                            </TouchableOpacity>
                        </View>
                        {selectedType?.rh_list && selectedType.rh_list.length > 0 ? (
                            <FlatList
                                data={selectedType.rh_list}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={[styles.modalItem, { paddingVertical: 16 }]}
                                        onPress={() => {
                                            setSelectedRh(item);
                                            setRhModalVisible(false);
                                            if (localErrors.rh) setLocalErrors(prev => ({ ...prev, rh: null }));
                                        }}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.modalItemText, { fontWeight: '700' }]}>{item.name}</Text>
                                            <Text style={{ color: COLORS.textGray, marginTop: 4 }}>
                                                {new Date(item.holiday_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                            </Text>
                                        </View>
                                        {selectedRh?.id === item.id && <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />}
                                    </TouchableOpacity>
                                )}
                            />
                        ) : (
                            <View style={{ padding: 30, alignItems: 'center' }}>
                                <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
                                <Text style={{ marginTop: 12, color: '#64748B', textAlign: 'center' }}>No restricted holidays are available for this cycle.</Text>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* Custom Calendar Modal */}
            {renderCustomCalendar()}
        </View>
    );
};

export default ApplyLeave;
