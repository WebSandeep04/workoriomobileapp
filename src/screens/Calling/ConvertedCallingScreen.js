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

const ConvertedCallingScreen = () => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();

    // Domain dataset
    const [callings, setCallings] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Views state
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('card'); 
    const [lastSyncedAt, setLastSyncedAt] = useState('--');

    // Filters matrix
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterOptions, setFilterOptions] = useState({ campaigns: [], states: [], cities: [] });
    const [filters, setFilters] = useState({ campaign_id: '', state_name: '', city_name: '' });
    const [activeFiltersCount, setActiveFiltersCount] = useState(0);

    useEffect(() => {
        if (isFocused) {
            fetchConvertedFilterOptions();
            loadConvertedCallings(1, false);
        }
    }, [isFocused]);

    const fetchConvertedFilterOptions = async () => {
        try {
            const res = await api.get('/calling/converted-filters');
            setFilterOptions(res.data || { campaigns: [], states: [], cities: [] });
        } catch (err) {
            console.log('Failed loading Converted filters:', err);
        }
    };

    const loadConvertedCallings = async (pageNumber = 1, refresh = false, activeFilters = filters, term = searchQuery) => {
        if (refresh) setRefreshing(true);
        else setLoading(true);

        try {
            const params = {
                page: pageNumber,
                per_page: 10,
                search: term.trim(),
                ...activeFilters
            };

            const res = await api.get('/calling/converted-calls', { params });
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
            if (activeFilters.state_name) count++;
            if (activeFilters.city_name) count++;
            setActiveFiltersCount(count);

        } catch (err) {
            console.log('Extraction error:', err);
            Alert.alert('Connection Interrupt', 'Failed to retrieve the conversion logs repository.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const triggerHistoryViewer = (item) => {
        navigation.navigate('CallingRemark', { 
            callingId: item.id, 
            campaignId: item.calling_campaign_id,
            readOnly: true
        });
    };

    const handleSearchSubmit = () => {
        loadConvertedCallings(1, false);
    };

    const handleRefresh = () => {
        loadConvertedCallings(1, true);
    };

    const handleApplyFilters = (compiledFilters) => {
        setFilters(compiledFilters);
        setFilterModalVisible(false);
        loadConvertedCallings(1, false, compiledFilters);
    };

    const handleClearFilters = () => {
        const blank = { campaign_id: '', state_name: '', city_name: '' };
        setFilters(blank);
        setFilterModalVisible(false);
        loadConvertedCallings(1, false, blank);
    };

    const renderTopStats = () => {
        const statsSet = [
            { label: 'Promoted Sales', val: pagination.total, tint: '#059669', icon: 'ribbon-outline' },
            { label: 'Filters Active', val: activeFiltersCount, tint: '#F59E0B', icon: 'funnel-outline' },
            { label: 'Synced', val: lastSyncedAt, tint: '#2563EB', icon: 'sync-outline' }
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

    const renderCard = ({ item }) => (
        <View style={styles.itemCard}>
            <View style={styles.itemCardHeader}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.leadNameTxt} numberOfLines={1}>{item.name || 'Anonymous Lead'}</Text>
                        <View style={styles.starPill}>
                            <Ionicons name="star" size={9} color="#D97706" />
                            <Text style={styles.starPillTxt}>WON</Text>
                        </View>
                    </View>
                    <Text style={styles.campaignLabelText}>
                        <Ionicons name="megaphone-outline" size={10} color="#64748B" /> {item.campaign_name || 'General Group'}
                    </Text>
                </View>
            </View>

            <View style={styles.itemCardBody}>
                <View style={styles.execRowContainer}>
                    <View style={styles.execPill}>
                        <Ionicons name="shield-checkmark-outline" size={13} color="#059669" />
                        <Text style={styles.execPillLabel}>Handed Over To: <Text style={{fontWeight: '800'}}>{item.converted_to_sales_name || 'Unassigned Executive'}</Text></Text>
                    </View>
                </View>

                <View style={styles.dataRow}>
                    <Ionicons name="business-outline" size={14} color="#64748B" style={styles.inlineIcon} />
                    <Text style={styles.inlineText} numberOfLines={1}>{item.company_name || 'Company unregistered'}</Text>
                </View>
                <View style={styles.dataRow}>
                    <Ionicons name="call-outline" size={14} color="#64748B" style={styles.inlineIcon} />
                    <Text style={[styles.inlineText, { color: '#2563EB', fontWeight: '700' }]} onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}>
                        {item.phone || 'No Phone'}
                    </Text>
                </View>
                <View style={styles.dataRow}>
                    <Ionicons name="location-outline" size={14} color="#64748B" style={styles.inlineIcon} />
                    <Text style={styles.inlineText} numberOfLines={1}>
                        {[item.city, item.state].filter(Boolean).join(', ') || 'Geographic unset'}
                    </Text>
                </View>

                {item.latest_remark_text && (
                    <View style={styles.remarkBoxContainer}>
                        <Text style={styles.remarkHeaderLabel}>Closing Call Memo:</Text>
                        <Text style={styles.remarkContentBody} numberOfLines={2}>{item.latest_remark_text}</Text>
                    </View>
                )}
            </View>

            <View style={styles.itemCardFooter}>
                <TouchableOpacity style={styles.footBtn} activeOpacity={0.8} onPress={() => triggerHistoryViewer(item)}>
                    <Ionicons name="book-outline" size={14} color="#0F172A" />
                    <Text style={styles.inspectBtnTxt}>Examine Progress Log</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderTableHeader = () => (
        <View style={styles.tableHeaderContainer}>
            <View style={{ width: 140 }}><Text style={styles.thTxt}>Promoted Lead</Text></View>
            <View style={{ width: 130 }}><Text style={styles.thTxt}>Sales Executive</Text></View>
            <View style={{ width: 110 }}><Text style={styles.thTxt}>Contact</Text></View>
            <View style={{ width: 150 }}><Text style={styles.thTxt}>Final Conversion Remark</Text></View>
            <View style={{ width: 90, alignItems: 'center' }}><Text style={styles.thTxt}>Action</Text></View>
        </View>
    );

    const renderTableRow = ({ item }) => (
        <View style={styles.tableRowItem}>
            <View style={{ width: 140, gap: 2 }}>
                <Text style={[styles.tdTxt, { fontWeight: '700' }]} numberOfLines={1}>{item.name || '-'}</Text>
                <Text style={{ fontSize: 9, color: '#64748B' }}>{item.campaign_name || '-'}</Text>
            </View>
            <Text style={[styles.tdTxt, { width: 130, fontWeight: '600', color: '#059669' }]} numberOfLines={1}>{item.converted_to_sales_name || '-'}</Text>
            <Text 
                style={[styles.tdTxt, { width: 110, color: '#2563EB', fontWeight: '600' }]} 
                numberOfLines={1}
                onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
            >
                {item.phone || '-'}
            </Text>
            <Text style={[styles.tdTxt, { width: 150, fontStyle: 'italic' }]} numberOfLines={1}>{item.latest_remark_text || '-'}</Text>
            
            <View style={{ width: 90, alignItems: 'center' }}>
                <TouchableOpacity style={styles.miniActBtn} onPress={() => triggerHistoryViewer(item)}>
                    <Ionicons name="book" size={15} color="#334155" />
                </TouchableOpacity>
            </View>
        </View>
    );

    const PagingWidget = () => (
        <View style={styles.pagerContainer}>
            <TouchableOpacity
                disabled={pagination.current_page === 1 || loading}
                style={[styles.pagerBtn, pagination.current_page === 1 && styles.pagerBtnDisabled]}
                onPress={() => loadConvertedCallings(pagination.current_page - 1)}
            >
                <Ionicons name="chevron-back" size={18} color={pagination.current_page === 1 ? '#94A3B8' : '#1E293B'} />
            </TouchableOpacity>
            <Text style={styles.pagerLabel}>Page {pagination.current_page} of {pagination.last_page}</Text>
            <TouchableOpacity
                disabled={pagination.current_page === pagination.last_page || loading}
                style={[styles.pagerBtn, pagination.current_page === pagination.last_page && styles.pagerBtnDisabled]}
                onPress={() => loadConvertedCallings(pagination.current_page + 1)}
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
            <Header title="Conversions Achievement" />

            {renderTopStats()}

            <View style={styles.utilityToolbar}>
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={16} color="#94A3B8" />
                    <TextInput
                        style={styles.searchFieldInput}
                        placeholder="Find won leads..."
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
                    <Ionicons name="funnel" size={15} color={activeFiltersCount > 0 ? '#FFF' : '#059669'} />
                </TouchableOpacity>
            </View>

            {loading && pagination.current_page === 1 && !refreshing ? (
                <View style={styles.busyContainer}>
                    <ActivityIndicator size="large" color="#059669" />
                    <Text style={styles.busyText}>Compiling achievements dashboard...</Text>
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
                                    <View style={styles.awardCircle}>
                                        <Ionicons name="ribbon" size={40} color="#D1FAE5" />
                                    </View>
                                    <Text style={styles.emptyHeadline}>Pending Conversions</Text>
                                    <Text style={styles.emptySubline}>Promote active campaign leads to 'Interested' state to populate this catalog.</Text>
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
                                            <Text style={styles.emptyHeadline}>Zero Record</Text>
                                        </View>
                                    }
                                />
                            </View>
                        </ScrollView>
                    )}
                    {callings.length > 0 && <PagingWidget />}
                </View>
            )}

            {/* DYNAMIC FILTER OVERLAY */}
            <Modal visible={filterModalVisible} transparent animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
                <View style={styles.dialogWrapper}>
                    <View style={styles.sheetPanel}>
                        <View style={styles.sheetTopBar}>
                            <Text style={styles.sheetTitle}>Isolate Converted Segments</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 16 }}>
                            {renderFilterSelectorScroll("Product Campaign", "campaign_id", filterOptions.campaigns)}
                            {renderFilterSelectorScroll("Regional States", "state_name", filterOptions.states)}
                            {renderFilterSelectorScroll("Locality Cities", "city_name", filterOptions.cities)}
                        </ScrollView>

                        <View style={styles.sheetFooter}>
                            <TouchableOpacity style={[styles.footBtnAction, styles.footBtnClear]} onPress={handleClearFilters}>
                                <Text style={styles.footBtnTxtClear}>Reset Matrices</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.footBtnAction, styles.footBtnApply]} onPress={() => handleApplyFilters(filters)}>
                                <Text style={styles.footBtnTxtApply}>Apply Parameters</Text>
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
    modeToggleActive: { backgroundColor: '#059669' },
    triggerFilterIcon: { width: 36, height: 36, backgroundColor: '#D1FAE5', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    triggerFilterIconActive: { backgroundColor: '#059669' },

    scrollerLayout: { paddingHorizontal: 12, paddingBottom: 80 },
    itemCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 1, borderWidth: 1, borderColor: '#DCFCE7' },
    itemCardHeader: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
    leadNameTxt: { fontSize: 14.5, fontWeight: '800', color: '#1E293B' },
    campaignLabelText: { fontSize: 10, color: '#64748B', fontWeight: '600', marginTop: 3 },
    
    starPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 12 },
    starPillTxt: { fontSize: 8.5, fontWeight: '800', color: '#D97706' },

    itemCardBody: { paddingTop: 8 },
    execRowContainer: { marginBottom: 8 },
    execPill: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: '#10B981' },
    execPillLabel: { fontSize: 10.5, color: '#065F46', fontWeight: '600' },

    dataRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    inlineIcon: { marginRight: 6, width: 14 },
    inlineText: { fontSize: 12.5, color: '#475569', flex: 1 },
    remarkBoxContainer: { marginTop: 6, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6, borderLeftWidth: 2, borderLeftColor: '#E5E7EB' },
    remarkHeaderLabel: { fontSize: 9.5, color: '#64748B', fontWeight: '700', marginBottom: 1 },
    remarkContentBody: { fontSize: 11.5, color: '#334155', fontStyle: 'italic', lineHeight: 15 },

    itemCardFooter: {
        marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9'
    },
    footBtn: { height: 36, borderRadius: 8, backgroundColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    inspectBtnTxt: { fontSize: 12.5, color: '#0F172A', fontWeight: '700' },

    tableHeaderContainer: { flexDirection: 'row', backgroundColor: '#ECFDF5', paddingVertical: 10, paddingHorizontal: 10 },
    thTxt: { fontSize: 11, fontWeight: '700', color: '#065F46' },
    tableRowItem: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 10 },
    tdTxt: { fontSize: 12.5, color: '#334155', alignSelf: 'center', paddingRight: 5 },
    miniActBtn: { padding: 5, borderRadius: 4, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },

    pagerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    pagerBtn: { padding: 6, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, marginHorizontal: 12 },
    pagerBtnDisabled: { opacity: 0.35 },
    pagerLabel: { fontSize: 12.5, fontWeight: '700', color: '#334155' },

    busyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    busyText: { marginTop: 8, color: '#64748B', fontSize: 12 },
    emptyPanel: { flex: 1, alignItems: 'center', marginTop: 70, paddingHorizontal: 32 },
    awardCircle: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#ECFDF5', borderStyle: 'dashed', borderWidth: 2, borderColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
    emptyHeadline: { fontSize: 15, fontWeight: '800', color: '#065F46', marginTop: 14 },
    emptySubline: { fontSize: 11.5, color: '#6B7280', textAlign: 'center', marginTop: 4, lineHeight: 17 },

    dialogWrapper: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    sheetPanel: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '70%' },
    sheetTopBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    sheetTitle: { fontSize: 15.5, fontWeight: '800', color: '#1E293B' },
    
    criteriaGroup: { marginBottom: 16 },
    criteriaTitle: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 },
    chipsRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    criteriaChip: { backgroundColor: '#F3F4F6', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
    criteriaChipActive: { backgroundColor: '#D1FAE5', borderColor: '#059669' },
    criteriaChipText: { fontSize: 11, color: '#475569', fontWeight: '600' },
    criteriaChipTextActive: { color: '#065F46', fontWeight: '800' },

    sheetFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10 },
    footBtnAction: { flex: 1, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    footBtnClear: { backgroundColor: '#F3F4F6' },
    footBtnApply: { backgroundColor: '#059669' },
    footBtnTxtClear: { color: '#4B5563', fontWeight: '700', fontSize: 12.5 },
    footBtnTxtApply: { color: '#FFF', fontWeight: '700', fontSize: 12.5 }
});

export default ConvertedCallingScreen;
