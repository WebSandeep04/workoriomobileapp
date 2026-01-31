import React, { useEffect, useState, useCallback } from 'react';
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
    Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyLeads, fetchFilterOptions } from '../store/slices/leadSlice';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import api from '../api/client';
import AddLeadModal from '../components/AddLeadModal';
import AssignLeadModal from '../components/AssignLeadModal';
import AddProspectModal from '../components/AddProspectModal';
import Header from '../components/Header';
import LeadFilterModal from '../components/LeadFilterModal';

const LeadScreen = () => {
    const dispatch = useDispatch();
    const { leads, pagination, loading, filterOptions, cityOptions, actionLoading } = useSelector((state) => state.lead);

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [modalVisible, setModalVisible] = useState(false);
    const [prospectModalVisible, setProspectModalVisible] = useState(false);
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filters, setFilters] = useState({});

    const [summaryStats, setSummaryStats] = useState(null);
    const [statusCounts, setStatusCounts] = useState([]);
    const [activeFilterType, setActiveFilterType] = useState(null);
    const [activeStatusId, setActiveStatusId] = useState(null);

    const [selectedLead, setSelectedLead] = useState(null);

    // Initial Fetch
    useEffect(() => {
        loadLeads(1);
        fetchDashboardStats();
        dispatch(fetchFilterOptions());
    }, [dispatch]);

    const fetchDashboardStats = async () => {
        try {
            const [statsRes, statusRes] = await Promise.all([
                api.get('/leads/stats'),
                api.get('/leads/status-counts')
            ]);
            setSummaryStats(statsRes.data.data);
            setStatusCounts(statusRes.data.data);
        } catch (error) {
            console.log("Error fetching dashboard stats", error);
        }
    };

    const loadLeads = (page, refresh = false, newFilters = null, filterType = null, statusId = null) => {
        const activeFilters = newFilters || filters;
        const currentFilterType = filterType !== null ? filterType : activeFilterType;
        const currentStatusId = statusId !== null ? statusId : activeStatusId;

        const queryParams = {
            page,
            search: searchQuery,
            ...activeFilters,
            ...(currentFilterType && { filter_type: currentFilterType }),
            ...(currentStatusId && { status_id: currentStatusId })
        };

        dispatch(fetchMyLeads(queryParams))
            .unwrap()
            .then(() => {
                if (refresh) setRefreshing(false);
            })
            .catch(() => {
                if (refresh) setRefreshing(false);
            });
    };

    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
        loadLeads(1, false, newFilters, activeFilterType, activeStatusId);
    };

    const handleResetFilters = () => {
        setFilters({});
        loadLeads(1, false, {}, activeFilterType, activeStatusId);
    };

    const handleDashboardFilter = (type) => {
        const newType = activeFilterType === type ? null : type;
        setActiveFilterType(newType);
        setActiveStatusId(null);
        loadLeads(1, false, null, newType, null);
    };

    const handleStatusFilter = (id) => {
        const newId = activeStatusId === id ? null : id;
        setActiveStatusId(newId);
        setActiveFilterType(null);
        loadLeads(1, false, null, null, newId);
    };

    const handleRefresh = () => {
        setRefreshing(true);
        fetchDashboardStats();
        loadLeads(1, true, null, activeFilterType, activeStatusId);
    };

    const handleLoadMore = () => {
        // Need to ensure filters are passed here too? 
        // Yes, 'filters' state is accessible here.
        if (!loading && pagination.current_page < pagination.last_page) {
            loadLeads(pagination.current_page + 1);
        }
    };

    const handleSearch = () => {
        loadLeads(1);
    };

    // Helper to render Status Badge (reused)
    const renderStatusBadge = (status, mini = false) => {
        const color = '#434AFA';
        const backgroundColor = '#EEF2FF';
        return (
            <View style={[styles.badge, { backgroundColor }, mini && { paddingHorizontal: 6, paddingVertical: 2 }]}>
                <Text style={[styles.badgeText, { color }, mini && { fontSize: 10 }]}>{status?.status_name || 'Unknown'}</Text>
            </View>
        );
    };

    const navigation = useNavigation(); // Hook for navigation

    // ... existing hooks

    const renderCardItem = ({ item }) => (
        <TouchableOpacity
            activeOpacity={0.9}
            style={styles.card}
            onPress={() => navigation.navigate('LeadRemark', { leadId: item.id })}
        >
            <View style={styles.cardHeader}>
                <Text style={styles.leadName}>{item.leads_name || 'No Name'}</Text>
                {renderStatusBadge(item.status)}
            </View>

            <View style={styles.cardBody}>
                {/* ... fields ... */}
                <View style={styles.row}>
                    <Ionicons name="person-outline" size={16} color="#666" style={styles.icon} />
                    <Text style={styles.infoText}>{item.contact_person || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                    <Ionicons name="call-outline" size={16} color="#666" style={styles.icon} />
                    <Text style={styles.infoText}>{item.contact_number || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                    <Ionicons name="mail-outline" size={16} color="#666" style={styles.icon} />
                    <Text style={styles.infoText}>{item.email || 'N/A'}</Text>
                </View>
                <View style={styles.row}>
                    <Ionicons name="calendar-outline" size={16} color="#666" style={styles.icon} />
                    <Text style={styles.infoText}>Next Follow Up: {item.next_follow_up_date ? item.next_follow_up_date.split('T')[0].split(' ')[0] : 'N/A'}</Text>
                </View>

                {item.latest_remark && (
                    <View style={styles.remarkContainer}>
                        <Text style={styles.remarkLabel}>Latest Remark:</Text>
                        <Text style={styles.remarkText}>{item.latest_remark.remark}</Text>
                    </View>
                )}
            </View>

            <View style={styles.cardFooter}>
                <TouchableOpacity
                    style={styles.assignButton}
                    onPress={(e) => {
                        // e.stopPropagation() helps if the parent is also touchable, prevent double action
                        setSelectedLead(item);
                        setAssignModalVisible(true);
                        // Prevent navigation if desired? React Native doesn't bubble onPress the same way as web, but nesting Touchables can be tricky.
                        // Here they are siblings in my new structure (Footer outside body), so safe.
                        // Wait, I wrapped the whole card in TouchableOpacity?
                        // Yes, so Footer is INSIDE.
                        // Nested Touchables in RN work: The deepest one wins.
                    }}
                >
                    <Ionicons name="person-add-outline" size={16} color="#434AFA" />
                    <Text style={styles.assignButtonText}>Assign</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    const renderTableItem = ({ item }) => (
        <TouchableOpacity
            style={styles.tableRow}
            onPress={() => navigation.navigate('LeadRemark', { leadId: item.id })}
        >
            <Text style={[styles.tableCell, { width: 150, color: '#434AFA', fontWeight: '500' }]} numberOfLines={1}>
                {item.leads_name || '-'}
            </Text>
            <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>{item.contact_person || '-'}</Text>
            <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>{item.contact_number || '-'}</Text>
            <Text style={[styles.tableCell, { width: 180 }]} numberOfLines={1}>{item.email || '-'}</Text>
            <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>{item.next_follow_up_date ? item.next_follow_up_date.split('T')[0].split(' ')[0] : '-'}</Text>
            <View style={[styles.tableCell, { width: 120, alignItems: 'center' }]}>
                {renderStatusBadge(item.status, true)}
            </View>
            <TouchableOpacity
                style={[styles.tableCell, { width: 80, alignItems: 'center' }]}
                onPress={() => {
                    setSelectedLead(item);
                    setAssignModalVisible(true);
                }}
            >
                <Ionicons name="person-add-outline" size={18} color="#434AFA" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderSummaryCards = () => {
        if (!summaryStats) return null;

        const cards = [
            { label: "Today's Follow Ups", key: 'today_followups', count: summaryStats.today_followups, color: '#434AFA', icon: 'calendar' },
            { label: "Under Process", key: 'under_process', count: summaryStats.under_process, color: '#F59E0B', icon: 'time' },
            { label: "Completed", key: 'today_completed', count: summaryStats.today_completed, color: '#10B981', icon: 'checkmark-circle' },
            { label: "Pending", key: 'today_pending', count: summaryStats.today_pending, color: '#EF4444', icon: 'alert-circle' },
            { label: "New Leads", key: 'today_new', count: summaryStats.today_new, color: '#3B82F6', icon: 'star' },
        ];

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {cards.map((card) => (
                    <TouchableOpacity
                        key={card.key}
                        style={[
                            styles.statsCard,
                            activeFilterType === card.key && { borderColor: card.color, borderWidth: 2 }
                        ]}
                        onPress={() => handleDashboardFilter(card.key)}
                    >
                        <View style={[styles.statsIcon, { backgroundColor: card.color + '20' }]}>
                            <Ionicons name={card.icon} size={20} color={card.color} />
                        </View>
                        <View>
                            <Text style={styles.statsCount}>{card.count || 0}</Text>
                            <Text style={styles.statsLabel}>{card.label}</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    const renderStatusFilters = () => {
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll} contentContainerStyle={{ paddingHorizontal: 16 }}>
                <TouchableOpacity
                    style={[styles.statusPill, !activeStatusId && !activeFilterType && styles.activePill]}
                    onPress={() => {
                        setActiveStatusId(null);
                        setActiveFilterType(null);
                        loadLeads(1);
                    }}
                >
                    <Text style={[styles.statusPillText, !activeStatusId && !activeFilterType && styles.activePillText]}>All</Text>
                </TouchableOpacity>
                {statusCounts.map((status) => (
                    <TouchableOpacity
                        key={status.id}
                        style={[styles.statusPill, activeStatusId === status.id && styles.activePill]}
                        onPress={() => handleStatusFilter(status.id)}
                    >
                        <Text style={[styles.statusPillText, activeStatusId === status.id && styles.activePillText]}>
                            {status.status_name} ({status.count})
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    const renderHeaderContent = () => (
        <>
            <View style={{ marginBottom: 10, marginTop: 10 }}>
                {renderSummaryCards()}
            </View>
            <View style={{ marginBottom: 10 }}>
                {renderStatusFilters()}
            </View>
        </>
    );

    const renderTableHeader = () => (
        <View style={styles.tableHeader}>
            <View style={{ width: 150 }}><Text style={styles.tableHeaderText}>Lead Name</Text></View>
            <View style={{ width: 120 }}><Text style={styles.tableHeaderText}>Contact</Text></View>
            <View style={{ width: 120 }}><Text style={styles.tableHeaderText}>Phone</Text></View>
            <View style={{ width: 180 }}><Text style={styles.tableHeaderText}>Email</Text></View>
            <View style={{ width: 120 }}><Text style={styles.tableHeaderText}>Follow Up</Text></View>
            <View style={{ width: 120, alignItems: 'center' }}><Text style={styles.tableHeaderText}>Status</Text></View>
            <View style={{ width: 80, alignItems: 'center' }}><Text style={styles.tableHeaderText}>Action</Text></View>
        </View>
    );

    const PaginationControls = () => (
        <View style={styles.paginationContainer}>
            <TouchableOpacity
                style={[styles.pageButton, pagination.current_page === 1 && styles.disabledButton]}
                disabled={pagination.current_page === 1 || loading}
                onPress={() => loadLeads(pagination.current_page - 1)}
            >
                <Ionicons name="chevron-back" size={20} color={pagination.current_page === 1 ? '#ccc' : '#333'} />
            </TouchableOpacity>

            <Text style={styles.pageInfoText}>
                Page {pagination.current_page} of {pagination.last_page}
            </Text>

            <TouchableOpacity
                style={[styles.pageButton, pagination.current_page === pagination.last_page && styles.disabledButton]}
                disabled={pagination.current_page === pagination.last_page || loading}
                onPress={() => loadLeads(pagination.current_page + 1)}
            >
                <Ionicons name="chevron-forward" size={20} color={pagination.current_page === pagination.last_page ? '#ccc' : '#333'} />
            </TouchableOpacity>
        </View>
    );

    const renderList = () => {
        if (viewMode === 'card') {
            return (
                <FlatList
                    data={leads}
                    renderItem={renderCardItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                    onEndReached={handleLoadMore}
                    onEndReachedThreshold={0.5}
                    ListHeaderComponent={renderHeaderContent}
                    ListFooterComponent={loading && !refreshing ? <ActivityIndicator size="small" color="#434AFA" style={{ margin: 20 }} /> : null}
                    ListEmptyComponent={!loading && <Text style={styles.emptyText}>No leads found.</Text>}
                />
            );
        } else {
            return (
                <View style={{ flex: 1 }}>
                    {renderHeaderContent()}
                    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                        <View>
                            {renderTableHeader()}
                            <FlatList
                                data={leads}
                                renderItem={renderTableItem}
                                keyExtractor={(item) => item.id.toString()}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                                ListEmptyComponent={!loading && <Text style={styles.emptyText}>No leads found.</Text>}
                            />
                        </View>
                    </ScrollView>
                    {leads.length > 0 && <PaginationControls />}
                </View>
            );
        }
    };

    return (
        <View style={styles.container}>
            <Header title="Lead" />
            {/* Search Bar & View Toggle */}
            <View style={{ flexDirection: 'row', alignItems: 'center', margin: 16 }}>
                <View style={[styles.searchContainer, { margin: 0, flex: 1 }]}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search leads..."
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                    />
                </View>

                {/* View Toggles */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, viewMode === 'card' && styles.activeToggle]}
                        onPress={() => setViewMode('card')}
                    >
                        <Ionicons name="grid-outline" size={20} color={viewMode === 'card' ? '#fff' : '#666'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, viewMode === 'table' && styles.activeToggle]}
                        onPress={() => setViewMode('table')}
                    >
                        <Ionicons name="list-outline" size={20} color={viewMode === 'table' ? '#fff' : '#666'} />
                    </TouchableOpacity>
                </View>

                {/* Filter Button */}
                <TouchableOpacity
                    style={[styles.toggleContainer, { padding: 8, backgroundColor: Object.keys(filters).length > 0 ? '#EEF2FF' : '#fff' }]}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons name="filter" size={20} color={Object.keys(filters).length > 0 ? '#434AFA' : '#666'} />
                </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            {renderList()}

            <AddLeadModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                onAddProspect={() => setProspectModalVisible(true)}
            />
            <AddProspectModal visible={prospectModalVisible} onClose={() => setProspectModalVisible(false)} />

            <AssignLeadModal
                visible={assignModalVisible}
                onClose={() => setAssignModalVisible(false)}
                lead={selectedLead}
            />

            <LeadFilterModal
                visible={filterModalVisible}
                onClose={() => setFilterModalVisible(false)}
                filterOptions={filterOptions}
                currentFilters={filters}
                onApply={handleApplyFilters}
                onReset={handleResetFilters}
            />

            <TouchableOpacity
                style={styles.fab}
                onPress={() => setModalVisible(true)}
            >
                <Ionicons name="add" size={30} color="#fff" />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F8FA',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        margin: 16,
        paddingHorizontal: 16,
        height: 50,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#333',
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 80,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    leadName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    cardBody: {
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        marginRight: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#555',
    },
    remarkContainer: {
        marginTop: 8,
        padding: 10,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
    },
    remarkLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 4,
    },
    remarkText: {
        fontSize: 14,
        color: '#444',
        fontStyle: 'italic',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#999',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#434AFA',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#434AFA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 10,
        justifyContent: 'space-between',
        gap: 10,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    statsScroll: {
        marginBottom: 8,
    },
    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 12,
        marginRight: 10,
        minWidth: 140,
        elevation: 2,
        borderWidth: 1,
        borderColor: 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 70,
    },
    statsIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsCount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statsLabel: {
        fontSize: 12,
        color: '#666',
        maxWidth: 90,
    },
    statusScroll: {
        marginBottom: 8,
    },
    statusPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        elevation: 1,
    },
    activePill: {
        backgroundColor: '#EEF2FF',
        borderColor: '#434AFA',
    },
    statusPillText: {
        color: '#666',
        fontSize: 12,
        fontWeight: '600',
    },
    activePillText: {
        color: '#434AFA',
    },
    cardFooter: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        alignItems: 'flex-end',
    },
    assignButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    assignButtonText: {
        marginLeft: 6,
        color: '#434AFA',
        fontWeight: '600',
        fontSize: 14,
    },
    // Table Styles
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#E5E7EB',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
    },
    tableHeaderText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    tableCell: {
        fontSize: 12,
        color: '#333',
        paddingRight: 4,
    },
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 10,
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 4,
    },
    toggleButton: {
        padding: 8,
        borderRadius: 6,
    },
    activeToggle: {
        backgroundColor: '#434AFA',
    },
    // Pagination Styles
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    pageButton: {
        padding: 10,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        marginHorizontal: 10,
        borderWidth: 1,
        borderColor: '#eee',
    },
    disabledButton: {
        opacity: 0.5,
    },
    pageInfoText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#434AFA',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#434AFA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
});

export default LeadScreen;