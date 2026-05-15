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
    StyleSheet
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

    // ----------------- RENDER TABS DATA IN LISTS -----------------

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
                                {(item.task_type || 'TASK').toUpperCase()}
                            </Text>
                        </View>
                        {item.priority && (
                            <View style={[styles.wlogMiniBadge, pStyle.bg]}>
                                <Text style={[styles.wlogBadgeText, pStyle.text]}>{(item.priority.name || '').toUpperCase()}</Text>
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
                    onPress={() => Toast.show({ type: 'info', text1: 'Feature Pending', text2: 'Opening advanced Task Recurrence Builder Modal' })}
                >
                    <Ionicons name="add" size={28} color="#FFF" />
                </TouchableOpacity>
            )}

            {renderInteractionSheet()}
        </View>
    );
}
