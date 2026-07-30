import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    FlatList, 
    ActivityIndicator, 
    Modal, 
    TextInput, 
    Dimensions,
    Platform
} from 'react-native';
import Header from '../components/Header';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TrackingReportScreen = () => {
    // 1. Tabs Setup
    const [activeTab, setActiveTab] = useState('user'); // 'user', 'monthly', 'date'

    // 2. Context Stores
    const [users, setUsers] = useState([]);
    const [reportData, setReportData] = useState(null);

    // 3. Filter Choices
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedMonth, setSelectedMonth] = useState(''); // 'YYYY-MM'
    const [selectedDate, setSelectedDate] = useState(''); // 'YYYY-MM-DD'

    // 4. Load Engines
    const [loading, setLoading] = useState(false);
    const [usersLoading, setUsersLoading] = useState(false);

    // 5. Interactive Modal Toggles
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [userSearchText, setUserSearchText] = useState('');
    
    const [monthModalVisible, setMonthModalVisible] = useState(false);
    const [tempYear, setTempYear] = useState(new Date().getFullYear());
    
    const [calendarModalVisible, setCalendarModalVisible] = useState(false);
    const [pickerNavDate, setPickerNavDate] = useState(new Date());

    // Constant Lookup Libraries
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Init Cycle
    useEffect(() => {
        const now = new Date();
        const curY = now.getFullYear();
        const curM = String(now.getMonth() + 1).padStart(2, '0');
        const curD = String(now.getDate()).padStart(2, '0');

        setSelectedMonth(`${curY}-${curM}`);
        setSelectedDate(`${curY}-${curM}-${curD}`);
        setTempYear(curY);

        loadTrackerUsers();
    }, []);

    // Automatically refresh grid data if navigation tab shifts
    useEffect(() => {
        if (activeTab === 'monthly' || activeTab === 'date') {
            triggerReportBuild();
        } else if (activeTab === 'user' && selectedUser) {
            triggerReportBuild();
        } else {
            setReportData(null);
        }
    }, [activeTab]);

    // Load active tracking users
    const loadTrackerUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await api.get('/tracking/report/users');
            if (res.data?.success) {
                const list = res.data.users || [];
                setUsers(list);
                if (list.length > 0) {
                    setSelectedUser(list[0]);
                }
            }
        } catch (error) {
            console.error('[TrackerReport] Load filters error:', error);
        } finally {
            setUsersLoading(false);
        }
    };

    // Core Data Dispatcher
    const triggerReportBuild = async () => {
        setLoading(true);
        setReportData(null);

        try {
            let endpoint = '';
            let params = {};

            if (activeTab === 'user') {
                if (!selectedUser) {
                    Toast.show({ type: 'error', text1: 'Selection Error', text2: 'Specify which staff member to audit.' });
                    setLoading(false);
                    return;
                }
                endpoint = '/tracking/report/user-wise';
                params = { user_id: selectedUser.id, month: selectedMonth };
            } else if (activeTab === 'monthly') {
                endpoint = '/tracking/report/monthly';
                params = { month: selectedMonth };
            } else if (activeTab === 'date') {
                endpoint = '/tracking/report/date-wise';
                params = { date: selectedDate };
            }

            const res = await api.get(endpoint, { params });
            if (res.data?.success) {
                setReportData(res.data);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Query Failed',
                    text2: res.data?.message || 'Service failed to output log analysis.'
                });
            }
        } catch (error) {
            console.error('[TrackerReport] Runtime exception:', error);
            Toast.show({
                type: 'error',
                text1: 'Server Glitch',
                text2: error.response?.data?.message || 'Network pipeline timed out.'
            });
        } finally {
            setLoading(false);
        }
    };

    // Dynamic UI styling helper
    const getStatusStyleConfig = (status) => {
        const str = String(status || '').toLowerCase();
        if (str.includes('present') || str === 'p') {
            return { bg: '#ECFDF5', txt: '#10B981', label: 'Present' };
        } else if (str.includes('halfday') || str === 'hd') {
            return { bg: '#FFFBEB', txt: '#D97706', label: 'Half Day' };
        } else if (str.includes('absent') || str === 'a') {
            return { bg: '#FEF2F2', txt: '#EF4444', label: 'Absent' };
        } else if (str.includes('weekly off') || str === 's') {
            return { bg: '#F1F5F9', txt: '#64748B', label: 'Weekly Off' };
        } else if (str.includes('holiday') || str === 'h') {
            return { bg: '#F5F3FF', txt: '#8B5CF6', label: 'Holiday' };
        } else if (str.includes('leave') || str === 'l') {
            return { bg: '#EFF6FF', txt: '#3B82F6', label: 'On Leave' };
        }
        return { bg: '#F8FAFC', txt: '#475569', label: status?.toUpperCase() || '-' };
    };

    /* ==========================================
       PICKER & COMPONENT OVERLAYS
       ========================================== */

    // 1. Employee Select Overlay
    const renderUserModal = () => {
        const filtered = users.filter(u => u.name?.toLowerCase().includes(userSearchText.toLowerCase()));
        return (
            <Modal visible={userModalVisible} animationType="slide" transparent={true} onRequestClose={() => setUserModalVisible(false)}>
                <View style={styles.overlayBg}>
                    <View style={[styles.sheetShell, { height: '70%' }]}>
                        <View style={styles.sheetTop}>
                            <Text style={styles.sheetTitle}>Track Employee</Text>
                            <TouchableOpacity onPress={() => setUserModalVisible(false)}><Ionicons name="close" size={22} color="#475569" /></TouchableOpacity>
                        </View>
                        <View style={styles.searchRow}>
                            <Ionicons name="search" size={16} color="#94A3B8" />
                            <TextInput style={styles.searchInput} placeholder="Type keywords..." placeholderTextColor="#94A3B8" value={userSearchText} onChangeText={setUserSearchText} />
                        </View>
                        {usersLoading ? (
                            <ActivityIndicator style={{ margin: 30 }} color="#434AFA" />
                        ) : (
                            <FlatList
                                data={filtered}
                                keyExtractor={item => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity 
                                        style={styles.selectRow} 
                                        onPress={() => { setSelectedUser(item); setUserModalVisible(false); setUserSearchText(''); }}
                                    >
                                        <View style={styles.avatarIcon}><Text style={styles.avatarTxt}>{item.name?.charAt(0) || 'U'}</Text></View>
                                        <View>
                                            <Text style={styles.rowHeadTxt}>{item.name}</Text>
                                            <Text style={styles.rowSubTxt}>{item.email}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={<View style={styles.noLogs}><Text style={styles.noLogsSub}>No tracking active users found</Text></View>}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        );
    };

    // 2. Inline Central Date Calendar Picker
    const renderCalendarGridModal = () => {
        const y = pickerNavDate.getFullYear();
        const m = pickerNavDate.getMonth();
        const firstWd = new Date(y, m, 1).getDay();
        const maxD = new Date(y, m + 1, 0).getDate();
        
        let matrix = [];
        for (let i = 0; i < firstWd; i++) matrix.push(null);
        for (let i = 1; i <= maxD; i++) matrix.push(new Date(y, m, i));

        const movePickerMonth = (shift) => {
            const copy = new Date(pickerNavDate);
            copy.setMonth(copy.getMonth() + shift);
            setPickerNavDate(copy);
        };

        const selectDaySlot = (dObj) => {
            const yrStr = dObj.getFullYear();
            const mnStr = String(dObj.getMonth() + 1).padStart(2, '0');
            const dyStr = String(dObj.getDate()).padStart(2, '0');
            setSelectedDate(`${yrStr}-${mnStr}-${dyStr}`);
            setCalendarModalVisible(false);
        };

        return (
            <Modal visible={calendarModalVisible} transparent={true} animationType="fade" onRequestClose={() => setCalendarModalVisible(false)}>
                <View style={styles.centerModal}>
                    <View style={styles.calWrapper}>
                        <View style={styles.calNavRow}>
                            <TouchableOpacity onPress={() => movePickerMonth(-1)} style={styles.calArrow}><Ionicons name="chevron-back" size={18} color="#1E293B" /></TouchableOpacity>
                            <Text style={styles.calMonthHeader}>{monthsFull[m]} {y}</Text>
                            <TouchableOpacity onPress={() => movePickerMonth(1)} style={styles.calArrow}><Ionicons name="chevron-forward" size={18} color="#1E293B" /></TouchableOpacity>
                        </View>
                        <View style={styles.calWdLine}>
                            {weekDays.map((w, i) => <Text key={i} style={styles.calWdTxt}>{w}</Text>)}
                        </View>
                        <View style={styles.calDayGrid}>
                            {matrix.map((d, ix) => {
                                if (!d) return <View key={ix} style={styles.calDayBlank} />;
                                const currentFmt = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                                const match = selectedDate === currentFmt;
                                return (
                                    <TouchableOpacity key={ix} style={[styles.calDayBox, match && styles.calDayBoxActive]} onPress={() => selectDaySlot(d)}>
                                        <Text style={[styles.calDayTxt, match && styles.calDayTxtActive]}>{d.getDate()}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity style={styles.calCancel} onPress={() => setCalendarModalVisible(false)}><Text style={styles.calCancelTxt}>Dismiss</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    // 3. High Fidelity Month & Year Picker Modal
    const renderMonthPickerModal = () => {
        const clickMonth = (mIndex) => {
            const pick = `${tempYear}-${String(mIndex + 1).padStart(2, '0')}`;
            setSelectedMonth(pick);
            setMonthModalVisible(false);
        };
        return (
            <Modal visible={monthModalVisible} transparent={true} animationType="fade" onRequestClose={() => setMonthModalVisible(false)}>
                <View style={styles.centerModal}>
                    <View style={styles.calWrapper}>
                        <View style={styles.calNavRow}>
                            <TouchableOpacity onPress={() => setTempYear(p => p - 1)} style={styles.calArrow}><Ionicons name="chevron-back" size={18} color="#1E293B" /></TouchableOpacity>
                            <Text style={styles.calMonthHeader}>{tempYear}</Text>
                            <TouchableOpacity onPress={() => setTempYear(p => p + 1)} style={styles.calArrow}><Ionicons name="chevron-forward" size={18} color="#1E293B" /></TouchableOpacity>
                        </View>
                        <View style={styles.monthMatrix}>
                            {monthsShort.map((ml, idx) => {
                                const mStr = `${tempYear}-${String(idx+1).padStart(2,'0')}`;
                                const isAct = selectedMonth === mStr;
                                return (
                                    <TouchableOpacity 
                                        key={idx} 
                                        style={[styles.monthTile, isAct && styles.monthTileActive]} 
                                        onPress={() => clickMonth(idx)}
                                    >
                                        <Text style={[styles.monthTileTxt, isAct && styles.monthTileTxtActive]}>{ml}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity style={styles.calCancel} onPress={() => setMonthModalVisible(false)}><Text style={styles.calCancelTxt}>Cancel</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    /* ==========================================
       CONTROLS & FILTER DISPLAY
       ========================================== */
    
    const renderFilterDashboard = () => {
        const displayMonthStr = selectedMonth ? `${monthsFull[parseInt(selectedMonth.split('-')[1]) - 1]} ${selectedMonth.split('-')[0]}` : 'N/A';

        return (
            <View style={styles.filterPanel}>
                {activeTab === 'user' && (
                    <View style={styles.inputGrp}>
                        <Text style={styles.inputLabel}>Employee Profile</Text>
                        <TouchableOpacity style={styles.controlBtn} onPress={() => setUserModalVisible(true)}>
                            <View style={styles.controlLeft}>
                                <Ionicons name="person" size={14} color="#434AFA" style={{ marginRight: 8 }} />
                                <Text style={[styles.controlTxt, selectedUser && { color: '#1E293B', fontWeight: '700' }]} numberOfLines={1}>
                                    {selectedUser ? selectedUser.name : 'Pick Target Employee'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-down" size={14} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                )}

                {activeTab !== 'date' ? (
                    <View style={[styles.inputGrp, { marginTop: activeTab === 'user' ? 12 : 0 }]}>
                        <Text style={styles.inputLabel}>Statement Period (Month)</Text>
                        <TouchableOpacity style={styles.controlBtn} onPress={() => setMonthModalVisible(true)}>
                            <View style={styles.controlLeft}>
                                <Ionicons name="calendar" size={14} color="#434AFA" style={{ marginRight: 8 }} />
                                <Text style={[styles.controlTxt, { color: '#1E293B', fontWeight: '700' }]}>{displayMonthStr}</Text>
                            </View>
                            <Ionicons name="chevron-down" size={14} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.inputGrp}>
                        <Text style={styles.inputLabel}>Inspection Date</Text>
                        <TouchableOpacity style={styles.controlBtn} onPress={() => setCalendarModalVisible(true)}>
                            <View style={styles.controlLeft}>
                                <Ionicons name="calendar" size={14} color="#434AFA" style={{ marginRight: 8 }} />
                                <Text style={[styles.controlTxt, { color: '#1E293B', fontWeight: '700' }]}>{selectedDate}</Text>
                            </View>
                            <Ionicons name="chevron-down" size={14} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity style={styles.searchQueryBtn} onPress={triggerReportBuild} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="map" size={16} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.searchQueryBtnTxt}>Compile Tracking Data</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    /* ==========================================
       METRIC GRID DISPATCHER
       ========================================== */
    const renderMetricSummaries = () => {
        if (!reportData?.summary) return null;
        const s = reportData.summary;

        let panels = [];
        if (activeTab === 'user') {
            panels = [
                { title: 'Mileage', val: `${s.total_distance_km} km`, icon: 'navigate', bg: '#EEF2FF', col: '#434AFA' },
                { title: 'Presents', val: s.total_present, icon: 'checkmark-done', bg: '#ECFDF5', col: '#10B981' },
                { title: 'Absences', val: s.total_absent, icon: 'close-circle', bg: '#FEF2F2', col: '#EF4444' },
                { title: 'Statement Period', val: `${s.total_days} Days`, icon: 'calendar', bg: '#FFFBEB', col: '#F59E0B' },
            ];
        } else if (activeTab === 'date') {
            panels = [
                { title: 'Staff Inspected', val: s.total_users, icon: 'people', bg: '#EEF2FF', col: '#434AFA' },
                { title: 'Fleet Mileage', val: `${s.total_distance_km} km`, icon: 'rocket', bg: '#ECFDF5', col: '#10B981' },
                { title: 'Active Field', val: s.present, icon: 'map', bg: '#F5F3FF', col: '#8B5CF6' },
                { title: 'Absent', val: s.absent, icon: 'ban', bg: '#FEF2F2', col: '#EF4444' },
            ];
        }

        if (panels.length === 0) return null;

        return (
            <View style={styles.metricGrid}>
                {panels.map((p, i) => (
                    <View key={i} style={styles.metricCell}>
                        <View style={[styles.metricIconCirc, { backgroundColor: p.bg }]}>
                            <Ionicons name={p.icon} size={16} color={p.col} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.metricCellVal}>{p.val}</Text>
                            <Text style={styles.metricCellTitle} numberOfLines={1}>{p.title}</Text>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    /* ==========================================
       TAB WISE CONTENT BUILDERS
       ========================================== */
    
    // 1. Individual User Log Card
    const renderUserWiseLogCard = ({ item }) => {
        if (!item || !item.display_date) return null;
        const cfg = getStatusStyleConfig(item.status);
        
        return (
            <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                    <View>
                        <Text style={styles.cardDateLabel}>{item.display_date}</Text>
                        <Text style={styles.cardDayLabel}>{item.day_name}</Text>
                    </View>
                    <View style={[styles.statBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.statBadgeTxt, { color: cfg.txt }]}>{cfg.label}</Text>
                    </View>
                </View>
                <View style={styles.statSplitRow}>
                    <View style={styles.statSplitCell}>
                        <Text style={styles.statValCap}>Mileage (Effort)</Text>
                        <View style={styles.statInlineFlex}>
                            <Ionicons name="bicycle" size={15} color="#434AFA" />
                            <Text style={styles.statValData}>{item.km_travelled} km</Text>
                        </View>
                    </View>
                    <View style={styles.statSplitCell}>
                        <Text style={styles.statValCap}>Shift Effort</Text>
                        <View style={styles.statInlineFlex}>
                            <Ionicons name="time" size={15} color="#10B981" />
                            <Text style={styles.statValData}>{item.hours} hrs</Text>
                        </View>
                    </View>
                    <View style={styles.statSplitCell}>
                        <Text style={styles.statValCap}>Geo-Log Points</Text>
                        <View style={styles.statInlineFlex}>
                            <Ionicons name="pin" size={14} color="#8B5CF6" />
                            <Text style={styles.statValData}>{item.locations_count} points</Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    // 2. Monthly Team Table Cell Card
    const renderMonthlyCellCard = ({ item }) => {
        if (!item || !item.summary) return null;
        const activePercent = item.summary.total_present + item.summary.total_absent > 0 
            ? Math.round((item.summary.total_present / (item.summary.total_present + item.summary.total_absent)) * 100)
            : 0;

        return (
            <View style={styles.tableUnit}>
                <View style={styles.tableHeadLine}>
                    <View style={styles.avatarShell}><Text style={styles.avatarTxt}>{item.user?.name?.charAt(0) || 'U'}</Text></View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.tableEmpName}>{item.user?.name}</Text>
                        <Text style={styles.tableSubLine}>Active Participation: {activePercent}%</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.tableEffortKm}>{item.summary.total_distance_km} km</Text>
                        <Text style={styles.tableEffortCap}>Total Driven</Text>
                    </View>
                </View>
                
                <View style={styles.attendanceStamps}>
                    <View style={styles.stampCell}><Text style={styles.stampVal}>{item.summary.total_present}</Text><Text style={styles.stampCap}>Present</Text></View>
                    <View style={styles.stampCell}><Text style={styles.stampVal}>{item.summary.total_absent}</Text><Text style={styles.stampCap}>Absent</Text></View>
                    <View style={[styles.stampCell, { borderRightWidth: 0 }]}><Text style={styles.stampVal}>{item.daily_statuses?.filter(s => !!s.km_travelled && s.km_travelled > 0).length || 0}</Text><Text style={styles.stampCap}>Drive Days</Text></View>
                </View>
            </View>
        );
    };
    
    // 2b. Monthly Summary Matrix Grid (Cloned layout from web / Attendance Report)
    const renderMonthlySummaryGrid = () => {
        const dates = reportData?.month?.dates || [];
        const usersGrid = reportData?.data || [];

        if (usersGrid.length === 0) return null;

        // Table sizing constants
        const userColWidth = 110;
        const cellWidth = 38;
        const summaryColWidth = 60;

        return (
            <View style={{ marginTop: 12, marginBottom: 24, marginHorizontal: -16 }}>
                <View style={styles.matrixHeaderMessage}>
                    <Ionicons name="information-circle" size={14} color="#434AFA" />
                    <Text style={styles.matrixHeaderMessageTxt}>Swipe horizontally to view entire matrix</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
                    <View>
                        {/* Header Rows */}
                        <View style={styles.matrixHeaderRow}>
                            <View style={[styles.matrixCell, styles.matrixLeftPinned, { width: userColWidth, backgroundColor: '#FFF' }]}>
                                <Text style={styles.matrixColHeaderTxt}>EMPLOYEE</Text>
                            </View>
                            {dates.map((d, i) => (
                                <View key={i} style={[styles.matrixCell, { width: cellWidth, backgroundColor: d.is_sunday ? '#FFF1F2' : '#F8FAFC' }]}>
                                    <Text style={[styles.dateDigit, d.is_sunday && { color: '#EF4444' }]}>{d.day}</Text>
                                    <Text style={[styles.dateDayName, d.is_sunday && { color: '#EF4444' }]}>{d.day_name}</Text>
                                </View>
                            ))}
                            <View style={[styles.matrixCell, { width: summaryColWidth + 5, backgroundColor: '#FFF' }]}><Text style={styles.matrixColHeaderTxt}>TOTAL KM</Text></View>
                            <View style={[styles.matrixCell, { width: summaryColWidth, backgroundColor: '#FFF' }]}><Text style={styles.matrixColHeaderTxt}>PRES</Text></View>
                            <View style={[styles.matrixCell, { width: summaryColWidth, backgroundColor: '#FFF' }]}><Text style={styles.matrixColHeaderTxt}>ABS</Text></View>
                        </View>

                        {/* Body Rows */}
                        {usersGrid.map((row, idx) => {
                            if (!row || !row.summary) return null;
                            const isEven = idx % 2 === 0;
                            const bgCol = isEven ? '#FFF' : '#F8FAFC';
                            return (
                                <View key={idx} style={[styles.matrixRow, { backgroundColor: bgCol }]}>
                                    <View style={[styles.matrixCell, styles.matrixLeftPinned, { width: userColWidth, backgroundColor: bgCol }]}>
                                        <Text style={styles.matrixUserName} numberOfLines={1}>{row.user?.name}</Text>
                                    </View>
                                    {row.daily_statuses?.map((ds, sIdx) => {
                                        const hasKm = ds.km_travelled && Number(ds.km_travelled) > 0;
                                        const kmVal = hasKm ? Number(ds.km_travelled).toFixed(1) : '-';
                                        const isOff = ds.code === 'S' || ds.code === 'H';
                                        return (
                                            <View key={sIdx} style={[styles.matrixCell, { width: cellWidth, backgroundColor: isOff ? '#F1F5F9' : 'transparent' }]}>
                                                <Text style={{ 
                                                    fontSize: hasKm ? 9 : 11, 
                                                    color: hasKm ? '#1E293B' : '#94A3B8', 
                                                    fontWeight: hasKm ? '700' : '500',
                                                    fontFamily: hasKm ? (Platform.OS === 'ios' ? 'Courier' : 'monospace') : undefined
                                                }}>
                                                    {kmVal}
                                                </Text>
                                            </View>
                                        );
                                    })}
                                    <View style={[styles.matrixCell, { width: summaryColWidth + 5 }]}><Text style={[styles.matrixSummaryNum, { color: '#434AFA', fontSize: 10 }]}>{Number(row.summary?.total_distance_km).toFixed(1)}</Text></View>
                                    <View style={[styles.matrixCell, { width: summaryColWidth }]}><Text style={[styles.matrixSummaryNum, { color: '#10B981', fontSize: 11 }]}>{row.summary?.total_present}</Text></View>
                                    <View style={[styles.matrixCell, { width: summaryColWidth }]}><Text style={[styles.matrixSummaryNum, { color: '#EF4444', fontSize: 11 }]}>{row.summary?.total_absent}</Text></View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        );
    };

    // 3. Single Day Single Audit Cell
    const renderDateWiseCellCard = ({ item }) => {
        if (!item || !item.user || item.summary) return null;
        const cfg = getStatusStyleConfig(item.status);
        return (
            <View style={styles.dateLogCard}>
                <View style={styles.dateLogHead}>
                    <Ionicons name="person-circle" size={22} color="#64748B" />
                    <Text style={styles.dateLogName} numberOfLines={1}>{item.user?.name}</Text>
                    <View style={[styles.statBadge, { backgroundColor: cfg.bg }]}>
                        <Text style={[styles.statBadgeTxt, { color: cfg.txt, fontSize: 8 }]}>{cfg.label}</Text>
                    </View>
                </View>
                <View style={styles.dateLogMetrics}>
                    <View style={styles.miniLogCell}>
                        <Ionicons name="rocket" size={13} color="#434AFA" />
                        <Text style={styles.miniLogVal}>{item.km_travelled} km</Text>
                    </View>
                    <View style={styles.miniLogCell}>
                        <Ionicons name="timer" size={13} color="#10B981" />
                        <Text style={styles.miniLogVal}>{item.hours} hrs</Text>
                    </View>
                    <View style={styles.miniLogCell}>
                        <Ionicons name="radio" size={13} color="#F59E0B" />
                        <Text style={styles.miniLogVal}>{item.locations_count} GPS</Text>
                    </View>
                </View>
            </View>
        );
    };

    // Center Screen Status Boxes
    const renderLoaderOrPlaceholder = () => {
        if (loading) {
            return (
                <View style={styles.paddedCenter}>
                    <ActivityIndicator size="large" color="#434AFA" />
                    <Text style={styles.centerTxt}>Compiling Geo-Distance logs...</Text>
                </View>
            );
        }

        if (!reportData) {
            return (
                <View style={styles.paddedCenter}>
                    <Ionicons name="earth" size={64} color="#E2E8F0" />
                    <Text style={styles.centerTitle}>Tracking Intelligence</Text>
                    <Text style={styles.centerSub}>Choose filter scopes and generate report analytics to see field operations telemetry.</Text>
                </View>
            );
        }

        const listData = reportData.data || [];
        if (listData.length === 0) {
            return (
                <View style={styles.paddedCenter}>
                    <Ionicons name="airplane" size={64} color="#E2E8F0" />
                    <Text style={styles.centerTitle}>No Movements Picked</Text>
                    <Text style={styles.centerSub}>The GPS telemetry returns zero travel bounds. This could mean staff were off, stationary, or permissions were blocked.</Text>
                </View>
            );
        }

        return null;
    };

    return (
        <View style={styles.mainSpace}>
            <Header title="Field Tracker Reports" />

            {/* Primary Matrix Tabs Row */}
            <View style={styles.tabRow}>
                <TouchableOpacity style={[styles.tabItem, activeTab === 'user' && styles.tabItemActive]} onPress={() => setActiveTab('user')}>
                    <Ionicons name="person" size={14} color={activeTab === 'user' ? '#434AFA' : '#64748B'} />
                    <Text style={[styles.tabLabel, activeTab === 'user' && styles.tabLabelActive]}>User Audit</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.tabItem, activeTab === 'monthly' && styles.tabItemActive]} onPress={() => setActiveTab('monthly')}>
                    <Ionicons name="grid" size={14} color={activeTab === 'monthly' ? '#434AFA' : '#64748B'} />
                    <Text style={[styles.tabLabel, activeTab === 'monthly' && styles.tabLabelActive]}>Fleet Monthly</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.tabItem, activeTab === 'date' && styles.tabItemActive]} onPress={() => setActiveTab('date')}>
                    <Ionicons name="today" size={14} color={activeTab === 'date' ? '#434AFA' : '#64748B'} />
                    <Text style={[styles.tabLabel, activeTab === 'date' && styles.tabLabelActive]}>Daily Snapshot</Text>
                </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 16 }} showsVerticalScrollIndicator={false}>
                {renderFilterDashboard()}

                {renderLoaderOrPlaceholder()}

                {!loading && reportData && (
                    <View style={{ paddingBottom: 40 }}>
                        {renderMetricSummaries()}

                        <View style={styles.listHeadLine}>
                            <Text style={styles.listHeadTxt}>Registry Breakdown</Text>
                            <Text style={styles.listHeadBadge}>{reportData.data?.length || 0} logs</Text>
                        </View>

                        {/* Render Active Feed */}
                        {activeTab === 'user' && (
                            <FlatList
                                data={reportData.data || []}
                                keyExtractor={(item, idx) => idx.toString()}
                                renderItem={renderUserWiseLogCard}
                                scrollEnabled={false}
                            />
                        )}

                        {activeTab === 'monthly' && renderMonthlySummaryGrid()}

                        {activeTab === 'date' && (
                            <FlatList
                                data={reportData.data || []}
                                keyExtractor={(item, idx) => idx.toString()}
                                renderItem={renderDateWiseCellCard}
                                scrollEnabled={false}
                            />
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Dynamic Modals */}
            {renderUserModal()}
            {renderCalendarGridModal()}
            {renderMonthPickerModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    mainSpace: { flex: 1, backgroundColor: '#FFFFFF' },
    
    // Tab Setup Styles
    tabRow: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: '#434AFA' },
    tabLabel: { fontSize: 11, color: '#64748B', fontWeight: '700' },
    tabLabelActive: { color: '#434AFA', fontWeight: '800' },

    // Filter Styles
    filterPanel: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
    inputGrp: { width: '100%' },
    inputLabel: { fontSize: 10, fontWeight: '800', textTransform: 'capitalize', color: '#64748B', marginBottom: 6 },
    controlBtn: { height: 42, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
    controlLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    controlTxt: { fontSize: 12, color: '#64748B', flex: 1 },
    searchQueryBtn: { height: 40, backgroundColor: '#434AFA', borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 },
    searchQueryBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '800' },

    // Metrics Tile Styles
    metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    metricCell: { width: (SCREEN_WIDTH - 42) / 2, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', padding: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
    metricIconCirc: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
    metricCellVal: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    metricCellTitle: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'capitalize', marginTop: 2 },

    // Section Headers
    listHeadLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
    listHeadTxt: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
    listHeadBadge: { backgroundColor: '#EEF2FF', color: '#434AFA', paddingHorizontal: 8, paddingVertical: 2, fontSize: 10, fontWeight: '800', borderRadius: 12 },

    // Card: Tab 1 User Wise Card
    statCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 14, marginBottom: 10 },
    statCardTop: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10, marginBottom: 10, alignItems: 'center' },
    cardDateLabel: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
    cardDayLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', marginTop: 2 },
    statBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    statBadgeTxt: { fontSize: 9, fontWeight: '800' },
    statSplitRow: { flexDirection: 'row', gap: 8 },
    statSplitCell: { flex: 1 },
    statValCap: { fontSize: 8, fontWeight: '800', color: '#94A3B8', textTransform: 'capitalize' },
    statInlineFlex: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    statValData: { fontSize: 12, fontWeight: '700', color: '#334155' },

    // Card: Tab 2 Fleet Monthly Unit
    tableUnit: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 14, marginBottom: 10 },
    tableHeadLine: { flexDirection: 'row', gap: 10, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 12 },
    avatarShell: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' },
    avatarTxt: { color: '#434AFA', fontWeight: '800', fontSize: 14 },
    tableEmpName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    tableSubLine: { fontSize: 11, color: '#94A3B8', marginTop: 2, fontWeight: '600' },
    tableEffortKm: { fontSize: 14, fontWeight: '800', color: '#434AFA' },
    tableEffortCap: { fontSize: 9, fontWeight: '700', color: '#94A3B8', textTransform: 'capitalize', marginTop: 2 },
    attendanceStamps: { flexDirection: 'row' },
    stampCell: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F1F5F9' },
    stampVal: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    stampCap: { fontSize: 9, color: '#94A3B8', fontWeight: '800', textTransform: 'capitalize', marginTop: 2 },

    // Card: Tab 3 Daily Split
    dateLogCard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginBottom: 10 },
    dateLogHead: { flexDirection: 'row', gap: 8, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F8FAFC', paddingBottom: 10, marginBottom: 10 },
    dateLogName: { flex: 1, fontSize: 13, fontWeight: '800', color: '#1E293B' },
    dateLogMetrics: { flexDirection: 'row', justifyContent: 'space-between' },
    miniLogCell: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    miniLogVal: { fontSize: 11, fontWeight: '700', color: '#475569' },

    // Generic State Layouts
    paddedCenter: { padding: 40, justifyContent: 'center', alignItems: 'center' },
    centerTxt: { fontSize: 12, color: '#64748B', fontWeight: '700', marginTop: 10 },
    centerTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginTop: 16 },
    centerSub: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 250 },
    noLogs: { padding: 30, alignItems: 'center' },
    noLogsSub: { fontStyle: 'italic', color: '#94A3B8', fontSize: 12 },

    // Overlay / Bottom Sheet Base Styles
    overlayBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
    sheetShell: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    sheetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    sheetTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    searchRow: { flexDirection: 'row', margin: 12, backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 12, alignItems: 'center' },
    searchInput: { flex: 1, height: 38, fontSize: 12, color: '#1E293B' },
    selectRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
    avatarIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
    rowHeadTxt: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
    rowSubTxt: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

    // Grid Modal Calendar / Month Styles
    centerModal: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    calWrapper: { backgroundColor: '#FFF', borderRadius: 12, width: '100%', padding: 16 },
    calNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    calArrow: { padding: 6, backgroundColor: '#F8FAFC', borderRadius: 6 },
    calMonthHeader: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    calWdLine: { flexDirection: 'row', marginBottom: 6 },
    calWdTxt: { flex: 1, textAlign: 'center', fontSize: 10, color: '#94A3B8', fontWeight: '800' },
    calDayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calDayBlank: { width: '14.28%', height: 36 },
    calDayBox: { width: '14.28%', height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 6, marginBottom: 4 },
    calDayBoxActive: { backgroundColor: '#434AFA' },
    calDayTxt: { fontSize: 12, color: '#1E293B', fontWeight: '600' },
    calDayTxtActive: { color: '#FFF', fontWeight: '800' },
    calCancel: { borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 12, paddingVertical: 12, alignItems: 'center' },
    calCancelTxt: { fontSize: 13, fontWeight: '800', color: '#434AFA' },

    monthMatrix: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    monthTile: { width: '30%', height: 38, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    monthTileActive: { backgroundColor: '#434AFA', borderColor: '#434AFA' },
    monthTileTxt: { fontSize: 12, fontWeight: '700', color: '#64748B' },
    monthTileTxtActive: { color: '#FFF' },

    // Monthly Matrix Table Grid styling
    matrixHeaderMessage: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', borderRadius: 8, marginHorizontal: 16, marginBottom: 10 },
    matrixHeaderMessageTxt: { fontSize: 11, color: '#434AFA', fontWeight: '600' },
    matrixHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#CBD5E1' },
    matrixRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    matrixCell: { 
        height: 46, 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderRightWidth: 1, 
        borderRightColor: '#E2E8F0', 
        paddingHorizontal: 4 
    },
    matrixLeftPinned: { 
        alignItems: 'flex-start', 
        paddingHorizontal: 8, 
        borderRightWidth: 2, 
        borderRightColor: '#CBD5E1',
        position: 'relative',
        zIndex: 10
    },
    matrixColHeaderTxt: { fontSize: 9, color: '#64748B', fontWeight: '800', textAlign: 'center' },
    dateDigit: { fontSize: 12, fontWeight: '800', color: '#1E293B' },
    dateDayName: { fontSize: 8, color: '#94A3B8', textTransform: 'capitalize' },
    matrixUserName: { fontSize: 11, color: '#1E293B', fontWeight: '700' },
    matrixSummaryNum: { fontSize: 12, fontWeight: '800', color: '#64748B', textAlign: 'center' }
});

export default TrackingReportScreen;
