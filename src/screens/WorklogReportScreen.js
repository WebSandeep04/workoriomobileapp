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
    Dimensions,
    Switch
} from 'react-native';
import Header from '../components/Header';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const WorklogReportScreen = () => {
    // 1. Main Screen Navigation
    const [activeTab, setActiveTab] = useState('timesheet'); // 'timesheet' or 'userwise'

    // 2. Metadata Stores
    const [users, setUsers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [metaLoading, setMetaLoading] = useState(false);
    const [projectsLoading, setProjectsLoading] = useState(false);

    // 3. Selected Filters Context
    const [selectedUser, setSelectedUser] = useState(null);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [groupByUser, setGroupByUser] = useState(true);

    // 4. Query Report Data 
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({}); 

    // 5. Modals & Picker Toggles
    const [userModalVisible, setUserModalVisible] = useState(false);
    const [userSearchText, setUserSearchText] = useState('');

    const [customerModalVisible, setCustomerModalVisible] = useState(false);
    const [customerSearchText, setCustomerSearchText] = useState('');

    const [projectModalVisible, setProjectModalVisible] = useState(false);
    const [projectSearchText, setProjectSearchText] = useState('');

    // 6. Unified Calendar Modal
    const [calendarModalVisible, setCalendarModalVisible] = useState(false);
    const [activePickerTarget, setActivePickerTarget] = useState('from'); // 'from' or 'to'
    const [pickerNavDate, setPickerNavDate] = useState(new Date());

    // Const Arrays
    const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    // Initial Lifecycle: Load Defaults and Core Metadata
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        setFromDate(formatDateISO(firstDay));
        setToDate(formatDateISO(today));
        
        fetchReportFilters();
    }, []);

    // Cascading Fetch Trigger for Projects on Customer modification
    useEffect(() => {
        if (selectedCustomer) {
            loadCustomerProjects(selectedCustomer.id);
        } else {
            setProjects([]);
        }
        setSelectedProject(null);
    }, [selectedCustomer]);

    // Load Users and Customers filter data
    const fetchReportFilters = async () => {
        setMetaLoading(true);
        try {
            const response = await api.get('/worklog/report/filters');
            if (response.data?.success) {
                setUsers(response.data.users || []);
                setCustomers(response.data.customers || []);
            }
        } catch (error) {
            console.error('[WorklogReport] Init failed:', error);
        } finally {
            setMetaLoading(false);
        }
    };

    // Load dynamic projects list
    const loadCustomerProjects = async (customerId) => {
        setProjectsLoading(true);
        try {
            const response = await api.get('/worklog/report/projects', { params: { customer_id: customerId } });
            if (response.data?.success) {
                setProjects(response.data.projects || []);
            }
        } catch (error) {
            console.error('[WorklogReport] Project loading fail:', error);
        } finally {
            setProjectsLoading(false);
        }
    };

    // Main Load Operations handler
    const runReportQuery = async () => {
        setLoading(true);
        setReportData(null);
        setExpandedGroups({});

        try {
            let endpoint = '';
            let params = {};

            if (activeTab === 'timesheet') {
                endpoint = '/worklog/report/general';
                params = {
                    customer_id: selectedCustomer?.id,
                    customer_project_id: selectedProject?.id,
                    from: fromDate,
                    to: toDate,
                    group_by_user: groupByUser ? 1 : 0
                };
            } else {
                if (!selectedUser) {
                    Toast.show({ type: 'info', text1: 'Incomplete Selection', text2: 'Please choose a User to audit.' });
                    setLoading(false);
                    return;
                }
                endpoint = '/worklog/report/user-wise';
                params = {
                    user_id: selectedUser.id,
                    customer_id: selectedCustomer?.id,
                    customer_project_id: selectedProject?.id,
                    from: fromDate,
                    to: toDate
                };
            }

            const response = await api.get(endpoint, { params });
            if (response.data?.success) {
                setReportData(response.data);
            } else {
                Toast.show({
                    type: 'error',
                    text1: 'Execution Failed',
                    text2: response.data?.message || 'Backend did not yield report content.'
                });
            }
        } catch (error) {
            console.error('[WorklogReport] API Execution Crash:', error);
            Toast.show({
                type: 'error',
                text1: 'Server Response Error',
                text2: error.response?.data?.message || 'Data query could not finish execution.'
            });
        } finally {
            setLoading(false);
        }
    };

    // Fetch automatically on tab shift
    useEffect(() => {
        setReportData(null);
    }, [activeTab]);

    // Helper Formatting
    const formatDateISO = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dy = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dy}`;
    };

    const formatDisplayDate = (dateStr) => {
        if (!dateStr) return '-';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${parts[2]} ${months[parseInt(parts[1]) - 1]}, ${parts[0]}`;
    };

    const formatTimeDisplay = (h, m) => {
        return `${String(h || 0).padStart(2, '0')}:${String(m || 0).padStart(2, '0')} Hrs`;
    };

    const toggleAccordion = (id) => {
        setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Calendar Launcher
    const showDatePicker = (target) => {
        setActivePickerTarget(target);
        const anchorStr = target === 'from' ? fromDate : toDate;
        if (anchorStr) {
            const d = new Date(anchorStr);
            if (!isNaN(d.getTime())) {
                setPickerNavDate(d);
            }
        }
        setCalendarModalVisible(true);
    };

    /* ==========================================
       OVERLAY RENDER FUNCTIONS
       ========================================== */

    // A. User Picker
    const renderUserSelectorModal = () => {
        const data = users.filter(u => u.name?.toLowerCase().includes(userSearchText.toLowerCase()));
        return (
            <Modal visible={userModalVisible} animationType="slide" transparent={true} onRequestClose={() => setUserModalVisible(false)}>
                <View style={styles.bottomOverlay}>
                    <View style={[styles.bottomSheet, { height: '65%' }]}>
                        <View style={styles.sheetHead}>
                            <Text style={styles.sheetTitle}>Choose User</Text>
                            <TouchableOpacity onPress={() => setUserModalVisible(false)}><Ionicons name="close" size={22} color="#475569" /></TouchableOpacity>
                        </View>
                        <View style={styles.sheetSearch}>
                            <Ionicons name="search" size={16} color="#94A3B8" />
                            <TextInput style={styles.sheetSearchInput} placeholder="Type keyword..." placeholderTextColor="#94A3B8" value={userSearchText} onChangeText={setUserSearchText} />
                        </View>
                        <FlatList
                            data={data}
                            keyExtractor={item => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.pickerRow} onPress={() => { setSelectedUser(item); setUserModalVisible(false); setUserSearchText(''); }}>
                                    <Ionicons name="person-circle-outline" size={24} color="#434AFA" />
                                    <Text style={styles.pickerRowText}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<View style={styles.listEmpty}><Text style={styles.listEmptyTxt}>No users found</Text></View>}
                        />
                    </View>
                </View>
            </Modal>
        );
    };

    // B. Customer Picker
    const renderCustomerSelectorModal = () => {
        const data = customers.filter(c => c.name?.toLowerCase().includes(customerSearchText.toLowerCase()));
        return (
            <Modal visible={customerModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCustomerModalVisible(false)}>
                <View style={styles.bottomOverlay}>
                    <View style={[styles.bottomSheet, { height: '70%' }]}>
                        <View style={styles.sheetHead}>
                            <Text style={styles.sheetTitle}>Select Customer</Text>
                            <TouchableOpacity onPress={() => setCustomerModalVisible(false)}><Ionicons name="close" size={22} color="#475569" /></TouchableOpacity>
                        </View>
                        <View style={styles.sheetSearch}>
                            <Ionicons name="search" size={16} color="#94A3B8" />
                            <TextInput style={styles.sheetSearchInput} placeholder="Filter customer logs..." placeholderTextColor="#94A3B8" value={customerSearchText} onChangeText={setCustomerSearchText} />
                        </View>
                        <TouchableOpacity style={styles.pickerRow} onPress={() => { setSelectedCustomer(null); setCustomerModalVisible(false); setCustomerSearchText(''); }}>
                            <Ionicons name="grid-outline" size={20} color="#64748B" />
                            <Text style={[styles.pickerRowText, { fontWeight: '700', color: '#434AFA' }]}>[ ALL CUSTOMERS ]</Text>
                        </TouchableOpacity>
                        <FlatList
                            data={data}
                            keyExtractor={item => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.pickerRow} onPress={() => { setSelectedCustomer(item); setCustomerModalVisible(false); setCustomerSearchText(''); }}>
                                    <Ionicons name="business" size={18} color="#64748B" />
                                    <Text style={styles.pickerRowText}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        );
    };

    // C. Project Picker
    const renderProjectSelectorModal = () => {
        const data = projects.filter(p => p.project_name?.toLowerCase().includes(projectSearchText.toLowerCase()));
        return (
            <Modal visible={projectModalVisible} animationType="slide" transparent={true} onRequestClose={() => setProjectModalVisible(false)}>
                <View style={styles.bottomOverlay}>
                    <View style={[styles.bottomSheet, { height: '60%' }]}>
                        <View style={styles.sheetHead}>
                            <Text style={styles.sheetTitle}>Select Project</Text>
                            <TouchableOpacity onPress={() => setProjectModalVisible(false)}><Ionicons name="close" size={22} color="#475569" /></TouchableOpacity>
                        </View>
                        <View style={styles.sheetSearch}>
                            <Ionicons name="search" size={16} color="#94A3B8" />
                            <TextInput style={styles.sheetSearchInput} placeholder="Find specific campaign..." placeholderTextColor="#94A3B8" value={projectSearchText} onChangeText={setProjectSearchText} />
                        </View>
                        <TouchableOpacity style={styles.pickerRow} onPress={() => { setSelectedProject(null); setProjectModalVisible(false); setProjectSearchText(''); }}>
                            <Ionicons name="briefcase-outline" size={18} color="#64748B" />
                            <Text style={[styles.pickerRowText, { fontWeight: '700', color: '#434AFA' }]}>[ ALL PROJECTS ]</Text>
                        </TouchableOpacity>
                        {projectsLoading ? (
                            <ActivityIndicator style={{ margin: 30 }} color="#434AFA" />
                        ) : (
                            <FlatList
                                data={data}
                                keyExtractor={item => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.pickerRow} onPress={() => { setSelectedProject(item); setProjectModalVisible(false); setProjectSearchText(''); }}>
                                        <Ionicons name="cube-outline" size={18} color="#64748B" />
                                        <Text style={styles.pickerRowText}>{item.project_name}</Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={<View style={styles.listEmpty}><Text style={styles.listEmptyTxt}>No projects registered for this customer</Text></View>}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        );
    };

    // D. Global Calendar Grid
    const renderCalendarGridModal = () => {
        const yr = pickerNavDate.getFullYear();
        const mth = pickerNavDate.getMonth();
        const firstWeekday = new Date(yr, mth, 1).getDay();
        const numDays = new Date(yr, mth + 1, 0).getDate();
        
        let days = [];
        for (let i = 0; i < firstWeekday; i++) days.push(null);
        for (let i = 1; i <= numDays; i++) days.push(new Date(yr, mth, i));

        const updateCalMonth = (step) => {
            const nu = new Date(pickerNavDate);
            nu.setMonth(nu.getMonth() + step);
            setPickerNavDate(nu);
        };

        const applyDateSelection = (obj) => {
            const val = formatDateISO(obj);
            if (activePickerTarget === 'from') {
                setFromDate(val);
            } else {
                setToDate(val);
            }
            setCalendarModalVisible(false);
        };

        const compDate = activePickerTarget === 'from' ? fromDate : toDate;

        return (
            <Modal visible={calendarModalVisible} transparent={true} animationType="fade" onRequestClose={() => setCalendarModalVisible(false)}>
                <View style={styles.centerModalBg}>
                    <View style={styles.calCard}>
                        <View style={styles.calTop}>
                            <TouchableOpacity style={styles.calArr} onPress={() => updateCalMonth(-1)}>
                                <Ionicons name="chevron-back" size={18} color="#1E293B" />
                            </TouchableOpacity>
                            <Text style={styles.calTitle}>{monthsFull[mth]} {yr}</Text>
                            <TouchableOpacity style={styles.calArr} onPress={() => updateCalMonth(1)}>
                                <Ionicons name="chevron-forward" size={18} color="#1E293B" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.calWeekHeaders}>
                            {weekDays.map((wd, ix) => <Text key={ix} style={styles.calWeekLabel}>{wd}</Text>)}
                        </View>
                        <View style={styles.calDaysGrid}>
                            {days.map((do_, ix) => {
                                if (!do_) return <View key={ix} style={styles.calEmptyCell} />;
                                const formStr = formatDateISO(do_);
                                const isPicked = compDate === formStr;
                                return (
                                    <TouchableOpacity key={ix} style={[styles.calDayCell, isPicked && styles.calDayCellPicked]} onPress={() => applyDateSelection(do_)}>
                                        <Text style={[styles.calDayNum, isPicked && styles.calDayNumPicked]}>{do_.getDate()}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity style={styles.calClose} onPress={() => setCalendarModalVisible(false)}>
                            <Text style={styles.calCloseTxt}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    /* ==========================================
       FILTERS RENDER BAR
       ========================================== */
    const renderFilterBox = () => {
        return (
            <View style={styles.filterBoard}>
                <View style={styles.rowFilter}>
                    {/* Conditional: Target User (Only in UserWise Tab) */}
                    {activeTab === 'userwise' && (
                        <View style={[styles.ctrlGrp, { width: '100%', marginBottom: 10 }]}>
                            <Text style={styles.ctrlLabel}>Employee *</Text>
                            <TouchableOpacity style={styles.triggerBtn} onPress={() => setUserModalVisible(true)}>
                                <View style={styles.triggerLeft}>
                                    <Ionicons name="person" size={14} color="#434AFA" style={{ marginRight: 6 }} />
                                    <Text style={[styles.triggerTxt, selectedUser && { color: '#1E293B', fontWeight: '700' }]} numberOfLines={1}>
                                        {selectedUser ? selectedUser.name : 'Choose Target User'}
                                    </Text>
                                </View>
                                <Ionicons name="chevron-down" size={14} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Customer Selection */}
                    <View style={styles.ctrlGrp}>
                        <Text style={styles.ctrlLabel}>Customer</Text>
                        <TouchableOpacity style={styles.triggerBtn} onPress={() => setCustomerModalVisible(true)}>
                            <View style={styles.triggerLeft}>
                                <Ionicons name="business" size={14} color="#434AFA" style={{ marginRight: 6 }} />
                                <Text style={[styles.triggerTxt, selectedCustomer && { color: '#1E293B', fontWeight: '700' }]} numberOfLines={1}>
                                    {selectedCustomer ? selectedCustomer.name : 'All Customers'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-down" size={14} color="#64748B" />
                        </TouchableOpacity>
                    </View>

                    {/* Cascading Project Selection */}
                    <View style={styles.ctrlGrp}>
                        <Text style={styles.ctrlLabel}>Project</Text>
                        <TouchableOpacity 
                            style={[styles.triggerBtn, !selectedCustomer && { opacity: 0.6, backgroundColor: '#F1F5F9' }]} 
                            onPress={() => selectedCustomer && setProjectModalVisible(true)}
                            disabled={!selectedCustomer}
                        >
                            <View style={styles.triggerLeft}>
                                <Ionicons name="cube" size={14} color={selectedCustomer ? "#434AFA" : "#94A3B8"} style={{ marginRight: 6 }} />
                                <Text style={[styles.triggerTxt, selectedProject && { color: '#1E293B', fontWeight: '700' }]} numberOfLines={1}>
                                    {selectedProject ? selectedProject.project_name : 'All Projects'}
                                </Text>
                            </View>
                            <Ionicons name="chevron-down" size={14} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Row: From Date, To Date */}
                <View style={[styles.rowFilter, { marginTop: 10 }]}>
                    <View style={styles.ctrlGrp}>
                        <Text style={styles.ctrlLabel}>From Date</Text>
                        <TouchableOpacity style={styles.triggerBtn} onPress={() => showDatePicker('from')}>
                            <View style={styles.triggerLeft}>
                                <Ionicons name="calendar" size={14} color="#434AFA" style={{ marginRight: 6 }} />
                                <Text style={[styles.triggerTxt, { color: '#1E293B', fontWeight: '600' }]}>{formatDisplayDate(fromDate)}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.ctrlGrp}>
                        <Text style={styles.ctrlLabel}>To Date</Text>
                        <TouchableOpacity style={styles.triggerBtn} onPress={() => showDatePicker('to')}>
                            <View style={styles.triggerLeft}>
                                <Ionicons name="calendar" size={14} color="#434AFA" style={{ marginRight: 6 }} />
                                <Text style={[styles.triggerTxt, { color: '#1E293B', fontWeight: '600' }]}>{formatDisplayDate(toDate)}</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Control Strip: Group By & Submit Button */}
                <View style={styles.actionStrip}>
                    {activeTab === 'timesheet' ? (
                        <View style={styles.groupCtrl}>
                            <Switch
                                value={groupByUser}
                                onValueChange={setGroupByUser}
                                trackColor={{ false: "#CBD5E1", true: "#C7D2FE" }}
                                thumbColor={groupByUser ? "#434AFA" : "#94A3B8"}
                                ios_backgroundColor="#E2E8F0"
                            />
                            <Text style={styles.groupCtrlLabel}>Group By Employee</Text>
                        </View>
                    ) : <View />}

                    <TouchableOpacity style={styles.queryBtn} onPress={runReportQuery} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="play-circle" size={18} color="#FFF" style={{ marginRight: 6 }} />
                                <Text style={styles.queryBtnTxt}>Load Analysis</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    /* ==========================================
       STATS TILES BOX
       ========================================== */
    const renderStatistics = () => {
        if (!reportData?.summary) return null;
        const sum = reportData.summary;

        if (activeTab === 'timesheet') {
            // Calc Average
            const totMin = (sum.total_hours || 0) * 60 + (sum.total_minutes || 0);
            const avgMin = sum.total_users > 0 ? Math.round(totMin / sum.total_users) : 0;
            const avgH = Math.floor(avgMin / 60);
            const avgM = avgMin % 60;

            return (
                <View style={styles.statGrid}>
                    <View style={styles.statCell}>
                        <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}><Ionicons name="people" size={18} color="#434AFA" /></View>
                        <View>
                            <Text style={styles.statCellNum}>{sum.total_users}</Text>
                            <Text style={styles.statCellLabel}>Employees</Text>
                        </View>
                    </View>
                    <View style={styles.statCell}>
                        <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}><Ionicons name="time" size={18} color="#10B981" /></View>
                        <View>
                            <Text style={styles.statCellNum}>{formatTimeDisplay(sum.total_hours, sum.total_minutes)}</Text>
                            <Text style={styles.statCellLabel}>Total Effort</Text>
                        </View>
                    </View>
                    <View style={styles.statCell}>
                        <View style={[styles.statIcon, { backgroundColor: '#F5F3FF' }]}><Ionicons name="list-circle" size={18} color="#8B5CF6" /></View>
                        <View>
                            <Text style={styles.statCellNum}>{sum.total_entries}</Text>
                            <Text style={styles.statCellLabel}>Task Logs</Text>
                        </View>
                    </View>
                    <View style={styles.statCell}>
                        <View style={[styles.statIcon, { backgroundColor: '#FFFBEB' }]}><Ionicons name="speedometer" size={18} color="#F59E0B" /></View>
                        <View>
                            <Text style={styles.statCellNum}>{formatTimeDisplay(avgH, avgM)}</Text>
                            <Text style={styles.statCellLabel}>Avg / User</Text>
                        </View>
                    </View>
                </View>
            );
        } else {
            return (
                <View style={styles.statGrid}>
                    <View style={[styles.statCell, { flex: 1 }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#F5F3FF' }]}><Ionicons name="copy" size={18} color="#8B5CF6" /></View>
                        <View>
                            <Text style={styles.statCellNum}>{sum.total_entries} Entries</Text>
                            <Text style={styles.statCellLabel}>Volume</Text>
                        </View>
                    </View>
                    <View style={[styles.statCell, { flex: 1 }]}>
                        <View style={[styles.statIcon, { backgroundColor: '#ECFDF5' }]}><Ionicons name="hourglass" size={18} color="#10B981" /></View>
                        <View>
                            <Text style={styles.statCellNum}>{formatTimeDisplay(sum.total_hours, sum.total_minutes)}</Text>
                            <Text style={styles.statCellLabel}>Cum. Logged Hours</Text>
                        </View>
                    </View>
                </View>
            );
        }
    };

    /* ==========================================
       LOG CARD VIEWS RENDER
       ========================================== */
    
    const renderIndividualLogCard = (item) => {
        const isApprove = item.status === 'approved';
        const isReject = item.status === 'rejected';

        return (
            <View key={item.id} style={styles.logUnit}>
                <View style={styles.logTopLine}>
                    <View style={styles.logTopLeft}>
                        <Ionicons name="calendar-outline" size={13} color="#64748B" />
                        <Text style={styles.logDateText}>{formatDisplayDate(item.work_date)}</Text>
                    </View>
                    <View style={styles.logPillWrapper}>
                        <Text style={styles.logEffortTxt}>{String(item.hours).padStart(2, '0')}:{String(item.minutes).padStart(2, '0')} Hrs</Text>
                        <View style={[
                            styles.statusMiniDot, 
                            isApprove && { backgroundColor: '#E1FCEF', borderColor: '#A7F3D0' },
                            isReject && { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }
                        ]}>
                            <Text style={[
                                styles.statusMiniDotTxt,
                                isApprove && { color: '#059669' },
                                isReject && { color: '#DC2626' }
                            ]}>{item.status?.toUpperCase() || 'PENDING'}</Text>
                        </View>
                    </View>
                </View>

                {/* If not user-wise and grouping disabled, show employee name on card */}
                {activeTab === 'timesheet' && !groupByUser && (
                    <View style={styles.cardRow}>
                        <Ionicons name="person" size={13} color="#94A3B8" style={{ width: 16 }} />
                        <Text style={styles.cardEmphName}>{item.user}</Text>
                    </View>
                )}

                <View style={styles.cardDetailBlock}>
                    <View style={styles.detailItem}>
                        <Text style={styles.dLabel}>Customer</Text>
                        <Text style={styles.dVal} numberOfLines={1}>{item.customer}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.dLabel}>Project</Text>
                        <Text style={styles.dVal} numberOfLines={1}>{item.project || item.service}</Text>
                    </View>
                </View>

                <View style={[styles.cardDetailBlock, { marginTop: 8 }]}>
                    <View style={styles.detailItem}>
                        <Text style={styles.dLabel}>Module</Text>
                        <Text style={styles.dVal} numberOfLines={1}>{item.module}</Text>
                    </View>
                    <View style={styles.detailItem}>
                        <Text style={styles.dLabel}>Category</Text>
                        <Text style={[styles.dVal, { color: '#434AFA' }]} numberOfLines={1}>{item.entry_type}</Text>
                    </View>
                </View>

                {!!item.description && (
                    <View style={styles.cardDescBox}>
                        <Text style={styles.cardDescTxt} numberOfLines={3}>"{item.description}"</Text>
                    </View>
                )}
            </View>
        );
    };

    // Group Accordion Renderer
    const renderGroupedUserAccordion = (grp, idx) => {
        const id = grp.user_id || idx;
        const isExp = !!expandedGroups[id];
        
        return (
            <View key={id} style={styles.groupCard}>
                <TouchableOpacity style={styles.groupHead} onPress={() => toggleAccordion(id)} activeOpacity={0.8}>
                    <View style={styles.groupHeadLeft}>
                        <View style={styles.avatarBox}>
                            <Text style={styles.avatarTxt}>{grp.user_name?.charAt(0).toUpperCase() || 'U'}</Text>
                        </View>
                        <View>
                            <Text style={styles.groupUserTitle}>{grp.user_name}</Text>
                            <Text style={styles.groupSummaryLine}>
                                {grp.entries?.length || 0} logs • {formatTimeDisplay(grp.total_hours, grp.total_minutes)}
                            </Text>
                        </View>
                    </View>
                    <Ionicons name={isExp ? "chevron-up-circle" : "chevron-down-circle"} size={24} color="#434AFA" />
                </TouchableOpacity>

                {isExp && (
                    <View style={styles.groupLogsBody}>
                        {grp.entries?.map((log) => renderIndividualLogCard(log))}
                    </View>
                )}
            </View>
        );
    };

    // Final Content Dispatcher
    const renderContentSection = () => {
        if (loading) {
            return (
                <View style={styles.centerHold}>
                    <ActivityIndicator size="large" color="#434AFA" />
                    <Text style={styles.centerHoldTxt}>Analyzing database...</Text>
                </View>
            );
        }

        if (!reportData) {
            return (
                <View style={styles.centerHold}>
                    <Ionicons name="document-text" size={64} color="#E2E8F0" />
                    <Text style={styles.centerHoldTitle}>Ready to Analyze</Text>
                    <Text style={styles.centerHoldSub}>Populate filters above and click Load Analysis to reveal stats.</Text>
                </View>
            );
        }

        const dataset = reportData.data || [];
        if (dataset.length === 0) {
            return (
                <View style={styles.centerHold}>
                    <Ionicons name="folder-open" size={64} color="#E2E8F0" />
                    <Text style={styles.centerHoldTitle}>No Records Found</Text>
                    <Text style={styles.centerHoldSub}>Try adjusted date bounds or broader customer criteria.</Text>
                </View>
            );
        }

        return (
            <View style={{ paddingBottom: 40 }}>
                {renderStatistics()}

                <View style={styles.listDivider}>
                    <Text style={styles.listDividerTxt}>Detailed Registry Logs</Text>
                    <Text style={styles.listDividerBadge}>{dataset.length} rows</Text>
                </View>

                {activeTab === 'timesheet' && groupByUser && reportData.grouped_data ? (
                    // Grouped View
                    reportData.grouped_data.map((grp, ix) => renderGroupedUserAccordion(grp, ix))
                ) : (
                    // Plain List View
                    dataset.map((log) => renderIndividualLogCard(log))
                )}
            </View>
        );
    };

    return (
        <View style={styles.primeContainer}>
            <Header title="Timesheet Reports" />

            {/* Master Top Tab Switch */}
            <View style={styles.tabRow}>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'timesheet' && styles.tabBtnActive]} onPress={() => setActiveTab('timesheet')}>
                    <Ionicons name="albums" size={16} color={activeTab === 'timesheet' ? '#434AFA' : '#64748B'} />
                    <Text style={[styles.tabBtnTxt, activeTab === 'timesheet' && styles.tabBtnTxtActive]}>General Analytics</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.tabBtn, activeTab === 'userwise' && styles.tabBtnActive]} onPress={() => setActiveTab('userwise')}>
                    <Ionicons name="person-circle" size={16} color={activeTab === 'userwise' ? '#434AFA' : '#64748B'} />
                    <Text style={[styles.tabBtnTxt, activeTab === 'userwise' && styles.tabBtnTxtActive]}>Employee Log</Text>
                </TouchableOpacity>
            </View>

            {metaLoading ? (
                <View style={styles.centerHold}><ActivityIndicator color="#434AFA" /><Text style={styles.centerHoldTxt}>Caching directories...</Text></View>
            ) : (
                <ScrollView style={styles.bodyScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {renderFilterBox()}
                    {renderContentSection()}
                </ScrollView>
            )}

            {/* Render Support Overlays */}
            {renderUserSelectorModal()}
            {renderCustomerSelectorModal()}
            {renderProjectSelectorModal()}
            {renderCalendarGridModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    primeContainer: { flex: 1, backgroundColor: '#F8FAFC' },
    bodyScroll: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

    // Tabs Setup
    tabRow: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', paddingHorizontal: 8 },
    tabBtn: { flex: 1, flexDirection: 'row', gap: 6, paddingVertical: 14, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
    tabBtnActive: { borderBottomColor: '#434AFA' },
    tabBtnTxt: { fontSize: 13, fontWeight: '600', color: '#64748B' },
    tabBtnTxtActive: { color: '#434AFA', fontWeight: '800' },

    // Filter Container Panel
    filterBoard: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, marginBottom: 16 },
    rowFilter: { flexDirection: 'row', gap: 10 },
    ctrlGrp: { flex: 1 },
    ctrlLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase', marginBottom: 6 },
    triggerBtn: { 
        height: 40, 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 8, 
        backgroundColor: '#F8FAFC', 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 10 
    },
    triggerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    triggerTxt: { fontSize: 12, color: '#64748B', flex: 1 },

    actionStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    groupCtrl: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    groupCtrlLabel: { fontSize: 12, fontWeight: '700', color: '#475569' },
    
    queryBtn: { height: 38, backgroundColor: '#434AFA', borderRadius: 8, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
    queryBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 13 },

    // General States Empty / Loaders
    centerHold: { padding: 40, justifyContent: 'center', alignItems: 'center' },
    centerHoldTxt: { marginTop: 12, fontSize: 13, color: '#64748B', fontWeight: '600' },
    centerHoldTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginTop: 16 },
    centerHoldSub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 250 },

    // Summary Card System
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
    statCell: { 
        width: (SCREEN_WIDTH - 42) / 2, 
        backgroundColor: '#FFF', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 10, 
        padding: 12, 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 10 
    },
    statIcon: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    statCellNum: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    statCellLabel: { fontSize: 10, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 2 },

    // Section Header Divider
    listDivider: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
    listDividerTxt: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
    listDividerBadge: { backgroundColor: '#EEF2FF', color: '#434AFA', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },

    // Standard Record Log Item
    logUnit: { 
        backgroundColor: '#FFF', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 10, 
        padding: 14, 
        marginBottom: 10 
    },
    logTopLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10, marginBottom: 10 },
    logTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    logDateText: { fontSize: 12, fontWeight: '800', color: '#475569' },
    logPillWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    logEffortTxt: { fontSize: 12, fontWeight: '800', color: '#434AFA' },
    
    statusMiniDot: { paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, backgroundColor: '#F8FAFC' },
    statusMiniDotTxt: { fontSize: 8, fontWeight: '800', color: '#64748B' },

    cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    cardEmphName: { fontSize: 13, fontWeight: '800', color: '#1E293B' },

    cardDetailBlock: { flexDirection: 'row', gap: 10 },
    detailItem: { flex: 1 },
    dLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
    dVal: { fontSize: 12, fontWeight: '700', color: '#334155', marginTop: 2 },
    
    cardDescBox: { marginTop: 10, padding: 8, backgroundColor: '#F8FAFC', borderRadius: 6, borderLeftWidth: 3, borderLeftColor: '#CBD5E1' },
    cardDescTxt: { fontSize: 11, fontStyle: 'italic', color: '#475569', lineHeight: 16 },

    // Grouped User Accordion Layout
    groupCard: { 
        backgroundColor: '#FFF', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 10, 
        marginBottom: 10, 
        overflow: 'hidden' 
    },
    groupHead: { 
        flexDirection: 'row', 
        padding: 14, 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    groupHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    avatarBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' },
    avatarTxt: { color: '#434AFA', fontWeight: '800', fontSize: 14 },
    groupUserTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    groupSummaryLine: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 2 },
    
    groupLogsBody: { 
        backgroundColor: '#F8FAFC', 
        borderTopWidth: 1, 
        borderTopColor: '#E2E8F0', 
        padding: 10 
    },

    // Picker Bottom Modals Shell
    bottomOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
    bottomSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    sheetHead: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
    sheetTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    
    sheetSearch: { flexDirection: 'row', margin: 12, backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 12, alignItems: 'center' },
    sheetSearchInput: { flex: 1, height: 38, fontSize: 12, color: '#1E293B' },
    
    pickerRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', gap: 12, alignItems: 'center' },
    pickerRowText: { fontSize: 13, fontWeight: '600', color: '#334155', flex: 1 },
    
    listEmpty: { padding: 40, alignItems: 'center' },
    listEmptyTxt: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },

    // Inline Center Calendar
    centerModalBg: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    calCard: { backgroundColor: '#FFF', borderRadius: 12, width: '100%', padding: 16 },
    calTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    calArr: { padding: 6, backgroundColor: '#F8FAFC', borderRadius: 6 },
    calTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    calWeekHeaders: { flexDirection: 'row', marginBottom: 6 },
    calWeekLabel: { flex: 1, textAlign: 'center', fontSize: 10, color: '#94A3B8', fontWeight: '800' },
    calDaysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    calEmptyCell: { width: '14.28%', height: 36 },
    calDayCell: { width: '14.28%', height: 36, justifyContent: 'center', alignItems: 'center', borderRadius: 6, marginBottom: 4 },
    calDayCellPicked: { backgroundColor: '#434AFA' },
    calDayNum: { fontSize: 12, fontWeight: '500', color: '#1E293B' },
    calDayNumPicked: { color: '#FFF', fontWeight: '800' },
    calClose: { marginTop: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', alignItems: 'center' },
    calCloseTxt: { color: '#434AFA', fontWeight: '800', fontSize: 13 },
});

export default WorklogReportScreen;
