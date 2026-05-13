import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Alert,
    Modal,
    TextInput,
    ScrollView
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../api/client';
import Header from '../../components/Header';

const CallingLockScreen = () => {
    // Central Data Sets
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Paging & Counts
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchName, setSearchName] = useState('');

    // Dropdowns & Selected Filters
    const [selectedCampaignId, setSelectedCampaignId] = useState('');
    const [selectedState, setSelectedState] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    
    const [filterOptions, setFilterOptions] = useState({
        campaigns: [],
        states: [],
        cities: []
    });
    const [filtersVisible, setFiltersVisible] = useState(false);

    // Multi-Selection Mechanics
    const [selectedIds, setSelectedIds] = useState([]);
    const [allMatchingActive, setAllMatchingActive] = useState(false);
    
    // Lock Action state
    const [locking, setLocking] = useState(false);

    useEffect(() => {
        fetchFilterOptions();
    }, []);

    // Re-run load if campaign choice switches
    useEffect(() => {
        if (selectedCampaignId) {
            setSelectedIds([]);
            setAllMatchingActive(false);
            loadLeads(1, false);
        } else {
            setLeads([]);
            setTotalCount(0);
            setSelectedIds([]);
            setAllMatchingActive(false);
        }
    }, [selectedCampaignId]);

    const fetchFilterOptions = async () => {
        try {
            const res = await api.get('/calling/campaign-filters');
            setFilterOptions({
                campaigns: res.data.campaigns || [],
                states: res.data.states || [],
                cities: res.data.cities || []
            });
        } catch (err) {
            console.log('Error pulling filter mappings:', err);
        }
    };

    const loadLeads = async (pageNum = 1, append = false) => {
        if (!selectedCampaignId) return;

        if (pageNum === 1) {
            if (append) setRefreshing(true);
            else setLoading(true);
        }

        try {
            const params = {
                page: pageNum,
                per_page: 15,
                campaign_id: selectedCampaignId,
                name: searchName.trim(),
                state_id: selectedState,
                city_id: selectedCity,
                is_locking: 1 // Essential flag enforcing unassigned (is_locked = 0) leads only
            };

            const res = await api.get('/calling/master', { params });
            const { data, current_page, last_page, total } = res.data;

            if (append) {
                setLeads((prev) => [...prev, ...(data || [])]);
            } else {
                setLeads(data || []);
            }

            setPage(current_page || 1);
            setTotalPages(last_page || 1);
            setTotalCount(total || 0);
        } catch (err) {
            console.log('Failed resolving unassigned cards:', err);
            Alert.alert('Query Interrupted', 'Could not retrieve unassigned campaign leads.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSearchSubmit = () => {
        setSelectedIds([]);
        setAllMatchingActive(false);
        loadLeads(1, false);
    };

    const handleLoadMore = () => {
        if (page < totalPages && !loading && !refreshing) {
            loadLeads(page + 1, true);
        }
    };

    const handleRefresh = () => {
        loadLeads(1, true);
    };

    // Selection Handlers
    const toggleSelection = (id) => {
        if (allMatchingActive) {
            setAllMatchingActive(false);
            setSelectedIds([id]);
            return;
        }

        setSelectedIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter(x => x !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const selectVisibleOnScreen = () => {
        setAllMatchingActive(false);
        const onScreenIds = leads.map(l => l.id);
        setSelectedIds((prev) => [...new Set([...prev, ...onScreenIds])]);
    };

    const selectGlobalMatching = () => {
        if (!selectedCampaignId) return;

        Alert.alert(
            'Global Lock Selection',
            `Set all matching? This selects all ${totalCount.toLocaleString()} unassigned contacts matching your current scope.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Match Global', 
                    onPress: () => {
                        setSelectedIds([]);
                        setAllMatchingActive(true);
                    }
                }
            ]
        );
    };

    const clearSelection = () => {
        setSelectedIds([]);
        setAllMatchingActive(false);
    };

    // Execute Assign/Lock Endpoint
    const executeLockRequest = () => {
        const activeCount = allMatchingActive ? totalCount : selectedIds.length;
        
        Alert.alert(
            'Establish Lock Ownership',
            `Are you sure you want to lock and assign these ${activeCount.toLocaleString()} lead cards to your user workspace?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Confirm Lock', 
                    onPress: submitLockPayload
                }
            ]
        );
    };

    const submitLockPayload = async () => {
        setLocking(true);
        try {
            const payload = {
                campaign_id: selectedCampaignId,
                all_matching: allMatchingActive,
                filters: {
                    name: searchName.trim(),
                    state_id: selectedState,
                    city_id: selectedCity,
                    is_locking: true
                },
                calling_ids: selectedIds
            };

            const res = await api.post('/calling/lock-leads', payload);

            if (res.data.success) {
                Alert.alert('Success Established', res.data.message || 'Leads locked and claimed.');
                clearSelection();
                loadLeads(1, false); // Refresh listing to exclude newly locked cards
            } else {
                Alert.alert('Lock Rejected', res.data.message || 'Constraint violation.');
            }
        } catch (err) {
            console.log('Lock execution error:', err);
            const msg = err.response?.data?.message || 'Backend anomaly interrupted lock pipeline.';
            Alert.alert('Operation Failed', msg);
        } finally {
            setLocking(false);
        }
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (selectedState) count++;
        if (selectedCity) count++;
        return count;
    };

    const applyDrawerFilters = () => {
        setFiltersVisible(false);
        clearSelection();
        loadLeads(1, false);
    };

    const resetDrawerFilters = () => {
        setSelectedState('');
        setSelectedCity('');
        setFiltersVisible(false);
        clearSelection();
        setTimeout(() => loadLeads(1, false), 100);
    };

    const renderMetricsHeader = () => {
        const activeSelectionCount = allMatchingActive ? totalCount : selectedIds.length;
        const filterCount = getActiveFiltersCount() + (searchName.trim() ? 1 : 0);
        
        return (
            <View style={styles.metricsRow}>
                <View style={styles.metricBox}>
                    <View style={[styles.iconCirc, { backgroundColor: '#E0F2FE' }]}>
                        <Ionicons name="megaphone-outline" size={15} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.metricVal}>{selectedCampaignId ? totalCount.toLocaleString() : '0'}</Text>
                        <Text style={styles.metricLabel}>Campaign Leads</Text>
                    </View>
                </View>
                
                <View style={styles.metricBox}>
                    <View style={[styles.iconCirc, { backgroundColor: '#FDF2F8' }]}>
                        <Ionicons name="lock-closed-outline" size={15} color="#DB2777" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.metricVal, { color: '#DB2777' }]}>{activeSelectionCount.toLocaleString()}</Text>
                        <Text style={styles.metricLabel}>Selected Count</Text>
                    </View>
                </View>

                <View style={styles.metricBox}>
                    <View style={[styles.iconCirc, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="funnel-outline" size={15} color="#D97706" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.metricVal, { color: '#D97706' }]}>{filterCount}</Text>
                        <Text style={styles.metricLabel}>Active Filters</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderLeadItem = ({ item }) => {
        const isSelected = allMatchingActive || selectedIds.includes(item.id);

        return (
            <TouchableOpacity 
                style={[styles.leadCard, isSelected && styles.leadCardSelected]} 
                activeOpacity={0.85}
                onPress={() => toggleSelection(item.id)}
            >
                <View style={styles.cardRow}>
                    <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                    </View>

                    <View style={styles.cardBody}>
                        <View style={styles.cardTop}>
                            <Text style={styles.leadName} numberOfLines={1}>{item.name || 'Contact Profile'}</Text>
                            <Text style={styles.leadId}>#{item.id}</Text>
                        </View>

                        <Text style={styles.companyText} numberOfLines={1}>
                            <Ionicons name="business-outline" size={12} color="#64748B" /> {item.company_name || 'Enterprise Not Set'}
                        </Text>

                        <View style={styles.chipsRow}>
                            {item.phone && (
                                <View style={styles.chipBadge}>
                                    <Ionicons name="call-outline" size={10} color="#475569" />
                                    <Text style={styles.chipTxt}>{item.phone}</Text>
                                </View>
                            )}
                            {(item.city || item.state) && (
                                <View style={[styles.chipBadge, { backgroundColor: '#EEF2FF' }]}>
                                    <Ionicons name="location-outline" size={10} color="#434AFA" />
                                    <Text style={[styles.chipTxt, { color: '#434AFA' }]}>
                                        {[item.city, item.state].filter(Boolean).join(', ')}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderScrollerChips = (label, currentVal, setter, data, displayKey = null) => {
        return (
            <View style={styles.groupField}>
                <Text style={styles.groupTitle}>{label}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollerBox}>
                    <TouchableOpacity 
                        style={[styles.pill, currentVal === '' && styles.pillActive]} 
                        onPress={() => setter('')}
                    >
                        <Text style={[styles.pillTxt, currentVal === '' && styles.pillTxtActive]}>All</Text>
                    </TouchableOpacity>
                    {data.map((val, index) => {
                        const keyVal = typeof val === 'object' ? val.id : val;
                        const display = typeof val === 'object' ? val[displayKey] : val;
                        const active = currentVal === keyVal;
                        return (
                            <TouchableOpacity 
                                key={index}
                                style={[styles.pill, active && styles.pillActive]} 
                                onPress={() => setter(keyVal)}
                            >
                                <Text style={[styles.pillTxt, active && styles.pillTxtActive]}>{display}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    return (
        <View style={styles.root}>
            <Header title="Lock Calling" />

            {renderMetricsHeader()}

            {/* Master Campaign Choice Bar (Triggers loading logic) */}
            <View style={styles.campaignPickerStrip}>
                <Ionicons name="megaphone" size={16} color="#FFF" style={{ marginLeft: 12 }} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 8, gap: 8, height: 40, alignItems: 'center' }}>
                    <TouchableOpacity 
                        style={[styles.campaignBtn, selectedCampaignId === '' && styles.campaignBtnActive]}
                        onPress={() => setSelectedCampaignId('')}
                    >
                        <Text style={[styles.campaignBtnTxt, selectedCampaignId === '' && styles.campaignBtnTxtActive]}>-- Select Campaign --</Text>
                    </TouchableOpacity>
                    {filterOptions.campaigns.map((c) => {
                        const isSel = selectedCampaignId === c.id;
                        return (
                            <TouchableOpacity 
                                key={c.id}
                                style={[styles.campaignBtn, isSel && styles.campaignBtnActive]}
                                onPress={() => setSelectedCampaignId(c.id)}
                            >
                                <Text style={[styles.campaignBtnTxt, isSel && styles.campaignBtnTxtActive]}>{c.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {selectedCampaignId ? (
                <>
                    {/* Filter Utilities Layer */}
                    <View style={styles.utilityRow}>
                        <View style={styles.searchBar}>
                            <Ionicons name="search-outline" size={16} color="#94A3B8" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search within scope..."
                                placeholderTextColor="#94A3B8"
                                value={searchName}
                                onChangeText={setSearchName}
                                onSubmitEditing={handleSearchSubmit}
                                returnKeyType="search"
                            />
                            {searchName.length > 0 && (
                                <TouchableOpacity onPress={() => { setSearchName(''); loadLeads(1, false); }}>
                                    <Ionicons name="close-circle" size={16} color="#94A3B8" />
                                </TouchableOpacity>
                            )}
                        </View>
                        <TouchableOpacity 
                            style={[styles.actionCircle, getActiveFiltersCount() > 0 && styles.actionCircleActive]} 
                            onPress={() => setFiltersVisible(true)}
                        >
                            <Ionicons name="funnel-outline" size={16} color={getActiveFiltersCount() > 0 ? '#FFF' : '#434AFA'} />
                        </TouchableOpacity>
                    </View>

                    {/* Selection Bulk Controls */}
                    <View style={styles.bulkControlRow}>
                        <TouchableOpacity style={styles.bulkCmd} onPress={selectVisibleOnScreen}>
                            <Ionicons name="checkbox-outline" size={13} color="#475569" />
                            <Text style={styles.bulkCmdTxt}>Add Visible</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.bulkCmd} onPress={selectGlobalMatching}>
                            <Ionicons name="globe-outline" size={13} color="#475569" />
                            <Text style={styles.bulkCmdTxt}>Select Global</Text>
                        </TouchableOpacity>
                        {(selectedIds.length > 0 || allMatchingActive) && (
                            <TouchableOpacity style={styles.bulkCmdClear} onPress={clearSelection}>
                                <Text style={styles.bulkCmdClearTxt}>Clear Selections</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Data Grid Engine */}
                    {loading && page === 1 ? (
                        <View style={styles.loadingWrapper}>
                            <ActivityIndicator size="large" color="#434AFA" />
                            <Text style={styles.loadingText}>Querying unassigned records...</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={leads}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderLeadItem}
                            contentContainerStyle={styles.leadsContainer}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                            onEndReached={handleLoadMore}
                            onEndReachedThreshold={0.3}
                            ListEmptyComponent={
                                <View style={styles.emptyState}>
                                    <Ionicons name="checkmark-done-circle-outline" size={60} color="#CBD5E1" />
                                    <Text style={styles.emptyTitle}>No unassigned leads found</Text>
                                    <Text style={styles.emptySubtitle}>All campaign contacts in this filter scope have been successfully assigned or locked.</Text>
                                </View>
                            }
                            ListFooterComponent={() => (
                                page < totalPages ? (
                                    <View style={styles.footerLoading}>
                                        <ActivityIndicator size="small" color="#434AFA" />
                                    </View>
                                ) : null
                            )}
                        />
                    )}

                    {/* Floating Action Footer (Safe area margin globally managed) */}
                    {(selectedIds.length > 0 || allMatchingActive) && (
                        <View style={styles.stickyFooter}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.footerHeadline}>
                                    {allMatchingActive ? totalCount.toLocaleString() : selectedIds.length.toLocaleString()} Selected
                                </Text>
                                <Text style={styles.footerSub}>Queued for claim</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.claimBtn} 
                                onPress={executeLockRequest}
                                disabled={locking}
                            >
                                {locking ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="lock-closed" size={14} color="#FFF" style={{ marginRight: 6 }} />
                                        <Text style={styles.claimBtnTxt}>Lock Selected</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    )}
                </>
            ) : (
                /* Placeholder Screen forcing Campaign selection first */
                <View style={styles.placeholderContent}>
                    <View style={styles.placeholderIconCirc}>
                        <Ionicons name="lock-closed-outline" size={40} color="#94A3B8" />
                    </View>
                    <Text style={styles.placeholderHeading}>Load Campaign Pool</Text>
                    <Text style={styles.placeholderSub}>Select an active campaign cluster from the scrolling panel above to load available unassigned contacts.</Text>
                </View>
            )}

            {/* Touch-Chips Dynamic Filters Modal */}
            <Modal
                visible={filtersVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setFiltersVisible(false)}
            >
                <View style={styles.modalWrapper}>
                    <View style={styles.drawerPanel}>
                        <View style={styles.drawerHead}>
                            <Text style={styles.drawerTitle}>Select Scope Subsets</Text>
                            <TouchableOpacity onPress={() => setFiltersVisible(false)}>
                                <Ionicons name="close" size={22} color="#1E293B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ padding: 16 }}>
                            {renderScrollerChips("State Scope", selectedState, setSelectedState, filterOptions.states)}
                            {renderScrollerChips("Metro/City Scope", selectedCity, setSelectedCity, filterOptions.cities)}
                        </ScrollView>

                        <View style={styles.drawerFoot}>
                            <TouchableOpacity style={[styles.footBtn, styles.btnReset]} onPress={resetDrawerFilters}>
                                <Text style={styles.btnTxtReset}>Reset All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.footBtn, styles.btnApply]} onPress={applyDrawerFilters}>
                                <Text style={styles.btnTxtApply}>Filter Leads</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#F8FAFC' },

    // Hero Metrics Row
    metricsRow: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 10, gap: 8 },
    metricBox: { 
        flex: 1, backgroundColor: '#FFF', padding: 10, borderRadius: 10, 
        flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 1.5
    },
    iconCirc: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    metricVal: { fontSize: 14, fontWeight: '800', color: '#0F172A' },
    metricLabel: { fontSize: 8.5, color: '#64748B', fontWeight: '600', marginTop: 1 },

    // Scrolling Campaign Bar
    campaignPickerStrip: { 
        backgroundColor: '#434AFA', marginHorizontal: 12, marginTop: 10, borderRadius: 8,
        flexDirection: 'row', alignItems: 'center', elevation: 2
    },
    campaignBtn: { 
        backgroundColor: 'rgba(255, 255, 255, 0.15)', paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)'
    },
    campaignBtnActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
    campaignBtnTxt: { fontSize: 11, fontWeight: '700', color: '#FFF' },
    campaignBtnTxtActive: { color: '#434AFA' },

    // Search and Drawer Filter toggles
    utilityRow: { flexDirection: 'row', paddingHorizontal: 12, marginTop: 12, gap: 8, alignItems: 'center' },
    searchBar: {
        flex: 1, height: 38, backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0',
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, elevation: 0.5
    },
    searchInput: { flex: 1, height: '100%', fontSize: 13, color: '#1E293B', padding: 0, marginLeft: 6 },
    actionCircle: {
        width: 38, height: 38, backgroundColor: '#EEF2FF', borderRadius: 6, 
        justifyContent: 'center', alignItems: 'center'
    },
    actionCircleActive: { backgroundColor: '#434AFA' },

    // Bulk Panel
    bulkControlRow: { flexDirection: 'row', paddingHorizontal: 12, marginVertical: 10, gap: 6, alignItems: 'center' },
    bulkCmd: {
        flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF',
        paddingHorizontal: 8, paddingVertical: 5, borderRadius: 5, borderWidth: 1, borderColor: '#CBD5E1'
    },
    bulkCmdTxt: { fontSize: 10, color: '#475569', fontWeight: '700' },
    bulkCmdClear: { paddingLeft: 4 },
    bulkCmdClearTxt: { color: '#EF4444', fontSize: 10, fontWeight: '700' },

    // Listing
    leadsContainer: { paddingHorizontal: 12, paddingBottom: 90 },
    leadCard: {
        backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 8,
        elevation: 1, borderLeftWidth: 3, borderLeftColor: '#CBD5E1'
    },
    leadCardSelected: { backgroundColor: '#FFF5F5', borderLeftColor: '#DB2777' },
    cardRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    checkbox: {
        width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#94A3B8',
        justifyContent: 'center', alignItems: 'center', marginTop: 2
    },
    checkboxChecked: { backgroundColor: '#DB2777', borderColor: '#DB2777' },
    cardBody: { flex: 1 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    leadName: { fontSize: 14, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 6 },
    leadId: { fontSize: 9.5, fontWeight: '800', color: '#94A3B8' },
    companyText: { fontSize: 11, color: '#64748B', marginTop: 3 },
    chipsRow: { flexDirection: 'row', gap: 5, marginTop: 8, flexWrap: 'wrap' },
    chipBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F1F5F9',
        paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4
    },
    chipTxt: { fontSize: 9.5, fontWeight: '600', color: '#475569' },

    // States Empty / Loading
    loadingWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 8, fontSize: 12, color: '#64748B' },
    emptyState: { flex: 1, alignItems: 'center', marginTop: 60, paddingHorizontal: 32 },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: '#475569', marginTop: 10 },
    emptySubtitle: { fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 4, lineHeight: 16 },
    footerLoading: { paddingVertical: 10, alignItems: 'center' },

    // Floating action footer
    stickyFooter: {
        position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1E293B',
        paddingVertical: 12, paddingHorizontal: 16, borderTopLeftRadius: 14, borderTopRightRadius: 14,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 15
    },
    footerHeadline: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    footerSub: { color: '#94A3B8', fontSize: 10 },
    claimBtn: {
        backgroundColor: '#DB2777', paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 6, flexDirection: 'row', alignItems: 'center', elevation: 3
    },
    claimBtnTxt: { color: '#FFF', fontWeight: '800', fontSize: 12 },

    // Placeholder content forcing Campaign selection
    placeholderContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
    placeholderIconCirc: { 
        width: 70, height: 70, borderRadius: 35, backgroundColor: '#E2E8F0',
        justifyContent: 'center', alignItems: 'center', marginBottom: 16
    },
    placeholderHeading: { fontSize: 16, fontWeight: '800', color: '#334155' },
    placeholderSub: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18 },

    // Modal Dialog Structure
    modalWrapper: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    drawerPanel: { backgroundColor: '#FFF', borderTopLeftRadius: 18, borderTopRightRadius: 18, maxHeight: '80%' },
    drawerHead: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    drawerTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    groupField: { marginBottom: 16 },
    groupTitle: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
    scrollerBox: { gap: 6, paddingBottom: 2 },
    pill: { 
        backgroundColor: '#F1F5F9', paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' 
    },
    pillActive: { backgroundColor: '#FFF1F2', borderColor: '#DB2777' },
    pillTxt: { fontSize: 11.5, color: '#475569', fontWeight: '600' },
    pillTxtActive: { color: '#DB2777', fontWeight: '800' },
    drawerFoot: { flexDirection: 'row', padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    footBtn: { flex: 1, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    btnReset: { backgroundColor: '#F3F4F6' },
    btnApply: { backgroundColor: '#DB2777' },
    btnTxtReset: { color: '#4B5563', fontWeight: '700', fontSize: 13 },
    btnTxtApply: { color: '#FFF', fontWeight: '700', fontSize: 13 }
});

export default CallingLockScreen;
