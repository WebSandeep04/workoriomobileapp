import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TextInput, 
    TouchableOpacity, 
    FlatList, 
    ActivityIndicator, 
    RefreshControl, 
    Modal, 
    ScrollView, 
    KeyboardAvoidingView, 
    Platform 
} from 'react-native';
import Header from '../components/Header';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';

const AttendanceUnlockScreen = () => {
    // Data Store
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);

    // Request Execution Trigger Drawer/Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [targetDate, setTargetDate] = useState('');
    const [unlockReason, setUnlockReason] = useState('');
    
    // Embedded Calendar System State
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [pickerDate, setPickerDate] = useState(new Date());

    // UI Static Setup
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Lifecycle: Launch
    useEffect(() => {
        loadLogs(1);
    }, []);

    // API Integrations: GET Logs History
    const loadLogs = async (pageNum = 1, isRefreshMode = false) => {
        if (pageNum === 1) {
            if (!isRefreshMode) setLoading(true);
        } else {
            setLoadingMore(true);
        }

        try {
            let url = `/attendance/unlock-logs?page=${pageNum}`;
            if (searchQuery.trim().length > 0) {
                url += `&search=${encodeURIComponent(searchQuery)}`;
            }

            const response = await api.get(url);
            if (response.data?.success) {
                const freshLogs = response.data.data || [];
                const pagination = response.data.pagination || {};

                if (pageNum === 1) {
                    setLogs(freshLogs);
                } else {
                    setLogs(prev => [...prev, ...freshLogs]);
                }

                setPage(pagination.current_page || pageNum);
                setHasMore((pagination.current_page || pageNum) < (pagination.last_page || 1));
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Fetch Failed',
                    text2: response.data?.message || 'Unable to sync unlock history.'
                });
            }
        } catch (err) {
            console.error('[Unlock] error loading logs:', err);
            Toast.show({
                type: 'error',
                text1: 'Network Error',
                text2: err.response?.data?.message || 'Failed to contact API server.'
            });
        } finally {
            setLoading(false);
            setIsRefreshing(false);
            setLoadingMore(false);
        }
    };

    // Lifecycle triggers
    const handleSearch = () => {
        loadLogs(1);
    };

    const onRefresh = () => {
        setIsRefreshing(true);
        loadLogs(1, true);
    };

    const handleLoadMore = () => {
        if (hasMore && !loadingMore) {
            loadLogs(page + 1);
        }
    };

    // Embedded Custom Grid Calendar Helpers
    const generateDays = () => {
        const year = pickerDate.getFullYear();
        const month = pickerDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let days = [];
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
        setTargetDate(formatted);
        setCalendarVisible(false);
    };

    const changeMonth = (increment) => {
        const newDate = new Date(pickerDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setPickerDate(newDate);
    };

    // API Integration: Submit Unlock Request
    const handlePerformUnlock = async () => {
        // Basic valid checks
        if (!targetDate) {
            Toast.show({
                type: 'error',
                text1: 'Validation Failed',
                text2: 'Please specify the date to be unlocked.'
            });
            return;
        }
        if (!unlockReason.trim()) {
            Toast.show({
                type: 'error',
                text1: 'Validation Failed',
                text2: 'Please specify the reason for this override.'
            });
            return;
        }

        setActionLoading(true);
        try {
            const payload = {
                date: targetDate,
                reason: unlockReason.trim()
            };

            const response = await api.post('/attendance/unlock-by-date', payload);
            if (response.data?.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Unlock Successful',
                    text2: response.data.message || 'Successfully updated records.'
                });
                
                // Reset States & Reload
                setModalVisible(false);
                setTargetDate('');
                setUnlockReason('');
                loadLogs(1); // Reload logs history
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Execution Failed',
                    text2: response.data?.message || 'Unable to process request.'
                });
            }
        } catch (err) {
            console.error('[Unlock] execution failed:', err);
            Toast.show({
                type: 'error',
                text1: 'Action Failed',
                text2: err.response?.data?.message || 'A server error occurred.'
            });
        } finally {
            setActionLoading(false);
        }
    };

    // UI Piece: Calendar Modal Overlay
    const renderCustomCalendar = () => (
        <Modal transparent={true} visible={calendarVisible} animationType="fade" onRequestClose={() => setCalendarVisible(false)}>
            <TouchableOpacity style={styles.calendarOverlay} activeOpacity={1} onPress={() => setCalendarVisible(false)}>
                <View style={styles.calendarModal}>
                    <View style={styles.calendarHeader}>
                        <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.calNavBtn}>
                            <Ionicons name="chevron-back" size={22} color="#1E293B" />
                        </TouchableOpacity>
                        <Text style={styles.calTitle}>
                            {months[pickerDate.getMonth()]} {pickerDate.getFullYear()}
                        </Text>
                        <TouchableOpacity onPress={() => changeMonth(1)} style={styles.calNavBtn}>
                            <Ionicons name="chevron-forward" size={22} color="#1E293B" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.calWeekRow}>
                        {weekDays.map((day, index) => (
                            <Text key={index} style={styles.calWeekText}>{day}</Text>
                        ))}
                    </View>

                    <View style={styles.calGrid}>
                        {generateDays().map((dayDate, index) => {
                            if (!dayDate) return <View key={index} style={styles.calCell} />;

                            const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
                            const isSelected = targetDate === dateStr;
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const isToday = today.toDateString() === dayDate.toDateString();

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.calCell,
                                        isSelected && styles.calCellSelected,
                                        isToday && !isSelected && styles.calCellToday
                                    ]}
                                    onPress={() => handleDateSelect(dayDate)}
                                >
                                    <Text style={[
                                        styles.calCellText,
                                        isSelected && styles.calCellTextSelected,
                                        isToday && !isSelected && styles.calCellTextToday
                                    ]}>
                                        {dayDate.getDate()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity style={styles.calCloseBtn} onPress={() => setCalendarVisible(false)}>
                        <Text style={styles.calCloseBtnText}>Close Calendar</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    // UI Piece: Individual Log Row Card
    const renderLogItem = ({ item }) => (
        <View style={styles.logCard}>
            <View style={styles.logCardHead}>
                <View style={styles.unlockedDateBadge}>
                    <Ionicons name="calendar-outline" size={13} color="#EF4444" />
                    <Text style={styles.unlockedDateBadgeTxt}>Unlocked For: {item.unlock_date}</Text>
                </View>
                <Text style={styles.logTimestamp}>{item.created_at}</Text>
            </View>

            <View style={styles.logCardBody}>
                <Text style={styles.logLabel}>Reason:</Text>
                <Text style={styles.logReason} numberOfLines={3}>"{item.reason}"</Text>

                <View style={styles.logFooterDivider} />

                <View style={styles.logMetaRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="person-circle-outline" size={14} color="#64748B" />
                        <Text style={styles.metaVal} numberOfLines={1}>By: {item.unlocked_by}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons name="shield-checkmark-outline" size={14} color="#10B981" />
                        <Text style={[styles.metaVal, { color: '#10B981', fontWeight: 'bold' }]}>Done</Text>
                    </View>
                </View>
            </View>
        </View>
    );

    // UI Render Engine
    return (
        <View style={styles.container}>
            <Header title="Unlock Attendance" />

            {/* Utility/Action Dock */}
            <View style={styles.utilityDock}>
                <View style={styles.searchDock}>
                    <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search logs by reason or author..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); setTimeout(() => loadLogs(1), 50); }}>
                            <Ionicons name="close-circle" size={15} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity style={styles.triggerActionBtn} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add" size={20} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Logs FlatList Stream */}
            {loading ? (
                <View style={styles.centerLoad}>
                    <ActivityIndicator size="large" color="#434AFA" />
                    <Text style={styles.loadTxt}>Syncing admin audit history...</Text>
                </View>
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderLogItem}
                    contentContainerStyle={styles.listPadding}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.2}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#434AFA']} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons name="shield-outline" size={56} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>No Override Logs</Text>
                            <Text style={styles.emptySub}>History of manual unlocks will appear here.</Text>
                        </View>
                    }
                    ListFooterComponent={
                        loadingMore ? (
                            <View style={{ paddingVertical: 16 }}>
                                <ActivityIndicator size="small" color="#434AFA" />
                            </View>
                        ) : null
                    }
                />
            )}

            {/* MODAL DRAWERS: EXECUTE OVERRIDE ACTION */}
            <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView 
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                    <View style={styles.dialogOverlay}>
                        <View style={styles.dialogSheet}>
                            {/* Modal Head */}
                            <View style={styles.dialogHead}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={styles.headIconCircle}>
                                        <Ionicons name="unlock-outline" size={18} color="#FFF" />
                                    </View>
                                    <Text style={styles.dialogTitle}>Unlock By Date</Text>
                                </View>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.dialogCloseBtn}>
                                    <Ionicons name="close" size={22} color="#64748B" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.dialogBody} keyboardShouldPersistTaps="handled">
                                <Text style={styles.helperMessage}>
                                    This admin override releases the locking mechanisms and reverts approval status for ALL attendance logs across the organization on the chosen date.
                                </Text>

                                {/* Form Input: Date Choice */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Target Unlock Date <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <TouchableOpacity style={styles.customInputTrigger} onPress={() => setCalendarVisible(true)}>
                                        <Text style={[styles.triggerText, targetDate ? { color: '#1E293B' } : { color: '#94A3B8' }]}>
                                            {targetDate ? targetDate : 'YYYY-MM-DD'}
                                        </Text>
                                        <Ionicons name="calendar" size={18} color="#64748B" />
                                    </TouchableOpacity>
                                </View>

                                {/* Form Input: Override Logs Reasoning */}
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Audit Reason / Remarks <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <TextInput
                                        style={[styles.formTextInput, styles.textArea]}
                                        placeholder="Provide internal remarks outlining why this backdate unlock is required..."
                                        placeholderTextColor="#94A3B8"
                                        value={unlockReason}
                                        onChangeText={setUnlockReason}
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                    />
                                </View>
                            </ScrollView>

                            {/* Footer Panel Commit Button */}
                            <View style={styles.dialogFooter}>
                                <TouchableOpacity 
                                    style={styles.cancelBtn} 
                                    onPress={() => setModalVisible(false)}
                                    disabled={actionLoading}
                                >
                                    <Text style={styles.cancelBtnText}>Discard</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[styles.commitBtn, actionLoading && { opacity: 0.7 }]} 
                                    onPress={handlePerformUnlock}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <ActivityIndicator color="#FFF" size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="shield-checkmark" size={16} color="#FFF" />
                                            <Text style={styles.commitBtnText}>Confirm Unlock</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Embedded Custom Grid Modal */}
            {renderCustomCalendar()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    
    // Toolbar layout
    utilityDock: { 
        flexDirection: 'row', 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        backgroundColor: '#FFF',
        borderBottomWidth: 1, 
        borderBottomColor: '#E2E8F0', 
        gap: 10, 
        alignItems: 'center' 
    },
    searchDock: { 
        flex: 1, 
        flexDirection: 'row', 
        backgroundColor: '#F1F5F9', 
        borderRadius: 8, 
        alignItems: 'center', 
        paddingHorizontal: 12, 
        height: 42 
    },
    searchInput: { 
        flex: 1, 
        fontSize: 13, 
        color: '#1E293B', 
        paddingVertical: 0,
        height: '100%'
    },
    triggerActionBtn: { 
        backgroundColor: '#434AFA', 
        width: 42, 
        height: 42, 
        borderRadius: 8, 
        justifyContent: 'center', 
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#434AFA',
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
    },

    // Center loaders and states
    centerLoad: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    loadTxt: { color: '#64748B', marginTop: 12, fontSize: 13 },
    listPadding: { padding: 16, paddingBottom: 80 },
    
    // Cards UI tokens
    logCard: { 
        backgroundColor: '#FFF', 
        borderRadius: 10, 
        marginBottom: 12, 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        overflow: 'hidden',
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowOffset: { width: 0, height: 1 }
    },
    logCardHead: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: '#F8FAFC', 
        paddingHorizontal: 12, 
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0'
    },
    unlockedDateBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 5, 
        backgroundColor: '#FEF2F2', 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 6 
    },
    unlockedDateBadgeTxt: { color: '#EF4444', fontSize: 11, fontWeight: '800' },
    logTimestamp: { color: '#94A3B8', fontSize: 10 },
    logCardBody: { padding: 12 },
    logLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 2 },
    logReason: { fontSize: 12, color: '#334155', lineHeight: 18, fontWeight: '500' },
    logFooterDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
    logMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    metaVal: { fontSize: 11, color: '#64748B', fontWeight: '500' },

    // Empty list setup
    emptyBox: { padding: 60, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginTop: 16 },
    emptySub: { fontSize: 12, color: '#64748B', marginTop: 6, textAlign: 'center' },

    // Modal Sheets layouts
    dialogOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
    dialogSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%' },
    dialogHead: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: '#F1F5F9' 
    },
    headIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
    dialogTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    dialogCloseBtn: { padding: 4 },
    dialogBody: { padding: 16 },
    helperMessage: { 
        fontSize: 12, 
        color: '#64748B', 
        backgroundColor: '#F8FAFC', 
        padding: 12, 
        borderRadius: 8, 
        lineHeight: 18, 
        borderLeftWidth: 3, 
        borderLeftColor: '#EF4444',
        marginBottom: 20
    },
    
    // Form elements
    inputGroup: { marginBottom: 16 },
    inputLabel: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
    customInputTrigger: { 
        height: 46, 
        borderRadius: 8, 
        borderWidth: 1, 
        borderColor: '#CBD5E1', 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: 12, 
        backgroundColor: '#FFF' 
    },
    triggerText: { fontSize: 13, fontWeight: '500' },
    formTextInput: { 
        borderWidth: 1, 
        borderColor: '#CBD5E1', 
        borderRadius: 8, 
        paddingHorizontal: 12, 
        fontSize: 13, 
        color: '#1E293B', 
        backgroundColor: '#FFF' 
    },
    textArea: { height: 90, paddingTop: 10 },
    
    // Dialog footer actions
    dialogFooter: { 
        flexDirection: 'row', 
        paddingHorizontal: 16, 
        paddingTop: 12, 
        paddingBottom: 30, 
        borderTopWidth: 1, 
        borderTopColor: '#F1F5F9', 
        gap: 12 
    },
    cancelBtn: { flex: 1, height: 46, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
    cancelBtnText: { color: '#64748B', fontWeight: '700', fontSize: 14 },
    commitBtn: { 
        flex: 1.5, 
        height: 46, 
        backgroundColor: '#EF4444', 
        borderRadius: 8, 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: 8 
    },
    commitBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

    // Custom Embedded Calendar Styles
    calendarOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    calendarModal: { backgroundColor: '#FFF', borderRadius: 12, width: '100%', padding: 16, elevation: 8 },
    calendarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    calTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    calNavBtn: { padding: 6, borderRadius: 6, backgroundColor: '#F1F5F9' },
    calWeekRow: { flexDirection: 'row', marginBottom: 8 },
    calWeekText: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#94A3B8' },
    calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calCell: { width: '14.28%', height: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 4, borderRadius: 6 },
    calCellSelected: { backgroundColor: '#434AFA' },
    calCellToday: { borderWidth: 1, borderColor: '#434AFA' },
    calCellText: { fontSize: 12, color: '#334155', fontWeight: '500' },
    calCellTextSelected: { color: '#FFF', fontWeight: '800' },
    calCellTextToday: { color: '#434AFA', fontWeight: '800' },
    calCloseBtn: { marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', alignItems: 'center' },
    calCloseBtnText: { color: '#434AFA', fontWeight: '700', fontSize: 13 }
});

export default AttendanceUnlockScreen;
