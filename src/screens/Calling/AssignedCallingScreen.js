import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Modal,
    TextInput,
    ScrollView,
    Alert,
    Linking
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../api/client';
import Header from '../../components/Header';

const AssignedCallingScreen = () => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();

    // Collections
    const [callings, setCallings] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Interactions
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('card'); 
    const [lastSyncedAt, setLastSyncedAt] = useState('--');

    // Filters state
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterOptions, setFilterOptions] = useState({ campaigns: [], owners: [], states: [], cities: [] });
    const [filters, setFilters] = useState({ campaign_id: '', current_owner_id: '', state_name: '', city_name: '' });
    const [activeFiltersCount, setActiveFiltersCount] = useState(0);

    // Reassignment state
    const [reassignModalVisible, setReassignModalVisible] = useState(false);
    const [targetPivotItem, setTargetPivotItem] = useState(null);
    const [reassignQuery, setReassignQuery] = useState('');
    const [submittingReassign, setSubmittingReassign] = useState(false);

    useEffect(() => {
        if (isFocused) {
            fetchAssignedFilterOptions();
            loadAssignedCallings(1, false);
        }
    }, [isFocused]);

    const fetchAssignedFilterOptions = async () => {
        try {
            const res = await api.get('/calling/assigned-filters');
            setFilterOptions(res.data || { campaigns: [], owners: [], states: [], cities: [] });
        } catch (err) {
            console.log('Failed loading Assigned specific filters:', err);
        }
    };

    const loadAssignedCallings = async (pageNumber = 1, refresh = false, activeFilters = filters, term = searchQuery) => {
        if (refresh) setRefreshing(true);
        else setLoading(true);

        try {
            const params = {
                page: pageNumber,
                per_page: 10,
                search: term.trim(),
                ...activeFilters
            };

            const res = await api.get('/calling/assigned-calls', { params });
            const { data, current_page, last_page, total } = res.data;

            setCallings(data || []);
            setPagination({
                current_page: current_page || 1,
                last_page: last_page || 1,
                total: total || 0
            });

            const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setLastSyncedAt(timeString);

            let count = 0;
            if (term.trim()) count++;
            if (activeFilters.campaign_id) count++;
            if (activeFilters.current_owner_id) count++;
            if (activeFilters.state_name) count++;
            if (activeFilters.city_name) count++;
            setActiveFiltersCount(count);

        } catch (err) {
            console.log('Failed extracting Assigned calls:', err);
            Alert.alert('Extraction Halted', 'Validation with assigned database scopes failed.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const triggerReassignFlow = (item) => {
        setTargetPivotItem(item);
        setReassignQuery('');
        setReassignModalVisible(true);
    };

    const executeReassignment = async (agent) => {
        if (!targetPivotItem) return;

        Alert.alert(
            'Authorize Reallocation',
            `Rewire assigned ownership of this lead from ${targetPivotItem.current_owner_name || 'Current'} to ${agent.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Re-delegate Lead',
                    onPress: async () => {
                        setSubmittingReassign(true);
                        try {
                            const res = await api.post('/calling/assigned/reassign', {
                                pivot_id: targetPivotItem.pivot_id,
                                new_user_id: agent.id
                            });

                            if (res.data.success) {
                                Alert.alert('Assignment Updated', res.data.message);
                                setReassignModalVisible(false);
                                setTargetPivotItem(null);
                                loadAssignedCallings(pagination.current_page, false);
                            }
                        } catch (err) {
                            Alert.alert('Protocol Reject', 'Server dismissed assigned reallocation.');
                        } finally {
                            setSubmittingReassign(false);
                        }
                    }
                }
            ]
        );
    };

    const triggerHistoryViewer = (item) => {
        navigation.navigate('CallingRemark', { 
            callingId: item.id, 
            campaignId: item.calling_campaign_id,
            readOnly: true
        });
    };

    const handleSearchSubmit = () => {
        loadAssignedCallings(1, false);
    };

    const handleRefresh = () => {
        loadAssignedCallings(1, true);
    };

    const handleApplyFilters = (compiledFilters) => {
        setFilters(compiledFilters);
        setFilterModalVisible(false);
        loadAssignedCallings(1, false, compiledFilters);
    };

    const handleClearFilters = () => {
        const blank = { campaign_id: '', current_owner_id: '', state_name: '', city_name: '' };
        setFilters(blank);
        setFilterModalVisible(false);
        loadAssignedCallings(1, false, blank);
    };

    const renderTopStats = () => {
        const statsSet = [
            { label: 'Assigned Out', val: pagination.total, tint: '#8B5CF6', icon: 'share-social-outline' },
            { label: 'Filtering', val: activeFiltersCount, tint: '#F59E0B', icon: 'funnel-outline' },
            { label: 'Refreshed', val: lastSyncedAt, tint: '#10B981', icon: 'sync-outline' }
        ];

        return (
            <View style={styles.topPanel}>
                {statsSet.map((s, index) => (
                    <View key={index} style={styles.summaryCard}>
                        <View style={[styles.iconCap, { backgroundColor: s.tint + '15' }]}>
                            <Ionicons name={s.icon} size={16} color={s.tint} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.summaryVal} numberOfLines={1}>{s.val}</Text>
                            <Text style={styles.summaryLabel} numberOfLines={1}>{s.label}</Text>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const renderDynamicBadge = (statusName) => {
        if (!statusName) return <Text style={styles.naDash}>Unprocessed</Text>;
        let hue = '#8B5CF6';
        const raw = statusName.toLowerCase();
        if (raw.includes('interested')) hue = '#10B981';
        if (raw.includes('follow')) hue = '#F97316';
        if (raw.includes('busy') || raw.includes('no answer')) hue = '#6B7280';
        if (raw.includes('junk') || raw.includes('reject')) hue = '#EF4444';

        return (
            <View style={[styles.badgeFill, { backgroundColor: hue + '12' }]}>
                <Text style={[styles.badgeTxt, { color: hue }]}>{statusName}</Text>
            </View>
        );
    };

    const renderCard = ({ item }) => (
        <View style={styles.itemCard}>
            <View style={styles.itemCardHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.leadNameTxt} numberOfLines={1}>{item.name || 'Unnamed Lead'}</Text>
                    <Text style={styles.campaignLabelText}>
                        <Ionicons name="megaphone-outline" size={10} color="#64748B" /> {item.campaign_name || 'No Group'}
                    </Text>
                </View>
                {renderDynamicBadge(item.calling_type_name)}
            </View>

            <View style={styles.itemCardBody}>
                <View style={styles.ownerRowContainer}>
                    <View style={styles.ownerPill}>
                        <Ionicons name="paper-plane-outline" size={13} color="#7C3AED" />
                        <Text style={styles.ownerPillLabel}>Allocated To: <Text style={{fontWeight: '800'}}>{item.current_owner_name || 'System Agent'}</Text></Text>
                    </View>
                </View>

                <View style={styles.dataRow}>
                    <Ionicons name="business-outline" size={14} color="#64748B" style={styles.inlineIcon} />
                    <Text style={styles.inlineText} numberOfLines={1}>{item.company_name || 'Company missing'}</Text>
                </View>
                <View style={styles.dataRow}>
                    <Ionicons name="call-outline" size={14} color="#64748B" style={styles.inlineIcon} />
                    <Text style={[styles.inlineText, { color: '#7C3AED', fontWeight: '700' }]} onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}>
                        {item.phone || 'No Contact'}
                    </Text>
                </View>
                <View style={styles.dataRow}>
                    <Ionicons name="location-outline" size={14} color="#64748B" style={styles.inlineIcon} />
                    <Text style={styles.inlineText} numberOfLines={1}>
                        {[item.city, item.state].filter(Boolean).join(', ') || 'Region unset'}
                    </Text>
                </View>

                {item.latest_remark_text && (
                    <View style={styles.remarkBoxContainer}>
                        <Text style={styles.remarkHeaderLabel}>Last Interaction Remarks:</Text>
                        <Text style={styles.remarkContentBody} numberOfLines={2}>{item.latest_remark_text}</Text>
                    </View>
                )}
            </View>

            <View style={styles.itemCardFooter}>
                <TouchableOpacity style={[styles.footBtn, styles.footBtnInspect]} onPress={() => triggerHistoryViewer(item)}>
                    <Ionicons name="book-outline" size={13} color="#4B5563" />
                    <Text style={styles.inspectBtnTxt}>Audit Timeline</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={[styles.footBtn, styles.footBtnReassign]} onPress={() => triggerReassignFlow(item)}>
                    <Ionicons name="arrow-forward-circle-outline" size={14} color="#FFF" />
                    <Text style={styles.reassignBtnTxt}>Shift Ownership</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTableHeader = () => (
        <View style={styles.tableHeaderContainer}>
            <View style={{ width: 130 }}><Text style={styles.thTxt}>Lead Name</Text></View>
            <View style={{ width: 110 }}><Text style={styles.thTxt}>Current Owner</Text></View>
            <View style={{ width: 110 }}><Text style={styles.thTxt}>Lead Status</Text></View>
            <View style={{ width: 110 }}><Text style={styles.thTxt}>Phone</Text></View>
            <View style={{ width: 130 }}><Text style={styles.thTxt}>Latest Notes</Text></View>
            <View style={{ width: 130, alignItems: 'center' }}><Text style={styles.thTxt}>Management</Text></View>
        </View>
    );

    const renderTableRow = ({ item }) => (
        <View style={styles.tableRowItem}>
            <Text style={[styles.tdTxt, { width: 130 }]} numberOfLines={1}>{item.name || '-'}</Text>
            <Text style={[styles.tdTxt, { width: 110, fontWeight: '600' }]} numberOfLines={1}>{item.current_owner_name || '-'}</Text>
            <View style={{ width: 110, justifyContent: 'center' }}>
                {renderDynamicBadge(item.calling_type_name)}
            </View>
            <Text 
                style={[styles.tdTxt, { width: 110, color: '#7C3AED', fontWeight: '600' }]} 
                numberOfLines={1}
                onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
            >
                {item.phone || '-'}
            </Text>
            <Text style={[styles.tdTxt, { width: 130 }]} numberOfLines={1}>{item.latest_remark_text || '-'}</Text>
            
            <View style={{ width: 130, flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
                <TouchableOpacity style={styles.miniActBtn} onPress={() => triggerHistoryViewer(item)}>
                    <Ionicons name="book" size={15} color="#4B5563" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.miniActBtn, { backgroundColor: '#7C3AED' }]} onPress={() => triggerReassignFlow(item)}>
                    <Ionicons name="arrow-forward-circle" size={16} color="#FFF" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const PagingWidget = () => (
        <View style={styles.pagerContainer}>
            <TouchableOpacity
                disabled={pagination.current_page === 1 || loading}
                style={[styles.pagerBtn, pagination.current_page === 1 && styles.pagerBtnDisabled]}
                onPress={() => loadAssignedCallings(pagination.current_page - 1)}
            >
                <Ionicons name="chevron-back" size={18} color={pagination.current_page === 1 ? '#94A3B8' : '#1E293B'} />
            </TouchableOpacity>
            <Text style={styles.pagerLabel}>Page {pagination.current_page} of {pagination.last_page}</Text>
            <TouchableOpacity
                disabled={pagination.current_page === pagination.last_page || loading}
                style={[styles.pagerBtn, pagination.current_page === pagination.last_page && styles.pagerBtnDisabled]}
                onPress={() => loadAssignedCallings(pagination.current_page + 1)}
            >
                <Ionicons name="chevron-forward" size={18} color={pagination.current_page === pagination.last_page ? '#94A3B8' : '#1E293B'} />
            </TouchableOpacity>
        </View>
    );

    const filteredAgentsList = (filterOptions.owners || []).filter(a => 
        a.name && a.name.toLowerCase().includes(reassignQuery.toLowerCase())
    );

    const renderFilterSelectorScroll = (label, propertyKey, dataset, displayKey = null) => {
        return (
            <View style={styles.criteriaGroup}>
                <Text style={styles.criteriaTitle}>{label}</Text>
                <View style={styles.chipsRowWrap}>
                    <TouchableOpacity 
                        style={[styles.criteriaChip, !filters[propertyKey] && styles.criteriaChipActive]}
                        onPress={() => setFilters({ ...filters, [propertyKey]: '' })}
                    >
                        <Text style={[styles.criteriaChipText, !filters[propertyKey] && styles.criteriaChipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {(dataset || []).map((entry, idx) => {
                        const value = typeof entry === 'object' ? entry.id : entry;
                        const name = typeof entry === 'object' ? entry[displayKey || 'name'] : entry;
                        const isAct = filters[propertyKey] === value;
                        return (
                            <TouchableOpacity 
                                key={idx}
                                style={[styles.criteriaChip, isAct && styles.criteriaChipActive]}
                                onPress={() => setFilters({ ...filters, [propertyKey]: value })}
                            >
                                <Text style={[styles.criteriaChipText, isAct && styles.criteriaChipTextActive]}>{name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.baseView}>
            <Header title="Assigned Scope" />

            {renderTopStats()}

            <View style={styles.utilityToolbar}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={16} color="#94A3B8" />
                    <TextInput
                        style={styles.searchFieldInput}
                        placeholder="Scan assigned leads or owners..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearchSubmit}
                        returnKeyType="search"
                    />
                </View>

                <View style={styles.toggleCapsule}>
                    <TouchableOpacity 
                        style={[styles.modeToggle, viewMode === 'card' && styles.modeToggleActive]} 
                        onPress={() => setViewMode('card')}
                    >
                        <Ionicons name="grid-outline" size={15} color={viewMode === 'card' ? '#FFF' : '#4B5563'} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.modeToggle, viewMode === 'table' && styles.modeToggleActive]} 
                        onPress={() => setViewMode('table')}
                    >
                        <Ionicons name="list" size={15} color={viewMode === 'table' ? '#FFF' : '#4B5563'} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={[styles.triggerFilterIcon, activeFiltersCount > 0 && styles.triggerFilterIconActive]} 
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons name="funnel" size={15} color={activeFiltersCount > 0 ? '#FFF' : '#7C3AED'} />
                </TouchableOpacity>
            </View>

            {loading && pagination.current_page === 1 && !refreshing ? (
                <View style={styles.busyContainer}>
                    <ActivityIndicator size="large" color="#7C3AED" />
                    <Text style={styles.busyText}>Restructuring delegated logs...</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {viewMode === 'card' ? (
                        <FlatList
                            data={callings}
                            keyExtractor={(item, idx) => `${item.id}-${item.pivot_id || idx}`}
                            renderItem={renderCard}
                            contentContainerStyle={styles.scrollerLayout}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                            ListEmptyComponent={
                                <View style={styles.emptyPanel}>
                                    <Ionicons name="paper-plane-outline" size={56} color="#CBD5E1" />
                                    <Text style={styles.emptyHeadline}>No Outward Allocations</Text>
                                    <Text style={styles.emptySubline}>You haven't assigned active campaign assets to other team accounts yet.</Text>
                                </View>
                            }
                        />
                    ) : (
                        <ScrollView horizontal bounces={false}>
                            <View>
                                {renderTableHeader()}
                                <FlatList
                                    data={callings}
                                    keyExtractor={(item, idx) => `${item.id}-${item.pivot_id || idx}`}
                                    renderItem={renderTableRow}
                                    contentContainerStyle={{ paddingBottom: 80 }}
                                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                                    ListEmptyComponent={
                                        <View style={[styles.emptyPanel, { width: 400 }]}>
                                            <Text style={styles.emptyHeadline}>Assigned List Empty</Text>
                                        </View>
                                    }
                                />
                            </View>
                        </ScrollView>
                    )}
                    {callings.length > 0 && <PagingWidget />}
                </View>
            )}

            {/* FILTER DRAWER */}
            <Modal visible={filterModalVisible} transparent animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
                <View style={styles.dialogWrapper}>
                    <View style={styles.sheetPanel}>
                        <View style={styles.sheetTopBar}>
                            <Text style={styles.sheetTitle}>Segment Outsourced Assets</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 16 }}>
                            {renderFilterSelectorScroll("Destination Holder", "current_owner_id", filterOptions.owners)}
                            {renderFilterSelectorScroll("Origin Campaign", "campaign_id", filterOptions.campaigns)}
                            {renderFilterSelectorScroll("Territory States", "state_name", filterOptions.states)}
                            {renderFilterSelectorScroll("Designated Cities", "city_name", filterOptions.cities)}
                        </ScrollView>

                        <View style={styles.sheetFooter}>
                            <TouchableOpacity style={[styles.footBtnAction, styles.footBtnClear]} onPress={handleClearFilters}>
                                <Text style={styles.footBtnTxtClear}>Wipe Matrix</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.footBtnAction, styles.footBtnApply]} onPress={() => handleApplyFilters(filters)}>
                                <Text style={styles.footBtnTxtApply}>Commit Schema</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ASSIGNMENT HANDOVER DRAWER */}
            <Modal visible={reassignModalVisible} transparent animationType="slide" onRequestClose={() => setReassignModalVisible(false)}>
                <View style={styles.dialogWrapper}>
                    <View style={[styles.sheetPanel, { height: '70%' }]}>
                        <View style={styles.sheetTopBar}>
                            <View>
                                <Text style={styles.sheetTitle}>Redirect Assigned Channel</Text>
                                <Text style={styles.sheetSubtitle}>Target new account below</Text>
                            </View>
                            <TouchableOpacity disabled={submittingReassign} onPress={() => setReassignModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>

                        <View style={{ padding: 16, paddingBottom: 4 }}>
                            <View style={styles.subSearch}>
                                <Ionicons name="search" size={14} color="#94A3B8" />
                                <TextInput
                                    style={styles.subSearchInput}
                                    placeholder="Search available handlers..."
                                    value={reassignQuery}
                                    onChangeText={setReassignQuery}
                                />
                            </View>
                        </View>

                        {submittingReassign ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="large" color="#7C3AED" />
                                <Text style={{ marginTop: 8, color: '#64748B', fontSize: 12 }}>Recommiting alignment parameters...</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={filteredAgentsList}
                                keyExtractor={a => String(a.id)}
                                contentContainerStyle={{ padding: 16 }}
                                renderItem={({ item }) => {
                                    const isCurrent = targetPivotItem && targetPivotItem.current_owner_id === item.id;
                                    return (
                                        <TouchableOpacity 
                                            style={[styles.agentSelectItem, isCurrent && styles.agentSelectItemActive]} 
                                            disabled={isCurrent}
                                            onPress={() => executeReassignment(item)}
                                        >
                                            <Ionicons name="person-circle" size={24} color={isCurrent ? '#94A3B8' : '#7C3AED'} />
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={[styles.agentSelectName, isCurrent && { color: '#94A3B8' }]}>{item.name}</Text>
                                                {isCurrent && <Text style={styles.activeAgentSub}>Currently Holding</Text>}
                                            </View>
                                            {!isCurrent && <Ionicons name="chevron-forward" size={16} color="#CBD5E1" />}
                                        </TouchableOpacity>
                                    );
                                }}
                                ListEmptyComponent={
                                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                                        <Text style={{ color: '#94A3B8', fontSize: 12.5 }}>No available personnel matched.</Text>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    baseView: { flex: 1, backgroundColor: '#FFFFFF' },
    
    topPanel: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 12, gap: 8 },
    summaryCard: {
        flex: 1, backgroundColor: '#FFF', padding: 10, borderRadius: 10, elevation: 1.5,
        flexDirection: 'row', alignItems: 'center', gap: 8
    },
    iconCap: { width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    summaryVal: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
    summaryLabel: { fontSize: 8.5, fontWeight: '600', color: '#64748B', marginTop: 1 },

    utilityToolbar: { flexDirection: 'row', paddingHorizontal: 12, marginVertical: 12, gap: 8, alignItems: 'center' },
    searchContainer: {
        flex: 1, height: 38, backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0',
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, elevation: 0.5
    },
    searchFieldInput: { flex: 1, marginLeft: 6, fontSize: 13, color: '#1E293B', padding: 0 },
    toggleCapsule: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 6, padding: 2, borderWidth: 1, borderColor: '#E2E8F0' },
    modeToggle: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
    modeToggleActive: { backgroundColor: '#7C3AED' },
    triggerFilterIcon: { width: 36, height: 36, backgroundColor: '#F5F3FF', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    triggerFilterIconActive: { backgroundColor: '#7C3AED' },

    scrollerLayout: { paddingHorizontal: 12, paddingBottom: 80 },
    itemCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 1 },
    itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
    leadNameTxt: { fontSize: 14.5, fontWeight: '700', color: '#1E293B' },
    campaignLabelText: { fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 2 },
    
    badgeFill: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 4 },
    badgeTxt: { fontSize: 9, fontWeight: '800' },
    naDash: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },

    itemCardBody: { paddingTop: 8 },
    ownerRowContainer: { marginBottom: 8 },
    ownerPill: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, backgroundColor: '#F5F3FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
    ownerPillLabel: { fontSize: 10.5, color: '#7C3AED', fontWeight: '600' },

    dataRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    inlineIcon: { marginRight: 6, width: 14 },
    inlineText: { fontSize: 12.5, color: '#4B5563', flex: 1 },
    remarkBoxContainer: { marginTop: 6, backgroundColor: '#FAF9FF', padding: 8, borderRadius: 6, borderLeftWidth: 2, borderLeftColor: '#DDD6FE' },
    remarkHeaderLabel: { fontSize: 9.5, color: '#6D28D9', fontWeight: '700', marginBottom: 1 },
    remarkContentBody: { fontSize: 11.5, color: '#4C1D95', fontStyle: 'italic', lineHeight: 15 },

    itemCardFooter: {
        flexDirection: 'row', gap: 10,
        marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9'
    },
    footBtn: { flex: 1, height: 34, borderRadius: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
    footBtnInspect: { backgroundColor: '#F3F4F6' },
    footBtnReassign: { backgroundColor: '#7C3AED' },
    inspectBtnTxt: { fontSize: 12, color: '#4B5563', fontWeight: '700' },
    reassignBtnTxt: { fontSize: 12, color: '#FFF', fontWeight: '700' },

    tableHeaderContainer: { flexDirection: 'row', backgroundColor: '#F5F3FF', paddingVertical: 10, paddingHorizontal: 10 },
    thTxt: { fontSize: 11, fontWeight: '700', color: '#5B21B6' },
    tableRowItem: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 10 },
    tdTxt: { fontSize: 12.5, color: '#334155', alignSelf: 'center', paddingRight: 5 },
    miniActBtn: { padding: 5, borderRadius: 4, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB' },

    pagerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    pagerBtn: { padding: 6, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, marginHorizontal: 12 },
    pagerBtnDisabled: { opacity: 0.35 },
    pagerLabel: { fontSize: 12.5, fontWeight: '700', color: '#334155' },

    busyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    busyText: { marginTop: 8, color: '#64748B', fontSize: 12 },
    emptyPanel: { flex: 1, alignItems: 'center', marginTop: 70, paddingHorizontal: 32 },
    emptyHeadline: { fontSize: 15, fontWeight: '800', color: '#4B5563', marginTop: 10 },
    emptySubline: { fontSize: 11.5, color: '#94A3B8', textAlign: 'center', marginTop: 4, lineHeight: 17 },

    dialogWrapper: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheetPanel: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%' },
    sheetTopBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    sheetTitle: { fontSize: 15.5, fontWeight: '800', color: '#1E293B' },
    sheetSubtitle: { fontSize: 11, color: '#64748B', fontWeight: '600', marginTop: 1 },
    
    criteriaGroup: { marginBottom: 16 },
    criteriaTitle: { fontSize: 12, fontWeight: '700', color: '#4B5563', marginBottom: 8 },
    chipsRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    criteriaChip: { backgroundColor: '#F9FAFB', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    criteriaChipActive: { backgroundColor: '#F5F3FF', borderColor: '#7C3AED' },
    criteriaChipText: { fontSize: 11, color: '#4B5563', fontWeight: '600' },
    criteriaChipTextActive: { color: '#7C3AED', fontWeight: '800' },

    sheetFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10 },
    footBtnAction: { flex: 1, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    footBtnClear: { backgroundColor: '#F3F4F6' },
    footBtnApply: { backgroundColor: '#7C3AED' },
    footBtnTxtClear: { color: '#4B5563', fontWeight: '700', fontSize: 12.5 },
    footBtnTxtApply: { color: '#FFF', fontWeight: '700', fontSize: 12.5 },

    subSearch: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, paddingHorizontal: 10, height: 36 },
    subSearchInput: { flex: 1, padding: 0, marginLeft: 6, fontSize: 12.5, color: '#1E293B' },
    
    agentSelectItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    agentSelectItemActive: { opacity: 0.6 },
    agentSelectName: { fontSize: 13.5, fontWeight: '700', color: '#1E293B' },
    activeAgentSub: { fontSize: 10.5, color: '#94A3B8', fontWeight: '600', marginTop: 1 }
});

export default AssignedCallingScreen;
