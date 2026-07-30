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

const JunkCallingScreen = () => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();

    // Collections & Logic States
    const [callings, setCallings] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Interaction controllers
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('card'); 
    const [lastSyncedAt, setLastSyncedAt] = useState('--');

    // Dynamic action state (Restore / Erase triggers)
    const [actionLoadingId, setActionLoadingId] = useState(null);

    // Filtering systems
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterOptions, setFilterOptions] = useState({ campaigns: [], states: [], cities: [] });
    const [filters, setFilters] = useState({ campaign_id: '', state_name: '', city_name: '' });
    const [activeFiltersCount, setActiveFiltersCount] = useState(0);

    useEffect(() => {
        if (isFocused) {
            fetchJunkFilterOptions();
            loadJunkCallings(1, false);
        }
    }, [isFocused]);

    const fetchJunkFilterOptions = async () => {
        try {
            const res = await api.get('/calling/junk-filters');
            setFilterOptions(res.data || { campaigns: [], states: [], cities: [] });
        } catch (err) {
            console.log('Failed loading Junk specific filters:', err);
        }
    };

    const loadJunkCallings = async (pageNumber = 1, refresh = false, activeFilters = filters, term = searchQuery) => {
        if (refresh) setRefreshing(true);
        else setLoading(true);

        try {
            const params = {
                page: pageNumber,
                per_page: 10,
                search: term.trim(),
                ...activeFilters
            };

            const res = await api.get('/calling/junk-calls', { params });
            const { data, current_page, last_page, total } = res.data;

            setCallings(data || []);
            setPagination({
                current_page: current_page || 1,
                last_page: last_page || 1,
                total: total || 0
            });

            // Sync timestamp mark
            const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setLastSyncedAt(timeString);

            // Compute applied boundaries count
            let count = 0;
            if (term.trim()) count++;
            if (activeFilters.campaign_id) count++;
            if (activeFilters.state_name) count++;
            if (activeFilters.city_name) count++;
            setActiveFiltersCount(count);

        } catch (err) {
            console.log('Failed extracting Junk repository:', err);
            Alert.alert('Load Interrupt', 'Secure connection with Junk collections failed.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const triggerRestoreLead = (item) => {
        Alert.alert(
            'Confirm Restoration',
            'This will remove the Junk flag and push the lead back to the standard tele-calling lifecycle. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Recover Lead',
                    onPress: async () => {
                        setActionLoadingId(item.pivot_id);
                        try {
                            const res = await api.post(`/calling/junk/${item.pivot_id}/restore`);
                            if (res.data.success) {
                                Alert.alert('Recovered', 'Lead has returned into active caller maps.');
                                loadJunkCallings(pagination.current_page, false);
                                fetchJunkFilterOptions();
                            }
                        } catch (err) {
                            Alert.alert('Failed', 'Recovery handler failed.');
                        } finally {
                            setActionLoadingId(null);
                        }
                    }
                }
            ]
        );
    };

    const triggerPurgeLead = (item) => {
        Alert.alert(
            'Destructive Action',
            'Warning: This permanently deletes this specific assignment, all associated remarks, and the base contact itself if unmapped elsewhere. This action is irrevocable. Proceed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Purge Forever',
                    style: 'destructive',
                    onPress: async () => {
                        setActionLoadingId(item.pivot_id);
                        try {
                            const res = await api.delete(`/calling/junk/${item.pivot_id}`);
                            if (res.data.success) {
                                Alert.alert('Purged', 'Lead footprint destroyed.');
                                loadJunkCallings(1, false);
                                fetchJunkFilterOptions();
                            }
                        } catch (err) {
                            Alert.alert('Failure', 'Erase processing failed.');
                        } finally {
                            setActionLoadingId(null);
                        }
                    }
                }
            ]
        );
    };

    const handleSearchSubmit = () => {
        loadJunkCallings(1, false);
    };

    const handleRefresh = () => {
        loadJunkCallings(1, true);
    };

    const handleApplyFilters = (compiledFilters) => {
        setFilters(compiledFilters);
        setFilterModalVisible(false);
        loadJunkCallings(1, false, compiledFilters);
    };

    const handleClearFilters = () => {
        const blank = { campaign_id: '', state_name: '', city_name: '' };
        setFilters(blank);
        setFilterModalVisible(false);
        loadJunkCallings(1, false, blank);
    };

    const renderTopStats = () => {
        const statsSet = [
            { label: 'Total Junk', val: pagination.total, tint: '#EF4444', icon: 'trash-bin-outline' },
            { label: 'Filtered', val: activeFiltersCount, tint: '#F59E0B', icon: 'funnel-outline' },
            { label: 'Synced', val: lastSyncedAt, tint: '#10B981', icon: 'sync-outline' }
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

    const renderCard = ({ item }) => {
        const isProcessing = actionLoadingId === item.pivot_id;
        return (
            <View style={styles.itemCard}>
                <View style={styles.itemCardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.leadNameTxt} numberOfLines={1}>{item.name || 'Unnamed Rejected Entity'}</Text>
                        <Text style={styles.campaignLabelText}>
                            <Ionicons name="megaphone-outline" size={10} color="#64748B" /> {item.campaign_name || 'Independent Pool'}
                        </Text>
                    </View>
                    <View style={styles.badgeFill}>
                        <Text style={styles.badgeTxt}>JUNKED</Text>
                    </View>
                </View>

                <View style={styles.itemCardBody}>
                    <View style={styles.dataRow}>
                        <Ionicons name="business-outline" size={13} color="#64748B" style={styles.inlineIcon} />
                        <Text style={styles.inlineText} numberOfLines={1}>{item.company_name || 'Company Name Unrecorded'}</Text>
                    </View>
                    <View style={styles.dataRow}>
                        <Ionicons name="call-outline" size={13} color="#64748B" style={styles.inlineIcon} />
                        <Text style={[styles.inlineText, { color: '#434AFA', fontWeight: '600' }]} onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}>
                            {item.phone || 'Phone missing'}
                        </Text>
                    </View>
                    <View style={styles.dataRow}>
                        <Ionicons name="person-outline" size={13} color="#64748B" style={styles.inlineIcon} />
                        <Text style={styles.inlineText} numberOfLines={1}>Owner Agent: <Text style={{ fontWeight: '700', color: '#334155' }}>{item.agent_name || 'System Unassigned'}</Text></Text>
                    </View>
                    <View style={styles.dataRow}>
                        <Ionicons name="location-outline" size={13} color="#64748B" style={styles.inlineIcon} />
                        <Text style={styles.inlineText} numberOfLines={1}>
                            {[item.city, item.state].filter(Boolean).join(', ') || 'Locality Unregistered'}
                        </Text>
                    </View>

                    {item.latest_remark_text && (
                        <View style={styles.remarkBoxContainer}>
                            <Text style={styles.remarkHeaderLabel}>Junk Justification / Memo:</Text>
                            <Text style={styles.remarkContentBody} numberOfLines={2}>{item.latest_remark_text}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.itemCardFooter}>
                    {isProcessing ? (
                        <View style={{ flex: 1, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color="#EF4444" />
                        </View>
                    ) : (
                        <>
                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnRestore]} onPress={() => triggerRestoreLead(item)}>
                                <Ionicons name="arrow-undo" size={13} color="#059669" />
                                <Text style={styles.actionLabelRestore}>Restore</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPurge]} onPress={() => triggerPurgeLead(item)}>
                                <Ionicons name="trash-outline" size={13} color="#DC2626" />
                                <Text style={styles.actionLabelPurge}>Purge Trace</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

    const renderTableHeader = () => (
        <View style={styles.tableHeaderContainer}>
            <View style={{ width: 130 }}><Text style={styles.thTxt}>Lead Name</Text></View>
            <View style={{ width: 120 }}><Text style={styles.thTxt}>Campaign</Text></View>
            <View style={{ width: 110 }}><Text style={styles.thTxt}>Owner Agent</Text></View>
            <View style={{ width: 110 }}><Text style={styles.thTxt}>Contact</Text></View>
            <View style={{ width: 140 }}><Text style={styles.thTxt}>Remarks / Memo</Text></View>
            <View style={{ width: 160, alignItems: 'center' }}><Text style={styles.thTxt}>Actions</Text></View>
        </View>
    );

    const renderTableRow = ({ item }) => {
        const isProcessing = actionLoadingId === item.pivot_id;
        return (
            <View style={styles.tableRowItem}>
                <Text style={[styles.tdTxt, { width: 130 }]} numberOfLines={1}>{item.name || '-'}</Text>
                <Text style={[styles.tdTxt, { width: 120 }]} numberOfLines={1}>{item.campaign_name || '-'}</Text>
                <Text style={[styles.tdTxt, { width: 110 }]} numberOfLines={1}>{item.agent_name || '-'}</Text>
                <Text 
                    style={[styles.tdTxt, { width: 110, color: '#434AFA', fontWeight: '600' }]} 
                    numberOfLines={1}
                    onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
                >
                    {item.phone || '-'}
                </Text>
                <Text style={[styles.tdTxt, { width: 140 }]} numberOfLines={1}>{item.latest_remark_text || '-'}</Text>
                
                <View style={{ width: 160, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                    {isProcessing ? (
                        <ActivityIndicator size="small" color="#434AFA" />
                    ) : (
                        <>
                            <TouchableOpacity style={styles.miniTableBtn} onPress={() => triggerRestoreLead(item)}>
                                <Ionicons name="arrow-undo-sharp" size={16} color="#059669" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.miniTableBtn} onPress={() => triggerPurgeLead(item)}>
                                <Ionicons name="trash-bin-sharp" size={16} color="#DC2626" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

    const PagingWidget = () => (
        <View style={styles.pagerContainer}>
            <TouchableOpacity
                disabled={pagination.current_page === 1 || loading}
                style={[styles.pagerBtn, pagination.current_page === 1 && styles.pagerBtnDisabled]}
                onPress={() => loadJunkCallings(pagination.current_page - 1)}
            >
                <Ionicons name="chevron-back" size={18} color={pagination.current_page === 1 ? '#94A3B8' : '#1E293B'} />
            </TouchableOpacity>
            <Text style={styles.pagerLabel}>Page {pagination.current_page} of {pagination.last_page}</Text>
            <TouchableOpacity
                disabled={pagination.current_page === pagination.last_page || loading}
                style={[styles.pagerBtn, pagination.current_page === pagination.last_page && styles.pagerBtnDisabled]}
                onPress={() => loadJunkCallings(pagination.current_page + 1)}
            >
                <Ionicons name="chevron-forward" size={18} color={pagination.current_page === pagination.last_page ? '#94A3B8' : '#1E293B'} />
            </TouchableOpacity>
        </View>
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
            <Header title="Junk Repository" />

            {renderTopStats()}

            {/* Actions Toolbar */}
            <View style={styles.utilityToolbar}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={16} color="#94A3B8" />
                    <TextInput
                        style={styles.searchFieldInput}
                        placeholder="Locate flagged entity..."
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
                        <Ionicons name="grid-outline" size={15} color={viewMode === 'card' ? '#FFF' : '#475569'} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.modeToggle, viewMode === 'table' && styles.modeToggleActive]} 
                        onPress={() => setViewMode('table')}
                    >
                        <Ionicons name="list" size={15} color={viewMode === 'table' ? '#FFF' : '#475569'} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={[styles.triggerFilterIcon, activeFiltersCount > 0 && styles.triggerFilterIconActive]} 
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons name="funnel" size={15} color={activeFiltersCount > 0 ? '#FFF' : '#434AFA'} />
                </TouchableOpacity>
            </View>

            {/* Records Matrix */}
            {loading && pagination.current_page === 1 && !refreshing ? (
                <View style={styles.busyContainer}>
                    <ActivityIndicator size="large" color="#EF4444" />
                    <Text style={styles.busyText}>Scanning segregated Junk maps...</Text>
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
                                    <Ionicons name="trash-bin-outline" size={56} color="#CBD5E1" />
                                    <Text style={styles.emptyHeadline}>Junk Vault Empty</Text>
                                    <Text style={styles.emptySubline}>No contacts sitting in standard rejection loops. Your active databases look clean!</Text>
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
                                            <Text style={styles.emptyHeadline}>No Junk Discovered</Text>
                                        </View>
                                    }
                                />
                            </View>
                        </ScrollView>
                    )}
                    {callings.length > 0 && <PagingWidget />}
                </View>
            )}

            {/* FILTER SLIDER PANEL */}
            <Modal visible={filterModalVisible} transparent animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
                <View style={styles.dialogWrapper}>
                    <View style={styles.sheetPanel}>
                        <View style={styles.sheetTopBar}>
                            <Text style={styles.sheetTitle}>Junk Segmenting Filters</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 16 }}>
                            {renderFilterSelectorScroll("Source Campaign", "campaign_id", filterOptions.campaigns)}
                            {renderFilterSelectorScroll("Geographical States", "state_name", filterOptions.states)}
                            {renderFilterSelectorScroll("Designated Metros", "city_name", filterOptions.cities)}
                        </ScrollView>

                        <View style={styles.sheetFooter}>
                            <TouchableOpacity style={[styles.footBtnAction, styles.footBtnClear]} onPress={handleClearFilters}>
                                <Text style={styles.footBtnTxtClear}>Flush Options</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.footBtnAction, styles.footBtnApply]} onPress={() => handleApplyFilters(filters)}>
                                <Text style={styles.footBtnTxtApply}>Activate Scope</Text>
                            </TouchableOpacity>
                        </View>
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
    modeToggleActive: { backgroundColor: '#434AFA' },
    triggerFilterIcon: { width: 36, height: 36, backgroundColor: '#EEF2FF', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    triggerFilterIconActive: { backgroundColor: '#434AFA' },

    scrollerLayout: { paddingHorizontal: 12, paddingBottom: 80 },
    itemCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 1, borderWidth: 1, borderColor: '#F3F4F6' },
    itemCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
    leadNameTxt: { fontSize: 14.5, fontWeight: '700', color: '#1E293B' },
    campaignLabelText: { fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 2 },
    
    badgeFill: { paddingVertical: 3, paddingHorizontal: 8, backgroundColor: '#FEF2F2', borderRadius: 4, borderWidth: 1, borderColor: '#FEE2E2' },
    badgeTxt: { fontSize: 9, fontWeight: '800', color: '#EF4444' },

    itemCardBody: { paddingTop: 10 },
    dataRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    inlineIcon: { marginRight: 6, width: 14 },
    inlineText: { fontSize: 12.5, color: '#475569', flex: 1 },
    remarkBoxContainer: { marginTop: 6, backgroundColor: '#FFF5F5', padding: 8, borderRadius: 6, borderLeftWidth: 2, borderLeftColor: '#FCA5A5' },
    remarkHeaderLabel: { fontSize: 9.5, color: '#DC2626', fontWeight: '800', marginBottom: 1, textTransform: 'capitalize' },
    remarkContentBody: { fontSize: 11.5, color: '#7F1D1D', fontStyle: 'italic', lineHeight: 15 },

    itemCardFooter: {
        flexDirection: 'row', gap: 10,
        marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9'
    },
    actionBtn: { flex: 1, height: 34, borderRadius: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1 },
    actionBtnRestore: { borderColor: '#A7F3D0', backgroundColor: '#ECFDF5' },
    actionBtnPurge: { borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
    actionLabelRestore: { fontSize: 12, color: '#059669', fontWeight: '700' },
    actionLabelPurge: { fontSize: 12, color: '#DC2626', fontWeight: '700' },

    tableHeaderContainer: { flexDirection: 'row', backgroundColor: '#FFF1F2', paddingVertical: 10, paddingHorizontal: 10 },
    thTxt: { fontSize: 11, fontWeight: '700', color: '#991B1B' },
    tableRowItem: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 10 },
    tdTxt: { fontSize: 12.5, color: '#334155', alignSelf: 'center', paddingRight: 5 },
    miniTableBtn: { padding: 4, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 4, backgroundColor: '#F9FAFB' },

    pagerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    pagerBtn: { padding: 6, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, marginHorizontal: 12 },
    pagerBtnDisabled: { opacity: 0.35 },
    pagerLabel: { fontSize: 12.5, fontWeight: '700', color: '#334155' },

    busyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    busyText: { marginTop: 8, color: '#EF4444', fontSize: 12 },
    emptyPanel: { flex: 1, alignItems: 'center', marginTop: 70, paddingHorizontal: 32 },
    emptyHeadline: { fontSize: 15, fontWeight: '800', color: '#475569', marginTop: 10 },
    emptySubline: { fontSize: 11.5, color: '#94A3B8', textAlign: 'center', marginTop: 4, lineHeight: 17 },

    dialogWrapper: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheetPanel: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '80%' },
    sheetTopBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    sheetTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    
    criteriaGroup: { marginBottom: 16 },
    criteriaTitle: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 },
    chipsRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    criteriaChip: { backgroundColor: '#F1F5F9', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    criteriaChipActive: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
    criteriaChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
    criteriaChipTextActive: { color: '#EF4444', fontWeight: '800' },

    sheetFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10 },
    footBtnAction: { flex: 1, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    footBtnClear: { backgroundColor: '#F3F4F6' },
    footBtnApply: { backgroundColor: '#EF4444' },
    footBtnTxtClear: { color: '#4B5563', fontWeight: '700', fontSize: 12.5 },
    footBtnTxtApply: { color: '#FFF', fontWeight: '700', fontSize: 12.5 }
});

export default JunkCallingScreen;
