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
    ScrollView,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../api/client';
import Header from '../../components/Header';

const CallingCampaignScreen = () => {
    // Data & State
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    // Filter parameters
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchName, setSearchName] = useState('');
    const [selectedFilters, setSelectedFilters] = useState({
        campaign_id: '',
        list_id: '',
        state_id: '',
        city_id: ''
    });

    // Master filter datasets
    const [filterOptions, setFilterOptions] = useState({
        campaigns: [],
        lists: [],
        states: [],
        cities: []
    });
    const [filtersVisible, setFiltersVisible] = useState(false);

    // Selection Engine state
    const [selectedIds, setSelectedIds] = useState([]);
    const [allMatchingActive, setAllMatchingActive] = useState(false);

    // Campaign Instantiation Overlay state
    const [launchModalVisible, setLaunchModalVisible] = useState(false);
    const [campaignName, setCampaignName] = useState('');
    const [launching, setLaunching] = useState(false);

    useEffect(() => {
        fetchFilterOptions();
        loadLeads(1, false);
    }, []);

    const fetchFilterOptions = async () => {
        try {
            const res = await api.get('/calling/campaign-filters');
            setFilterOptions({
                campaigns: res.data.campaigns || [],
                lists: res.data.lists || [],
                states: res.data.states || [],
                cities: res.data.cities || []
            });
        } catch (err) {
            console.log('Failed loading master filters:', err);
        }
    };

    const loadLeads = async (pageNum = 1, append = false) => {
        if (pageNum === 1) {
            if (append) setRefreshing(true);
            else setLoading(true);
        }

        try {
            const params = {
                page: pageNum,
                per_page: 15,
                name: searchName.trim(),
                campaign_id: selectedFilters.campaign_id,
                list_id: selectedFilters.list_id,
                state_id: selectedFilters.state_id,
                city_id: selectedFilters.city_id
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
            console.log('Error resolving lead pool:', err);
            Alert.alert('Request Refused', 'Could not establish secure link to central lead indexes.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleSearchSubmit = () => {
        // Clear current selections when applying new manual constraints to ensure accuracy
        setSelectedIds([]);
        setAllMatchingActive(false);
        loadLeads(1, false);
    };

    const handleRefresh = () => {
        loadLeads(1, true);
    };

    const handleLoadMore = () => {
        if (page < totalPages && !loading && !refreshing) {
            loadLeads(page + 1, true);
        }
    };

    // Selection Core Methods
    const toggleLeadSelection = (id) => {
        if (allMatchingActive) {
            setAllMatchingActive(false); // User interrupted global pool, switch to individual
            setSelectedIds([id]);
            return;
        }

        setSelectedIds((prev) => {
            if (prev.includes(id)) {
                return prev.filter(item => item !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const selectCurrentScreen = () => {
        setAllMatchingActive(false);
        const currentScreenIds = leads.map(l => l.id);
        setSelectedIds((prev) => {
            const combined = [...prev, ...currentScreenIds];
            return [...new Set(combined)]; // Distinct IDs
        });
    };

    const triggerGlobalSelectAll = () => {
        Alert.alert(
            'Global Selection',
            `Match All Leads in scope? This will select all ${totalCount.toLocaleString()} records that match your current active filter constraints globally.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Apply Global',
                    onPress: () => {
                        setSelectedIds([]);
                        setAllMatchingActive(true);
                    }
                }
            ]
        );
    };

    const clearAllSelections = () => {
        setSelectedIds([]);
        setAllMatchingActive(false);
    };

    // Campaign Persistence logic
    const handleLaunchCampaign = async () => {
        if (!campaignName.trim()) {
            Alert.alert('Required Input', 'Please define the Campaign Identity before establishing the cluster.');
            return;
        }

        setLaunching(true);
        try {
            const payload = {
                campaign_name: campaignName.trim(),
                all_matching: allMatchingActive,
                filters: {
                    name: searchName.trim(),
                    campaign_id: selectedFilters.campaign_id,
                    list_id: selectedFilters.list_id,
                    state_id: selectedFilters.state_id,
                    city_id: selectedFilters.city_id
                },
                calling_ids: selectedIds
            };

            const res = await api.post('/calling/campaigns', payload);

            if (res.data.success) {
                Alert.alert('Success Established', res.data.message || 'New Campaign set launched.');
                
                // Cleanup and refresh view
                setLaunchModalVisible(false);
                setCampaignName('');
                clearAllSelections();
                fetchFilterOptions(); // Fetch newly created campaign in dropdowns
                loadLeads(1, false);
            } else {
                Alert.alert('Abort Failure', res.data.message || 'Internal error creation.');
            }
        } catch (err) {
            console.log('Campaign creation error:', err);
            const msg = err.response?.data?.message || 'Network anomaly interrupted campaign setup.';
            Alert.alert('Establishment Refused', msg);
        } finally {
            setLaunching(false);
        }
    };

    const getActiveFiltersCount = () => {
        return Object.values(selectedFilters).filter(v => v !== '').length;
    };

    const applyFilters = () => {
        setFiltersVisible(false);
        clearAllSelections();
        loadLeads(1, false);
    };

    const resetFilters = () => {
        setSelectedFilters({ campaign_id: '', list_id: '', state_id: '', city_id: '' });
        setSearchName('');
        setFiltersVisible(false);
        clearAllSelections();
        setTimeout(() => {
            loadLeads(1, false);
        }, 100);
    };

    const renderSummaryCounters = () => {
        const countDisplay = allMatchingActive ? totalCount : selectedIds.length;
        return (
            <View style={styles.metricsRow}>
                <View style={styles.metricBox}>
                    <View style={[styles.iconCirc, { backgroundColor: '#EFF6FF' }]}>
                        <Ionicons name="layers-outline" size={16} color="#3B82F6" />
                    </View>
                    <View>
                        <Text style={styles.metricCount}>{totalCount.toLocaleString()}</Text>
                        <Text style={styles.metricLabel}>Leads Pool</Text>
                    </View>
                </View>
                <View style={styles.metricBox}>
                    <View style={[styles.iconCirc, { backgroundColor: '#ECFDF5' }]}>
                        <Ionicons name="checkmark-done-circle-outline" size={16} color="#10B981" />
                    </View>
                    <View>
                        <Text style={[styles.metricCount, { color: '#10B981' }]}>{countDisplay.toLocaleString()}</Text>
                        <Text style={styles.metricLabel}>Target Active</Text>
                    </View>
                </View>
            </View>
        );
    };

    const renderLeadItem = ({ item }) => {
        const isChecked = allMatchingActive || selectedIds.includes(item.id);
        
        return (
            <TouchableOpacity 
                style={[styles.leadCard, isChecked && styles.leadCardSelected]} 
                activeOpacity={0.85}
                onPress={() => toggleLeadSelection(item.id)}
            >
                <View style={styles.cardFlex}>
                    {/* Select Checkbox Circle */}
                    <View style={[styles.checkDot, isChecked && styles.checkDotChecked]}>
                        {isChecked && <Ionicons name="checkmark" size={14} color="#FFF" />}
                    </View>

                    <View style={styles.cardMain}>
                        <View style={styles.cardHeaderRow}>
                            <Text style={styles.leadName} numberOfLines={1}>{item.name || 'Untitled Contact'}</Text>
                            <Text style={styles.leadIdBadge}>#{item.id}</Text>
                        </View>
                        
                        <Text style={styles.companyText} numberOfLines={1}>
                            <Ionicons name="business-outline" size={12} color="#64748B" /> {item.company_name || 'No Enterprise Profile'}
                        </Text>

                        <View style={styles.metaGroup}>
                            {item.contact_person && (
                                <View style={styles.metaBadge}>
                                    <Ionicons name="person-outline" size={10} color="#4B5563" />
                                    <Text style={styles.metaText}>{item.contact_person}</Text>
                                </View>
                            )}
                            {(item.city || item.state) && (
                                <View style={[styles.metaBadge, { backgroundColor: '#EEF2FF' }]}>
                                    <Ionicons name="location-outline" size={10} color="#434AFA" />
                                    <Text style={[styles.metaText, { color: '#434AFA' }]}>
                                        {[item.city, item.state].filter(Boolean).join(', ')}
                                    </Text>
                                </View>
                            )}
                        </View>
                        
                        {item.phone && (
                            <Text style={styles.phoneFooter}>
                                <Ionicons name="call-outline" size={12} color="#64748B" /> {item.phone}
                            </Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderFilterDropdown = (label, key, data, labelProp = 'name') => {
        return (
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{label}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroller}>
                    <TouchableOpacity
                        style={[styles.chipItem, selectedFilters[key] === '' && styles.chipItemActive]}
                        onPress={() => setSelectedFilters(prev => ({ ...prev, [key]: '' }))}
                    >
                        <Text style={[styles.chipText, selectedFilters[key] === '' && styles.chipTextActive]}>All</Text>
                    </TouchableOpacity>
                    {data.map((item, idx) => {
                        const val = typeof item === 'object' ? item.id : item;
                        const display = typeof item === 'object' ? item[labelProp] : item;
                        const isAct = selectedFilters[key] === val;
                        return (
                            <TouchableOpacity
                                key={idx}
                                style={[styles.chipItem, isAct && styles.chipItemActive]}
                                onPress={() => setSelectedFilters(prev => ({ ...prev, [key]: val }))}
                            >
                                <Text style={[styles.chipText, isAct && styles.chipTextActive]}>{display}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <Header title="Campaign Master" />

            {renderSummaryCounters()}

            {/* Search and Filters Trigger */}
            <View style={styles.toolbar}>
                <View style={styles.searchField}>
                    <Ionicons name="search-outline" size={18} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Query name, phone, enterprise..."
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
                <TouchableOpacity style={styles.filterTrigger} onPress={() => setFiltersVisible(true)}>
                    <Ionicons name="funnel-outline" size={18} color="#434AFA" />
                    {getActiveFiltersCount() > 0 && (
                        <View style={styles.badgeDot} />
                    )}
                </TouchableOpacity>
            </View>

            {/* Mass Actions Panel */}
            <View style={styles.massPanel}>
                <TouchableOpacity style={styles.massBtn} onPress={selectCurrentScreen}>
                    <Ionicons name="checkbox-outline" size={14} color="#475569" />
                    <Text style={styles.massBtnText}>Add Visible</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.massBtn} onPress={triggerGlobalSelectAll}>
                    <Ionicons name="globe-outline" size={14} color="#475569" />
                    <Text style={styles.massBtnText}>Select Global Matching</Text>
                </TouchableOpacity>
                {(selectedIds.length > 0 || allMatchingActive) && (
                    <TouchableOpacity style={styles.massBtnClear} onPress={clearAllSelections}>
                        <Text style={styles.massBtnClearText}>Clear</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Central Data View */}
            {loading && page === 1 ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#434AFA" />
                    <Text style={styles.loadingText}>Interrogating database clusters...</Text>
                </View>
            ) : (
                <FlatList
                    data={leads}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderLeadItem}
                    contentContainerStyle={styles.leadsList}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.3}
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ionicons name="search-circle-outline" size={54} color="#CBD5E1" />
                            <Text style={styles.emptyTitle}>No matching records</Text>
                            <Text style={styles.emptySubtitle}>Refine search scope parameters to find target profiles.</Text>
                        </View>
                    }
                    ListFooterComponent={() => 
                        page < totalPages ? (
                            <View style={styles.footerLoader}>
                                <ActivityIndicator size="small" color="#434AFA" />
                            </View>
                        ) : null
                    }
                />
            )}

            {/* PERSISTENT SELECTION FOOTER */}
            {(selectedIds.length > 0 || allMatchingActive) && (
                <View style={styles.actionFooter}>
                    <View style={styles.actionMeta}>
                        <Text style={styles.footerCount}>
                            {allMatchingActive ? totalCount.toLocaleString() : selectedIds.length.toLocaleString()} Leads
                        </Text>
                        <Text style={styles.footerSub}>Queued for Cluster</Text>
                    </View>
                    <TouchableOpacity style={styles.footerLaunchBtn} onPress={() => setLaunchModalVisible(true)}>
                        <Ionicons name="megaphone-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                        <Text style={styles.footerLaunchText}>Build Campaign</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* FILTER DRAWER MODAL */}
            <Modal
                visible={filtersVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setFiltersVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.filterBoxContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Target Criteria Filters</Text>
                            <TouchableOpacity onPress={() => setFiltersVisible(false)}>
                                <Ionicons name="close" size={24} color="#1E293B" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={styles.filterScroll}>
                            {renderFilterDropdown("Campaign Filter Scope", "campaign_id", filterOptions.campaigns)}
                            {renderFilterDropdown("Target Source Segments", "list_id", filterOptions.lists)}
                            {renderFilterDropdown("Geographic States", "state_id", filterOptions.states)}
                            {renderFilterDropdown("Registered Metros/Cities", "city_id", filterOptions.cities)}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={[styles.footBtn, styles.footBtnReset]} onPress={resetFilters}>
                                <Text style={styles.footTextReset}>Reset All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.footBtn, styles.footBtnApply]} onPress={applyFilters}>
                                <Text style={styles.footTextApply}>Extract Subset</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* CAMPAIGN LAUNCHER MODAL */}
            <Modal
                visible={launchModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => !launching && setLaunchModalVisible(false)}
            >
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                    style={styles.launcherOverlay}
                >
                    <View style={styles.launcherBox}>
                        <View style={styles.launcherHeader}>
                            <Ionicons name="megaphone" size={22} color="#434AFA" />
                            <Text style={styles.launcherTitle}>Establish Target Cluster</Text>
                        </View>

                        <View style={styles.launcherBody}>
                            <Text style={styles.descLabel}>Campaign Identifier Label *</Text>
                            <TextInput
                                style={styles.launcherInput}
                                placeholder="e.g. Tier-1 Bangalore Expansion Q3"
                                placeholderTextColor="#94A3B8"
                                value={campaignName}
                                onChangeText={setCampaignName}
                                autoFocus
                                editable={!launching}
                            />

                            <View style={styles.impactPanel}>
                                <Ionicons name="information-circle" size={20} color="#2563EB" />
                                <View style={{ flex: 1, marginLeft: 8 }}>
                                    <Text style={styles.impactTitle}>Deployment Impact</Text>
                                    <Text style={styles.impactSubtitle}>
                                        This binds {allMatchingActive ? totalCount.toLocaleString() : selectedIds.length.toLocaleString()} contact cards to a new callable campaign cluster.
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.launcherFooter}>
                            <TouchableOpacity 
                                disabled={launching} 
                                style={styles.cancelLaunchBtn} 
                                onPress={() => setLaunchModalVisible(false)}
                            >
                                <Text style={styles.cancelLaunchText}>Retreat</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                disabled={launching} 
                                style={styles.confirmLaunchBtn} 
                                onPress={handleLaunchCampaign}
                            >
                                {launching ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.confirmLaunchText}>Launch Campaign</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    
    metricsRow: { 
        flexDirection: 'row', paddingHorizontal: 16, marginVertical: 12, gap: 12, flexShrink: 0
    },
    metricBox: {
        flex: 1, backgroundColor: '#FFF', padding: 12, borderRadius: 12,
        flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 1.5
    },
    iconCirc: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    metricCount: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    metricLabel: { fontSize: 10, color: '#64748B', fontWeight: '600' },

    toolbar: {
        flexDirection: 'row', paddingHorizontal: 16, marginBottom: 10, gap: 10, alignItems: 'center'
    },
    searchField: {
        flex: 1, height: 42, backgroundColor: '#FFF', borderRadius: 8, elevation: 1,
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0'
    },
    searchInput: {
        flex: 1, height: '100%', marginLeft: 8, fontSize: 14, color: '#1E293B', padding: 0
    },
    filterTrigger: {
        width: 42, height: 42, backgroundColor: '#EEF2FF', borderRadius: 8,
        justifyContent: 'center', alignItems: 'center', position: 'relative'
    },
    badgeDot: {
        position: 'absolute', top: 10, right: 10, width: 8, height: 8,
        borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1, borderColor: '#EEF2FF'
    },

    massPanel: {
        flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12
    },
    massBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF',
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1'
    },
    massBtnText: { fontSize: 11, color: '#475569', fontWeight: '700' },
    massBtnClear: {
        paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center'
    },
    massBtnClearText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },

    leadsList: { paddingHorizontal: 16, paddingBottom: 100 },
    leadCard: {
        backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10,
        elevation: 1, borderLeftWidth: 4, borderLeftColor: '#CBD5E1'
    },
    leadCardSelected: {
        backgroundColor: '#F0F9FF', borderLeftColor: '#434AFA'
    },
    cardFlex: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    checkDot: {
        width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#CBD5E1',
        justifyContent: 'center', alignItems: 'center', marginTop: 2
    },
    checkDotChecked: {
        backgroundColor: '#434AFA', borderColor: '#434AFA'
    },
    cardMain: { flex: 1 },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    leadName: { fontSize: 15, fontWeight: '700', color: '#1E293B', flex: 1, marginRight: 8 },
    leadIdBadge: { fontSize: 10, fontWeight: '800', color: '#94A3B8' },
    companyText: { fontSize: 12, color: '#64748B', marginTop: 4 },
    metaGroup: { flexDirection: 'row', gap: 6, marginVertical: 8, flexWrap: 'wrap' },
    metaBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F3F4F6',
        paddingVertical: 2, paddingHorizontal: 6, borderRadius: 4
    },
    metaText: { fontSize: 10, fontWeight: '600', color: '#4B5563' },
    phoneFooter: { fontSize: 12, color: '#475569', fontWeight: '500' },

    footerLoader: { paddingVertical: 12, alignItems: 'center' },
    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#64748B', fontSize: 13 },
    emptyBox: { flex: 1, alignItems: 'center', marginTop: 80, paddingHorizontal: 30 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginTop: 10 },
    emptySubtitle: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 4 },

    // Sticky Footer
    actionFooter: {
        position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#1E293B',
        paddingVertical: 14, paddingHorizontal: 20, borderTopLeftRadius: 16, borderTopRightRadius: 16,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 20
    },
    actionMeta: { flex: 1 },
    footerCount: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    footerSub: { color: '#94A3B8', fontSize: 11 },
    footerLaunchBtn: {
        backgroundColor: '#434AFA', paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 8, flexDirection: 'row', alignItems: 'center'
    },
    footerLaunchText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    filterBoxContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
    modalHeader: { 
        flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
    },
    modalTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    filterScroll: { padding: 20 },
    formGroup: { marginBottom: 20 },
    formLabel: { fontSize: 13, fontWeight: '700', color: '#475569', marginBottom: 8 },
    chipsScroller: { gap: 8, paddingBottom: 4 },
    chipItem: {
        backgroundColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0'
    },
    chipItemActive: {
        backgroundColor: '#EEF2FF', borderColor: '#434AFA'
    },
    chipText: { fontSize: 12, color: '#475569', fontWeight: '600' },
    chipTextActive: { color: '#434AFA', fontWeight: '800' },

    modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    footBtn: { flex: 1, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    footBtnReset: { backgroundColor: '#F3F4F6' },
    footBtnApply: { backgroundColor: '#434AFA' },
    footTextReset: { color: '#4B5563', fontWeight: '700' },
    footTextApply: { color: '#FFF', fontWeight: '700' },

    // Campaign Builder Layer
    launcherOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'center', padding: 20 },
    launcherBox: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', elevation: 10 },
    launcherHeader: { 
        flexDirection: 'row', alignItems: 'center', gap: 8, padding: 18, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0'
    },
    launcherTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    launcherBody: { padding: 20 },
    descLabel: { fontSize: 12, fontWeight: '700', color: '#64748B', marginBottom: 6 },
    launcherInput: {
        backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1',
        borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1E293B', marginBottom: 16
    },
    impactPanel: {
        flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10, borderLeftWidth: 3, borderLeftColor: '#2563EB'
    },
    impactTitle: { fontSize: 13, fontWeight: '700', color: '#1E40AF' },
    impactSubtitle: { fontSize: 11, color: '#2563EB', marginTop: 2, lineHeight: 16 },

    launcherFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, padding: 16, backgroundColor: '#F8FAFC' },
    cancelLaunchBtn: { paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' },
    cancelLaunchText: { color: '#64748B', fontWeight: '700', fontSize: 13 },
    confirmLaunchBtn: {
        backgroundColor: '#434AFA', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, minWidth: 120, alignItems: 'center'
    },
    confirmLaunchText: { color: '#FFF', fontWeight: '800', fontSize: 13 }
});

export default CallingCampaignScreen;
