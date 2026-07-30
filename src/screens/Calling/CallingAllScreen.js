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
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../api/client';
import Header from '../../components/Header';

const CallingAllScreen = () => {
    const navigation = useNavigation();

    // Data and Pagination
    const [callings, setCallings] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Search and Control States
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
    const [lastUpdated, setLastUpdated] = useState('--');

    // Filtering States
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterOptions, setFilterOptions] = useState({ states: [], cities: [], calling_types: [] });
    const [filters, setFilters] = useState({ state_name: '', city_name: '', calling_type_id: '' });
    const [activeFilterCount, setActiveFilterCount] = useState(0);

    useEffect(() => {
        fetchFilterOptions();
        loadCallings(1, false);
    }, []);

    const fetchFilterOptions = async () => {
        try {
            const res = await api.get('/calling/filter-options');
            setFilterOptions(res.data);
        } catch (err) {
            console.log('Error loading filter options', err);
        }
    };

    const loadCallings = async (page = 1, refresh = false, currentFilters = filters, search = searchQuery) => {
        if (refresh) setRefreshing(true);
        else setLoading(true);

        try {
            const params = {
                page,
                per_page: 10,
                search: search.trim(),
                ...currentFilters
            };

            const res = await api.get('/calling/all', { params });
            const { data, current_page, last_page, total } = res.data;
            
            setCallings(data || []);
            setPagination({
                current_page: current_page || 1,
                last_page: last_page || 1,
                total: total || 0
            });

            // Update timestamp
            const now = new Date();
            setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

            // Compute active filter counts
            let cnt = 0;
            if (search.trim()) cnt++;
            if (currentFilters.state_name) cnt++;
            if (currentFilters.city_name) cnt++;
            if (currentFilters.calling_type_id) cnt++;
            setActiveFilterCount(cnt);

        } catch (err) {
            console.log('Error loading calling list', err);
            Alert.alert('Error', 'Failed to retrieve calls database.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        loadCallings(1, true);
    };

    const handleSearchSubmit = () => {
        loadCallings(1, false);
    };

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
        setFilterModalVisible(false);
        loadCallings(1, false, newFilters);
    };

    const handleResetFilters = () => {
        const reset = { state_name: '', city_name: '', calling_type_id: '' };
        setFilters(reset);
        setFilterModalVisible(false);
        loadCallings(1, false, reset);
    };

    const navigateToRemarkTrail = (item) => {
        navigation.navigate('CallingRemark', { callingId: item.id });
    };

    // RENDER WIDGETS
    const renderSummaryStats = () => {
        const stats = [
            { label: 'Total Calls', count: pagination.total, color: '#3B82F6', icon: 'call-outline' },
            { label: 'Active Filters', count: activeFilterCount, color: '#F59E0B', icon: 'options-outline' },
            { label: 'Last Update', count: lastUpdated, color: '#10B981', icon: 'time-outline' },
        ];

        return (
            <View style={styles.statsWrapper}>
                {stats.map((item, idx) => (
                    <View key={idx} style={styles.statsCard}>
                        <View style={[styles.statsIcon, { backgroundColor: item.color + '15' }]}>
                            <Ionicons name={item.icon} size={18} color={item.color} />
                        </View>
                        <View style={styles.statsContent}>
                            <Text style={styles.statsCount} numberOfLines={1}>{item.count}</Text>
                            <Text style={styles.statsLabel} numberOfLines={1}>{item.label}</Text>
                        </View>
                    </View>
                ))}
            </View>
        );
    };

    const renderBadge = (statusText) => {
        if (!statusText) return <Text style={styles.naText}>-</Text>;
        let color = '#434AFA';
        const txt = statusText.toLowerCase();
        if (txt.includes('interested')) color = '#10B981';
        if (txt.includes('follow')) color = '#F97316';
        if (txt.includes('busy') || txt.includes('no answer')) color = '#6B7280';
        if (txt.includes('junk') || txt.includes('reject')) color = '#EF4444';

        return (
            <View style={[styles.badge, { backgroundColor: color + '15' }]}>
                <Text style={[styles.badgeText, { color: color }]}>{statusText}</Text>
            </View>
        );
    };

    const renderCardItem = ({ item }) => (
        <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={() => navigateToRemarkTrail(item)}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name || 'Unnamed Lead'}</Text>
                {renderBadge(item.calling_type_name)}
            </View>
            <View style={styles.cardBody}>
                <View style={styles.row}>
                    <Ionicons name="business-outline" size={16} color="#666" style={styles.icon} />
                    <Text style={styles.infoText} numberOfLines={1}>{item.company_name || 'No Company'}</Text>
                </View>
                <View style={styles.row}>
                    <Ionicons name="person-outline" size={16} color="#666" style={styles.icon} />
                    <Text style={styles.infoText} numberOfLines={1}>{item.contact_person || 'No Contact Person'}</Text>
                </View>
                <View style={styles.row}>
                    <Ionicons name="call-outline" size={16} color="#666" style={styles.icon} />
                    <Text
                        style={[styles.infoText, { color: '#434AFA', fontWeight: '600' }]}
                        onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
                    >
                        {item.phone || 'N/A'}
                    </Text>
                </View>
                <View style={styles.row}>
                    <Ionicons name="location-outline" size={16} color="#666" style={styles.icon} />
                    <Text style={styles.infoText} numberOfLines={1}>
                        {[item.city, item.state].filter(Boolean).join(', ') || 'N/A'}
                    </Text>
                </View>
                {item.latest_remark_text && (
                    <View style={styles.remarkSection}>
                        <Text style={styles.remarkTitle}>Latest Remark:</Text>
                        <Text style={styles.remarkBody} numberOfLines={2}>{item.latest_remark_text}</Text>
                    </View>
                )}
            </View>
            <View style={styles.cardFooter}>
                <Text style={styles.dateFooter}>Next F/Up: {item.next_follow_up_date || 'Not Scheduled'}</Text>
                <TouchableOpacity style={styles.historyBtn} onPress={() => navigateToRemarkTrail(item)}>
                    <Ionicons name="chatbubbles-outline" size={18} color="#434AFA" />
                    <Text style={styles.historyBtnText}>History</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const renderTableHeader = () => (
        <View style={styles.tableHeader}>
            <View style={{ width: 140 }}><Text style={styles.tableHeaderText}>Name</Text></View>
            <View style={{ width: 150 }}><Text style={styles.tableHeaderText}>Company</Text></View>
            <View style={{ width: 120 }}><Text style={styles.tableHeaderText}>Contact</Text></View>
            <View style={{ width: 120 }}><Text style={styles.tableHeaderText}>Type / Status</Text></View>
            <View style={{ width: 120 }}><Text style={styles.tableHeaderText}>Phone</Text></View>
            <View style={{ width: 100 }}><Text style={styles.tableHeaderText}>State</Text></View>
            <View style={{ width: 100 }}><Text style={styles.tableHeaderText}>City</Text></View>
            <View style={{ width: 160 }}><Text style={styles.tableHeaderText}>Latest Remark</Text></View>
            <View style={{ width: 120 }}><Text style={styles.tableHeaderText}>Follow-up</Text></View>
            <View style={{ width: 70, alignItems: 'center' }}><Text style={styles.tableHeaderText}>Actions</Text></View>
        </View>
    );

    const renderTableItem = ({ item }) => (
        <TouchableOpacity style={styles.tableRow} onPress={() => navigateToRemarkTrail(item)}>
            <Text style={[styles.tableCell, { width: 140 }]} numberOfLines={1}>{item.name || '-'}</Text>
            <Text style={[styles.tableCell, { width: 150 }]} numberOfLines={1}>{item.company_name || '-'}</Text>
            <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>{item.contact_person || '-'}</Text>
            <View style={[styles.tableCell, { width: 120, alignItems: 'flex-start', justifyContent: 'center' }]}>
                {renderBadge(item.calling_type_name)}
            </View>
            <Text
                style={[styles.tableCell, { width: 120, color: '#434AFA' }]}
                numberOfLines={1}
                onPress={() => item.phone && Linking.openURL(`tel:${item.phone}`)}
            >
                {item.phone || '-'}
            </Text>
            <Text style={[styles.tableCell, { width: 100 }]} numberOfLines={1}>{item.state || '-'}</Text>
            <Text style={[styles.tableCell, { width: 100 }]} numberOfLines={1}>{item.city || '-'}</Text>
            <Text style={[styles.tableCell, { width: 160 }]} numberOfLines={1}>{item.latest_remark_text || '-'}</Text>
            <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>{item.next_follow_up_date || '-'}</Text>
            <View style={[styles.tableCell, { width: 70, alignItems: 'center', justifyContent: 'center' }]}>
                <TouchableOpacity onPress={() => navigateToRemarkTrail(item)}>
                    <Ionicons name="chatbubble-ellipses" size={20} color="#434AFA" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const PaginationControls = () => (
        <View style={styles.pagination}>
            <TouchableOpacity
                disabled={pagination.current_page === 1 || loading}
                style={[styles.pageBtn, pagination.current_page === 1 && styles.disabledBtn]}
                onPress={() => loadCallings(pagination.current_page - 1)}
            >
                <Ionicons name="chevron-back" size={20} color={pagination.current_page === 1 ? '#CCC' : '#333'} />
            </TouchableOpacity>
            <Text style={styles.pageText}>Page {pagination.current_page} of {pagination.last_page}</Text>
            <TouchableOpacity
                disabled={pagination.current_page === pagination.last_page || loading}
                style={[styles.pageBtn, pagination.current_page === pagination.last_page && styles.disabledBtn]}
                onPress={() => loadCallings(pagination.current_page + 1)}
            >
                <Ionicons name="chevron-forward" size={20} color={pagination.current_page === pagination.last_page ? '#CCC' : '#333'} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Header title="All Calls" />

            {renderSummaryStats()}

            {/* Search and Filters Toolbar */}
            <View style={styles.toolbar}>
                <View style={styles.searchBar}>
                    <Ionicons name="search" size={20} color="#888" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search name, company, phone..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearchSubmit}
                    />
                </View>
                <View style={styles.toolbarToggles}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'card' && styles.activeToggle]}
                        onPress={() => setViewMode('card')}
                    >
                        <Ionicons name="grid-outline" size={18} color={viewMode === 'card' ? '#FFF' : '#555'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'table' && styles.activeToggle]}
                        onPress={() => setViewMode('table')}
                    >
                        <Ionicons name="list-outline" size={18} color={viewMode === 'table' ? '#FFF' : '#555'} />
                    </TouchableOpacity>
                </View>
                <TouchableOpacity
                    style={[styles.filterIconBtn, activeFilterCount > 0 && styles.filterIconBtnActive]}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons name="filter-sharp" size={18} color={activeFilterCount > 0 ? '#FFF' : '#434AFA'} />
                </TouchableOpacity>
            </View>

            {/* Content */}
            {loading && pagination.current_page === 1 && !refreshing ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#434AFA" />
                    <Text style={styles.loadingText}>Connecting to global database...</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {viewMode === 'card' ? (
                        <FlatList
                            data={callings}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderCardItem}
                            contentContainerStyle={styles.cardList}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                            ListEmptyComponent={<Text style={styles.emptyText}>No call logs found in repository.</Text>}
                        />
                    ) : (
                        <ScrollView horizontal bounces={false}>
                            <View>
                                {renderTableHeader()}
                                <FlatList
                                    data={callings}
                                    keyExtractor={(item) => item.id.toString()}
                                    renderItem={renderTableItem}
                                    contentContainerStyle={{ paddingBottom: 20 }}
                                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                                    ListEmptyComponent={<Text style={[styles.emptyText, { width: 300 }]}>No records found.</Text>}
                                />
                            </View>
                        </ScrollView>
                    )}
                    {callings.length > 0 && <PaginationControls />}
                </View>
            )}

            {/* DYNAMIC FILTER MODAL */}
            <Modal visible={filterModalVisible} transparent animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Queue</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalScroll}>
                            
                            <Text style={styles.sectionLabel}>Filter by State</Text>
                            <View style={styles.chipsGrid}>
                                <TouchableOpacity
                                    style={[styles.chip, !filters.state_name && styles.chipSel]}
                                    onPress={() => setFilters({ ...filters, state_name: '' })}
                                >
                                    <Text style={[styles.chipText, !filters.state_name && styles.chipTextSel]}>All</Text>
                                </TouchableOpacity>
                                {(filterOptions.states || []).slice(0, 20).map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.chip, filters.state_name === s && styles.chipSel]}
                                        onPress={() => setFilters({ ...filters, state_name: s })}
                                    >
                                        <Text style={[styles.chipText, filters.state_name === s && styles.chipTextSel]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Filter by City</Text>
                            <View style={styles.chipsGrid}>
                                <TouchableOpacity
                                    style={[styles.chip, !filters.city_name && styles.chipSel]}
                                    onPress={() => setFilters({ ...filters, city_name: '' })}
                                >
                                    <Text style={[styles.chipText, !filters.city_name && styles.chipTextSel]}>All</Text>
                                </TouchableOpacity>
                                {(filterOptions.cities || []).slice(0, 20).map((c) => (
                                    <TouchableOpacity
                                        key={c}
                                        style={[styles.chip, filters.city_name === c && styles.chipSel]}
                                        onPress={() => setFilters({ ...filters, city_name: c })}
                                    >
                                        <Text style={[styles.chipText, filters.city_name === c && styles.chipTextSel]}>{c}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Calling Status Type</Text>
                            <View style={styles.chipsGrid}>
                                <TouchableOpacity
                                    style={[styles.chip, !filters.calling_type_id && styles.chipSel]}
                                    onPress={() => setFilters({ ...filters, calling_type_id: '' })}
                                >
                                    <Text style={[styles.chipText, !filters.calling_type_id && styles.chipTextSel]}>All</Text>
                                </TouchableOpacity>
                                {(filterOptions.calling_types || []).map((t) => (
                                    <TouchableOpacity
                                        key={t.id}
                                        style={[styles.chip, filters.calling_type_id === t.id && styles.chipSel]}
                                        onPress={() => setFilters({ ...filters, calling_type_id: t.id })}
                                    >
                                        <Text style={[styles.chipText, filters.calling_type_id === t.id && styles.chipTextSel]}>{t.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                        </ScrollView>
                        <View style={styles.modalFooter}>
                            <TouchableOpacity style={[styles.footerBtn, styles.footerBtnReset]} onPress={handleResetFilters}>
                                <Text style={styles.footerBtnTextReset}>Clear All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.footerBtn, styles.footerBtnApply]} onPress={() => handleApplyFilters(filters)}>
                                <Text style={styles.footerBtnTextApply}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    
    statsWrapper: {
        flexDirection: 'row', justifyContent: 'space-between',
        marginHorizontal: 16, marginVertical: 12, gap: 8, height: 66, flexGrow: 0
    },
    statsCard: {
        flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 10,
        flexDirection: 'row', alignItems: 'center', gap: 6, elevation: 1.5
    },
    statsIcon: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    statsContent: { flex: 1 },
    statsCount: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
    statsLabel: { fontSize: 10, color: '#64748B' },

    toolbar: {
        flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12
    },
    searchBar: {
        flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
        height: 44, paddingHorizontal: 12, borderRadius: 10, elevation: 1
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: '#333' },
    toolbarToggles: {
        flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 8, padding: 3, marginLeft: 8, elevation: 1
    },
    toggleBtn: { padding: 8, borderRadius: 6 },
    activeToggle: { backgroundColor: '#434AFA' },
    filterIconBtn: {
        backgroundColor: '#FFF', padding: 10, borderRadius: 8, marginLeft: 8,
        justifyContent: 'center', alignItems: 'center', elevation: 1
    },
    filterIconBtnActive: { backgroundColor: '#434AFA' },

    cardList: { paddingHorizontal: 16, paddingBottom: 30 },
    card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', flex: 1, marginRight: 10 },
    cardBody: { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 10 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    icon: { marginRight: 8, width: 16 },
    infoText: { fontSize: 13, color: '#475569', flex: 1 },
    remarkSection: { marginTop: 6, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 6 },
    remarkTitle: { fontSize: 11, color: '#64748B', fontWeight: '600', marginBottom: 2 },
    remarkBody: { fontSize: 12, color: '#334155', fontStyle: 'italic' },
    cardFooter: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9'
    },
    dateFooter: { fontSize: 11, color: '#64748B' },
    historyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    historyBtnText: { fontSize: 13, fontWeight: '600', color: '#434AFA' },

    badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    naText: { fontSize: 12, color: '#94A3B8' },

    tableRow: {
        flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
        paddingVertical: 10, paddingHorizontal: 12
    },
    tableCell: { fontSize: 13, color: '#334155', paddingRight: 10, alignSelf: 'center' },
    tableHeader: {
        flexDirection: 'row', backgroundColor: '#EDF2F7', paddingVertical: 12, paddingHorizontal: 12
    },
    tableHeaderText: { fontSize: 11, fontWeight: 'bold', color: '#4A5568', paddingRight: 10 },

    pagination: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        paddingVertical: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0'
    },
    pageBtn: { padding: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, marginHorizontal: 15 },
    disabledBtn: { opacity: 0.4 },
    pageText: { fontSize: 14, color: '#333', fontWeight: '600' },

    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#64748B' },
    emptyText: { textAlign: 'center', marginTop: 40, fontSize: 14, color: '#94A3B8' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalBox: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '75%' },
    modalHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9'
    },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    modalScroll: { padding: 16 },
    sectionLabel: { fontSize: 14, fontWeight: 'bold', color: '#475569', marginBottom: 10 },
    chipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#F1F5F9', borderRadius: 20 },
    chipSel: { backgroundColor: '#434AFA' },
    chipText: { fontSize: 12, color: '#475569' },
    chipTextSel: { color: '#FFF', fontWeight: '600' },
    modalFooter: {
        flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10
    },
    footerBtn: { flex: 1, height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    footerBtnReset: { backgroundColor: '#F1F5F9' },
    footerBtnApply: { backgroundColor: '#434AFA' },
    footerBtnTextReset: { color: '#475569', fontWeight: '600' },
    footerBtnTextApply: { color: '#FFF', fontWeight: '600' }
});

export default CallingAllScreen;
