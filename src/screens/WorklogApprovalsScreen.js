import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, ScrollView, RefreshControl, Modal, TextInput, Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Header from '../components/Header';
import {
    fetchPendingApprovals,
    approveWorklog,
    rejectWorklog,
    approveWorklogGroup,
    rejectWorklogGroup
} from '../store/slices/worklogSlice';

const WorklogApprovalsScreen = () => {
    const dispatch = useDispatch();
    
    // State Selectors
    const { pendingApprovals, loading, actionLoading } = useSelector((state) => state.worklog);

    // Local interaction states
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Modal triggers
    const [approvalModalVisible, setApprovalModalVisible] = useState(false);
    const [rejectionModalVisible, setRejectionModalVisible] = useState(false);

    // Modal payload targets
    const [targetType, setTargetType] = useState(''); // 'single' | 'group'
    const [selectedId, setSelectedId] = useState(null); // for single
    const [selectedGroupUser, setSelectedGroupUser] = useState(''); // for group
    const [selectedGroupDate, setSelectedGroupDate] = useState(''); // for group

    // Modal input fields
    const [rating, setRating] = useState(''); // 'below', 'met', 'exceeded'
    const [remark, setRemark] = useState('');

    // Init data
    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        dispatch(fetchPendingApprovals());
    };

    const onRefresh = async () => {
        setIsRefreshing(true);
        await dispatch(fetchPendingApprovals());
        setIsRefreshing(false);
    };

    // Live Searching Logic
    const getFilteredApprovals = () => {
        if (!searchQuery.trim()) return pendingApprovals;
        const q = searchQuery.toLowerCase();
        return pendingApprovals.map(grp => {
            const isUserMatch = (grp.user_name || '').toLowerCase().includes(q);
            const isDateMatch = (grp.work_date || '').toLowerCase().includes(q);
            if (isUserMatch || isDateMatch) {
                return grp;
            }
            // Scan nested records inside group
            const matchingEntries = grp.entries.filter(entry => 
                (entry.entry_type?.name || '').toLowerCase().includes(q) ||
                (entry.customer?.name || '').toLowerCase().includes(q) ||
                (entry.customer_project_name || '').toLowerCase().includes(q) ||
                (entry.description || '').toLowerCase().includes(q) ||
                (entry.module?.name || '').toLowerCase().includes(q) ||
                (entry.service?.name || '').toLowerCase().includes(q)
            );
            if (matchingEntries.length > 0) {
                return { ...grp, entries: matchingEntries };
            }
            return null;
        }).filter(x => x !== null);
    };

    // Logic Handlers
    const handleOpenApproveModal = (type, data) => {
        setTargetType(type);
        setRating('met'); // baseline expectation default
        setRemark('');
        
        if (type === 'single') {
            setSelectedId(data.id);
        } else {
            setSelectedGroupUser(data.user_name);
            setSelectedGroupDate(data.work_date);
        }
        setApprovalModalVisible(true);
    };

    const handleOpenRejectModal = (type, data) => {
        setTargetType(type);
        setRemark('');

        if (type === 'single') {
            setSelectedId(data.id);
        } else {
            setSelectedGroupUser(data.user_name);
            setSelectedGroupDate(data.work_date);
        }
        setRejectionModalVisible(true);
    };

    const submitApproval = () => {
        if (!rating || !remark.trim()) {
            Alert.alert('Mandatory Inputs', 'Please select a rating and enter a brief verification remark.');
            return;
        }

        if (targetType === 'single') {
            dispatch(approveWorklog({ id: selectedId, rating, remark }))
                .unwrap()
                .then(() => {
                    setApprovalModalVisible(false);
                    loadData();
                });
        } else {
            dispatch(approveWorklogGroup({ user_name: selectedGroupUser, work_date: selectedGroupDate, rating, remark }))
                .unwrap()
                .then(() => {
                    setApprovalModalVisible(false);
                    loadData();
                });
        }
    };

    const submitRejection = () => {
        if (!remark.trim()) {
            Alert.alert('Mandatory Inputs', 'Please type in a constructive reason for the rejection.');
            return;
        }

        if (targetType === 'single') {
            dispatch(rejectWorklog({ id: selectedId, remark }))
                .unwrap()
                .then(() => {
                    setRejectionModalVisible(false);
                    loadData();
                });
        } else {
            dispatch(rejectWorklogGroup({ user_name: selectedGroupUser, work_date: selectedGroupDate, remark }))
                .unwrap()
                .then(() => {
                    setRejectionModalVisible(false);
                    loadData();
                });
        }
    };

    // Display formatting kits
    const formatTime = (h, m) => `${parseInt(h || 0)}h ${parseInt(m || 0)}m`;
    const calculateGroupTime = (entries) => {
        const totalMin = entries.reduce((tot, e) => tot + (parseInt(e.hours || 0) * 60 + parseInt(e.minutes || 0)), 0);
        return formatTime(Math.floor(totalMin / 60), totalMin % 60);
    };

    const formatDate = (str) => {
        if (!str) return '';
        return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const renderRatingOption = (val, label) => (
        <TouchableOpacity
            style={[styles.radioOption, rating === val && styles.radioOptionActive]}
            onPress={() => setRating(val)}
        >
            <View style={[styles.radioDot, rating === val && styles.radioDotActive]}>
                {rating === val && <View style={styles.radioDotInner} />}
            </View>
            <Text style={[styles.radioLabel, rating === val && styles.radioLabelActive]}>{label}</Text>
        </TouchableOpacity>
    );

    // Renderer Component for individual Employee cards
    const renderGroupCard = ({ item }) => {
        const totalHoursDisplay = calculateGroupTime(item.entries);
        
        return (
            <View style={styles.groupCard}>
                {/* Metadata Head */}
                <View style={styles.groupCardHead}>
                    <View style={{ flex: 1 }}>
                        <View style={styles.avatarRow}>
                            <View style={styles.avatarBlock}>
                                <Text style={styles.avatarInitial}>{item.user_name?.charAt(0) || 'U'}</Text>
                            </View>
                            <View>
                                <Text style={styles.groupUserName}>{item.user_name}</Text>
                                <Text style={styles.groupDateStr}>{formatDate(item.work_date)}</Text>
                            </View>
                        </View>
                    </View>
                    
                    <View style={styles.badgeCol}>
                        <View style={[styles.headStatBadge, { backgroundColor: '#EEF2FF' }]}>
                            <Ionicons name="list" size={11} color="#4F46E5" />
                            <Text style={[styles.headStatBadgeTxt, { color: '#4F46E5' }]}>{item.entries.length} Entries</Text>
                        </View>
                        <View style={[styles.headStatBadge, { backgroundColor: '#ECFDF5' }]}>
                            <Ionicons name="time-outline" size={11} color="#059669" />
                            <Text style={[styles.headStatBadgeTxt, { color: '#059669' }]}>{totalHoursDisplay}</Text>
                        </View>
                    </View>
                </View>

                {/* Nested Task Rows */}
                <View style={styles.entriesListWrapper}>
                    {item.entries.map((work, index) => (
                        <View key={work.id} style={[styles.nestedEntryRow, index === item.entries.length - 1 && { borderBottomWidth: 0 }]}>
                            <View style={styles.entryMetaGrid}>
                                <View style={styles.metaCellLeft}>
                                    <Text style={styles.entryTypeName} numberOfLines={1}>
                                        {work.entry_type?.name || 'General'}
                                    </Text>
                                    <Text style={styles.entryContextStr} numberOfLines={1}>
                                        {work.customer?.name || 'N/A'} {work.customer_project_name ? `(${work.customer_project_name})` : ''}
                                    </Text>
                                </View>
                                <View style={styles.metaCellRight}>
                                    <Text style={styles.entryDurationVal}>{formatTime(work.hours, work.minutes)}</Text>
                                    <Text style={styles.entryModuleTxt}>{work.module?.name || work.service?.name || 'No Module'}</Text>
                                </View>
                            </View>

                            {work.description ? (
                                <View style={styles.descSpeechBubble}>
                                    <Text style={styles.descTextStr}>{work.description}</Text>
                                </View>
                            ) : null}

                            {/* Single Entry audit toolbar */}
                            <View style={styles.singleActionRow}>
                                <TouchableOpacity 
                                    style={[styles.singleBtn, styles.btnAccept]}
                                    onPress={() => handleOpenApproveModal('single', work)}
                                >
                                    <Ionicons name="checkmark-outline" size={14} color="#059669" />
                                    <Text style={[styles.singleBtnText, { color: '#059669' }]}>Approve</Text>
                                </TouchableOpacity>

                                <TouchableOpacity 
                                    style={[styles.singleBtn, styles.btnReject]}
                                    onPress={() => handleOpenRejectModal('single', work)}
                                >
                                    <Ionicons name="close-outline" size={14} color="#DC2626" />
                                    <Text style={[styles.singleBtnText, { color: '#DC2626' }]}>Reject</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Footer Date-Level bulk action button grouping */}
                <View style={styles.groupCardFooter}>
                    <Text style={styles.footerGroupTitle}>GROUP ACTIONS FOR DATE</Text>
                    <View style={styles.footerActionBox}>
                        <TouchableOpacity 
                            style={[styles.bulkGroupBtn, { backgroundColor: '#434AFA' }]}
                            onPress={() => handleOpenApproveModal('group', item)}
                        >
                            <Ionicons name="checkmark-done-outline" size={16} color="#FFF" />
                            <Text style={styles.bulkGroupBtnLabel}>Approve Group</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.bulkGroupBtn, { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FCA5A5' }]}
                            onPress={() => handleOpenRejectModal('group', item)}
                        >
                            <Ionicons name="ban-outline" size={15} color="#DC2626" />
                            <Text style={[styles.bulkGroupBtnLabel, { color: '#DC2626' }]}>Reject Group</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.screenWrapper}>
            <Header title="Timesheet Approvals" />

            {/* Full-Width Search Filter Bar */}
            <View style={styles.utilityDockBar}>
                <View style={styles.searchFormDock}>
                    <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                    <TextInput
                        style={styles.textInputControl}
                        placeholder="Search Team Timesheets by Name, Project, Tasks..."
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
            </View>

            {/* Loaders & Group View Engine */}
            {loading && pendingApprovals.length === 0 ? (
                <View style={styles.fullscreenLoading}>
                    <ActivityIndicator size="large" color="#434AFA" />
                    <Text style={styles.loadingText}>Scanning team timesheets...</Text>
                </View>
            ) : (
                <FlatList
                    data={getFilteredApprovals()}
                    keyExtractor={(item) => `${item.user_name}|${item.work_date}`}
                    renderItem={renderGroupCard}
                    contentContainerStyle={styles.scrollListContent}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#434AFA']} />}
                    ListEmptyComponent={
                        <View style={styles.emptyWrapper}>
                            <View style={styles.emptyCircle}>
                                <Ionicons name="ribbon-outline" size={48} color="#A5B4FC" />
                            </View>
                            <Text style={styles.emptyStrongTxt}>All Clear!</Text>
                            <Text style={styles.emptyMutedTxt}>No pending timesheets matching criteria.</Text>
                        </View>
                    }
                />
            )}

            {/* ==================================================== */}
            {/* DIALOG MODAL: Perform Approval */}
            {/* ==================================================== */}
            <Modal visible={approvalModalVisible} transparent animationType="fade">
                <View style={styles.dialogOverlay}>
                    <View style={styles.dialogSheet}>
                        <View style={[styles.dialogHeader, { backgroundColor: '#434AFA' }]}>
                            <Text style={styles.dialogTitle}>Approve Request</Text>
                            <TouchableOpacity onPress={() => setApprovalModalVisible(false)} disabled={actionLoading}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.dialogBody} keyboardShouldPersistTaps="handled">
                            <Text style={styles.fieldLabel}>PERFORMANCE RATING *</Text>
                            <View style={styles.radioGroupWrap}>
                                {renderRatingOption('below', 'Below Expectations')}
                                {renderRatingOption('met', 'Met Expectations')}
                                {renderRatingOption('exceeded', 'Exceeded Expectations')}
                            </View>

                            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>VERIFICATION NOTE / REMARK *</Text>
                            <TextInput
                                style={styles.noteBox}
                                multiline
                                numberOfLines={3}
                                placeholder="Briefly state any observations or confirmations..."
                                placeholderTextColor="#94A3B8"
                                value={remark}
                                onChangeText={setRemark}
                            />
                        </ScrollView>

                        <View style={styles.dialogFooter}>
                            <TouchableOpacity 
                                style={styles.btnDialogCancel}
                                onPress={() => setApprovalModalVisible(false)}
                                disabled={actionLoading}
                            >
                                <Text style={styles.btnDialogCancelTxt}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.btnDialogCommit, { backgroundColor: '#434AFA' }]}
                                onPress={submitApproval}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle-sharp" size={16} color="#FFF" />
                                        <Text style={styles.btnDialogCommitTxt}>Confirm Approve</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ==================================================== */}
            {/* DIALOG MODAL: Perform Rejection */}
            {/* ==================================================== */}
            <Modal visible={rejectionModalVisible} transparent animationType="fade">
                <View style={styles.dialogOverlay}>
                    <View style={styles.dialogSheet}>
                        <View style={[styles.dialogHeader, { backgroundColor: '#EF4444' }]}>
                            <Text style={styles.dialogTitle}>Reject Timesheet</Text>
                            <TouchableOpacity onPress={() => setRejectionModalVisible(false)} disabled={actionLoading}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.dialogBody} keyboardShouldPersistTaps="handled">
                            <Text style={styles.fieldLabel}>REJECTION REASON / REMARK *</Text>
                            <TextInput
                                style={[styles.noteBox, { borderColor: '#FCA5A5' }]}
                                multiline
                                numberOfLines={4}
                                placeholder="Describe precisely why these entries are rejected..."
                                placeholderTextColor="#94A3B8"
                                value={remark}
                                onChangeText={setRemark}
                            />
                        </ScrollView>

                        <View style={styles.dialogFooter}>
                            <TouchableOpacity 
                                style={styles.btnDialogCancel}
                                onPress={() => setRejectionModalVisible(false)}
                                disabled={actionLoading}
                            >
                                <Text style={styles.btnDialogCancelTxt}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={[styles.btnDialogCommit, { backgroundColor: '#EF4444' }]}
                                onPress={submitRejection}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="ban" size={15} color="#FFF" />
                                        <Text style={styles.btnDialogCommitTxt}>Confirm Reject</Text>
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
    screenWrapper: { flex: 1, backgroundColor: '#FFFFFF' },
    
    // Pure wide toolbar design
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
        paddingVertical: 10, 
        borderRadius: 8 
    },
    textInputControl: { flex: 1, fontSize: 13, color: '#1E293B', padding: 0 },

    // Base loaders & empty
    fullscreenLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#64748B', marginTop: 12, fontWeight: '600' },
    scrollListContent: { padding: 16, paddingBottom: 40 },
    
    emptyWrapper: { alignItems: 'center', justifyContent: 'center', paddingVertical: 100, paddingHorizontal: 32 },
    emptyCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
    emptyStrongTxt: { fontSize: 18, fontWeight: '800', color: '#312E81', marginTop: 20 },
    emptyMutedTxt: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 },

    // Group Card styling
    groupCard: { 
        backgroundColor: '#FFF', 
        borderRadius: 12, 
        marginBottom: 20, 
        overflow: 'hidden', 
        elevation: 3, 
        shadowColor: '#000', 
        shadowOpacity: 0.06,
        shadowOffset: { width: 0, height: 2 }
    },
    groupCardHead: { 
        flexDirection: 'row', 
        padding: 14, 
        borderBottomWidth: 1, 
        borderBottomColor: '#F1F5F9', 
        backgroundColor: '#FAFAFA', 
        alignItems: 'center'
    },
    avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarBlock: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#434AFA', justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    groupUserName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    groupDateStr: { fontSize: 11, color: '#64748B', marginTop: 1 },
    badgeCol: { gap: 4, alignItems: 'flex-end' },
    headStatBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 12 },
    headStatBadgeTxt: { fontSize: 10, fontWeight: '800' },

    // Nested Entries inside Card view
    entriesListWrapper: { paddingHorizontal: 14 },
    nestedEntryRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    entryMetaGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    metaCellLeft: { flex: 0.65 },
    metaCellRight: { flex: 0.35, alignItems: 'flex-end' },
    entryTypeName: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
    entryContextStr: { fontSize: 11, color: '#64748B', marginTop: 2 },
    entryDurationVal: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
    entryModuleTxt: { fontSize: 10, fontWeight: '700', color: '#4F46E5', marginTop: 2, textTransform: 'uppercase' },
    
    descSpeechBubble: { backgroundColor: '#F8FAFC', borderRadius: 6, padding: 10, marginTop: 10, borderWidth: 1, borderColor: '#EEF2FF' },
    descTextStr: { fontSize: 12, color: '#475569', fontStyle: 'italic', lineHeight: 17 },

    // Single row buttons
    singleActionRow: { flexDirection: 'row', gap: 10, marginTop: 12, justifyContent: 'flex-end' },
    singleBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 4, 
        paddingHorizontal: 12, 
        paddingVertical: 6, 
        borderRadius: 6 
    },
    btnAccept: { backgroundColor: '#ECFDF5' },
    btnReject: { backgroundColor: '#FEF2F2' },
    singleBtnText: { fontSize: 11, fontWeight: '800' },

    // Group footer toolbar
    groupCardFooter: { backgroundColor: '#FAFAFA', padding: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    footerGroupTitle: { fontSize: 9, fontWeight: '800', color: '#94A3B8', letterSpacing: 0.8, marginBottom: 10 },
    footerActionBox: { flexDirection: 'row', gap: 12 },
    bulkGroupBtn: { 
        flex: 1, 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: 6, 
        paddingVertical: 10, 
        borderRadius: 8 
    },
    bulkGroupBtnLabel: { color: '#FFF', fontWeight: '800', fontSize: 12 },

    // Modals Sheet popup general
    dialogOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    dialogSheet: { backgroundColor: '#FFF', width: '90%', borderRadius: 12, overflow: 'hidden', elevation: 10 },
    dialogHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
    dialogTitle: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    dialogBody: { padding: 16, maxHeight: 400 },
    dialogFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 12 },
    
    fieldLabel: { fontSize: 11, fontWeight: '800', color: '#64748B', letterSpacing: 0.5, marginBottom: 8 },
    noteBox: { 
        borderWidth: 1.5, 
        borderColor: '#CBD5E1', 
        borderRadius: 8, 
        padding: 12, 
        fontSize: 13, 
        color: '#1E293B', 
        minHeight: 80, 
        textAlignVertical: 'top', 
        backgroundColor: '#FAFAFA' 
    },

    btnDialogCancel: { flex: 0.4, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, justifyContent: 'center', alignItems: 'center', height: 44 },
    btnDialogCancelTxt: { color: '#64748B', fontWeight: '700', fontSize: 13 },
    btnDialogCommit: { 
        flex: 0.6, 
        borderRadius: 6, 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        gap: 8, 
        height: 44 
    },
    btnDialogCommitTxt: { color: '#FFF', fontWeight: '800', fontSize: 13 },

    // Radio option select
    radioGroupWrap: { gap: 8 },
    radioOption: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 12, 
        borderWidth: 1.5, 
        borderColor: '#E2E8F0', 
        borderRadius: 8, 
        gap: 10,
        backgroundColor: '#FCFCFD'
    },
    radioOptionActive: { borderColor: '#818CF8', backgroundColor: '#EEF2FF' },
    radioDot: { 
        width: 16, 
        height: 16, 
        borderRadius: 8, 
        borderWidth: 2, 
        borderColor: '#CBD5E1', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    radioDotActive: { borderColor: '#4F46E5' },
    radioDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4F46E5' },
    radioLabel: { fontSize: 13, fontWeight: '700', color: '#475569' },
    radioLabelActive: { color: '#312E81' }
});

export default WorklogApprovalsScreen;
