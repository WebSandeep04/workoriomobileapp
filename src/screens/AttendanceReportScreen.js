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
    Platform, 
    Dimensions 
} from 'react-native';
import Header from '../components/Header';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AttendanceReportScreen = () => {
    // 1. Navigation Tabs State
    const [activeTab, setActiveTab] = useState('user'); // 'user', 'monthly', 'date'

    // 2. Data Feed Containers
    const [users, setUsers] = useState([]);
    const [reportData, setReportData] = useState(null);
    
    // 3. Filter Inputs
    const [selectedUser, setSelectedUser] = useState(null); // { id, name }
    const [selectedMonth, setSelectedMonth] = useState(''); // 'YYYY-MM'
    const [selectedDate, setSelectedDate] = useState(''); // 'YYYY-MM-DD'
    
    // 4. Load States
    const [loading, setLoading] = useState(false);
    const [usersLoading, setUsersLoading] = useState(false);
    const [expandedDays, setExpandedDays] = useState({}); // User wise accordion keys

    // 5. Custom Date/Month Modals Controls
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [userSearchText, setUserSearchText] = useState('');
    
    const [monthModalVisible, setMonthModalVisible] = useState(false);
    const [tempYear, setTempYear] = useState(new Date().getFullYear());
    
    const [calendarModalVisible, setCalendarModalVisible] = useState(false);
    const [pickerNavDate, setPickerNavDate] = useState(new Date());

    // Static Maps
    const monthsShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Initial Setup
    useEffect(() => {
        const today = new Date();
        const curYear = today.getFullYear();
        const curMonth = String(today.getMonth() + 1).padStart(2, '0');
        const curDay = String(today.getDate()).padStart(2, '0');
        
        setSelectedMonth(`${curYear}-${curMonth}`);
        setSelectedDate(`${curYear}-${curMonth}-${curDay}`);
        setTempYear(curYear);
        
        loadReportUsers();
    }, []);

    // Load Active Employees for Userwise dropdown
    const loadReportUsers = async () => {
        setUsersLoading(true);
        try {
            const res = await api.get('/attendance/report/users');
            if (res.data?.success) {
                const fetched = res.data.data || [];
                setUsers(fetched);
                if (fetched.length > 0) {
                    setSelectedUser(fetched[0]);
                }
            }
        } catch (error) {
            console.error('[Report] load users failed:', error);
        } finally {
            setUsersLoading(false);
        }
    };

    // Handle Fetching Report from Backend based on active state
    const fetchActiveReport = async () => {
        setLoading(true);
        setReportData(null);
        setExpandedDays({});

        try {
            let endpoint = '';
            let params = {};

            if (activeTab === 'user') {
                if (!selectedUser) {
                    Toast.show({ type: 'error', text1: 'Required Input', text2: 'Please choose a target employee.' });
                    setLoading(false);
                    return;
                }
                endpoint = '/attendance/report/user-wise';
                params = { user_id: selectedUser.id, month: selectedMonth };
            } else if (activeTab === 'monthly') {
                endpoint = '/attendance/report/monthly';
                params = { month: selectedMonth };
            } else if (activeTab === 'date') {
                endpoint = '/attendance/report/date-wise';
                params = { date: selectedDate };
            }

            const response = await api.get(endpoint, { params });
            if (response.data?.success) {
                setReportData(response.data.data);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Load Failed',
                    text2: response.data?.message || 'Unable to query database records.'
                });
            }
        } catch (error) {
            console.error('[Report] fetch data failed:', error);
            Toast.show({
                type: 'error',
                text1: 'Server Error',
                text2: error.response?.data?.message || 'A network glitch prevented fetching records.'
            });
        } finally {
            setLoading(false);
        }
    };

    // Trigger Fetching when active tab switches or filter changes
    useEffect(() => {
        // Automatically fetch monthly/date summaries if defaults present
        if (activeTab === 'monthly' || activeTab === 'date') {
            fetchActiveReport();
        } else if (activeTab === 'user' && selectedUser) {
            fetchActiveReport();
        }
    }, [activeTab]);

    // Helper accordion
    const toggleExpandDay = (index) => {
        setExpandedDays(prev => ({ ...prev, [index]: !prev[index] }));
    };

    // Decimal Hour converter to HH:MM
    const formatDuration = (hoursFloat) => {
        if (!hoursFloat || hoursFloat === 0) return '00:00';
        const hrs = Math.floor(hoursFloat);
        const mins = Math.round((hoursFloat - hrs) * 60);
        return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    };

    // Custom Label Styles Generator
    const getStatusColorConfig = (status) => {
        const token = String(status).toLowerCase();
        if (token.includes('present') || token === 'p' || token === 'full day') {
            return { bg: '#ECFDF5', txt: '#10B981', label: status };
        } else if (token.includes('halfday') || token.includes('half day') || token === 'hd') {
            return { bg: '#FFFBEB', txt: '#D97706', label: status };
        } else if (token.includes('absent') || token === 'a') {
            return { bg: '#FEF2F2', txt: '#EF4444', label: status };
        } else if (token.includes('sunday') || token.includes('weekly off') || token === 's') {
            return { bg: '#F8FAFC', txt: '#64748B', label: status };
        } else if (token.includes('holiday') || token === 'h') {
            return { bg: '#F5F3FF', txt: '#8B5CF6', label: status };
        } else if (token.includes('leave') || token === 'l') {
            return { bg: '#EEF2FF', txt: '#4F46E5', label: status };
        } else if (token === 'rh') {
            return { bg: '#EFF6FF', txt: '#3B82F6', label: status };
        } else if (token === 'sl') {
            return { bg: '#ECFEFF', txt: '#06B6D4', label: status };
        }
        return { bg: '#F1F5F9', txt: '#475569', label: status || '-' };
    };

    /* ==========================================
       MODALS & OVERLAYS LOGIC
       ========================================== */
    
    // 1. User Filter Dropdown Modal
    const renderUserDropdown = () => {
        const filtered = users.filter(u => 
            u.name?.toLowerCase().includes(userSearchText.toLowerCase())
        );
        return (
            <Modal visible={userModalVisible} animationType="slide" transparent={true} onRequestClose={() => setUserModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.sheetContainer, { height: '70%' }]}>
                        <View style={styles.sheetHead}>
                            <Text style={styles.sheetTitle}>Choose Employee</Text>
                            <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#475569" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.searchWrap}>
                            <Ionicons name="search" size={18} color="#94A3B8" />
                            <TextInput
                                style={styles.searchBox}
                                placeholder="Type name to filter..."
                                placeholderTextColor="#94A3B8"
                                value={userSearchText}
                                onChangeText={setUserSearchText}
                            />
                        </View>
                        {usersLoading ? (
                            <ActivityIndicator style={{ margin: 40 }} color="#434AFA" />
                        ) : (
                            <FlatList
                                data={filtered}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity 
                                        style={styles.listRow} 
                                        onPress={() => {
                                            setSelectedUser(item);
                                            setUserModalVisible(false);
                                            setUserSearchText('');
                                        }}
                                    >
                                        <View style={styles.rowAvatar}>
                                            <Text style={styles.rowAvatarTxt}>{item.name?.charAt(0) || 'U'}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.rowName}>{item.name}</Text>
                                            <Text style={styles.rowMail}>{item.email}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        );
    };

    // 2. Custom Grid Calendar (Day Picker)
    const renderCustomCalendar = () => {
        const year = pickerNavDate.getFullYear();
        const month = pickerNavDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        let days = [];
        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

        const changeCalMonth = (inc) => {
            const fresh = new Date(pickerNavDate);
            fresh.setMonth(fresh.getMonth() + inc);
            setPickerNavDate(fresh);
        };

        const selectDay = (dateObj) => {
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            setSelectedDate(`${y}-${m}-${d}`);
            setCalendarModalVisible(false);
        };

        return (
            <Modal visible={calendarModalVisible} transparent={true} animationType="fade" onRequestClose={() => setCalendarModalVisible(false)}>
                <View style={styles.centerModalBg}>
                    <View style={styles.calCard}>
                        <View style={styles.calTop}>
                            <TouchableOpacity style={styles.calArr} onPress={() => changeCalMonth(-1)}>
                                <Ionicons name="chevron-back" size={20} color="#1E293B" />
                            </TouchableOpacity>
                            <Text style={styles.calTitle}>{monthsFull[month]} {year}</Text>
                            <TouchableOpacity style={styles.calArr} onPress={() => changeCalMonth(1)}>
                                <Ionicons name="chevron-forward" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.calWeekHeaders}>
                            {weekDays.map((d, i) => <Text key={i} style={styles.calWeekLabel}>{d}</Text>)}
                        </View>
                        <View style={styles.calDaysGrid}>
                            {days.map((dayObj, i) => {
                                if (!dayObj) return <View key={i} style={styles.calEmptyCell} />;
                                const formattedStr = `${dayObj.getFullYear()}-${String(dayObj.getMonth() + 1).padStart(2, '0')}-${String(dayObj.getDate()).padStart(2, '0')}`;
                                const isPicked = selectedDate === formattedStr;
                                return (
                                    <TouchableOpacity 
                                        key={i} 
                                        style={[styles.calDayCell, isPicked && styles.calDayCellPicked]} 
                                        onPress={() => selectDay(dayObj)}
                                    >
                                        <Text style={[styles.calDayNum, isPicked && styles.calDayNumPicked]}>{dayObj.getDate()}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity style={styles.calClBtn} onPress={() => setCalendarModalVisible(false)}>
                            <Text style={styles.calClBtnTxt}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    // 3. Month & Year Picker Overlay
    const renderMonthYearPicker = () => {
        const selectMonthGrid = (monthIndex) => {
            const target = `${tempYear}-${String(monthIndex + 1).padStart(2, '0')}`;
            setSelectedMonth(target);
            setMonthModalVisible(false);
        };

        return (
            <Modal visible={monthModalVisible} transparent={true} animationType="fade" onRequestClose={() => setMonthModalVisible(false)}>
                <View style={styles.centerModalBg}>
                    <View style={styles.monthCard}>
                        <View style={styles.monthHead}>
                            <TouchableOpacity onPress={() => setTempYear(prev => prev - 1)}>
                                <Ionicons name="chevron-back" size={20} color="#1E293B" />
                            </TouchableOpacity>
                            <Text style={styles.monthYearTxt}>{tempYear}</Text>
                            <TouchableOpacity onPress={() => setTempYear(prev => prev + 1)}>
                                <Ionicons name="chevron-forward" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.monthGrid}>
                            {monthsShort.map((mLabel, idx) => {
                                const act = selectedMonth === `${tempYear}-${String(idx+1).padStart(2, '0')}`;
                                return (
                                    <TouchableOpacity 
                                        key={idx} 
                                        style={[styles.monthCell, act && styles.monthCellActive]} 
                                        onPress={() => selectMonthGrid(idx)}
                                    >
                                        <Text style={[styles.monthCellTxt, act && styles.monthCellTxtActive]}>{mLabel}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity style={styles.calClBtn} onPress={() => setMonthModalVisible(false)}>
                            <Text style={styles.calClBtnTxt}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    /* ==========================================
       CONTENT BLOCK VISUALIZERS
       ========================================== */
    
    // Block: Filters Toolbar Layout
    const renderFiltersLayout = () => {
        return (
            <View style={styles.filterToolbar}>
                {activeTab === 'user' && (
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Target Employee</Text>
                        <TouchableOpacity style={styles.customTrigger} onPress={() => setUserModalVisible(true)}>
                            <Ionicons name="person-outline" size={16} color="#434AFA" />
                            <Text style={styles.triggerTxt} numberOfLines={1}>
                                {selectedUser ? selectedUser.name : 'Choose an employee...'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                )}

                {activeTab !== 'date' ? (
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Statement Period (Month)</Text>
                        <TouchableOpacity style={styles.customTrigger} onPress={() => setMonthModalVisible(true)}>
                            <Ionicons name="calendar-outline" size={16} color="#434AFA" />
                            <Text style={styles.triggerTxt}>
                                {selectedMonth ? `${monthsFull[parseInt(selectedMonth.split('-')[1]) - 1]} ${selectedMonth.split('-')[0]}` : 'Choose Month'}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.fieldGroup}>
                        <Text style={styles.fieldLabel}>Select Target Date</Text>
                        <TouchableOpacity style={styles.customTrigger} onPress={() => setCalendarModalVisible(true)}>
                            <Ionicons name="calendar" size={16} color="#434AFA" />
                            <Text style={styles.triggerTxt}>{selectedDate}</Text>
                            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity style={styles.actionBtn} onPress={fetchActiveReport} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="play-circle" size={18} color="#FFF" />
                            <Text style={styles.actionBtnTxt}>Generate Report</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    // Sub-Widget: Dynamic Metric Box Widget
    const renderSummaryStats = () => {
        if (!reportData?.summary) return null;
        const s = reportData.summary;
        
        // Layout adapts based on tab
        let blocks = [];
        if (activeTab === 'user') {
            blocks = [
                { label: 'Work Days', val: s.total_working_days || 0, color: '#3B82F6', icon: 'calendar' },
                { label: 'Present', val: s.total_present || 0, color: '#10B981', icon: 'checkmark-circle' },
                { label: 'Absent', val: s.days_absent || 0, color: '#EF4444', icon: 'close-circle' },
                { label: 'Half Day', val: s.total_halfday || 0, color: '#F59E0B', icon: 'pie-chart' },
                { label: 'Leave', val: s.days_on_leave || 0, color: '#4F46E5', icon: 'cafe' },
                { label: 'Hol Worked', val: s.total_holidays_worked || 0, color: '#8B5CF6', icon: 'ribbon' },
            ];
        } else if (activeTab === 'date') {
            blocks = [
                { label: 'Total Users', val: s.total_users || 0, color: '#3B82F6', icon: 'people' },
                { label: 'Present', val: s.present || 0, color: '#10B981', icon: 'person-add' },
                { label: 'Absent', val: s.absent || 0, color: '#EF4444', icon: 'person-remove' },
                { label: 'Half Day', val: s.halfday || 0, color: '#F59E0B', icon: 'time' },
                { label: 'On Leave', val: s.leave || 0, color: '#4F46E5', icon: 'airplane' },
                { label: 'Hols Worked', val: s.holiday_working || 0, color: '#8B5CF6', icon: 'sparkles' },
            ];
        }

        if (blocks.length === 0) return null;

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statScroller}>
                {blocks.map((b, idx) => (
                    <View key={idx} style={styles.statMiniCard}>
                        <View style={[styles.statIconCirc, { backgroundColor: b.color + '15' }]}>
                            <Ionicons name={b.icon} size={16} color={b.color} />
                        </View>
                        <View>
                            <Text style={styles.statSub}>{b.label}</Text>
                            <Text style={[styles.statVal, { color: '#1E293B' }]}>{b.val}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        );
    };

    // Sub-Visualizer: Tab content for USER WISE report
    const renderUserWiseContent = () => {
        const dataList = reportData?.daily_breakdown || [];
        if (dataList.length === 0) return renderNoDataBox();

        return (
            <View style={{ flex: 1 }}>
                {renderSummaryStats()}
                <FlatList
                    data={dataList}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
                    renderItem={({ item, index }) => {
                        const isExp = expandedDays[index];
                        const styleCfg = getStatusColorConfig(item.status);
                        const totalStr = formatDuration(item.hours);
                        const hasMovements = item.movements && item.movements.length > 0;

                        return (
                            <View style={styles.userLogCard}>
                                {/* Card Header row */}
                                <TouchableOpacity style={styles.userLogCardHead} activeOpacity={0.8} onPress={() => toggleExpandDay(index)}>
                                    <View style={{ flex: 1 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <Text style={styles.logDateTxt}>{item.display_date}</Text>
                                            {!!item.is_wfh && <View style={styles.wfhPill}><Text style={styles.wfhPillTxt}>WFH</Text></View>}
                                        </View>
                                        <View style={[styles.statusLabelPill, { backgroundColor: styleCfg.bg }]}>
                                            <Text style={[styles.statusLabelTxt, { color: styleCfg.txt }]}>
                                                {styleCfg.label}
                                                {item.holiday_name ? `: ${item.holiday_name}` : ''}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.logDurationTxt}>{totalStr} Hrs</Text>
                                        {hasMovements && (
                                            <Ionicons name={isExp ? "chevron-up" : "chevron-down"} size={18} color="#94A3B8" style={{ marginTop: 4 }} />
                                        )}
                                    </View>
                                </TouchableOpacity>

                                {/* Dynamic Body Section */}
                                {isExp && hasMovements && (
                                    <View style={styles.expandedLogsBody}>
                                        <View style={styles.breakdownList}>
                                            {item.movements.map((m, idx) => {
                                                const actIn = String(m.movement_action || m.action).toLowerCase() === 'in' || String(m.movement_action || m.action).toLowerCase() === 'start';
                                                const mType = String(m.movement_type || m.type);
                                                return (
                                                    <View key={idx} style={styles.movementItemRow}>
                                                        <View style={[styles.lineIndicator, actIn ? styles.indicatorIn : styles.indicatorOut]} />
                                                        <Text style={styles.moveTime}>{m.time || '-'}</Text>
                                                        <View style={{ flex: 1 }}>
                                                            <Text style={styles.moveTitle}>
                                                                {mType} - {actIn ? 'IN' : 'OUT'}
                                                            </Text>
                                                            {!!m.description && (
                                                                <Text style={styles.moveDesc} numberOfLines={2}>
                                                                    "{m.description}"
                                                                </Text>
                                                            )}
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    }}
                />
            </View>
        );
    };

    // Sub-Visualizer: Tab content for MONTHLY summary Matrix Grid
    const renderMonthlySummaryContent = () => {
        const dates = reportData?.month?.dates || [];
        const usersGrid = reportData?.data || [];

        if (usersGrid.length === 0) return renderNoDataBox();

        // Table sizing
        const userColWidth = 120;
        const cellWidth = 34;
        const summaryColWidth = 65;

        return (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }}>
                <View style={styles.matrixHeaderMessage}>
                    <Ionicons name="information-circle" size={16} color="#434AFA" />
                    <Text style={styles.matrixHeaderMessageTxt}>Swipe horizontally to view entire month matrix</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
                    <View>
                        {/* Header Rows */}
                        <View style={styles.matrixHeaderRow}>
                            <View style={[styles.matrixCell, styles.matrixLeftPinned, { width: userColWidth }]}>
                                <Text style={styles.matrixColHeaderTxt}>EMPLOYEE</Text>
                            </View>
                            {dates.map((d, i) => (
                                <View key={i} style={[styles.matrixCell, { width: cellWidth, backgroundColor: d.is_sunday ? '#FFF1F2' : '#F8FAFC' }]}>
                                    <Text style={[styles.dateDigit, d.is_sunday && { color: '#EF4444' }]}>{d.day}</Text>
                                    <Text style={[styles.dateDayName, d.is_sunday && { color: '#EF4444' }]}>{d.day_name}</Text>
                                </View>
                            ))}
                            <View style={[styles.matrixCell, { width: summaryColWidth }]}><Text style={styles.matrixColHeaderTxt}>DAYS</Text></View>
                            <View style={[styles.matrixCell, { width: summaryColWidth }]}><Text style={styles.matrixColHeaderTxt}>PRES</Text></View>
                            <View style={[styles.matrixCell, { width: summaryColWidth }]}><Text style={styles.matrixColHeaderTxt}>ABS</Text></View>
                            <View style={[styles.matrixCell, { width: summaryColWidth }]}><Text style={styles.matrixColHeaderTxt}>LV</Text></View>
                        </View>

                        {/* Body Rows */}
                        {usersGrid.map((row, idx) => {
                            const isEven = idx % 2 === 0;
                            return (
                                <View key={idx} style={[styles.matrixRow, { backgroundColor: isEven ? '#FFF' : '#F8FAFC' }]}>
                                    <View style={[styles.matrixCell, styles.matrixLeftPinned, { width: userColWidth, backgroundColor: isEven ? '#FFF' : '#F8FAFC' }]}>
                                        <Text style={styles.matrixUserName} numberOfLines={1}>{row.user?.name}</Text>
                                    </View>
                                    {row.daily_statuses?.map((ds, sIdx) => {
                                        const code = String(ds.code || '-');
                                        const cfg = getStatusColorConfig(code);
                                        return (
                                            <View key={sIdx} style={[styles.matrixCell, { width: cellWidth }]}>
                                                {code !== '-' ? (
                                                    <View style={[styles.codeMarker, { backgroundColor: cfg.bg }]}>
                                                        <Text style={[styles.codeMarkerTxt, { color: cfg.txt }]}>{code}</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={{ color: '#CBD5E1' }}>-</Text>
                                                )}
                                            </View>
                                        );
                                    })}
                                    <View style={[styles.matrixCell, { width: summaryColWidth }]}><Text style={styles.matrixSummaryNum}>{row.summary?.total_working_days || 0}</Text></View>
                                    <View style={[styles.matrixCell, { width: summaryColWidth }]}><Text style={[styles.matrixSummaryNum, { color: '#10B981' }]}>{row.summary?.total_present || 0}</Text></View>
                                    <View style={[styles.matrixCell, { width: summaryColWidth }]}><Text style={[styles.matrixSummaryNum, { color: '#EF4444' }]}>{row.summary?.days_absent || 0}</Text></View>
                                    <View style={[styles.matrixCell, { width: summaryColWidth }]}><Text style={[styles.matrixSummaryNum, { color: '#4F46E5' }]}>{row.summary?.days_on_leave || 0}</Text></View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </ScrollView>
        );
    };

    // Sub-Visualizer: Tab content for DATE WISE listing
    const renderDateWiseContent = () => {
        const dataList = reportData?.data || [];
        if (dataList.length === 0) return renderNoDataBox();

        return (
            <View style={{ flex: 1 }}>
                {renderSummaryStats()}
                <FlatList
                    data={dataList}
                    keyExtractor={(item, index) => index.toString()}
                    contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
                    renderItem={({ item }) => {
                        const cfg = getStatusColorConfig(item.status);
                        return (
                            <View style={styles.dateWiseCard}>
                                <View style={styles.dateWiseLeft}>
                                    <View style={styles.empAvatar}>
                                        <Text style={styles.empAvatarTxt}>{item.user?.name?.charAt(0) || 'U'}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.empName} numberOfLines={1}>{item.user?.name}</Text>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                            <View style={[styles.statusPillMini, { backgroundColor: cfg.bg }]}>
                                                <Text style={[styles.statusPillMiniTxt, { color: cfg.txt }]}>{cfg.label}</Text>
                                            </View>
                                            {!!item.is_wfh && <Text style={styles.wfhSmallTag}>WFH</Text>}
                                        </View>
                                        {(item.status_reason && item.status_reason !== '-') && (
                                            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4, fontStyle: 'italic' }}>
                                                {item.status_reason}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.dateWiseDivider} />

                                <View style={styles.dateWiseRight}>
                                    <View style={{ flexDirection: 'row', gap: 16 }}>
                                        <View style={styles.gridMetric}>
                                            <Ionicons name="log-in" size={12} color="#10B981" />
                                            <Text style={styles.gridMetricLabel}>IN:</Text>
                                            <Text style={styles.gridMetricVal}>{item.first_in || '-'}</Text>
                                        </View>
                                        <View style={styles.gridMetric}>
                                            <Ionicons name="log-out" size={12} color="#EF4444" />
                                            <Text style={styles.gridMetricLabel}>OUT:</Text>
                                            <Text style={styles.gridMetricVal}>{item.last_out || '-'}</Text>
                                        </View>
                                        <View style={styles.gridMetric}>
                                            <Ionicons name="hourglass" size={12} color="#434AFA" />
                                            <Text style={styles.gridMetricLabel}>HRS:</Text>
                                            <Text style={[styles.gridMetricVal, { fontWeight: 'bold', color: '#1E293B' }]}>{formatDuration(item.hours)}</Text>
                                        </View>
                                    </View>
                                    
                                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                                        <View style={styles.gridMetric}>
                                            <Ionicons name="business" size={12} color="#64748B" />
                                            <Text style={styles.gridMetricLabel}>OFFICE:</Text>
                                            <Text style={styles.gridMetricVal}>{formatDuration(item.office_hours)}</Text>
                                        </View>
                                        <View style={styles.gridMetric}>
                                            <Ionicons name="map" size={12} color="#64748B" />
                                            <Text style={styles.gridMetricLabel}>FIELD:</Text>
                                            <Text style={styles.gridMetricVal}>{formatDuration(item.field_hours)}</Text>
                                        </View>
                                        <View style={styles.gridMetric}>
                                            <Ionicons name="cafe" size={12} color="#8B5CF6" />
                                            <Text style={styles.gridMetricLabel}>BREAK:</Text>
                                            <Text style={styles.gridMetricVal}>{formatDuration(item.break_time)}</Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row', gap: 16, marginTop: 8 }}>
                                        <View style={styles.gridMetric}>
                                            <Ionicons name="time" size={12} color="#F59E0B" />
                                            <Text style={styles.gridMetricLabel}>LATE BY:</Text>
                                            <Text style={styles.gridMetricVal}>{item.late_by !== '-' ? item.late_by : '-'}</Text>
                                        </View>
                                        <View style={styles.gridMetric}>
                                            <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                                            <Text style={styles.gridMetricLabel}>GRACE BAL:</Text>
                                            <Text style={styles.gridMetricVal}>{item.grace_balance !== '-' ? item.grace_balance : '-'}</Text>
                                        </View>
                                    </View>

                                    {(item.late_reason && item.late_reason !== '-') && (
                                        <View style={{ marginTop: 8 }}>
                                            <Text style={{ fontSize: 10, color: '#EF4444', fontStyle: 'italic' }}>Late Reason: {item.late_reason}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        );
                    }}
                />
            </View>
        );
    };

    // Helper box when no data is populated yet
    const renderNoDataBox = () => {
        return (
            <View style={styles.noDataBox}>
                <Ionicons name="bar-chart-outline" size={56} color="#CBD5E1" />
                <Text style={styles.noDataTitle}>No Report Records Available</Text>
                <Text style={styles.noDataSub}>Define your filter metrics above and tap "Generate Report" to visualize analytics.</Text>
            </View>
        );
    };

    /* ==========================================
       MAIN RENDER ENGINE
       ========================================== */
    return (
        <View style={styles.mainWrapper}>
            <Header title="Attendance Analytics" />

            {/* Top Segement Selection Navigation */}
            <View style={styles.tabsBar}>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'user' && styles.tabBtnActive]} onPress={() => setActiveTab('user')}>
                    <Text style={[styles.tabBtnTxt, activeTab === 'user' && styles.tabBtnTxtActive]}>User Wise</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'monthly' && styles.tabBtnActive]} onPress={() => setActiveTab('monthly')}>
                    <Text style={[styles.tabBtnTxt, activeTab === 'monthly' && styles.tabBtnTxtActive]}>Monthly</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'date' && styles.tabBtnActive]} onPress={() => setActiveTab('date')}>
                    <Text style={[styles.tabBtnTxt, activeTab === 'date' && styles.tabBtnTxtActive]}>Date Wise</Text>
                </TouchableOpacity>
            </View>

            {/* Central Panel Filters */}
            {renderFiltersLayout()}

            {/* Dynamically injected Tab Feed Screens */}
            <View style={{ flex: 1 }}>
                {loading ? (
                    <View style={styles.loadingCenter}>
                        <ActivityIndicator size="large" color="#434AFA" />
                        <Text style={styles.loadingCenterTxt}>Compiling report matrices...</Text>
                    </View>
                ) : (
                    <>
                        {activeTab === 'user' && renderUserWiseContent()}
                        {activeTab === 'monthly' && renderMonthlySummaryContent()}
                        {activeTab === 'date' && renderDateWiseContent()}
                    </>
                )}
            </View>

            {/* Core Filter Custom Overlay Modals */}
            {renderUserDropdown()}
            {renderMonthYearPicker()}
            {renderCustomCalendar()}
        </View>
    );
};

const styles = StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: '#FFFFFF' },
    
    // Tab bar Navigation Styling
    tabsBar: { 
        flexDirection: 'row', 
        backgroundColor: '#FFF', 
        padding: 4, 
        marginHorizontal: 16, 
        marginTop: 12, 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: '#E2E8F0' 
    },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
    tabBtnActive: { backgroundColor: '#434AFA' },
    tabBtnTxt: { fontSize: 13, color: '#64748B', fontWeight: '600' },
    tabBtnTxtActive: { color: '#FFF', fontWeight: '800' },

    // Filters Layout Panel tokens
    filterToolbar: { 
        backgroundColor: '#FFF', 
        marginHorizontal: 16, 
        marginTop: 12, 
        padding: 12, 
        borderRadius: 10, 
        borderWidth: 1, 
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOpacity: 0.02,
        shadowOffset: { width: 0, height: 2 },
        gap: 10
    },
    fieldGroup: { },
    fieldLabel: { fontSize: 11, color: '#64748B', fontWeight: '700', textTransform: 'capitalize', marginBottom: 4 },
    customTrigger: { 
        height: 44, 
        borderRadius: 8, 
        borderWidth: 1, 
        borderColor: '#CBD5E1', 
        backgroundColor: '#F8FAFC',
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 12, 
        gap: 8 
    },
    triggerTxt: { flex: 1, fontSize: 13, color: '#1E293B', fontWeight: '600' },
    actionBtn: { 
        height: 44, 
        backgroundColor: '#434AFA', 
        borderRadius: 8, 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: 8,
        marginTop: 4
    },
    actionBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 14 },

    // Stat scroller mini tokens
    statScroller: { paddingHorizontal: 16, gap: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center' },
    statMiniCard: { 
        backgroundColor: '#FFF', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 10, 
        paddingHorizontal: 14, 
        paddingVertical: 10,
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 10,
        minWidth: 140,
        flexShrink: 0
    },
    statIconCirc: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    statSub: { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'capitalize' },
    statVal: { fontSize: 16, fontWeight: '800' },

    // Common Blank Box setup
    noDataBox: { flex: 1, padding: 50, justifyContent: 'center', alignItems: 'center' },
    noDataTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginTop: 16, textAlign: 'center' },
    noDataSub: { fontSize: 12, color: '#64748B', marginTop: 6, textAlign: 'center', lineHeight: 18 },

    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    loadingCenterTxt: { marginTop: 12, color: '#64748B', fontSize: 13, fontWeight: '600' },

    // 1. UserWise Log Card Visuals
    userLogCard: { 
        backgroundColor: '#FFF', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 10, 
        marginBottom: 12, 
        overflow: 'hidden' 
    },
    userLogCardHead: { 
        flexDirection: 'row', 
        padding: 16, 
        justifyContent: 'space-between', 
        alignItems: 'center',
        minHeight: 72
    },
    logDateTxt: { fontSize: 15, color: '#1E293B', fontWeight: '800' },
    statusLabelPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 6 },
    statusLabelTxt: { fontSize: 10, fontWeight: '800' },
    wfhPill: { backgroundColor: '#64748B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    wfhPillTxt: { color: '#FFF', fontSize: 9, fontWeight: '800' },
    logDurationTxt: { fontSize: 15, fontWeight: '800', color: '#434AFA' },

    expandedLogsBody: { 
        backgroundColor: '#F8FAFC', 
        borderTopWidth: 1, 
        borderTopColor: '#E2E8F0', 
        padding: 14 
    },
    breakdownList: { gap: 12 },
    movementItemRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    lineIndicator: { width: 3, height: '100%', borderRadius: 2, minHeight: 30 },
    indicatorIn: { backgroundColor: '#10B981' },
    indicatorOut: { backgroundColor: '#EF4444' },
    moveTime: { fontSize: 12, color: '#1E293B', fontWeight: '800', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', minWidth: 45 },
    moveTitle: { fontSize: 11, color: '#475569', fontWeight: '700' },
    moveDesc: { fontSize: 11, color: '#94A3B8', fontStyle: 'italic', marginTop: 2 },

    // 2. DateWise Card Visuals
    dateWiseCard: { 
        backgroundColor: '#FFF', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 10, 
        marginBottom: 12, 
        padding: 12 
    },
    dateWiseLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    empAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' },
    empAvatarTxt: { color: '#434AFA', fontWeight: '800', fontSize: 14 },
    empName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    statusPillMini: { alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    statusPillMiniTxt: { fontSize: 9, fontWeight: '800' },
    wfhSmallTag: { color: '#64748B', fontWeight: '800', fontSize: 10 },
    dateWiseDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
    dateWiseRight: { flexDirection: 'row', justifyContent: 'space-between' },
    gridMetric: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    gridMetricLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '800' },
    gridMetricVal: { fontSize: 11, color: '#475569', fontWeight: '600' },

    // 3. Monthly Matrix Table Grid styling
    matrixHeaderMessage: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF' },
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
        borderRightColor: '#CBD5E1' 
    },
    matrixColHeaderTxt: { fontSize: 9, color: '#64748B', fontWeight: '800', textAlign: 'center' },
    dateDigit: { fontSize: 12, fontWeight: '800', color: '#1E293B' },
    dateDayName: { fontSize: 8, color: '#94A3B8', textTransform: 'capitalize' },
    matrixUserName: { fontSize: 11, color: '#1E293B', fontWeight: '700' },
    codeMarker: { width: 22, height: 22, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
    codeMarkerTxt: { fontSize: 10, fontWeight: '800' },
    matrixSummaryNum: { fontSize: 12, fontWeight: '800', color: '#64748B' },

    // Universal Modals Visual Layout elements
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
    sheetContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    sheetHead: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    sheetTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    searchWrap: { flexDirection: 'row', margin: 16, backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 12, alignItems: 'center' },
    searchBox: { flex: 1, height: 40, fontSize: 13, color: '#1E293B' },
    listRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', gap: 12, alignItems: 'center' },
    rowAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#434AFA15', justifyContent: 'center', alignItems: 'center' },
    rowAvatarTxt: { color: '#434AFA', fontWeight: '800', fontSize: 14 },
    rowName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
    rowMail: { fontSize: 11, color: '#64748B' },

    // Center Modals Overlay visual
    centerModalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    
    // Custom Calendar Grid modal token
    calCard: { backgroundColor: '#FFF', borderRadius: 12, width: '100%', padding: 16 },
    calTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    calArr: { padding: 6, backgroundColor: '#F8FAFC', borderRadius: 6 },
    calTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    calWeekHeaders: { flexDirection: 'row', marginBottom: 6 },
    calWeekLabel: { flex: 1, textAlign: 'center', fontSize: 11, color: '#94A3B8', fontWeight: '700' },
    calDaysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calEmptyCell: { width: '14.28%', height: 38 },
    calDayCell: { width: '14.28%', height: 38, justifyContent: 'center', alignItems: 'center', borderRadius: 6, marginBottom: 4 },
    calDayCellPicked: { backgroundColor: '#434AFA' },
    calDayNum: { fontSize: 13, fontWeight: '500', color: '#1E293B' },
    calDayNumPicked: { color: '#FFF', fontWeight: '800' },
    calClBtn: { marginTop: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', alignItems: 'center' },
    calClBtnTxt: { color: '#434AFA', fontWeight: '800', fontSize: 14 },

    // Month Picker Modal styling
    monthCard: { backgroundColor: '#FFF', borderRadius: 12, width: '90%', padding: 16 },
    monthHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    monthYearTxt: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    monthGrid: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 12 },
    monthCell: { width: '33.33%', height: 44, justifyContent: 'center', alignItems: 'center' },
    monthCellActive: { backgroundColor: '#434AFA15', borderRadius: 8 },
    monthCellTxt: { fontSize: 13, fontWeight: '600', color: '#475569' },
    monthCellTxtActive: { color: '#434AFA', fontWeight: '800' },
});

export default AttendanceReportScreen;
