import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    FlatList,
    Modal,
    Pressable,
    TextInput,
    StyleSheet,
    Switch,
    Dimensions
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import dayjs from 'dayjs';
import Toast from 'react-native-toast-message';

import {
    fetchProjectDetails,
    fetchProjectTasks,
    fetchProjectWorklogs,
    updateProjectProgress,
    addProjectRemark,
    resetCurrentProject,
} from '../store/slices/projectsSlice';
import { fetchFormData, createTask } from '../store/slices/taskSlice';
import { styles } from '../css/ProjectsStyles';
import Header from '../components/Header';

export default function ProjectDetailsScreen({ navigation, route }) {
    const { projectId, projectName } = route.params;
    const dispatch = useDispatch();
    const { currentProject, currentTasks, currentWorklogs, loading, successMessage, error } = useSelector(state => state.projects);

    // Detail Tabs
    const [activeTab, setActiveTab] = useState('tasks'); // 'tasks' | 'worklogs'

    // Local Sub Modals (BottomSheet-style)
    const [modalVisible, setModalVisible] = useState(null); // 'progress' | 'add_remark' | 'remarks_history' | null
    const [tempProgress, setTempProgress] = useState('');
    const [tempRemark, setTempRemark] = useState('');

    // Redux Selectors for Task Builder Dependencies
    const { formData, actionLoading } = useSelector(state => state.task);

    // Create Task Form Core States
    const [taskType, setTaskType] = useState('task'); // 'task' | 'qc'
    const [taskName, setTaskName] = useState('');
    const [taskDesc, setTaskDesc] = useState('');
    const [taskEst, setTaskEst] = useState('');
    const [taskDueDate, setTaskDueDate] = useState('');
    const [taskStatusId, setTaskStatusId] = useState('');
    const [taskPriorityId, setTaskPriorityId] = useState('');
    const [taskAssigneeIds, setTaskAssigneeIds] = useState([]);

    // Recursive Frequency Configurations
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurType, setRecurType] = useState('daily'); // 'daily' | 'weekly' | 'monthly' | 'yearly'
    const [recurInterval, setRecurInterval] = useState('1');
    const [recurEndDate, setRecurEndDate] = useState('');
    const [recurWeeklyDays, setRecurWeeklyDays] = useState([]); // mon, tue, wed...
    const [recurMonthlyDay, setRecurMonthlyDay] = useState(''); // 1-31
    const [recurYearlyMonths, setRecurYearlyMonths] = useState([]); // 1-12

    // UI Controls (Drop Overlays & Specialized Calendars)
    const [pickerTarget, setPickerTarget] = useState(null); // 'dueDate' | 'recurEndDate' | null
    const [navDate, setNavDate] = useState(new Date());
    const [pickerModalVisible, setPickerModalVisible] = useState(false); // 'status' | 'priority' | null

    // Hydrate Form Meta dependencies when task builder launches
    useEffect(() => {
        if (modalVisible === 'create_task' && formData?.statuses?.length === 0) {
            dispatch(fetchFormData());
        }
    }, [modalVisible, dispatch, formData?.statuses?.length]);

    // Automatically preset first/default status when loaded
    useEffect(() => {
        if (formData?.statuses?.length > 0 && !taskStatusId) {
            const pending = formData.statuses.find(s => s.name?.toLowerCase() === 'pending') || formData.statuses[0];
            if (pending) setTaskStatusId(pending.id);
        }
    }, [formData?.statuses, taskStatusId]);

    useEffect(() => {
        loadDetails();
        return () => {
            dispatch(resetCurrentProject());
        };
    }, [projectId]);

    useEffect(() => {
        if (successMessage) {
            Toast.show({ type: 'success', text1: 'Success', text2: successMessage });
            setModalVisible(null);
            setTempProgress('');
            setTempRemark('');
        }
    }, [successMessage]);

    const loadDetails = () => {
        dispatch(fetchProjectDetails(projectId));
        dispatch(fetchProjectTasks(projectId));
        dispatch(fetchProjectWorklogs({ projectId }));
    };

    // Resource Summary Grid Color Computation
    const getResourceBorderColor = (actualMinutes, estimatedMinutes) => {
        const actualHrs = (actualMinutes || 0) / 60;
        const estHrs = (estimatedMinutes || 0) / 60;

        if (actualHrs > estHrs) return '#EF4444'; // Overspent limit
        return '#10B981'; // Performing stable
    };

    // Custom Sub-Tab Render Strategy
    const renderDetailBanner = () => {
        if (!currentProject) return null;
        const progress = currentProject.completed_percentage || 0;
        const remark = currentProject.latest_remark || currentProject.remarks?.[0];

        return (
            <View style={styles.detailBanner}>
                <View style={styles.bannerGrid}>
                    <View style={styles.bannerItem}>
                        <Text style={styles.bannerLabel}>Target Entity</Text>
                        <Text style={styles.bannerValue} numberOfLines={1}>
                            {currentProject.customer?.company_name || 'General'}
                        </Text>
                    </View>

                    <View style={styles.bannerItem}>
                        <Text style={styles.bannerLabel}>Fulfillment Stream</Text>
                        <Text style={styles.bannerValue} numberOfLines={1}>
                            {currentProject.service?.name || 'SaaS Platform'}
                        </Text>
                    </View>

                    <View style={styles.bannerItem}>
                        <Text style={styles.bannerLabel}>Start Vector</Text>
                        <Text style={styles.bannerValue}>
                            {currentProject.start_date ? dayjs(currentProject.start_date).format('DD MMM YYYY') : 'Pending'}
                        </Text>
                    </View>

                    <View style={styles.bannerItem}>
                        <Text style={styles.bannerLabel}>Due Deadline</Text>
                        <Text style={styles.bannerValue}>
                            {currentProject.end_date ? dayjs(currentProject.end_date).format('DD MMM YYYY') : 'Undefined'}
                        </Text>
                    </View>
                </View>

                {/* Elegant Dynamic SOW Viewer/Downloader Quick Action Link Block */}
                {currentProject.sow_document && (
                    <TouchableOpacity
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, backgroundColor: '#F1F5F9', padding: 8, borderRadius: 8 }}
                    >
                        <Ionicons name="document-text" size={16} color="#434AFA" />
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B' }}>View Statement of Work (SOW)</Text>
                        <Ionicons name="open-outline" size={12} color="#64748B" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                )}

                {/* Linear Progress Slider Trigger Button Wrap */}
                <View style={[styles.progressContainer, { marginTop: 18 }]}>
                    <View style={styles.progressLabelRow}>
                        <Text style={styles.metaText}>Consolidated Velocity</Text>
                        <TouchableOpacity
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                            onPress={() => { setTempProgress(String(progress)); setModalVisible('progress'); }}
                        >
                            <Text style={[styles.progressPercent, { color: '#434AFA' }]}>{progress}%</Text>
                            <Ionicons name="pencil-outline" size={12} color="#434AFA" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
                    </View>
                </View>

                {/* Nested Collapsible Real-Time Latest Remark Banner */}
                <View style={styles.latestRemarkBlock}>
                    <View style={styles.remarkHeader}>
                        <Text style={styles.remarkTitle}>Active Timeline Feed</Text>
                        <View style={styles.remarkActions}>
                            <TouchableOpacity onPress={() => setModalVisible('add_remark')}>
                                <Text style={styles.remarkActionLink}>+ Add Feed</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {remark ? (
                        <View style={styles.remarkBubble}>
                            <Text style={styles.remarkText} numberOfLines={2}>{remark.remark || remark}</Text>
                            <View style={styles.remarkMeta}>
                                <Text style={styles.remarkUser}>~ {remark.user?.name || 'Author'}</Text>
                                <Text style={styles.remarkTime}>{remark.created_at ? dayjs(remark.created_at).format('DD MMM HH:mm') : ''}</Text>
                            </View>
                        </View>
                    ) : (
                        <Text style={{ fontSize: 11, fontStyle: 'italic', color: '#94A3B8' }}>No status logs broadcasted.</Text>
                    )}
                </View>
            </View>
        );
    };

    // Horizon Scrolling Resource Utilization summary cards
    const renderResourceCards = () => {
        const users = currentProject?.assignedUsers || currentProject?.assigned_users || [];
        if (users.length === 0) return null;

        return (
            <View style={styles.resourcesWrap}>
                <Text style={styles.sectionHeader}>Resource Allocations Summary</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingBottom: 4 }}>
                    {users.map((user, idx) => {
                        // Convert minutes from worklogs mapping
                        const actualMinutes = Number(user.actual_minutes || 0);
                        const estimatedMinutes = Number(user.pivot?.estimated_minutes || user.estimated_minutes || 0);
                        const actualHrs = (actualMinutes / 60).toFixed(1);
                        const estHrs = (estimatedMinutes / 60).toFixed(1);

                        const color = getResourceBorderColor(actualMinutes, estimatedMinutes);

                        return (
                            <View
                                key={user.id || idx}
                                style={[styles.resourceCard, { borderColor: color }]}
                            >
                                <View style={[styles.resourceIconWrap, { backgroundColor: color + '15' }]}>
                                    <Ionicons name="person" size={16} color={color} />
                                </View>
                                <Text style={styles.resourceName} numberOfLines={1}>{user.name}</Text>

                                <View style={styles.resourceHoursRow}>
                                    <Text style={[styles.resHoursVal, { color: color }]}>{actualHrs}h</Text>
                                    <Text style={styles.resEstVal}>/ {estHrs}h</Text>
                                </View>
                                <Text style={styles.resSubLabel}>Actual VS Est</Text>
                            </View>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    // Submit Functions
    const handleUpdateProgress = () => {
        const val = Number(tempProgress);
        if (isNaN(val) || val < 0 || val > 100) {
            Toast.show({ type: 'error', text1: 'Invalid', text2: 'Input value between 0-100' });
            return;
        }
        dispatch(updateProjectProgress({ projectId, percentage: val }));
    };

    const handlePostRemark = () => {
        if (!tempRemark.trim()) {
            Toast.show({ type: 'error', text1: 'Required', text2: 'Remark field cannot be empty' });
            return;
        }
        dispatch(addProjectRemark({ projectId, remark: tempRemark }));
    };

    // ----------------- PROJECT TASK BUILDER SUBMIT LOGIC -----------------

    const toggleAssigneeSelection = (userId) => {
        setTaskAssigneeIds(prev => 
            prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
        );
    };

    const toggleWeeklyDay = (day) => {
        setRecurWeeklyDays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
        );
    };

    const toggleYearlyMonth = (monthNum) => {
        setRecurYearlyMonths(prev =>
            prev.includes(monthNum) ? prev.filter(m => m !== monthNum) : [...prev, monthNum]
        );
    };

    const resetTaskForm = () => {
        setTaskType('task');
        setTaskName('');
        setTaskDesc('');
        setTaskEst('');
        setTaskDueDate('');
        setTaskAssigneeIds([]);
        setIsRecurring(false);
        setRecurType('daily');
        setRecurInterval('1');
        setRecurEndDate('');
        setRecurWeeklyDays([]);
        setRecurMonthlyDay('');
        setRecurYearlyMonths([]);
        if (formData?.statuses?.length > 0) {
            const pending = formData.statuses.find(s => s.name?.toLowerCase() === 'pending') || formData.statuses[0];
            setTaskStatusId(pending?.id || '');
        }
        setTaskPriorityId('');
    };

    const handleCreateTaskSubmit = async () => {
        if (!taskName.trim() || !taskDesc.trim()) {
            Toast.show({ type: 'error', text1: 'Validation Failure', text2: 'Name and Description are mandatory' });
            return;
        }
        if (taskAssigneeIds.length === 0) {
            Toast.show({ type: 'error', text1: 'Validation Failure', text2: 'Assign at least one user to this vector' });
            return;
        }
        if (!taskStatusId) {
            Toast.show({ type: 'error', text1: 'Validation Failure', text2: 'Ensure an active workflow status' });
            return;
        }

        // Prepare Multiplexed FormData Package for strict consistency with desktop
        const payload = new FormData();
        payload.append('customer_id', String(currentProject.customer_id));
        payload.append('customer_project_id', String(projectId));
        payload.append('task_name', taskName);
        payload.append('task', taskDesc);
        payload.append('task_type', taskType);
        payload.append('estimated_efforts', taskEst || '');
        payload.append('task_status_id', String(taskStatusId));
        if (taskPriorityId) payload.append('task_priority_id', String(taskPriorityId));
        if (taskDueDate) payload.append('due_date', taskDueDate);

        // Batch user array
        taskAssigneeIds.forEach(uid => {
            payload.append('user_ids[]', String(uid));
        });

        // Recurrence payload tree parsing
        if (isRecurring) {
            payload.append('is_recurring', '1');
            payload.append('recurrence_type', recurType);
            payload.append('recurrence_interval', recurInterval || '1');
            if (recurEndDate) payload.append('recurrence_end_date', recurEndDate);

            if (recurType === 'weekly') {
                recurWeeklyDays.forEach(day => payload.append('recurrence_days_of_week[]', day));
            } else if (recurType === 'monthly') {
                if (recurMonthlyDay) payload.append('recurrence_day_of_month', recurMonthlyDay);
            } else if (recurType === 'yearly') {
                recurYearlyMonths.forEach(mon => payload.append('recurrence_months[]', String(mon)));
            }
        }

        const actionResult = await dispatch(createTask(payload));
        if (createTask.fulfilled.match(actionResult)) {
            Toast.show({ type: 'success', text1: 'Vector Configured', text2: 'Task logged and broadcasted successfully' });
            resetTaskForm();
            setModalVisible(null);
            // Re-trigger project tasks load
            dispatch(fetchProjectTasks(projectId));
        } else {
            Toast.show({ type: 'error', text1: 'Deployment Error', text2: actionResult.payload || 'Backend rejection encountered.' });
        }
    };

    // Launch calendar specific targets
    const openInlineDatePicker = (target) => {
        setPickerTarget(target);
        const anchor = target === 'dueDate' ? taskDueDate : recurEndDate;
        if (anchor) {
            const parsed = new Date(anchor);
            if (!isNaN(parsed.getTime())) setNavDate(parsed);
        } else {
            setNavDate(new Date());
        }
    };

    const renderCustomCalendarModal = () => {
        if (!pickerTarget) return null;

        const monthsFull = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        const yr = navDate.getFullYear();
        const mth = navDate.getMonth();
        const firstWeekday = new Date(yr, mth, 1).getDay();
        const numDays = new Date(yr, mth + 1, 0).getDate();
        
        let days = [];
        for (let i = 0; i < firstWeekday; i++) days.push(null);
        for (let i = 1; i <= numDays; i++) days.push(new Date(yr, mth, i));

        const shiftMonth = (step) => {
            const next = new Date(navDate);
            next.setMonth(next.getMonth() + step);
            setNavDate(next);
        };

        const commitDate = (d) => {
            const iso = dayjs(d).format('YYYY-MM-DD');
            if (pickerTarget === 'dueDate') setTaskDueDate(iso);
            else setRecurEndDate(iso);
            setPickerTarget(null);
        };

        const activeVal = pickerTarget === 'dueDate' ? taskDueDate : recurEndDate;

        return (
            <Modal visible transparent animationType="fade" onRequestClose={() => setPickerTarget(null)}>
                <View style={localStyles.calCenterBg}>
                    <View style={localStyles.calSheet}>
                        <View style={localStyles.calNavHeader}>
                            <TouchableOpacity onPress={() => shiftMonth(-1)}><Ionicons name="chevron-back" size={20} color="#1E293B" /></TouchableOpacity>
                            <Text style={localStyles.calMonthTitle}>{monthsFull[mth]} {yr}</Text>
                            <TouchableOpacity onPress={() => shiftMonth(1)}><Ionicons name="chevron-forward" size={20} color="#1E293B" /></TouchableOpacity>
                        </View>
                        <View style={localStyles.calWeekHeaders}>
                            {weekDays.map(w => <Text key={w} style={localStyles.calDayHeaderLabel}>{w}</Text>)}
                        </View>
                        <View style={localStyles.calDaysContainer}>
                            {days.map((dy, ix) => {
                                if (!dy) return <View key={`e-${ix}`} style={localStyles.calDayCellEmpty} />;
                                const str = dayjs(dy).format('YYYY-MM-DD');
                                const isPicked = activeVal === str;
                                return (
                                    <TouchableOpacity key={ix} style={[localStyles.calDayBtn, isPicked && localStyles.calDayBtnPicked]} onPress={() => commitDate(dy)}>
                                        <Text style={[localStyles.calDayBtnTxt, isPicked && localStyles.calDayBtnTxtPicked]}>{dy.getDate()}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <TouchableOpacity style={localStyles.calDismissBtn} onPress={() => setPickerTarget(null)}>
                            <Text style={localStyles.calDismissBtnTxt}>Dismiss</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    // ----------------- RENDER TABS DATA IN LISTS -----------------

    const renderDropdownPickerOverlay = () => {
        if (!pickerModalVisible) return null;
        
        const isStatus = pickerModalVisible === 'status';
        const options = isStatus ? (formData?.statuses || []) : (formData?.priorities || []);
        const title = isStatus ? 'Select Vector Status' : 'Set Task Priority';
        const activeId = isStatus ? taskStatusId : taskPriorityId;

        return (
            <Modal visible transparent animationType="slide" onRequestClose={() => setPickerModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setPickerModalVisible(false)}>
                    <Pressable style={[styles.bottomSheet, { maxHeight: '50%' }]}>
                        <View style={styles.bsDragHandle} />
                        <View style={styles.bsHeader}>
                            <Text style={styles.bsTitle}>{title}</Text>
                            <TouchableOpacity onPress={() => setPickerModalVisible(false)}>
                                <Ionicons name="close-circle" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => {
                                const isSelected = String(activeId) === String(item.id);
                                return (
                                    <TouchableOpacity 
                                        style={[
                                            styles.optionItem, 
                                            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
                                            isSelected && { backgroundColor: '#EEF2FF', paddingHorizontal: 10, borderRadius: 8 }
                                        ]} 
                                        onPress={() => {
                                            if (isStatus) setTaskStatusId(item.id);
                                            else setTaskPriorityId(item.id);
                                            setPickerModalVisible(false);
                                        }}
                                    >
                                        <Text style={[styles.optionText, isSelected && { color: '#434AFA', fontWeight: '900' }]}>{item.name}</Text>
                                        {isSelected && <Ionicons name="checkmark-circle" size={18} color="#434AFA" />}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={{ padding: 30, alignItems: 'center' }}>
                                    <Text style={{ color: '#94A3B8', fontStyle: 'italic' }}>Fetching options...</Text>
                                </View>
                            }
                        />
                    </Pressable>
                </Pressable>
            </Modal>
        );
    };

    const renderTaskRow = ({ item }) => {
        const isOverdue = item.due_date && dayjs().isAfter(dayjs(item.due_date)) && item.status?.name?.toLowerCase() !== 'completed';

        const getPriorityStyle = (priority) => {
            const pr = priority?.toLowerCase();
            if (pr === 'high' || pr === 'critical') return { bg: styles.bgHigh, text: styles.textHigh };
            if (pr === 'medium' || pr === 'normal') return { bg: styles.bgMed, text: styles.textMed };
            return { bg: styles.bgLow, text: styles.textLow };
        };
        const pStyle = getPriorityStyle(item.priority?.name || item.task_priority?.name);

        return (
            <View style={styles.taskItemRow}>
                <View style={styles.taskMainInfo}>
                    <View style={styles.taskMetaLine}>
                        <View style={[styles.wlogMiniBadge, { backgroundColor: item.task_type === 'qc' ? '#FEE2E2' : '#E0E7FF' }]}>
                            <Text style={[styles.wlogBadgeText, { color: item.task_type === 'qc' ? '#EF4444' : '#434AFA' }]}>
                                {(item.task_type || 'TASK')}
                            </Text>
                        </View>
                        {item.priority && (
                            <View style={[styles.wlogMiniBadge, pStyle.bg]}>
                                <Text style={[styles.wlogBadgeText, pStyle.text]}>{(item.priority.name || '')}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.taskNameText} numberOfLines={1}>{item.task_name}</Text>
                    <Text style={[styles.taskSubDetail, isOverdue && styles.overdueText]}>
                        Due Deadline: {item.due_date ? dayjs(item.due_date).format('DD MMM YYYY') : 'Indefinite'} {isOverdue ? '(OVERDUE)' : ''}
                    </Text>
                </View>

                <View style={styles.taskSideCol}>
                    <View style={[styles.statusPill, { backgroundColor: item.status?.color || '#94A3B8' }]}>
                        <Text style={[styles.statusText, { color: '#FFF' }]}>{item.status?.name || 'PENDING'}</Text>
                    </View>
                    
                    {/* Inline Micro Task Interaction Bar */}
                    <View style={styles.taskActionRow}>
                        {/* Poke Quick Action */}
                        <TouchableOpacity style={[styles.smallIconBtn, { backgroundColor: '#FFFBEB' }]}>
                            <Ionicons name="notifications-outline" size={14} color="#F59E0B" />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.smallIconBtn, { backgroundColor: '#F1F5F9' }]}>
                            <Ionicons name="create-outline" size={14} color="#64748B" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const renderWorklogRow = ({ item }) => {
        const totalMins = Number(item.spent_minutes || 0);
        const hours = Math.floor(totalMins / 60);
        const minutes = totalMins % 60;
        const displayTime = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

        return (
            <View style={styles.worklogRow}>
                <View style={styles.wlogHeader}>
                    <Text style={styles.wlogUser}>{item.user?.name || 'Engineering'}</Text>
                    <Text style={styles.wlogTime}>{displayTime}</Text>
                </View>
                <View style={styles.wlogBadgesRow}>
                    <View style={styles.wlogMiniBadge}>
                        <Text style={styles.wlogBadgeText}>MODULE: {item.module_name || 'Main'}</Text>
                    </View>
                    <View style={styles.wlogMiniBadge}>
                        <Text style={styles.wlogBadgeText}>TYPE: {item.work_entry_type || 'Dev'}</Text>
                    </View>
                </View>
                <Text style={styles.wlogDesc}>{item.work_description || 'Standard development deliverables.'}</Text>
                <Text style={styles.wlogDate}>{item.log_date ? dayjs(item.log_date).format('DD MMM YYYY') : ''}</Text>
            </View>
        );
    };

    // ----------------- END RENDER TABS DATA -----------------

    const renderInteractionSheet = () => {
        if (!modalVisible) return null;
        let title = '';
        let content = null;

        if (modalVisible === 'progress') {
            title = 'Recalibrate Progress Vector';
            content = (
                <View>
                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Percentage Completed (%)</Text>
                        <TextInput
                            style={styles.formInput}
                            keyboardType="numeric"
                            maxLength={3}
                            value={tempProgress}
                            onChangeText={setTempProgress}
                            placeholder="e.g. 75"
                        />
                    </View>
                    <TouchableOpacity style={styles.btnSubmit} onPress={handleUpdateProgress}>
                        <Text style={styles.btnSubmitText}>Commit Calibration</Text>
                    </TouchableOpacity>
                </View>
            );
        } else if (modalVisible === 'add_remark') {
            title = 'Post Real-Time Log Remark';
            content = (
                <View>
                    <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>Detailed Entry Remark</Text>
                        <TextInput
                            style={[styles.formInput, styles.formInputArea]}
                            multiline
                            numberOfLines={4}
                            value={tempRemark}
                            onChangeText={setTempRemark}
                            placeholder="Outline relevant project updates..."
                        />
                    </View>
                    <TouchableOpacity style={styles.btnSubmit} onPress={handlePostRemark}>
                        <Text style={styles.btnSubmitText}>Broadcast Event Log</Text>
                    </TouchableOpacity>
                </View>
            );
        } else if (modalVisible === 'create_task') {
            const assignees = (formData?.users && formData.users.length > 0) ? formData.users : (currentProject?.assignedUsers || currentProject?.assigned_users || []);
            const statusName = formData?.statuses?.find(s => String(s.id) === String(taskStatusId))?.name || 'Select Status...';
            const priorityName = formData?.priorities?.find(p => String(p.id) === String(taskPriorityId))?.name || 'Select Priority...';

            return (
                <Modal visible transparent animationType="slide" onRequestClose={() => setModalVisible(null)}>
                    <View style={localStyles.fullScreenBg}>
                        <View style={localStyles.largeModalContent}>
                            {/* Header Controls */}
                            <View style={localStyles.modalHeadBar}>
                                <View style={{ flex: 1 }}>
                                    <Text style={localStyles.modalTitleTxt}>Assign Task & QC</Text>
                                    <Text style={localStyles.modalSubTxt} numberOfLines={1}>Project: {projectName}</Text>
                                </View>
                                <TouchableOpacity onPress={() => { resetTaskForm(); setModalVisible(null); }}>
                                    <Ionicons name="close-circle" size={28} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={localStyles.modalScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                {/* 1. Task Type Toggle Row */}
                                <View style={localStyles.sectRow}>
                                    <Text style={localStyles.subLabel}>Vessel Configuration</Text>
                                    <View style={localStyles.segControl}>
                                        <TouchableOpacity 
                                            style={[localStyles.segItem, taskType === 'task' && localStyles.segItemActive]}
                                            onPress={() => setTaskType('task')}
                                        >
                                            <Ionicons name="checkbox-outline" size={16} color={taskType === 'task' ? '#FFF' : '#64748B'} />
                                            <Text style={[localStyles.segTxt, taskType === 'task' && localStyles.segTxtActive]}>Standard Task</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={[localStyles.segItem, taskType === 'qc' && localStyles.segItemActiveQC]}
                                            onPress={() => setTaskType('qc')}
                                        >
                                            <Ionicons name="shield-checkmark-outline" size={16} color={taskType === 'qc' ? '#FFF' : '#64748B'} />
                                            <Text style={[localStyles.segTxt, taskType === 'qc' && localStyles.segTxtActive]}>Quality Control (QC)</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* 2. Dynamic Expandable Recurrence Controller */}
                                {taskType === 'task' && (
                                    <View style={localStyles.accentBox}>
                                        <View style={localStyles.flexRowBetween}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={localStyles.accentTitle}>Repeating Schedule</Text>
                                                <Text style={localStyles.accentDesc}>Enable automatic recurring deployment</Text>
                                            </View>
                                            <Switch 
                                                value={isRecurring} 
                                                onValueChange={setIsRecurring}
                                                trackColor={{ false: '#CBD5E1', true: '#C7D2FE' }}
                                                thumbColor={isRecurring ? '#434AFA' : '#94A3B8'}
                                            />
                                        </View>

                                        {isRecurring && (
                                            <View style={localStyles.recurrencePanel}>
                                                <View style={localStyles.recurGrid}>
                                                    <View style={{ flex: 1.2 }}>
                                                        <Text style={localStyles.inputMiniLabel}>Frequency</Text>
                                                        <View style={localStyles.inlineSelectWrap}>
                                                            <FlatList
                                                                horizontal
                                                                showsHorizontalScrollIndicator={false}
                                                                data={['daily', 'weekly', 'monthly', 'yearly']}
                                                                keyExtractor={f => f}
                                                                renderItem={({ item }) => (
                                                                    <TouchableOpacity 
                                                                        style={[localStyles.freqBtn, recurType === item && localStyles.freqBtnActive]}
                                                                        onPress={() => setRecurType(item)}
                                                                    >
                                                                        <Text style={[localStyles.freqBtnTxt, recurType === item && localStyles.freqBtnTxtActive]}>{item}</Text>
                                                                    </TouchableOpacity>
                                                                )}
                                                            />
                                                        </View>
                                                    </View>
                                                    
                                                    <View style={{ flex: 0.8, marginLeft: 10 }}>
                                                        <Text style={localStyles.inputMiniLabel}>Interval</Text>
                                                        <TextInput 
                                                            style={localStyles.miniInput}
                                                            keyboardType="numeric"
                                                            value={recurInterval}
                                                            onChangeText={setRecurInterval}
                                                            placeholder="Every X"
                                                        />
                                                    </View>
                                                </View>

                                                <View style={{ marginTop: 12 }}>
                                                    <Text style={localStyles.inputMiniLabel}>Halt Recurring (End Date)</Text>
                                                    <TouchableOpacity 
                                                        style={localStyles.dateSelectorBar}
                                                        onPress={() => openInlineDatePicker('recurEndDate')}
                                                    >
                                                        <Ionicons name="calendar-outline" size={16} color="#434AFA" />
                                                        <Text style={localStyles.dateSelectorTxt}>
                                                            {recurEndDate ? dayjs(recurEndDate).format('DD MMM YYYY') : 'Infinitely Continues'}
                                                        </Text>
                                                    </TouchableOpacity>
                                                </View>

                                                {recurType === 'weekly' && (
                                                    <View style={{ marginTop: 12 }}>
                                                        <Text style={localStyles.inputMiniLabel}>Weekly Activation Days</Text>
                                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                                            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
                                                                const sel = recurWeeklyDays.includes(day);
                                                                return (
                                                                    <TouchableOpacity 
                                                                        key={day} 
                                                                        style={[localStyles.dayPill, sel && localStyles.dayPillActive]} 
                                                                        onPress={() => toggleWeeklyDay(day)}
                                                                    >
                                                                        <Text style={[localStyles.dayPillTxt, sel && localStyles.dayPillTxtActive]}>{day}</Text>
                                                                    </TouchableOpacity>
                                                                );
                                                            })}
                                                        </View>
                                                    </View>
                                                )}

                                                {recurType === 'monthly' && (
                                                    <View style={{ marginTop: 12 }}>
                                                        <Text style={localStyles.inputMiniLabel}>Trigger on Day of Month</Text>
                                                        <TextInput 
                                                            style={localStyles.miniInput}
                                                            keyboardType="numeric"
                                                            maxLength={2}
                                                            value={recurMonthlyDay}
                                                            onChangeText={setRecurMonthlyDay}
                                                            placeholder="e.g. 15"
                                                        />
                                                    </View>
                                                )}

                                                {recurType === 'yearly' && (
                                                    <View style={{ marginTop: 12 }}>
                                                        <Text style={localStyles.inputMiniLabel}>Target Months</Text>
                                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                                                                const isSel = recurYearlyMonths.includes(m);
                                                                const label = dayjs().month(m - 1).format('MMM');
                                                                return (
                                                                    <TouchableOpacity 
                                                                        key={m}
                                                                        style={[localStyles.monthBox, isSel && localStyles.monthBoxActive]}
                                                                        onPress={() => toggleYearlyMonth(m)}
                                                                    >
                                                                        <Text style={[localStyles.monthBoxTxt, isSel && localStyles.monthBoxTxtActive]}>{label}</Text>
                                                                    </TouchableOpacity>
                                                                );
                                                            })}
                                                        </View>
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                )}

                                {/* 3. Core Information Section */}
                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Task Overview Title *</Text>
                                    <TextInput 
                                        style={styles.formInput}
                                        value={taskName}
                                        onChangeText={setTaskName}
                                        placeholder="Enter descriptive task title..."
                                    />
                                </View>

                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Full Work Breakdown Description *</Text>
                                    <TextInput 
                                        style={[styles.formInput, styles.formInputArea]}
                                        multiline
                                        numberOfLines={4}
                                        value={taskDesc}
                                        onChangeText={setTaskDesc}
                                        placeholder="Detail exact deliverables..."
                                    />
                                </View>

                                {/* 4. Project Resources Assignee Grid */}
                                <View style={localStyles.sectRow}>
                                    <Text style={styles.formLabel}>Assigned Task Force *</Text>
                                    <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: -6, marginBottom: 8 }}>Select users assigned to this project scope</Text>
                                    <View style={localStyles.assigneeGrid}>
                                        {assignees.map((user, index) => {
                                            const isSel = taskAssigneeIds.includes(user.id);
                                            return (
                                                <TouchableOpacity 
                                                    key={user.id || index}
                                                    style={[localStyles.assigneeCell, isSel && localStyles.assigneeCellSel]}
                                                    onPress={() => toggleAssigneeSelection(user.id)}
                                                >
                                                    <Ionicons 
                                                        name={isSel ? "checkmark-circle" : "ellipse-outline"} 
                                                        size={18} 
                                                        color={isSel ? "#434AFA" : "#CBD5E1"} 
                                                    />
                                                    <Text style={[localStyles.assigneeName, isSel && localStyles.assigneeNameSel]} numberOfLines={1}>
                                                        {user.name}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* 5. Parameters Row */}
                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.formLabel}>Est Efforts</Text>
                                        <TextInput 
                                            style={styles.formInput}
                                            value={taskEst}
                                            onChangeText={setTaskEst}
                                            placeholder="e.g. 4h, 2d"
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.formLabel}>Due Deadline</Text>
                                        <TouchableOpacity 
                                            style={[styles.formInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                                            onPress={() => openInlineDatePicker('dueDate')}
                                        >
                                            <Text style={{ fontSize: 12, color: taskDueDate ? '#1E293B' : '#94A3B8', fontWeight: '700' }}>
                                                {taskDueDate ? dayjs(taskDueDate).format('DD MMM YYYY') : 'Set Limit'}
                                            </Text>
                                            <Ionicons name="calendar" size={16} color="#64748B" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* 6. Pipeline Toggles (Dropdowns) */}
                                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 30 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.formLabel}>Workflow Status *</Text>
                                        <TouchableOpacity 
                                            style={[styles.formInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                                            onPress={() => setPickerModalVisible('status')}
                                        >
                                            <Text style={{ fontSize: 12, color: '#1E293B', fontWeight: '700' }} numberOfLines={1}>{statusName}</Text>
                                            <Ionicons name="chevron-down" size={16} color="#64748B" />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.formLabel}>Priority</Text>
                                        <TouchableOpacity 
                                            style={[styles.formInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                                            onPress={() => setPickerModalVisible('priority')}
                                        >
                                            <Text style={{ fontSize: 12, color: '#1E293B', fontWeight: '700' }} numberOfLines={1}>{priorityName}</Text>
                                            <Ionicons name="chevron-down" size={16} color="#64748B" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                            </ScrollView>

                            {/* Final Save Panel */}
                            <View style={localStyles.modalActionPanel}>
                                <TouchableOpacity 
                                    style={[styles.btnSubmit, { flex: 1, marginTop: 0, backgroundColor: '#434AFA' }]} 
                                    onPress={handleCreateTaskSubmit}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <ActivityIndicator color="#FFF" size="small" />
                                    ) : (
                                        <Text style={styles.btnSubmitText}>Deploy Assignment</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>
            );
        }

        return (
            <Modal visible transparent animationType="slide" onRequestClose={() => setModalVisible(null)}>
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(null)}>
                    <Pressable style={styles.bottomSheet}>
                        <View style={styles.bsDragHandle} />
                        <View style={styles.bsHeader}>
                            <Text style={styles.bsTitle}>{title}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(null)}>
                                <Ionicons name="close-circle" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>
                        {content}
                    </Pressable>
                </Pressable>
            </Modal>
        );
    };

    // Dynamic Switch Header Logic
    const listHeaderComponent = () => (
        <View>
            {renderDetailBanner()}
            {renderResourceCards()}

            {/* Core Double Tabs Controller */}
            <View style={styles.detailTabsWrap}>
                <TouchableOpacity
                    style={[styles.detailTabItem, activeTab === 'tasks' && styles.activeDetailTabItem]}
                    onPress={() => setActiveTab('tasks')}
                >
                    <Text style={[styles.detailTabText, activeTab === 'tasks' && styles.activeDetailTabText]}>Task Manifest</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.detailTabItem, activeTab === 'worklogs' && styles.activeDetailTabItem]}
                    onPress={() => setActiveTab('worklogs')}
                >
                    <Text style={[styles.detailTabText, activeTab === 'worklogs' && styles.activeDetailTabText]}>Time Utilization</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <Header title={projectName || "Project Ledger"} />

            {loading && !currentProject ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#434AFA" />
                </View>
            ) : (
                <FlatList
                    data={activeTab === 'tasks' ? currentTasks : currentWorklogs}
                    keyExtractor={(item, idx) => (item.id || idx).toString()}
                    renderItem={activeTab === 'tasks' ? renderTaskRow : renderWorklogRow}
                    ListHeaderComponent={listHeaderComponent}
                    contentContainerStyle={{ paddingBottom: 80 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={loadDetails} colors={['#434AFA']} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="layers-outline" size={40} color="#CBD5E1" />
                            <Text style={styles.emptyText}>
                                {activeTab === 'tasks' ? 'No tasks registered in this manifest.' : 'No log entries filed yet.'}
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Floating Creation Trigger inside active tab */}
            {activeTab === 'tasks' && (
                <TouchableOpacity 
                    style={{ position: 'absolute', right: 20, bottom: 20, backgroundColor: '#434AFA', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 }}
                    onPress={() => setModalVisible('create_task')}
                >
                    <Ionicons name="add" size={28} color="#FFF" />
                </TouchableOpacity>
            )}

            {renderInteractionSheet()}
            {renderDropdownPickerOverlay()}
            {renderCustomCalendarModal()}
        </View>
    );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const localStyles = StyleSheet.create({
    // Fullscreen overlay for task creator
    fullScreenBg: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        justifyContent: 'flex-end',
    },
    largeModalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '92%',
        paddingBottom: 20,
    },
    modalHeadBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    modalTitleTxt: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1E293B',
    },
    modalSubTxt: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        marginTop: 2,
    },
    modalScroll: {
        flex: 1,
        padding: 20,
    },
    modalActionPanel: {
        paddingHorizontal: 20,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },

    // Segmented Control
    segControl: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        padding: 4,
        marginTop: 8,
    },
    segItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 10,
        gap: 6,
    },
    segItemActive: {
        backgroundColor: '#434AFA',
    },
    segItemActiveQC: {
        backgroundColor: '#DC2626',
    },
    segTxt: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
    },
    segTxtActive: {
        color: '#FFF',
    },

    // Accordion / Recurring container
    accentBox: {
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        padding: 14,
        marginBottom: 20,
    },
    accentTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1E293B',
    },
    accentDesc: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 2,
    },
    flexRowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    recurrencePanel: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
    },
    recurGrid: {
        flexDirection: 'row',
    },
    inputMiniLabel: {
        fontSize: 10,
        fontWeight: '800',
        color: '#475569',
        textTransform: 'capitalize',
        marginBottom: 4,
    },
    miniInput: {
        backgroundColor: '#FFF',
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        borderRadius: 8,
        paddingHorizontal: 10,
        height: 36,
        fontSize: 12,
        fontWeight: '700',
        color: '#1E293B',
    },
    inlineSelectWrap: {
        height: 36,
    },
    freqBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
        marginRight: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },
    freqBtnActive: {
        backgroundColor: '#434AFA',
        borderColor: '#434AFA',
    },
    freqBtnTxt: {
        fontSize: 9,
        fontWeight: '800',
        color: '#64748B',
    },
    freqBtnTxtActive: {
        color: '#FFF',
    },
    dateSelectorBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 8,
        height: 38,
        paddingHorizontal: 12,
        gap: 8,
    },
    dateSelectorTxt: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1E293B',
    },
    dayPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 6,
    },
    dayPillActive: {
        backgroundColor: '#434AFA',
        borderColor: '#434AFA',
    },
    dayPillTxt: {
        fontSize: 9,
        fontWeight: '800',
        color: '#64748B',
    },
    dayPillTxtActive: {
        color: '#FFF',
    },
    monthBox: {
        width: (SCREEN_WIDTH - 90) / 4,
        paddingVertical: 8,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 6,
        alignItems: 'center',
    },
    monthBoxActive: {
        backgroundColor: '#434AFA',
        borderColor: '#434AFA',
    },
    monthBoxTxt: {
        fontSize: 10,
        fontWeight: '800',
        color: '#64748B',
    },
    monthBoxTxtActive: {
        color: '#FFF',
    },

    // Multi select assignee grid
    assigneeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 6,
    },
    assigneeCell: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 8,
        gap: 6,
        width: (SCREEN_WIDTH - 60) / 2,
    },
    assigneeCellSel: {
        borderColor: '#434AFA',
        backgroundColor: '#EEF2FF',
    },
    assigneeName: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
        flex: 1,
    },
    assigneeNameSel: {
        color: '#434AFA',
        fontWeight: '800',
    },

    sectRow: {
        marginBottom: 20,
    },
    subLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#475569',
        textTransform: 'capitalize',
    },

    // Calendar Specific Local styles
    calCenterBg: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    calSheet: {
        width: '100%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    calNavHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    calMonthTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#1E293B',
    },
    calWeekHeaders: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 6,
    },
    calDayHeaderLabel: {
        width: (SCREEN_WIDTH - 72) / 7,
        textAlign: 'center',
        fontSize: 11,
        fontWeight: '800',
        color: '#94A3B8',
    },
    calDaysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    calDayCellEmpty: {
        width: (SCREEN_WIDTH - 72) / 7,
        height: 40,
    },
    calDayBtn: {
        width: (SCREEN_WIDTH - 72) / 7,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
    },
    calDayBtnPicked: {
        backgroundColor: '#434AFA',
    },
    calDayBtnTxt: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1E293B',
    },
    calDayBtnTxtPicked: {
        color: '#FFF',
        fontWeight: '900',
    },
    calDismissBtn: {
        marginTop: 16,
        backgroundColor: '#F1F5F9',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    calDismissBtnTxt: {
        fontSize: 13,
        fontWeight: '800',
        color: '#64748B',
    }
});
