import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, ScrollView, RefreshControl, Modal, TextInput, Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../components/Header';
import {
    fetchLeaveApprovals,
    approveLeave,
    rejectLeave,
    fetchEmployeeLeaveHistory,
    clearEmployeeTrail
} from '../store/slices/leaveSlice';

const LeaveApprovalsScreen = () => {
    const dispatch = useDispatch();
    
    // State Selectors
    const { 
        pendingApprovals, 
        loadingApprovals, 
        actionLoading,
        employeeTrail, 
        loadingTrail 
    } = useSelector((state) => state.leave);

    // Local UI Controllers
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'approved' | 'rejected'
    const [viewMode, setViewMode] = useState('card'); // 'card' | 'table'

    // Rejection Modal Triggers
    const [rejectionModalVisible, setRejectionModalVisible] = useState(false);
    const [selectedLeave, setSelectedLeave] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    // History Trail Modal Controllers
    const [trailModalVisible, setTrailModalVisible] = useState(false);
    const [trailTargetName, setTrailTargetName] = useState('');

    // Life Cycles
    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        dispatch(fetchLeaveApprovals());
    };

    const onRefresh = async () => {
        setIsRefreshing(true);
        await dispatch(fetchLeaveApprovals());
        setIsRefreshing(false);
    };

    // Computations
    const getFilteredApprovals = () => {
        // 1. Hard Filter by Tab Status
        let tabData = pendingApprovals.filter(item => item.status === activeTab);

        // 2. Soft Filter by Query
        if (!searchQuery.trim()) return tabData;
        const q = searchQuery.toLowerCase();
        
        return tabData.filter(item => {
            const userName = item.user?.name || '';
            const leaveType = item.leave_type?.name || '';
            const reason = item.reason || '';
            return userName.toLowerCase().includes(q) ||
                   leaveType.toLowerCase().includes(q) ||
                   reason.toLowerCase().includes(q);
        });
    };

    // Actions Processing
    const handleApprove = (item) => {
        Alert.alert(
            'Approve Leave Request?',
            `Confirm leave approval for ${item.user?.name} (${item.total_days} Day${item.total_days > 1 ? 's' : ''}).`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Yes, Approve',
                    style: 'default',
                    onPress: () => {
                        dispatch(approveLeave(item.id))
                            .unwrap()
                            .then(() => {
                                loadData();
                            });
                    }
                }
            ]
        );
    };

    const handleOpenRejectModal = (item) => {
        setSelectedLeave(item);
        setRejectReason('');
        setRejectionModalVisible(true);
    };

    const submitRejection = () => {
        if (!rejectReason.trim()) {
            Alert.alert('Missing Info', 'Please input a reason for rejection.');
            return;
        }

        dispatch(rejectLeave({ id: selectedLeave.id, reason: rejectReason }))
            .unwrap()
            .then(() => {
                setRejectionModalVisible(false);
                loadData();
            });
    };

    // Trigger fetching Detailed annual Trail
    const handleViewTrail = (userId, userName) => {
        setTrailTargetName(userName);
        dispatch(clearEmployeeTrail());
        setTrailModalVisible(true);
        dispatch(fetchEmployeeLeaveHistory(userId));
    };

    // Decorators & Text Formatters
    const formatDate = (str) => {
        if (!str) return '';
        return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const getPeriodDetails = (item) => {
        if (item.is_sl) {
            const prd = item.sl_period === 'evening' ? 'Evening Shift' : 'Morning Shift';
            return `Short Leave (${prd})`;
        }
        if (item.is_half_day) {
            const prd = item.half_day_period === 'pre_lunch' ? 'Pre-Lunch' : 'Post-Lunch';
            return `Half Day (${prd})`;
        }
        return 'Full Duration';
    };

    const getStatusColor = (status) => {
        switch ((status || '').toLowerCase()) {
            case 'approved': return '#059669';
            case 'rejected': return '#DC2626';
            case 'cancelled': return '#94A3B8';
            case 'pending': return '#D97706';
            default: return '#64748B';
        }
    };

    // View Renderer Component
    const renderLeaveCard = ({ item }) => {
        const detailsStr = getPeriodDetails(item);
        
        return (
            <View style={styles.leaveCard}>
                {/* Top metadata row */}
                <View style={styles.cardHead}>
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarDot}>
                            <Text style={styles.avatarLetter}>{item.user?.name?.charAt(0) || 'U'}</Text>
                        </View>
                        <View>
                            <Text style={styles.empNameTxt}>{item.user?.name}</Text>
                            <Text style={styles.metaDateTxt}>Applied: {formatDate(item.created_at)}</Text>
                        </View>
                    </View>

                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                        {/* History Trigger Eye Action */}
                        <TouchableOpacity 
                            style={styles.eyeActionTrigger}
                            onPress={() => handleViewTrail(item.user?.id || item.user_id, item.user?.name)}
                        >
                            <Ionicons name="time" size={13} color="#434AFA" />
                            <Text style={styles.eyeActionLabel}>History Trail</Text>
                        </TouchableOpacity>
                        <View style={[
                            styles.statusPill, 
                            item.status === 'approved' && { backgroundColor: '#ECFDF5' },
                            item.status === 'rejected' && { backgroundColor: '#FEF2F2' }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                item.status === 'approved' && { color: '#059669' },
                                item.status === 'rejected' && { color: '#DC2626' }
                            ]}>
                                {item.status?.toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Info Grid Body */}
                <View style={styles.cardBody}>
                    <View style={styles.periodGrid}>
                        <View style={styles.dateCol}>
                            <Text style={styles.gridLabel}>START DATE</Text>
                            <Text style={styles.gridVal}>{formatDate(item.start_date)}</Text>
                        </View>
                        <Ionicons name="arrow-forward" size={16} color="#CBD5E1" style={{ marginHorizontal: 8 }} />
                        <View style={styles.dateCol}>
                            <Text style={styles.gridLabel}>END DATE</Text>
                            <Text style={styles.gridVal}>{formatDate(item.end_date)}</Text>
                        </View>
                    </View>

                    <View style={styles.attributeStrip}>
                        <View style={styles.attributeCell}>
                            <Ionicons name="ribbon-outline" size={14} color="#4F46E5" />
                            <Text style={styles.attributeTxt}>{item.leave_type?.name || 'N/A'}</Text>
                        </View>
                        <View style={styles.attributeCell}>
                            <Ionicons name="calendar-outline" size={14} color="#0891B2" />
                            <Text style={styles.attributeTxt}>{item.total_days} Day{item.total_days > 1 ? 's' : ''}</Text>
                        </View>
                    </View>

                    {!!(item.is_sl || item.is_half_day) ? (
                        <View style={styles.subPeriodLabel}>
                            <Ionicons name="time-outline" size={12} color="#D97706" />
                            <Text style={styles.subPeriodTxt}>{detailsStr}</Text>
                        </View>
                    ) : null}

                    {item.reason ? (
                        <View style={styles.speechBlock}>
                            <Text style={styles.speechTitle}>REASON:</Text>
                            <Text style={styles.speechText}>{item.reason}</Text>
                        </View>
                    ) : null}

                    {item.status === 'rejected' && item.reject_reason ? (
                        <View style={[styles.speechBlock, { borderColor: '#FCA5A5', backgroundColor: '#FFF5F5' }]}>
                            <Text style={[styles.speechTitle, { color: '#DC2626' }]}>REJECTION REMARK:</Text>
                            <Text style={styles.speechText}>{item.reject_reason}</Text>
                        </View>
                    ) : null}
                </View>

                {/* Conditional Actions Footer */}
                {item.status === 'pending' && (
                    <View style={styles.actionsFooter}>
                        <TouchableOpacity 
                            style={[styles.actionBtn, styles.btnReject]}
                            onPress={() => handleOpenRejectModal(item)}
                            disabled={actionLoading}
                        >
                            <Ionicons name="close-circle-outline" size={16} color="#DC2626" />
                            <Text style={[styles.btnLabel, { color: '#DC2626' }]}>Reject Request</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionBtn, styles.btnApprove]}
                            onPress={() => handleApprove(item)}
                            disabled={actionLoading}
                        >
                            <Ionicons name="checkmark-done-circle-outline" size={17} color="#059669" />
                            <Text style={[styles.btnLabel, { color: '#059669' }]}>Approve Leave</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // RENDER PIECE: Horizontal scrollable table UI
    const renderLeaveTable = () => {
        const data = getFilteredApprovals();
        return (
            <View style={styles.tableWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
                    <View style={{ minWidth: 780 }}>
                        {/* Header Row */}
                        <View style={styles.tableHeaderRow}>
                            <Text style={[styles.tableColHead, { width: 90 }]}>APPLIED</Text>
                            <Text style={[styles.tableColHead, { width: 140 }]}>EMPLOYEE</Text>
                            <Text style={[styles.tableColHead, { width: 180 }]}>DATES (FROM - TO)</Text>
                            <Text style={[styles.tableColHead, { width: 70, textAlign: 'center' }]}>DAYS</Text>
                            <Text style={[styles.tableColHead, { width: 110 }]}>LEAVE TYPE</Text>
                            <Text style={[styles.tableColHead, { width: 90 }]}>STATUS</Text>
                            <Text style={[styles.tableColHead, { width: 100, textAlign: 'center' }]}>ACTIONS</Text>
                        </View>

                        {/* Body Data Rows */}
                        {data.length === 0 ? (
                            <View style={styles.tableNoData}>
                                <Ionicons name="cafe-outline" size={32} color="#CBD5E1" style={{ marginBottom: 8 }} />
                                <Text style={styles.tableNoDataTxt}>No leave requests found matching selection.</Text>
                            </View>
                        ) : (
                            data.map((item, idx) => {
                                const isEven = idx % 2 === 0;
                                return (
                                    <View 
                                        key={item.id} 
                                        style={[
                                            styles.tableBodyRow, 
                                            { backgroundColor: isEven ? '#FFF' : '#F8FAFC' }
                                        ]}
                                    >
                                        {/* Applied Date */}
                                        <Text style={[styles.tableColCell, { width: 90, fontSize: 11 }]} numberOfLines={1}>
                                            {formatDate(item.created_at)}
                                        </Text>

                                        {/* Employee Avatar + Name */}
                                        <View style={[styles.tableColCell, { width: 140, flexDirection: 'row', alignItems: 'center', gap: 6 }]}>
                                            <View style={styles.tableMiniAvatar}>
                                                <Text style={styles.tableMiniAvatarTxt}>{item.user?.name?.charAt(0) || 'U'}</Text>
                                            </View>
                                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1E293B', flex: 1 }} numberOfLines={1}>
                                                {item.user?.name || '-'}
                                            </Text>
                                        </View>

                                        {/* Dates Span */}
                                        <View style={[styles.tableColCell, { width: 180, paddingVertical: 4 }]}>
                                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#334155' }} numberOfLines={1}>
                                                {formatDate(item.start_date)}
                                            </Text>
                                            <Text style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }} numberOfLines={1}>
                                                ➜ {formatDate(item.end_date)}
                                            </Text>
                                        </View>

                                        {/* Total Days */}
                                        <View style={{ width: 70, justifyContent: 'center', alignItems: 'center' }}>
                                            <Text style={styles.tableDaysTextCell}>{parseFloat(item.total_days || 0).toFixed(1)}</Text>
                                        </View>

                                        {/* Leave Type */}
                                        <Text style={[styles.tableColCell, { width: 110, fontWeight: '600', color: '#4B5563' }]} numberOfLines={1}>
                                            {item.leave_type?.name || 'N/A'}
                                        </Text>

                                        {/* Status Badge */}
                                        <View style={[styles.tableColCell, { width: 90, justifyContent: 'center' }]}>
                                            <View style={[
                                                styles.tableStatusBadge,
                                                { backgroundColor: getStatusColor(item.status) + '15' }
                                            ]}>
                                                <Text style={[styles.tableStatusBadgeTxt, { color: getStatusColor(item.status) }]}>
                                                    {item.status?.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Action Row */}
                                        <View style={[styles.tableColCell, { width: 100, flexDirection: 'row', gap: 10, justifyContent: 'center', alignItems: 'center' }]}>
                                            {/* Audit Eye */}
                                            <TouchableOpacity 
                                                onPress={() => handleViewTrail(item.user?.id || item.user_id, item.user?.name)}
                                                style={styles.tblCircleActionBtn}
                                            >
                                                <Ionicons name="eye-outline" size={14} color="#434AFA" />
                                            </TouchableOpacity>

                                            {/* Action Buttons if pending */}
                                            {item.status === 'pending' && (
                                                <>
                                                    <TouchableOpacity 
                                                        onPress={() => handleApprove(item)}
                                                        disabled={actionLoading}
                                                        style={[styles.tblCircleActionBtn, { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' }]}
                                                    >
                                                        <Ionicons name="checkmark" size={14} color="#059669" />
                                                    </TouchableOpacity>
                                                    <TouchableOpacity 
                                                        onPress={() => handleOpenRejectModal(item)}
                                                        disabled={actionLoading}
                                                        style={[styles.tblCircleActionBtn, { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }]}
                                                    >
                                                        <Ionicons name="close" size={14} color="#DC2626" />
                                                    </TouchableOpacity>
                                                </>
                                            )}
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </ScrollView>
            </View>
        );
    };

    return (
        <View style={styles.screenContainer}>
            <Header title="Leave Approvals" />

            {/* Tab selectors bar */}
            <View style={styles.tabContainer}>
                {['pending', 'approved', 'rejected'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Wide Search filters input */}
            <View style={styles.utilityDockBar}>
                <View style={styles.searchFormDock}>
                    <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                    <TextInput
                        style={styles.textInputControl}
                        placeholder="Search Employee, Reason, Type..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={15} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.viewModeSelectBlock}>
                    <TouchableOpacity 
                        style={[styles.viewModeBtn, viewMode === 'card' && styles.viewModeBtnActive]} 
                        onPress={() => setViewMode('card')}
                    >
                        <Ionicons name="grid-outline" size={15} color={viewMode === 'card' ? '#FFF' : '#64748B'} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.viewModeBtn, viewMode === 'table' && styles.viewModeBtnActive]} 
                        onPress={() => setViewMode('table')}
                    >
                        <Ionicons name="list-outline" size={15} color={viewMode === 'table' ? '#FFF' : '#64748B'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Content Listing View */}
            {loadingApprovals && pendingApprovals.length === 0 ? (
                <View style={styles.loadingSection}>
                    <ActivityIndicator size="large" color="#434AFA" />
                    <Text style={styles.loadingText}>Syncing team calendar requests...</Text>
                </View>
            ) : viewMode === 'table' ? (
                <ScrollView 
                    style={{ flex: 1 }}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#434AFA']} />}
                >
                    {renderLeaveTable()}
                </ScrollView>
            ) : (
                <FlatList
                    data={getFilteredApprovals()}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderLeaveCard}
                    contentContainerStyle={styles.listPadding}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#434AFA']} />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrapper}>
                            <View style={styles.emptyBubble}>
                                <Ionicons name="calendar-clear-outline" size={40} color="#818CF8" />
                            </View>
                            <Text style={styles.emptyStrong}>Zero {activeTab} Requests</Text>
                            <Text style={styles.emptyMuted}>There are no leave requests available to show in this filter group.</Text>
                        </View>
                    }
                />
            )}

            {/* ==================================================== */}
            {/* MODAL OVERLAY: EMPLOYEE DETAILED ANNUAL TRAIL LOGS */}
            {/* ==================================================== */}
            <Modal visible={trailModalVisible} transparent animationType="slide">
                <View style={styles.dialogOverlay}>
                    <View style={[styles.dialogSheet, { width: '94%', height: '78%', maxHeight: '80%' }]}>
                        {/* Top header of trail popover */}
                        <View style={[styles.dialogHead, { backgroundColor: '#434AFA' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="time-outline" size={18} color="#FFF" />
                                <Text style={styles.dialogTitle} numberOfLines={1}>Leave History: {trailTargetName}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setTrailModalVisible(false)}>
                                <Ionicons name="close-circle" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        {loadingTrail ? (
                            <View style={styles.trailLoaderBlock}>
                                <ActivityIndicator size="large" color="#434AFA" />
                                <Text style={styles.trailLoaderTxt}>Retrieving annual metrics & history log...</Text>
                            </View>
                        ) : (
                            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 20 }}>
                                {/* SECTION 1: LEAVE POOL BALANCE CARDS */}
                                <Text style={styles.sectionTitleLabel}>ANNUAL BALANCE POOLS</Text>
                                <ScrollView 
                                    horizontal 
                                    showsHorizontalScrollIndicator={false}
                                    contentContainerStyle={styles.horizontalCardScroller}
                                >
                                    {employeeTrail.balances && employeeTrail.balances.length > 0 ? (
                                        employeeTrail.balances.map((bal, idx) => (
                                            <View key={idx} style={styles.poolCard}>
                                                <View style={styles.poolHeaderRow}>
                                                    <Ionicons name="bookmarks-outline" size={14} color="#434AFA" />
                                                    <Text style={styles.poolTypeName} numberOfLines={1}>{bal.leave_type_name}</Text>
                                                </View>
                                                <View style={styles.poolMetricGrid}>
                                                    <View>
                                                        <Text style={styles.poolMetricBigNum}>{bal.remaining}</Text>
                                                        <Text style={styles.poolMetricSub}>Remaining</Text>
                                                    </View>
                                                    <View style={styles.poolDivider} />
                                                    <View>
                                                        <Text style={[styles.poolMetricBigNum, { color: '#64748B' }]}>{bal.allowed}</Text>
                                                        <Text style={styles.poolMetricSub}>Quota</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.poolDeductionFooter}>
                                                    <Text style={styles.poolDeductionFooterTxt}>
                                                        Used: {bal.consumed}d | Pending: {bal.pending}d
                                                    </Text>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <View style={styles.noBalanceBlock}>
                                            <Text style={styles.noBalanceTxt}>No recorded balance limits for employment type.</Text>
                                        </View>
                                    )}
                                </ScrollView>

                                {/* SECTION 2: DETAILED CHRONOLOGICAL TABLE */}
                                <Text style={styles.sectionTitleLabel}>DETAILED LOG TRAIL (CHRONOLOGICAL)</Text>
                                <View style={styles.tableSurface}>
                                    {/* Table Header */}
                                    <View style={styles.tableHeadRow}>
                                        <Text style={[styles.tableHeadCell, { flex: 1 }]}>DATES</Text>
                                        <Text style={[styles.tableHeadCell, { flex: 0.5, textAlign: 'center' }]}>DAYS</Text>
                                        <Text style={[styles.tableHeadCell, { flex: 1.2 }]}>LEAVE TYPE</Text>
                                        <Text style={[styles.tableHeadCell, { flex: 0.8, textAlign: 'right' }]}>STATUS</Text>
                                    </View>

                                    {/* Table Body Rows */}
                                    {employeeTrail.leaves && employeeTrail.leaves.length > 0 ? (
                                        employeeTrail.leaves.map((history, index) => (
                                            <View key={index} style={[
                                                styles.tableBodyRow,
                                                index % 2 === 1 && { backgroundColor: '#FAFAFA' },
                                                index === employeeTrail.leaves.length - 1 && { borderBottomWidth: 0 }
                                            ]}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.tableSpanTxt}>{new Date(history.start_date).toLocaleDateString('en-IN', {day: '2-digit', month: '2-digit'})}</Text>
                                                    <Text style={styles.tableSpanArrow}>➜ {new Date(history.end_date).toLocaleDateString('en-IN', {day: '2-digit', month: '2-digit'})}</Text>
                                                </View>
                                                <View style={{ flex: 0.5, alignItems: 'center', justifyContent: 'center' }}>
                                                    <Text style={styles.tableDaysText}>{parseFloat(history.total_days).toFixed(1)}</Text>
                                                </View>
                                                <View style={{ flex: 1.2, paddingHorizontal: 4, justifyContent: 'center' }}>
                                                    <Text style={styles.tableTypeName} numberOfLines={2}>{history.leave_type?.name || 'N/A'}</Text>
                                                    {!!(history.is_sl || history.is_half_day) && (
                                                        <Text style={styles.tableSubLabel}>
                                                            {history.is_sl ? 'Short' : 'Half-D'}
                                                        </Text>
                                                    )}
                                                </View>
                                                <View style={{ flex: 0.8, alignItems: 'flex-end', justifyContent: 'center' }}>
                                                    <Text style={[
                                                        styles.tableStatusVal,
                                                        { color: getStatusColor(history.status) }
                                                    ]}>
                                                        {history.status?.toUpperCase()}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <View style={styles.emptyTrailContainer}>
                                            <Ionicons name="cafe-outline" size={28} color="#CBD5E1" />
                                            <Text style={styles.emptyTrailTxt}>Zero recorded leaves this calendar year.</Text>
                                        </View>
                                    )}
                                </View>
                            </ScrollView>
                        )}

                        <View style={styles.dialogFooter}>
                            <TouchableOpacity 
                                style={[styles.cancelBtn, { flex: 1, backgroundColor: '#FFFFFF' }]} 
                                onPress={() => setTrailModalVisible(false)}
                            >
                                <Text style={[styles.cancelBtnText, { color: '#475569' }]}>Close Trail View</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ==================================================== */}
            {/* MODAL SHEET: REJECTION NOTE INPUT */}
            {/* ==================================================== */}
            <Modal visible={rejectionModalVisible} transparent animationType="fade">
                <View style={styles.dialogOverlay}>
                    <View style={styles.dialogSheet}>
                        <View style={styles.dialogHead}>
                            <Text style={styles.dialogTitle}>Reject Leave Application</Text>
                            <TouchableOpacity onPress={() => setRejectionModalVisible(false)}>
                                <Ionicons name="close" size={22} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.dialogBody}>
                            <Text style={styles.fieldLabel}>STATE REJECTION REASON *</Text>
                            <TextInput
                                style={styles.reasonBox}
                                multiline
                                numberOfLines={4}
                                placeholder="Give a constructive reason so the employee understands the context..."
                                placeholderTextColor="#94A3B8"
                                value={rejectReason}
                                onChangeText={setRejectReason}
                            />
                        </View>

                        <View style={styles.dialogFooter}>
                            <TouchableOpacity 
                                style={styles.cancelBtn} 
                                onPress={() => setRejectionModalVisible(false)}
                                disabled={actionLoading}
                            >
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.commitBtn}
                                onPress={submitRejection}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="ban" size={15} color="#FFF" />
                                        <Text style={styles.commitBtnText}>Confirm Reject</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    screenContainer: { flex: 1, backgroundColor: '#FFFFFF' },
    
    // Tab Navigation Row
    tabContainer: { 
        flexDirection: 'row', 
        backgroundColor: '#FFF', 
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    tabItem: { 
        flex: 1, 
        paddingVertical: 14, 
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent'
    },
    tabItemActive: { 
        borderBottomColor: '#434AFA' 
    },
    tabText: { 
        fontSize: 13, 
        fontWeight: '800', 
        color: '#94A3B8' 
    },
    tabTextActive: { 
        color: '#434AFA' 
    },

    // Utility Search toolbar
    utilityDockBar: { 
        flexDirection: 'row', 
        padding: 12, 
        backgroundColor: '#FFF', 
        alignItems: 'center', 
        borderBottomWidth: 1, 
        borderBottomColor: '#E2E8F0' 
    },
    searchFormDock: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: '#F1F5F9', 
        paddingHorizontal: 10, 
        paddingVertical: 8, 
        borderRadius: 8 
    },
    textInputControl: { flex: 1, fontSize: 13, color: '#1E293B', padding: 0 },

    // Loaders & Padding
    loadingSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#64748B', fontWeight: '700', marginTop: 12 },
    listPadding: { padding: 16, paddingBottom: 40 },
    
    emptyWrapper: { alignItems: 'center', paddingVertical: 100, paddingHorizontal: 32 },
    emptyBubble: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
    emptyStrong: { fontSize: 16, fontWeight: '800', color: '#312E81', marginTop: 16 },
    emptyMuted: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18 },

    // Card structures
    leaveCard: { 
        backgroundColor: '#FFF', 
        borderRadius: 12, 
        elevation: 2, 
        shadowColor: '#000', 
        shadowOpacity: 0.04, 
        shadowOffset: { width: 0, height: 2 }, 
        marginBottom: 16,
        overflow: 'hidden'
    },
    cardHead: { 
        flexDirection: 'row', 
        padding: 14, 
        borderBottomWidth: 1, 
        borderBottomColor: '#F8FAFC', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    avatarSection: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    avatarDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#434AFA', justifyContent: 'center', alignItems: 'center' },
    avatarLetter: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    empNameTxt: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    metaDateTxt: { fontSize: 10, color: '#94A3B8', marginTop: 1 },
    eyeActionTrigger: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 4, 
        backgroundColor: '#EEF2FF', 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 6,
        borderWidth: 0.5,
        borderColor: '#A5B4FC'
    },
    eyeActionLabel: { fontSize: 10, fontWeight: '800', color: '#434AFA' },
    statusPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#FEF3C7' },
    statusText: { fontSize: 9, fontWeight: '900', color: '#B45309' },

    // Body parameters
    cardBody: { padding: 14 },
    periodGrid: { 
        flexDirection: 'row', 
        backgroundColor: '#F8FAFC', 
        borderRadius: 8, 
        padding: 12, 
        alignItems: 'center',
        marginBottom: 12
    },
    dateCol: { flex: 1 },
    gridLabel: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.5 },
    gridVal: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginTop: 2 },
    
    attributeStrip: { flexDirection: 'row', gap: 16, marginBottom: 10 },
    attributeCell: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    attributeTxt: { fontSize: 12, fontWeight: '700', color: '#334155' },
    
    subPeriodLabel: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 5, 
        backgroundColor: '#FFFBEB', 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 4, 
        alignSelf: 'flex-start',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FDE68A'
    },
    subPeriodTxt: { fontSize: 10, fontWeight: '800', color: '#B45309' },

    speechBlock: { 
        backgroundColor: '#FAFAFA', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 8, 
        padding: 10, 
        marginTop: 6 
    },
    speechTitle: { fontSize: 9, fontWeight: '800', color: '#64748B', marginBottom: 4, letterSpacing: 0.5 },
    speechText: { fontSize: 12, color: '#334155', lineHeight: 18, fontStyle: 'italic' },

    // Card Footer
    actionsFooter: { 
        flexDirection: 'row', 
        borderTopWidth: 1, 
        borderTopColor: '#F1F5F9', 
        backgroundColor: '#FCFCFD',
        padding: 12,
        gap: 12
    },
    actionBtn: { 
        flex: 1, 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: 6, 
        paddingVertical: 10, 
        borderRadius: 8 
    },
    btnReject: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
    btnApprove: { backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0' },
    btnLabel: { fontSize: 12, fontWeight: '800' },

    // Dialog sheets general styles
    dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    dialogSheet: { backgroundColor: '#FFF', width: '85%', borderRadius: 12, overflow: 'hidden', elevation: 10 },
    dialogHead: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: '#EF4444', 
        padding: 14 
    },
    dialogTitle: { color: '#FFF', fontWeight: '800', fontSize: 14, maxWidth: '85%' },
    dialogBody: { padding: 16 },
    fieldLabel: { fontSize: 10, fontWeight: '800', color: '#64748B', marginBottom: 8 },
    reasonBox: { 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 8, 
        padding: 12, 
        color: '#1E293B', 
        fontSize: 13, 
        backgroundColor: '#F8FAFC',
        minHeight: 80,
        textAlignVertical: 'top'
    },
    dialogFooter: { flexDirection: 'row', gap: 12, padding: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    cancelBtn: { 
        flex: 0.4, 
        borderWidth: 1, 
        borderColor: '#CBD5E1', 
        borderRadius: 6, 
        height: 42, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    cancelBtnText: { color: '#64748B', fontWeight: '800', fontSize: 12 },
    commitBtn: { 
        flex: 0.6, 
        backgroundColor: '#EF4444', 
        borderRadius: 6, 
        height: 42, 
        flexDirection: 'row', 
        gap: 6, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    commitBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },

    // History Trail styling additions
    trailLoaderBlock: { padding: 60, alignItems: 'center', justifyContent: 'center', gap: 16 },
    trailLoaderTxt: { fontSize: 12, color: '#64748B', fontWeight: '600', textAlign: 'center' },
    sectionTitleLabel: { fontSize: 10, fontWeight: '900', color: '#94A3B8', letterSpacing: 0.8, paddingHorizontal: 16, marginTop: 18, marginBottom: 10 },
    horizontalCardScroller: { paddingLeft: 16, paddingRight: 20, gap: 12, paddingBottom: 6 },
    
    poolCard: { 
        backgroundColor: '#FFF', 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        borderRadius: 10, 
        width: 140, 
        padding: 12,
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1
    },
    poolHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
    poolTypeName: { fontSize: 10, fontWeight: '800', color: '#1E293B', flex: 1 },
    poolMetricGrid: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 8 },
    poolMetricBigNum: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
    poolMetricSub: { fontSize: 8, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', marginTop: 1 },
    poolDivider: { width: 1, height: 20, backgroundColor: '#E2E8F0' },
    poolDeductionFooter: { borderTopWidth: 0.5, borderTopColor: '#F1F5F9', paddingTop: 6 },
    poolDeductionFooterTxt: { fontSize: 8, fontWeight: '700', color: '#64748B' },
    
    noBalanceBlock: { padding: 16, backgroundColor: '#F8FAFC', borderRadius: 8, marginHorizontal: 16 },
    noBalanceTxt: { fontSize: 11, color: '#64748B', fontStyle: 'italic' },

    tableSurface: { marginHorizontal: 16, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, overflow: 'hidden' },
    tableHeadRow: { flexDirection: 'row', backgroundColor: '#F1F5F9', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    tableHeadCell: { fontSize: 9, fontWeight: '900', color: '#64748B', letterSpacing: 0.5 },
    tableBodyRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFF' },
    
    tableSpanTxt: { fontSize: 11, fontWeight: '800', color: '#1E293B' },
    tableSpanArrow: { fontSize: 10, color: '#94A3B8', marginTop: 1 },
    tableDaysText: { fontSize: 12, fontWeight: '800', color: '#334155', backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
    tableTypeName: { fontSize: 11, fontWeight: '700', color: '#334155' },
    tableSubLabel: { fontSize: 8, fontWeight: '800', color: '#D97706', textTransform: 'uppercase', marginTop: 2 },
    tableStatusVal: { fontSize: 10, fontWeight: '900' },
    
    emptyTrailContainer: { padding: 40, alignItems: 'center', gap: 8, justifyContent: 'center' },
    emptyTrailTxt: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },

    // Switcher styles for Toolbar
    viewModeSelectBlock: { 
        flexDirection: 'row', 
        gap: 4, 
        backgroundColor: '#F1F5F9', 
        padding: 3, 
        borderRadius: 6, 
        marginLeft: 10 
    },
    viewModeBtn: { padding: 6, borderRadius: 4 },
    viewModeBtnActive: { backgroundColor: '#434AFA' },

    // Main horizontal scrollable table container
    tableWrapper: { 
        backgroundColor: '#FFF', 
        flex: 1,
        marginTop: 0,
        borderTopWidth: 1, 
        borderTopColor: '#E2E8F0' 
    },
    tableHeaderRow: { 
        flexDirection: 'row', 
        backgroundColor: '#EEF2FF', 
        borderBottomWidth: 1, 
        borderBottomColor: '#C7D2FE',
        alignItems: 'center'
    },
    tableColHead: { 
        fontSize: 10, 
        fontWeight: '900', 
        color: '#312E81', 
        paddingVertical: 12, 
        paddingHorizontal: 10, 
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    tableBodyRow: { 
        flexDirection: 'row', 
        borderBottomWidth: 1, 
        borderBottomColor: '#F1F5F9', 
        alignItems: 'center',
        minHeight: 56
    },
    tableColCell: { 
        paddingHorizontal: 10, 
        paddingVertical: 8,
        fontSize: 11, 
        color: '#475569' 
    },
    tableNoData: { padding: 48, alignItems: 'center', justifyContent: 'center' },
    tableNoDataTxt: { fontStyle: 'italic', color: '#94A3B8', fontSize: 12 },

    // Mini table components
    tableMiniAvatar: { 
        width: 24, 
        height: 24, 
        borderRadius: 12, 
        backgroundColor: '#EEF2FF', 
        justifyContent: 'center', 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C7D2FE'
    },
    tableMiniAvatarTxt: { fontSize: 10, fontWeight: '800', color: '#434AFA' },
    tableDaysTextCell: { 
        fontSize: 11, 
        fontWeight: '800', 
        color: '#334155', 
        backgroundColor: '#F1F5F9', 
        paddingHorizontal: 6, 
        paddingVertical: 2, 
        borderRadius: 4,
        overflow: 'hidden' 
    },
    tableStatusBadge: { 
        paddingHorizontal: 6, 
        paddingVertical: 3, 
        borderRadius: 4, 
        alignSelf: 'flex-start' 
    },
    tableStatusBadgeTxt: { fontSize: 8, fontWeight: '900', textAlign: 'center' },
    
    tblCircleActionBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center'
    }
});

export default LeaveApprovalsScreen;
