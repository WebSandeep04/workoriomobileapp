import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Modal,
    Animated,
    Dimensions,
    RefreshControl,
    StatusBar,
    TextInput,
    Switch,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import Header from '../components/Header';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CalendarScreen({ navigation }) {
    const [currentDate, setCurrentDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Remote General Calendar Data
    const [markedDates, setMarkedDates] = useState({});
    const [events, setEvents] = useState([]);

    // --- Social Handles / Client Work states ---
    const [socialLoading, setSocialLoading] = useState(false);
    const [clients, setClients] = useState([]);
    const [clientHandles, setClientHandles] = useState({});
    const [checkedHandles, setCheckedHandles] = useState({});
    const [statuses, setStatuses] = useState([]);
    const [clientStatuses, setClientStatuses] = useState({});
    const [clientMissedReasons, setClientMissedReasons] = useState({});
    const [clientDescriptions, setClientDescriptions] = useState({});
    const [checkedChecklistOptions, setCheckedChecklistOptions] = useState({});
    const [missedReasons, setMissedReasons] = useState([]);
    
    // Cache for dynamic status-checklists schema to prevent duplicate fetches
    // Format: { [statusId]: { checklists: [], options: [] } }
    const [checklistSchemas, setChecklistSchemas] = useState({});

    // Picker selection sub-modal state
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerType, setPickerType] = useState(''); // 'status', 'missed_reason'
    const [activeClientId, setActiveClientId] = useState(null);
    const [pickerOptions, setPickerOptions] = useState([]);

    // Modal / Bottom Sheet Controls
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

    // Fetch main calendar grid whenever date ranges change
    useEffect(() => {
        loadCalendarData();
    }, [currentDate]);

    const loadCalendarData = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const pivot = dayjs(currentDate);
            const fromDate = pivot.startOf('month').subtract(7, 'day').format('YYYY-MM-DD');
            const toDate = pivot.endOf('month').add(7, 'day').format('YYYY-MM-DD');

            const response = await api.get('/calendar/events', {
                params: { from: fromDate, to: toDate }
            });

            if (response.data && response.data.success) {
                setEvents(response.data.events || []);
                
                const dbMarked = response.data.markedDates || {};
                const formattedMarked = {};
                
                Object.keys(dbMarked).forEach(key => {
                    formattedMarked[key] = {
                        marked: true,
                        dots: dbMarked[key].dots || []
                    };
                });

                setMarkedDates(formattedMarked);
            }
        } catch (error) {
            console.log('Calendar sync error:', error);
            Toast.show({ type: 'error', text1: 'Unable to fetch calendar feeds.' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Triggered when a cell is tapped on the calendar
    const handleDateSelect = (day) => {
        const dateStr = day.dateString;
        setSelectedDate(dateStr);
        
        // Fetch deep social data configurations for this specific date
        fetchSocialDetails(dateStr);
        
        openDetailSheet();
    };

    const fetchSocialDetails = async (dateStr) => {
        setSocialLoading(true);
        try {
            const resp = await api.get(`/calendar/date/${dateStr}/handles`);
            if (resp.data && resp.data.success) {
                const data = resp.data;
                setClients(data.clients || []);
                setClientHandles(data.client_handles || {});
                setCheckedHandles(data.checked_handles || {});
                setStatuses(data.statuses || []);
                setClientStatuses(data.client_statuses || {});
                setClientMissedReasons(data.client_missed_reasons || {});
                setClientDescriptions(data.client_descriptions || {});
                setCheckedChecklistOptions(data.checked_checklist_options || {});
                setMissedReasons(data.missed_reasons || []);

                // Pre-fetch schemas for currently assigned client statuses

                // Pre-fetch schemas for currently assigned client statuses
                if (data.client_statuses) {
                    Object.values(data.client_statuses).forEach(statusId => {
                        if (statusId) fetchChecklistSchema(statusId);
                    });
                }
            }
        } catch (e) {
            console.log('Social data error:', e);
            Toast.show({ type: 'error', text1: 'Error pulling post schedules.' });
        } finally {
            setSocialLoading(false);
        }
    };

    const fetchChecklistSchema = async (statusId) => {
        if (checklistSchemas[statusId]) return; // cache hit
        try {
            const resp = await api.get(`/calendar/status/${statusId}/checklists`);
            if (resp.data) {
                setChecklistSchemas(prev => ({
                    ...prev,
                    [statusId]: {
                        checklists: resp.data.checklists || [],
                        options: resp.data.options || []
                    }
                }));
            }
        } catch (e) {
            console.log('Error pulling checklist schema:', e);
        }
    };

    // Live Toggle of social post handle checkboxes
    const handleSocialHandleToggle = async (clientId, handleId, currentValue) => {
        const newValue = !currentValue;
        
        // Optimistic State Update
        setCheckedHandles(prev => {
            const existing = prev[clientId] || [];
            let nextList = [];
            if (newValue) {
                nextList = [...existing, handleId];
            } else {
                nextList = existing.filter(id => id !== handleId);
            }
            return { ...prev, [clientId]: nextList };
        });

        try {
            const resp = await api.post('/calendar/date/handle/toggle', {
                date: selectedDate,
                client_id: clientId,
                social_handle_id: handleId,
                is_checked: newValue
            });
            
            if (!resp.data || !resp.data.success) {
                throw new Error('Fail');
            }
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Update sync failed. Reverting...' });
            // Revert local state on sync failure
            setCheckedHandles(prev => {
                const existing = prev[clientId] || [];
                return {
                    ...prev,
                    [clientId]: newValue ? existing.filter(id => id !== handleId) : [...existing, handleId]
                };
            });
        }
    };

    // Handles checkbox clicks on Required Status Checklists
    const handleChecklistOptionToggle = (clientId, optionId) => {
        setCheckedChecklistOptions(prev => {
            const list = prev[clientId] || [];
            const exists = list.includes(optionId);
            let nextList = [];
            if (exists) {
                nextList = list.filter(id => id !== optionId);
            } else {
                nextList = [...list, optionId];
            }
            return { ...prev, [clientId]: nextList };
        });
    };

    // Save Status & Meta parameters for a client
    const saveClientFinalStatus = async (clientId) => {
        const statusId = clientStatuses[clientId];
        const description = clientDescriptions[clientId] || '';
        const missedReasonId = clientMissedReasons[clientId];
        const selectedOptions = checkedChecklistOptions[clientId] || [];

        // Dynamic Validations based on schema
        if (statusId) {
            const statusObj = statuses.find(s => s.id === statusId);
            const isMissed = statusObj && statusObj.name.toLowerCase().trim() === 'missed';
            
            if (isMissed && !missedReasonId) {
                Toast.show({ type: 'error', text1: 'Input Validation', text2: 'Please select a missed reason.' });
                return;
            }

            // Validate checklists if schema exists
            const schema = checklistSchemas[statusId];
            if (schema && schema.options && schema.options.length > 0) {
                const reqOptionIds = schema.options.map(o => o.id);
                const allTicked = reqOptionIds.every(reqId => selectedOptions.includes(reqId));
                
                if (!allTicked) {
                    Toast.show({ type: 'error', text1: 'Audit Gate', text2: 'Please check all mandatory checklists.' });
                    return;
                }
            }
        }

        try {
            Toast.show({ type: 'info', text1: 'Syncing updates...' });
            const resp = await api.post('/calendar/date/client/status', {
                date: selectedDate,
                client_id: clientId,
                status_id: statusId || null,
                checklist_option_ids: selectedOptions,
                missed_reason_id: missedReasonId || null,
                descriptions: description
            });

            if (resp.data && resp.data.success) {
                Toast.show({ type: 'success', text1: 'Record Synchronized!', text2: 'Post settings saved.' });
            } else {
                throw new Error('Error');
            }
        } catch (e) {
            Toast.show({ type: 'error', text1: 'Failed to save client status.' });
        }
    };

    // Triggers Selection Pickers for Status & Missed Reasons
    const openSelectionPicker = (type, clientId) => {
        setActiveClientId(clientId);
        setPickerType(type);
        if (type === 'status') {
            setPickerOptions(statuses.map(s => ({ id: s.id, name: s.name })));
        } else if (type === 'missed_reason') {
            setPickerOptions(missedReasons.map(r => ({ id: r.id, name: r.name })));
        }
        setPickerVisible(true);
    };

    const handlePickerSelect = (itemId) => {
        const clientId = activeClientId;
        if (pickerType === 'status') {
            setClientStatuses(prev => ({ ...prev, [clientId]: itemId }));
            if (itemId) {
                fetchChecklistSchema(itemId); // fetch checklist dynamic requirements
            }
        } else if (pickerType === 'missed_reason') {
            setClientMissedReasons(prev => ({ ...prev, [clientId]: itemId }));
        }
        setPickerVisible(false);
    };

    const openDetailSheet = () => {
        setDetailModalVisible(true);
        Animated.spring(slideAnim, {
            toValue: 0,
            tension: 55,
            friction: 12,
            useNativeDriver: true
        }).start();
    };

    const closeDetailSheet = () => {
        Animated.timing(slideAnim, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true
        }).start(() => {
            setDetailModalVisible(false);
        });
    };

    // Filter General non-client items for bottom section
    const activeEvents = useMemo(() => {
        return events.filter(e => e.date === selectedDate);
    }, [events, selectedDate]);

    const markedDatesWithSelection = useMemo(() => {
        const finalMarked = { ...markedDates };
        if (finalMarked[selectedDate]) {
            finalMarked[selectedDate] = {
                ...finalMarked[selectedDate],
                selected: true,
                selectedColor: '#434AFA'
            };
        } else {
            finalMarked[selectedDate] = {
                selected: true,
                selectedColor: '#434AFA'
            };
        }
        const todayStr = dayjs().format('YYYY-MM-DD');
        if (!finalMarked[todayStr]) {
            finalMarked[todayStr] = {
                customStyles: {
                    container: { borderColor: '#434AFA', borderWidth: 1.5, borderRadius: 20 },
                    text: { color: '#434AFA', fontWeight: 'bold' }
                }
            };
        }
        return finalMarked;
    }, [markedDates, selectedDate]);

    const renderClientPostBlock = (client) => {
        const clientId = client.id;
        const handles = clientHandles[clientId] || [];
        const checkedList = checkedHandles[clientId] || [];
        
        const currentStatusId = clientStatuses[clientId];
        const currentStatus = statuses.find(s => s.id === currentStatusId);
        
        const currentMissedId = clientMissedReasons[clientId];
        const currentMissed = missedReasons.find(r => r.id === currentMissedId);

        const isMissed = currentStatus && currentStatus.name.toLowerCase().trim() === 'missed';
        const schema = checklistSchemas[currentStatusId];
        const currentDesc = clientDescriptions[clientId] || '';
        
        const tickedOptions = checkedChecklistOptions[clientId] || [];

        return (
            <View key={clientId} style={styles.clientCard}>
                {/* Top Row: Name and Status Dropdown */}
                <View style={styles.clientRowTop}>
                    <View style={styles.clientInfo}>
                        <Ionicons name="business-outline" size={16} color="#475569" />
                        <Text style={styles.clientName}>{client.name}</Text>
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.inlinePickerTrigger}
                        onPress={() => openSelectionPicker('status', clientId)}
                    >
                        <Text style={[styles.pickerValText, !currentStatus && { color: '#94A3B8' }]}>
                            {currentStatus ? currentStatus.name : 'Select Status'}
                        </Text>
                        <Ionicons name="chevron-down" size={14} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* Missed Reason selector logic */}
                {isMissed && (
                    <View style={styles.nestedInputGroup}>
                        <Text style={styles.nestedLabel}>MISSING REASON AUDIT</Text>
                        <TouchableOpacity 
                            style={styles.nestedPickerTrigger}
                            onPress={() => openSelectionPicker('missed_reason', clientId)}
                        >
                            <Ionicons name="alert-circle-outline" size={15} color="#F59E0B" />
                            <Text style={[styles.pickerValText, !currentMissed && { color: '#94A3B8' }]}>
                                {currentMissed ? currentMissed.name : 'Select Missed Reason'}
                            </Text>
                            <Ionicons name="caret-down-outline" size={12} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Dynamic Checklist Audit Block */}
                {schema && schema.options && schema.options.length > 0 && (
                    <View style={styles.checklistAuditWrapper}>
                        <Text style={styles.nestedLabel}>MANDATORY COMPLIANCE CHECKLIST</Text>
                        <View style={styles.checklistBox}>
                            {schema.options.map(opt => {
                                const isChecked = tickedOptions.includes(opt.id);
                                return (
                                    <TouchableOpacity 
                                        key={opt.id} 
                                        style={styles.checkOptionRow}
                                        onPress={() => handleChecklistOptionToggle(clientId, opt.id)}
                                    >
                                        <Ionicons 
                                            name={isChecked ? "checkbox" : "square-outline"} 
                                            size={18} 
                                            color={isChecked ? "#10B981" : "#94A3B8"} 
                                        />
                                        <Text style={[styles.checkOptionTxt, isChecked && styles.checkOptionTxtStriked]}>
                                            {opt.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Social Handles wrapping grid */}
                <View style={styles.handlesWrap}>
                    <Text style={styles.nestedLabel}>PLATFORM HANDLES COVERAGE</Text>
                    {handles.length === 0 ? (
                        <Text style={styles.noHandlesTxt}>No linked platforms configured.</Text>
                    ) : (
                        <View style={styles.handlesRowFlex}>
                            {handles.map(h => {
                                const isChecked = checkedList.includes(h.id);
                                return (
                                    <TouchableOpacity
                                        key={h.id}
                                        style={[styles.handleChip, isChecked && styles.handleChipChecked]}
                                        onPress={() => handleSocialHandleToggle(clientId, h.id, isChecked)}
                                    >
                                        <Ionicons 
                                            name={isChecked ? "checkmark-circle" : "logo-rss"} 
                                            size={12} 
                                            color={isChecked ? "#FFF" : "#434AFA"} 
                                        />
                                        <Text style={[styles.handleChipTxt, isChecked && styles.handleChipTxtChecked]}>
                                            {h.name}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    )}
                </View>

                {/* Description field */}
                <View style={styles.descWrap}>
                    <Text style={styles.nestedLabel}>CAMPAIGN NOTES / DESCRIPTIONS</Text>
                    <TextInput
                        style={styles.descInput}
                        multiline
                        numberOfLines={2}
                        value={currentDesc}
                        onChangeText={(t) => setClientDescriptions(prev => ({ ...prev, [clientId]: t }))}
                        placeholder="Provide execution descriptions, URLs, or metrics..."
                        placeholderTextColor="#94A3B8"
                    />
                </View>

                {/* Saving trigger */}
                <TouchableOpacity 
                    style={styles.saveBlockBtn}
                    activeOpacity={0.8}
                    onPress={() => saveClientFinalStatus(clientId)}
                >
                    <Ionicons name="cloud-upload-outline" size={14} color="#FFF" />
                    <Text style={styles.saveBlockBtnTxt}>Save Client Parameters</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderEventCard = (item) => {
        const getIcon = (type) => {
            switch(type) {
                case 'common': return 'share-social-outline';
                default: return 'megaphone-outline';
            }
        };
        return (
            <View key={item.id} style={styles.eventCard}>
                <View style={[styles.eventAccentLine, { backgroundColor: item.color }]} />
                <View style={styles.cardInner}>
                    <View style={styles.cardPrimaryRow}>
                        <View style={[styles.iconChip, { backgroundColor: item.color + '15' }]}>
                            <Ionicons name={getIcon(item.type)} size={18} color={item.color} />
                        </View>
                        <View style={styles.cardMetaWrap}>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <View style={styles.badgeRow}>
                                <View style={[styles.tagBadge, { backgroundColor: item.color + '12' }]}>
                                    <Text style={[styles.tagBadgeTxt, { color: item.color }]}>
                                        {item.type === 'common' ? 'GROUP CAMPAIGN' : 'CLIENT CAMPAIGN'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                    {item.description && (
                        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.mainContainer}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
            <Header title="Calendar Master" />



            <ScrollView 
                style={{ flex: 1 }} 
                contentContainerStyle={{ paddingBottom: 90 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadCalendarData(true)} />}
            >
                <View style={styles.calendarWrapper}>
                    <Calendar
                        current={currentDate}
                        onMonthChange={(month) => setCurrentDate(month.dateString)}
                        onDayPress={handleDateSelect}
                        markedDates={markedDatesWithSelection}
                        markingType={'multi-dot'}
                        enableSwipeMonths={true}
                        theme={{
                            calendarBackground: '#FFFFFF',
                            textSectionTitleColor: '#64748B',
                            selectedDayBackgroundColor: '#434AFA',
                            selectedDayTextColor: '#FFFFFF',
                            todayTextColor: '#434AFA',
                            dayTextColor: '#1E293B',
                            textDisabledColor: '#CBD5E1',
                            arrowColor: '#434AFA',
                            monthTextColor: '#1E293B',
                            indicatorColor: '#434AFA',
                            textDayFontWeight: '600',
                            textMonthFontWeight: '800',
                            textDayHeaderFontWeight: '700'
                        }}
                    />
                </View>

                {/* QUICK VIEW LIST UNDER CALENDAR */}
                <View style={styles.agendaSection}>
                    <View style={styles.agendaHeader}>
                        <View>
                            <Text style={styles.agendaSub}>SCHEDULED CAMPAIGNS</Text>
                            <Text style={styles.agendaTitle}>{dayjs(selectedDate).format('MMMM D, YYYY')}</Text>
                        </View>
                        <TouchableOpacity style={styles.agendaCountBadge} onPress={openDetailSheet}>
                            <Text style={styles.agendaCountTxt}>OPEN DETAILS</Text>
                        </TouchableOpacity>
                    </View>

                    {loading ? (
                        <View style={{ marginTop: 10 }}>
                            <ActivityIndicator color="#434AFA" />
                        </View>
                    ) : activeEvents.length === 0 ? (
                        <View style={styles.emptyWrap}>
                            <Ionicons name="calendar-outline" size={38} color="#94A3B8" />
                            <Text style={styles.emptyTitle}>Clear Calendar Day</Text>
                            <Text style={styles.emptySub}>Tap the cell or open details to verify client social activities.</Text>
                        </View>
                    ) : (
                        <View style={{ marginTop: 8 }}>
                            {activeEvents.map(renderEventCard)}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* COMPREHENSIVE SLIDE UP DASHBOARD SHEET */}
            <Modal 
                animationType="fade" 
                transparent={true} 
                visible={detailModalVisible} 
                onRequestClose={closeDetailSheet}
            >
                <View style={styles.modalBackdrop}>
                    <TouchableOpacity style={styles.modalBackdropDismiss} activeOpacity={1} onPress={closeDetailSheet} />
                    
                    <Animated.View style={[styles.sheetContainer, { transform: [{ translateY: slideAnim }] }]}>
                        <View style={styles.sheetIndicator} />
                        
                        <View style={styles.sheetHeader}>
                            <View>
                                <Text style={styles.sheetTitle}>{dayjs(selectedDate).format('MMMM DD')}</Text>
                                <Text style={styles.sheetSubtitle}>{dayjs(selectedDate).format('dddd, YYYY')}</Text>
                            </View>
                            <TouchableOpacity onPress={closeDetailSheet} style={styles.sheetCloseCircle}>
                                <Ionicons name="close" size={18} color="#475569" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView 
                            style={styles.sheetBody} 
                            contentContainerStyle={{ paddingBottom: 50 }}
                            showsVerticalScrollIndicator={false}
                        >
                            {socialLoading ? (
                                <View style={styles.socialLoadingCenter}>
                                    <ActivityIndicator size="small" color="#434AFA" />
                                    <Text style={styles.loadingText}>Loading platform schedules...</Text>
                                </View>
                            ) : (
                                clients.length === 0 ? (
                                    <View style={styles.emptySocialWrap}>
                                        <Ionicons name="balloon-outline" size={44} color="#CBD5E1" />
                                        <Text style={styles.emptyTitle}>No Client Campaigns</Text>
                                        <Text style={styles.emptySub}>No clients are linked to scheduled campaigns or group events on this date.</Text>
                                    </View>
                                ) : (
                                    clients.map(renderClientPostBlock)
                                )
                            )}
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>

            {/* DYNAMIC SINGLE SELECTION MODAL FOR STATUS / MISSED REASON SELECTORS */}
            <Modal
                transparent={true}
                visible={pickerVisible}
                animationType="slide"
                onRequestClose={() => setPickerVisible(false)}
            >
                <View style={styles.pickerOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setPickerVisible(false)} />
                    <View style={styles.pickerContent}>
                        <View style={styles.pickerHeader}>
                            <Text style={styles.pickerTitle}>
                                {pickerType === 'status' ? 'SELECT CAMPAIGN STATUS' : 'SELECT MISSING REASON'}
                            </Text>
                            <TouchableOpacity onPress={() => setPickerVisible(false)}>
                                <Ionicons name="close" size={20} color="#000" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.pickerScroll} contentContainerStyle={{ paddingBottom: 30 }}>
                            {/* Add a 'Clear' option if it is status */}
                            {pickerType === 'status' && (
                                <TouchableOpacity 
                                    style={styles.pickerItem} 
                                    onPress={() => handlePickerSelect(null)}
                                >
                                    <Text style={[styles.pickerItemTxt, { color: '#EF4444', fontWeight: '700' }]}>
                                        ❌ Clear / Remove Status
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {pickerOptions.map(item => (
                                <TouchableOpacity 
                                    key={item.id} 
                                    style={styles.pickerItem}
                                    onPress={() => handlePickerSelect(item.id)}
                                >
                                    <Text style={styles.pickerItemTxt}>{item.name}</Text>
                                    <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>
            </Modal>


        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    
    // Top View Tabs
    tabBar: { flexDirection: 'row', backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    tabItem: { flex: 1, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    tabItemActive: { backgroundColor: '#434AFA10' },
    tabTxt: { fontSize: 13, color: '#64748B', fontWeight: '700' },
    tabTxtActive: { color: '#434AFA', fontWeight: '800' },

    // Calendar Grid
    calendarWrapper: { backgroundColor: '#FFF', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    
    // Below Grid Quick View
    agendaSection: { padding: 16 },
    agendaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    agendaSub: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
    agendaTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', marginTop: 2 },
    agendaCountBadge: { backgroundColor: '#EEF2FF', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    agendaCountTxt: { color: '#434AFA', fontSize: 9, fontWeight: '800' },

    // Accent Cards
    eventCard: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 10, elevation: 1, flexDirection: 'row', overflow: 'hidden' },
    eventAccentLine: { width: 5 },
    cardInner: { flex: 1, padding: 12 },
    cardPrimaryRow: { flexDirection: 'row', alignItems: 'center' },
    iconChip: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    cardMetaWrap: { flex: 1, marginLeft: 10 },
    cardTitle: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
    tagBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#F1F5F9' },
    tagBadgeTxt: { fontSize: 9, fontWeight: '800' },
    tagBadgeTxtSecondary: { fontSize: 9, fontWeight: '700', color: '#64748B', textTransform: 'capitalize' },
    cardDesc: { fontSize: 11, color: '#64748B', marginTop: 8, lineHeight: 16 },

    // Common Empty Wrap
    emptyWrap: { alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#FFF', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CBD5E1', marginTop: 10 },
    emptyTitle: { fontSize: 14, fontWeight: '800', color: '#475569', marginTop: 10 },
    emptySub: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 4, paddingHorizontal: 10, lineHeight: 15 },

    // FAB
    fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#434AFA', justifyContent: 'center', alignItems: 'center', shadowColor: '#434AFA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 8 },

    // BOTTOM SHEET MODAL MECHANISMS
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
    modalBackdropDismiss: { flex: 1 },
    sheetContainer: { backgroundColor: '#F8FAFC', borderTopLeftRadius: 24, borderTopRightRadius: 24, height: SCREEN_HEIGHT * 0.78, width: SCREEN_WIDTH, shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 24 },
    sheetIndicator: { width: 40, height: 5, borderRadius: 2.5, backgroundColor: '#E2E8F0', alignSelf: 'center', marginTop: 10 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingVertical: 16, paddingHorizontal: 20, backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
    sheetTitle: { fontSize: 22, fontWeight: '900', color: '#1E293B' },
    sheetSubtitle: { fontSize: 13, fontWeight: '700', color: '#64748B', marginTop: 2 },
    sheetCloseCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    sheetBody: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

    // Custom Segmented Tab inside Sheet
    sheetTabsWrapper: { flexDirection: 'row', padding: 4, backgroundColor: '#E2E8F0', marginHorizontal: 16, marginTop: 14, borderRadius: 10 },
    sheetTabBtn: { flex: 1, flexDirection: 'row', height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 6 },
    sheetTabBtnActive: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, elevation: 1 },
    sheetTabBtnTxt: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    sheetTabBtnTxtActive: { color: '#1E293B', fontWeight: '800' },

    // Loading inside sheet
    socialLoadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 },
    loadingText: { marginTop: 12, color: '#64748B', fontSize: 12, fontWeight: '700' },
    emptySocialWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },

    // CLIENT CARD / MODULE COMPONENT (PREMIUM WORKFLOW)
    clientCard: { backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4, elevation: 2 },
    clientRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    clientInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, marginRight: 10 },
    clientName: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
    inlinePickerTrigger: { minWidth: 130, height: 34, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC' },
    pickerValText: { fontSize: 12, fontWeight: '700', color: '#1E293B' },

    // Nested form blocks
    nestedInputGroup: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 10, marginBottom: 12 },
    nestedLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', letterSpacing: 0.8, marginBottom: 8 },
    nestedPickerTrigger: { height: 36, borderRadius: 8, backgroundColor: '#FFF', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
    
    // Checklists compliance
    checklistAuditWrapper: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#DCFCE7' },
    checklistBox: { backgroundColor: '#FFF', borderRadius: 8, padding: 8 },
    checkOptionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 10 },
    checkOptionTxt: { fontSize: 12, fontWeight: '700', color: '#1E293B', flex: 1 },
    checkOptionTxtStriked: { color: '#94A3B8', textDecorationLine: 'line-through' },

    // Handles row
    handlesWrap: { marginBottom: 14 },
    noHandlesTxt: { fontSize: 12, fontStyle: 'italic', color: '#94A3B8' },
    handlesRowFlex: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    handleChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, height: 28, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFF' },
    handleChipChecked: { backgroundColor: '#434AFA', borderColor: '#434AFA' },
    handleChipTxt: { fontSize: 11, fontWeight: '700', color: '#475569' },
    handleChipTxtChecked: { color: '#FFF' },

    // Text inputs
    descWrap: { marginBottom: 16 },
    descInput: { height: 52, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 10, fontSize: 12, color: '#1E293B', textAlignVertical: 'top', fontWeight: '600' },

    // Card save button
    saveBlockBtn: { height: 40, backgroundColor: '#434AFA', borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 1 },
    saveBlockBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '800' },

    // Picker overlays
    pickerOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'flex-end' },
    pickerContent: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: SCREEN_HEIGHT * 0.5 },
    pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    pickerTitle: { fontSize: 13, fontWeight: '800', color: '#64748B' },
    pickerScroll: { padding: 16 },
    pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    pickerItemTxt: { fontSize: 14, fontWeight: '700', color: '#1E293B' }
});
