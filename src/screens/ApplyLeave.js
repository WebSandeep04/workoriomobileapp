import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Modal, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import Header from '../components/Header';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { fetchLeaveTypes, fetchLeaveHistory, applyLeave, clearLeaveMessages } from '../store/slices/leaveSlice';
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
    const [selectedType, setSelectedType] = useState(null); // { id, name }
    const [date, setDate] = useState('');
    const [reason, setReason] = useState('');

    // UI Local State
    const [modalVisible, setModalVisible] = useState(false);
    const [calendarVisible, setCalendarVisible] = useState(false);
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
            Alert.alert('Success', successMessage, [
                {
                    text: 'OK',
                    onPress: () => {
                        setDate('');
                        setReason('');
                        setSelectedType(null);
                        setActiveTab('history');
                        dispatch(clearLeaveMessages());
                    }
                }
            ]);
        }

        if (validationErrors) {
            // Map validation errors from API to local string for Alert
            const firstErrorKey = Object.keys(validationErrors)[0];
            const msg = firstErrorKey ? `Validation Error: ${validationErrors[firstErrorKey][0]}` : 'Please check your inputs';
            Alert.alert('Validation Failed', msg);
            dispatch(clearLeaveMessages());
        }

        if (reduxError) {
            Alert.alert('Error', reduxError);
            dispatch(clearLeaveMessages());
        }

    }, [successMessage, validationErrors, reduxError, dispatch]);


    const validate = () => {
        let valid = true;
        let newErrors = {};

        if (!date) {
            newErrors.date = 'Date is required (YYYY-MM-DD).';
            valid = false;
        } else {
            const regex = /^\d{4}-\d{2}-\d{2}$/;
            if (!regex.test(date)) {
                newErrors.date = 'Invalid format. Use YYYY-MM-DD.';
                valid = false;
            }
        }

        if (!selectedType) {
            newErrors.type = 'Please select a leave type.';
            valid = false;
        }

        setLocalErrors(newErrors);
        return valid;
    };

    const handleSubmit = () => {
        if (!validate()) return;

        const payload = {
            date: date,
            leave_type_id: selectedType.id,
            reason: reason,
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
        // Format YYYY-MM-DD
        // Use local time to avoid timezone offsets when formatting
        const year = selectedDate.getFullYear();
        const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(selectedDate.getDate()).padStart(2, '0');

        setDate(`${year}-${month}-${day}`);
        setCalendarVisible(false);
        if (localErrors.date) setLocalErrors(prev => ({ ...prev, date: null }));
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
                            const isSelected = date === dateStr;
                            const isToday = new Date().toDateString() === dayDate.toDateString();

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.dayCell,
                                        isSelected && styles.selectedDayCell,
                                        isToday && !isSelected && styles.todayCell
                                    ]}
                                    onPress={() => handleDateSelect(dayDate)}
                                >
                                    <Text style={[
                                        styles.dayText,
                                        isSelected && styles.selectedDayText,
                                        isToday && !isSelected && styles.todayText
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

    const renderHistoryItem = ({ item }) => {
        const formattedDate = item.date ? new Date(item.date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }) : '';

        return (
            <View style={styles.historyCard}>
                <View style={styles.historyRow}>
                    <View>
                        <Text style={styles.historyType}>{item.leave_type?.name || 'Leave'}</Text>
                        <Text style={styles.historyDate}>{formattedDate}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                    </View>
                </View>
                {item.reason ? (
                    <Text style={styles.historyReason} numberOfLines={2}>
                        {item.reason}
                    </Text>
                ) : null}
            </View>
        );
    };

    const renderTypeItem = ({ item }) => (
        <TouchableOpacity
            style={styles.modalItem}
            onPress={() => {
                setSelectedType(item);
                setModalVisible(false);
                setLocalErrors((prev) => ({ ...prev, type: null }));
            }}
        >
            <Text style={styles.modalItemText}>{item.name}</Text>
            {selectedType?.id === item.id && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
        </TouchableOpacity>
    );

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

                    {/* Date Input */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>Date <Text style={styles.required}>*</Text></Text>
                        <View style={[styles.inputRow, localErrors.date && styles.inputError]}>
                            <TextInput
                                style={styles.inputField}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={COLORS.textGray}
                                value={date}
                                onChangeText={(text) => {
                                    setDate(text);
                                    if (localErrors.date) setLocalErrors(prev => ({ ...prev, date: null }));
                                }}
                                keyboardType="numbers-and-punctuation"
                                maxLength={10}
                            />
                            <TouchableOpacity onPress={() => setCalendarVisible(true)}>
                                <Ionicons name="calendar-outline" size={20} color={COLORS.textGray} />
                            </TouchableOpacity>
                        </View>
                        {localErrors.date && <Text style={styles.errorText}>{localErrors.date}</Text>}
                    </View>

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

            {/* Custom Calendar Modal */}
            {renderCustomCalendar()}
        </View>
    );
};

export default ApplyLeave;
