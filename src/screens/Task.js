import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    Alert,
    RefreshControl,
    ActivityIndicator,
    Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';
import {
    fetchCreatedTasks,
    fetchAssignedTasks,
    fetchFormData,
    createTask,
    fetchTaskDetails,
    updateTaskStatus,
    toggleTaskDone,
    updateTask,
    deleteTask,
    addTaskRemark,
    clearTaskMessages
} from '../store/slices/taskSlice';
import { styles } from '../css/TaskStyles';
import Header from '../components/Header';

const Task = ({ navigation }) => {
    const dispatch = useDispatch();
    const {
        createdTasks,
        assignedTasks,
        formData,
        loading,
        currentTask,
        loadingDetails,
        actionLoading,
        error,
        successMessage
    } = useSelector(state => state.task);
    const { user } = useSelector(state => state.auth);

    const [activeTab, setActiveTab] = useState('assigned'); // 'assigned' | 'created'
    const [createModalVisible, setCreateModalVisible] = useState(false);
    const [detailModalVisible, setDetailModalVisible] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    // Form State
    const initialTaskState = {
        customer_id: '',
        user_ids: [],
        task_name: '',
        task: '',
        task_type: 'task',
        task_priority_id: '',
        task_status_id: 1,
        due_date: '',
        is_recurring: false,
        recurrence_type: 'daily',
        recurrence_interval: '1',
        recurrence_end_date: ''
    };
    const [newTask, setNewTask] = useState(initialTaskState);

    const [remark, setRemark] = useState('');

    // Calendar State
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [pickerDate, setPickerDate] = useState(new Date());
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (successMessage) {
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: successMessage
            });
            dispatch(clearTaskMessages());
            if (createModalVisible) {
                setCreateModalVisible(false);
                setNewTask(initialTaskState);
                setIsEditing(false);
                setEditId(null);
            }
        }
        if (error) {
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: typeof error === 'string' ? error : JSON.stringify(error)
            });
            dispatch(clearTaskMessages());
        }
    }, [successMessage, error, dispatch]);

    const loadInitialData = () => {
        dispatch(fetchAssignedTasks());
        dispatch(fetchCreatedTasks());
        dispatch(fetchFormData());
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setEditId(null);
        setNewTask(initialTaskState);
        setCreateModalVisible(true);
    };

    const openEditModal = () => {
        if (!currentTask) return;

        setIsEditing(true);
        setEditId(currentTask.id);

        const assignedUsers = currentTask.assignedUsers || currentTask.assigned_users || currentTask.users || [];
        const taskPriorityId = currentTask.task_priority_id || currentTask.priority?.id || currentTask.task_priority?.id || '';
        const taskStatusId = currentTask.task_status_id || currentTask.status?.id || 1;

        setNewTask({
            customer_id: currentTask.customer_id || currentTask.customer?.id || '',
            user_ids: assignedUsers.map(u => u.id),
            task_name: currentTask.task_name || '',
            task: currentTask.task || '',
            task_type: currentTask.task_type || 'task',
            task_priority_id: taskPriorityId,
            task_status_id: taskStatusId,
            due_date: currentTask.due_date || '',
            is_recurring: !!currentTask.is_recurring,
            recurrence_type: currentTask.recurrence_type || 'daily',
            recurrence_interval: currentTask.recurrence_interval ? String(currentTask.recurrence_interval) : '1',
            recurrence_end_date: currentTask.recurrence_end_date || ''
        });

        setDetailModalVisible(false);
        setCreateModalVisible(true);
    };

    const handleDeleteTask = () => {
        Alert.alert(
            "Delete Task",
            "Are you sure you want to delete this task?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => {
                        dispatch(deleteTask(currentTask.id)).then((result) => {
                            if (!result.error) {
                                setDetailModalVisible(false);
                            }
                        });
                    }
                }
            ]
        );
    };

    const handleDataSubmit = () => {
        const data = new FormData();
        data.append('customer_id', newTask.customer_id);
        newTask.user_ids.forEach(id => data.append('user_ids[]', id));
        data.append('task_name', newTask.task_name);
        data.append('task', newTask.task);
        data.append('task_type', newTask.task_type);
        if (newTask.task_priority_id) data.append('task_priority_id', newTask.task_priority_id);
        if (newTask.task_status_id) data.append('task_status_id', newTask.task_status_id);
        if (newTask.due_date) data.append('due_date', newTask.due_date);
        data.append('is_recurring', newTask.is_recurring ? '1' : '0');

        if (newTask.is_recurring) {
            data.append('recurrence_type', newTask.recurrence_type);
            data.append('recurrence_interval', newTask.recurrence_interval);
            if (newTask.recurrence_end_date) data.append('recurrence_end_date', newTask.recurrence_end_date);
        }

        if (isEditing && editId) {
            dispatch(updateTask({ id: editId, data }));
        } else {
            dispatch(createTask(data));
        }
    };

    const handleTaskPress = (id) => {
        dispatch(fetchTaskDetails(id));
        setDetailModalVisible(true);
    };

    const handleToggleDone = (id) => {
        const isMarkingDone = !currentTask.is_done;
        dispatch(toggleTaskDone(id)).then((result) => {
            if (!result.error && isMarkingDone) {
                // Find 'Completed' or 'Done' status
                const completedStatus = formData.statuses.find(s =>
                    s.name.toLowerCase() === 'completed' || s.name.toLowerCase() === 'done'
                );
                if (completedStatus) {
                    dispatch(updateTaskStatus({ id, statusId: completedStatus.id }));
                }
            }
        });
    };

    const handleAddRemark = () => {
        if (!remark.trim()) return;
        dispatch(addTaskRemark({ id: currentTask.id, remark }));
        setRemark('');
    };

    const renderTaskItem = ({ item }) => (
        <TouchableOpacity style={styles.taskCard} onPress={() => handleTaskPress(item.id)}>
            <View style={styles.taskHeader}>
                <Text style={styles.taskTitle} numberOfLines={1}>{item.task_name}</Text>
                {item.priority && (
                    <View style={[styles.priorityBadge, { backgroundColor: item.priority.color + '20' }]}>
                        <Text style={[styles.priorityText, { color: item.priority.color }]}>{item.priority.name}</Text>
                    </View>
                )}
            </View>
            <Text style={styles.taskDescription} numberOfLines={2}>
                {typeof item.task === 'string' ? item.task : ''}
            </Text>
            <View style={styles.taskFooter}>
                <View style={[styles.statusBadge, { backgroundColor: item.status?.color || '#9CA3AF' }]}>
                    <Text style={styles.statusText}>{item.status?.name || 'Unknown'}</Text>
                </View>
                <Text style={styles.dateText}>
                    Due: {item.due_date ? item.due_date.split('T')[0] : 'No Date'}
                </Text>
            </View>
        </TouchableOpacity>
    );

    const toggleUserSelection = (userId) => {
        setNewTask(prev => {
            const exists = prev.user_ids.includes(userId);
            if (exists) {
                return { ...prev, user_ids: prev.user_ids.filter(id => id !== userId) };
            } else {
                return { ...prev, user_ids: [...prev.user_ids, userId] };
            }
        });
    };

    // Calendar Helpers
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
        const formattedDate = `${year}-${month}-${day}`;

        setNewTask(prev => ({ ...prev, due_date: formattedDate }));
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
            <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPress={() => setCalendarVisible(false)}>
                <View style={[styles.modalContent, { padding: 0 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' }}>
                        <TouchableOpacity onPress={() => changeMonth(-1)}>
                            <Ionicons name="chevron-back" size={24} color="#374151" />
                        </TouchableOpacity>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#111827' }}>
                            {months[pickerDate.getMonth()]} {pickerDate.getFullYear()}
                        </Text>
                        <TouchableOpacity onPress={() => changeMonth(1)}>
                            <Ionicons name="chevron-forward" size={24} color="#374151" />
                        </TouchableOpacity>
                    </View>

                    <View style={{ flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                        {weekDays.map((day, index) => (
                            <Text key={index} style={{ flex: 1, textAlign: 'center', fontWeight: '600', color: '#6B7280', fontSize: 13 }}>{day}</Text>
                        ))}
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 10 }}>
                        {generateDays().map((dayDate, index) => {
                            if (!dayDate) return <View key={index} style={{ width: '14.28%', aspectRatio: 1 }} />;

                            const dateStr = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
                            const isSelected = newTask.due_date === dateStr;
                            const isToday = new Date().toDateString() === dayDate.toDateString();

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={{
                                        width: '14.28%',
                                        aspectRatio: 1,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        backgroundColor: isSelected ? '#3B82F6' : isToday ? '#EFF6FF' : 'transparent',
                                        borderRadius: 20,
                                        marginVertical: 2
                                    }}
                                    onPress={() => handleDateSelect(dayDate)}
                                >
                                    <Text style={{
                                        color: isSelected ? '#fff' : isToday ? '#3B82F6' : '#374151',
                                        fontWeight: isSelected || isToday ? 'bold' : 'normal'
                                    }}>
                                        {dayDate.getDate()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <TouchableOpacity style={{ padding: 15, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB' }} onPress={() => setCalendarVisible(false)}>
                        <Text style={{ color: '#EF4444', fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const usersList = formData.users || [];
    const displayedTasks = activeTab === 'assigned' ? assignedTasks : createdTasks;

    return (
        <View style={styles.container}>
            <Header title="Tasks" />

            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'assigned' && styles.activeTabButton]}
                    onPress={() => setActiveTab('assigned')}
                >
                    <Text style={[styles.tabText, activeTab === 'assigned' && styles.activeTabText]}>My Tasks</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabButton, activeTab === 'created' && styles.activeTabButton]}
                    onPress={() => setActiveTab('created')}
                >
                    <Text style={[styles.tabText, activeTab === 'created' && styles.activeTabText]}>Created by Me</Text>
                </TouchableOpacity>
            </View>

            {loading && !displayedTasks.length ? (
                <ActivityIndicator size="large" color="#3B82F6" style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={displayedTasks}
                    renderItem={renderTaskItem}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={loadInitialData} />
                    }
                    ListEmptyComponent={
                        <Text style={{ textAlign: 'center', marginTop: 20, color: '#6B7280' }}>No tasks found.</Text>
                    }
                />
            )}

            <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>

            {/* Create/Edit Task Modal */}
            <Modal
                visible={createModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCreateModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isEditing ? 'Edit Task' : 'Create Task'}</Text>
                            <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#374151" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Task Name */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Task Title *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newTask.task_name}
                                    onChangeText={text => setNewTask({ ...newTask, task_name: text })}
                                    placeholder="Enter task title"
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Customer *</Text>
                                <View style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, overflow: 'hidden' }}>
                                    <TouchableOpacity
                                        onPress={() => setNewTask(prev => ({ ...prev, showCustomerPicker: !prev.showCustomerPicker }))}
                                        style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F9FAFB' }}
                                    >
                                        <Text style={{ color: newTask.customer_id ? '#111827' : '#9CA3AF' }}>
                                            {newTask.customer_id
                                                ? formData.customers.find(c => c.id === newTask.customer_id)?.name
                                                : "Select Customer"}
                                        </Text>
                                        <Ionicons name={newTask.showCustomerPicker ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
                                    </TouchableOpacity>

                                    {newTask.showCustomerPicker && (
                                        <View style={{ maxHeight: 200, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' }}>
                                            <ScrollView nestedScrollEnabled={true}>
                                                {formData.customers.map(c => (
                                                    <TouchableOpacity
                                                        key={c.id}
                                                        style={{
                                                            padding: 12,
                                                            borderBottomWidth: 1,
                                                            borderBottomColor: '#F3F4F6',
                                                            backgroundColor: newTask.customer_id === c.id ? '#F3F4F6' : '#fff'
                                                        }}
                                                        onPress={() => setNewTask(prev => ({ ...prev, customer_id: c.id, showCustomerPicker: false }))}
                                                    >
                                                        <Text style={{ color: newTask.customer_id === c.id ? '#3B82F6' : '#374151' }}>{c.name}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Assign Users (Multi Select) */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Assign Users *</Text>
                                <ScrollView horizontal style={{ flexDirection: 'row' }} showsHorizontalScrollIndicator={false}>
                                    {usersList.map(u => (
                                        <TouchableOpacity
                                            key={u.id}
                                            style={[
                                                styles.pickerButton,
                                                newTask.user_ids.includes(u.id) && { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' },
                                                { marginRight: 8 }
                                            ]}
                                            onPress={() => toggleUserSelection(u.id)}
                                        >
                                            <Text>{u.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>

                            {/* Description */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Description *</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea]}
                                    value={newTask.task}
                                    onChangeText={text => setNewTask({ ...newTask, task: text })}
                                    placeholder="Enter description"
                                    multiline
                                />
                            </View>

                            {/* Due Date */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Due Date (YYYY-MM-DD)</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TextInput
                                        style={[styles.input, { flex: 1 }]}
                                        value={newTask.due_date}
                                        onChangeText={text => setNewTask({ ...newTask, due_date: text })}
                                        placeholder="2024-12-31"
                                    />
                                    <TouchableOpacity style={{ padding: 10, position: 'absolute', right: 0 }} onPress={() => setCalendarVisible(true)}>
                                        <Ionicons name="calendar-outline" size={24} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.row}>
                                {/* Priority */}
                                <View style={[styles.inputGroup, styles.halfInput]}>
                                    <Text style={styles.label}>Priority</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                        {formData.priorities.map(p => (
                                            <TouchableOpacity
                                                key={p.id}
                                                style={[
                                                    styles.pickerButton,
                                                    newTask.task_priority_id === p.id && { borderColor: p.color, borderWidth: 2 },
                                                    { marginBottom: 4, marginRight: 4, padding: 8 }
                                                ]}
                                                onPress={() => setNewTask({ ...newTask, task_priority_id: p.id })}
                                            >
                                                <Text style={{ fontSize: 10 }}>{p.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>


                            </View>

                            <TouchableOpacity
                                style={[styles.submitButton, actionLoading && styles.disabledButton]}
                                onPress={handleDataSubmit}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={styles.submitButtonText}>{isEditing ? 'Update Task' : 'Create Task'}</Text>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Task Details Modal */}
            <Modal
                visible={detailModalVisible && !!currentTask}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setDetailModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        {/* Header with Close */}
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Task Details</Text>
                            <View style={{ flexDirection: 'row' }}>
                                {(currentTask?.created_by === user?.id) && (
                                    <>
                                        <TouchableOpacity onPress={handleDeleteTask} style={{ marginRight: 15 }}>
                                            <Ionicons name="trash-outline" size={24} color="#EF4444" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={openEditModal} style={{ marginRight: 15 }}>
                                            <Ionicons name="create-outline" size={24} color="#3B82F6" />
                                        </TouchableOpacity>
                                    </>
                                )}
                                <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                                    <Ionicons name="close" size={24} color="#374151" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {loadingDetails || !currentTask ? (
                            <ActivityIndicator size="large" color="#3B82F6" />
                        ) : (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Title and Status */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', flex: 1 }}>{currentTask.task_name}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: currentTask.status?.color || '#9CA3AF' }]}>
                                        <Text style={styles.statusText}>{currentTask.status?.name}</Text>
                                    </View>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Description</Text>
                                    <Text style={styles.detailValue}>
                                        {typeof currentTask.task === 'string' ? currentTask.task : ''}
                                    </Text>
                                </View>

                                <View style={styles.row}>
                                    <View style={[styles.detailRow, styles.halfInput]}>
                                        <Text style={styles.detailLabel}>Priority</Text>
                                        <Text style={[styles.detailValue, { color: (currentTask.priority?.color || currentTask.task_priority?.color || '#000') }]}>
                                            {(currentTask.priority?.name || currentTask.task_priority?.name || 'None')}
                                        </Text>
                                    </View>
                                    <View style={[styles.detailRow, styles.halfInput]}>
                                        <Text style={styles.detailLabel}>Due Date</Text>
                                        <Text style={styles.detailValue}>
                                            {currentTask.due_date ? currentTask.due_date.split('T')[0] : 'N/A'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Assigned To</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                                        {((currentTask.assignedUsers || currentTask.assigned_users || currentTask.users || []).length > 0) ? (
                                            (currentTask.assignedUsers || currentTask.assigned_users || currentTask.users).map(u => (
                                                <View key={u.id} style={{ backgroundColor: '#E5E7EB', padding: 4, borderRadius: 4, marginRight: 8, marginBottom: 4 }}>
                                                    <Text style={{ fontSize: 12 }}>{u.name}</Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={{ color: '#9CA3AF', fontSize: 14 }}>No assignees</Text>
                                        )}
                                    </View>
                                </View>

                                {/* Actions */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 20 }}>
                                    {(currentTask?.created_by === user?.id) && (
                                        <TouchableOpacity
                                            style={{ alignItems: 'center' }}
                                            onPress={() => handleToggleDone(currentTask.id)}
                                        >
                                            <Ionicons
                                                name={currentTask.is_done ? "checkmark-circle" : "ellipse-outline"}
                                                size={32}
                                                color={currentTask.is_done ? "#10B981" : "#6B7280"}
                                            />
                                            <Text style={{ fontSize: 12 }}>{currentTask.is_done ? "Done" : "Mark Done"}</Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Quick Status Change Example */}
                                    {formData.statuses.slice(0, 3).map(s => (
                                        <TouchableOpacity
                                            key={s.id}
                                            style={{ alignItems: 'center' }}
                                            onPress={() => dispatch(updateTaskStatus({ id: currentTask.id, statusId: s.id }))}
                                        >
                                            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: s.color }} />
                                            <Text style={{ fontSize: 10, marginTop: 4 }}>{s.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Remarks Section */}
                                <Text style={styles.sectionTitle}>Remarks</Text>
                                {currentTask.remarks && currentTask.remarks.map((r, index) => (
                                    <View key={r.id || index} style={styles.remarkCard}>
                                        <Text style={styles.remarkText}>{r.remark}</Text>
                                        <View style={styles.remarkMeta}>
                                            <Text style={styles.remarkUser}>{r.user?.name || 'User'}</Text>
                                            <Text style={styles.remarkDate}>{r.created_at}</Text>
                                        </View>
                                    </View>
                                ))}

                                {/* Add Remark */}
                                <View style={{ marginTop: 10 }}>
                                    <TextInput
                                        style={[styles.input, { height: 60 }]}
                                        value={remark}
                                        onChangeText={setRemark}
                                        placeholder="Add a comment..."
                                        multiline
                                    />
                                    <TouchableOpacity
                                        style={[styles.submitButton, { marginTop: 10, padding: 10 }]}
                                        onPress={handleAddRemark}
                                    >
                                        <Text style={styles.submitButtonText}>Post Remark</Text>
                                    </TouchableOpacity>
                                </View>

                                <View style={{ height: 40 }} />
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
            {renderCustomCalendar()}
        </View>
    );
};

export default Task;