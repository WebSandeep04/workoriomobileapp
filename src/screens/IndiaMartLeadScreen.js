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
    Alert,
    Linking
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';
import Header from '../components/Header';

const IndiaMartLeadScreen = ({ route }) => {
    const navigation = useNavigation();
    const isJunkMode = route.name === 'indiamart.junk.index';

    const [leads, setLeads] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
    const [summaryStats, setSummaryStats] = useState(null);
    
    // Modals Visibility
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [junkModalVisible, setJunkModalVisible] = useState(false);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);

    // Filtering States
    const [filterOptions, setFilterOptions] = useState({ statuses: [], query_types: [] });
    const [filters, setFilters] = useState({ status: '', query_type: '', date_from: '', date_to: '' });
    const [activeStatus, setActiveStatus] = useState('');

    // Team Members for assignment
    const [teamMembers, setTeamMembers] = useState([]);
    const [assignLoading, setAssignLoading] = useState(false);
    const [memberSearch, setMemberSearch] = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);

    // Junk States
    const [junkReason, setJunkReason] = useState('');
    const [junkSubmitting, setJunkSubmitting] = useState(false);

    // Initialize data
    useEffect(() => {
        fetchFilterOptions();
        fetchTeamMembers();
    }, []);

    useEffect(() => {
        loadLeads(1, false);
        if (!isJunkMode) {
            fetchSummaryStats();
        }
    }, [route.name]);

    const fetchFilterOptions = async () => {
        try {
            const res = await api.get('/indiamart/filter-options');
            setFilterOptions(res.data);
        } catch (err) {
            console.log('Error loading filter options', err);
        }
    };

    const fetchTeamMembers = async (search = '') => {
        try {
            const res = await api.get('/leads/team-members', { params: { search } });
            setTeamMembers(res.data.data || []);
        } catch (err) {
            console.log('Error fetching team members', err);
        }
    };

    const fetchSummaryStats = async () => {
        try {
            const res = await api.get('/indiamart/stats');
            setSummaryStats(res.data);
        } catch (err) {
            console.log('Error loading stats', err);
        }
    };

    const loadLeads = async (page = 1, refresh = false, currentFilters = filters, search = searchQuery) => {
        if (refresh) setRefreshing(true);
        else setLoading(true);

        try {
            const endpoint = isJunkMode ? '/indiamart/junk-leads' : '/indiamart/leads';
            const activeParams = {
                page,
                per_page: 10,
                search: search.trim(),
                ...currentFilters
            };
            // Active status helper maps to standard status filtration override
            if (activeStatus && !isJunkMode) {
                activeParams.status = activeStatus;
            }

            const res = await api.get(endpoint, { params: activeParams });
            const { data, current_page, last_page, total } = res.data;
            setLeads(data || []);
            setPagination({ current_page: current_page || 1, last_page: last_page || 1, total: total || 0 });
        } catch (err) {
            console.log('Error fetching external leads', err);
            Alert.alert('Error', 'Could not load IndiaMART leads. Please try again.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        loadLeads(1, true);
        if (!isJunkMode) fetchSummaryStats();
    };

    const handleSearch = () => {
        loadLeads(1, false);
    };

    const handleStatusPillPress = (status) => {
        const targetStatus = activeStatus === status ? '' : status;
        setActiveStatus(targetStatus);
        // Construct inline parameters since setState is async
        const tempFilters = { ...filters };
        loadLeads(1, false, tempFilters, searchQuery);
    };

    // Assign Action Trigger
    const openAssignModal = (lead) => {
        setSelectedLead(lead);
        setSelectedUserId(null);
        setMemberSearch('');
        fetchTeamMembers('');
        setAssignModalVisible(true);
    };

    const handleAssignSubmit = async () => {
        if (!selectedUserId) {
            Alert.alert('Warning', 'Please select a user to assign this lead to.');
            return;
        }
        setAssignLoading(true);
        try {
            const payload = { lead_id: selectedLead.id, user_id: selectedUserId };
            const res = await api.post('/indiamart/assign', payload);
            if (res.data.success) {
                Alert.alert('Success', 'Lead assigned and converted successfully.');
                setAssignModalVisible(false);
                handleRefresh();
            } else {
                Alert.alert('Failed', res.data.message || 'Could not assign lead.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Internal error assigning lead.';
            Alert.alert('Error', msg);
        } finally {
            setAssignLoading(false);
        }
    };

    // Junk Action Trigger
    const openJunkModal = (lead) => {
        setSelectedLead(lead);
        setJunkReason('');
        setJunkModalVisible(true);
    };

    const handleJunkSubmit = async () => {
        if (!junkReason.trim()) {
            Alert.alert('Warning', 'Please provide a reason for marking this lead as junk.');
            return;
        }
        setJunkSubmitting(true);
        try {
            const payload = { lead_id: selectedLead.id, junk_reason: junkReason.trim() };
            const res = await api.post('/indiamart/junk', payload);
            if (res.data.success) {
                Alert.alert('Success', 'Lead marked as junk.');
                setJunkModalVisible(false);
                handleRefresh();
            }
        } catch (err) {
            Alert.alert('Error', 'Error submitting junk report.');
        } finally {
            setJunkSubmitting(false);
        }
    };

    // Restore Junk Logic
    const handleRestoreLead = (lead) => {
        Alert.alert(
            'Restore Lead',
            'Are you sure you want to restore this lead back to active pipeline?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Restore',
                    onPress: async () => {
                        try {
                            const res = await api.post('/indiamart/junk/restore', { lead_id: lead.id });
                            if (res.data.success) {
                                Alert.alert('Success', 'Lead restored.');
                                handleRefresh();
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Could not restore lead.');
                        }
                    }
                }
            ]
        );
    };

    // Delete Junk Logic
    const handleDeleteLead = (lead) => {
        Alert.alert(
            'Delete Lead Permanently',
            'This action cannot be undone. The lead will be removed forever.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Permanently',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const res = await api.post('/indiamart/junk/delete', { lead_id: lead.id });
                            if (res.data.success) {
                                Alert.alert('Success', 'Lead deleted forever.');
                                handleRefresh();
                            }
                        } catch (err) {
                            Alert.alert('Error', 'Delete request failed.');
                        }
                    }
                }
            ]
        );
    };

    // Filters Application
    const handleApplyFilters = (newFilters) => {
        setFilters(newFilters);
        setFilterModalVisible(false);
        loadLeads(1, false, newFilters);
    };

    const handleResetFilters = () => {
        const reset = { status: '', query_type: '', date_from: '', date_to: '' };
        setFilters(reset);
        setActiveStatus('');
        setFilterModalVisible(false);
        loadLeads(1, false, reset);
    };

    const renderStatusBadge = (status) => {
        const key = (status || 'new').toString().trim().toLowerCase();
        let color = '#434AFA';
        if (key === 'processing') color = '#F97316';
        if (key === 'converted') color = '#10B981';
        if (key === 'junk') color = '#333333';

        return (
            <View style={[styles.badge, { backgroundColor: color }]}>
                <Text style={styles.badgeText}>{key.toUpperCase()}</Text>
            </View>
        );
    };

    const formatDateTime = (val) => {
        if (!val) return 'N/A';
        return val.replace('T', ' ').substring(0, 16);
    };

    // Top stats cards
    const renderSummaryStats = () => {
        if (!summaryStats || isJunkMode) return null;

        const stats = [
            { label: 'New Leads', count: summaryStats.new_leads, color: '#0284C7', icon: 'flash-outline' },
            { label: 'Processing', count: summaryStats.processing_leads, color: '#D97706', icon: 'sync-outline' },
            { label: 'Converted', count: summaryStats.converted_leads, color: '#059669', icon: 'checkmark-done-circle-outline' },
            { label: 'Assigned', count: summaryStats.assigned_leads, color: '#7C3AED', icon: 'people-circle-outline' },
            { label: 'Junk', count: summaryStats.junk_leads, color: '#E11D48', icon: 'trash-outline' },
        ];

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8 }}>
                {stats.map((item, idx) => (
                    <View key={idx} style={styles.statsCard}>
                        <View style={[styles.statsIcon, { backgroundColor: item.color + '15' }]}>
                            <Ionicons name={item.icon} size={20} color={item.color} />
                        </View>
                        <View>
                            <Text style={styles.statsCount}>{item.count || 0}</Text>
                            <Text style={styles.statsLabel} numberOfLines={1}>{item.label}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        );
    };

    // Rendering Item logic
    const renderCardItem = ({ item }) => {
        const canAssign = !item.is_processed && item.status?.toLowerCase() !== 'junk';
        const canJunk = !item.is_processed && !item.sales_record_id && !isJunkMode;

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                style={styles.card}
                onPress={() => navigation.navigate('IndiaMartRemark', { lead: item, isJunkMode })}
            >
                <View style={styles.cardHeader}>
                    <Text style={styles.leadName}>{item.sender_name || 'No Sender Name'}</Text>
                    {renderStatusBadge(item.status)}
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.row}>
                        <Ionicons name="briefcase-outline" size={16} color="#666" style={styles.icon} />
                        <Text style={[styles.infoText, { fontWeight: '600', color: '#333' }]}>
                            {item.query_product_name || item.product_name || 'Product unspecified'}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Ionicons name="call-outline" size={16} color="#666" style={styles.icon} />
                        <Text style={[styles.infoText, { color: '#434AFA' }]} onPress={() => { if (item.sender_mobile) Linking.openURL(`tel:${item.sender_mobile}`) }}>
                            {item.sender_mobile || 'N/A'}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Ionicons name="business-outline" size={16} color="#666" style={styles.icon} />
                        <Text style={styles.infoText}>{item.sender_company || 'N/A'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Ionicons name="location-outline" size={16} color="#666" style={styles.icon} />
                        <Text style={styles.infoText}>{item.sender_city || 'N/A'}</Text>
                    </View>
                    <View style={styles.row}>
                        <Ionicons name="time-outline" size={16} color="#666" style={styles.icon} />
                        <Text style={styles.infoText}>Inquired At: {formatDateTime(item.query_time)}</Text>
                    </View>
                    
                    {isJunkMode && item.junk_reason && (
                        <View style={[styles.remarkContainer, { backgroundColor: '#FFF5F5' }]}>
                            <Text style={[styles.remarkLabel, { color: '#E11D48' }]}>Junk Reason:</Text>
                            <Text style={styles.remarkText}>{item.junk_reason}</Text>
                        </View>
                    )}

                    {item.latest_remark && (
                        <View style={styles.remarkContainer}>
                            <Text style={styles.remarkLabel}>Latest Remark:</Text>
                            <Text style={styles.remarkText}>{item.latest_remark}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.cardFooter}>
                    {isJunkMode ? (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity style={[styles.actionBtnSmall, { borderColor: '#059669' }]} onPress={() => handleRestoreLead(item)}>
                                <Ionicons name="refresh-circle" size={16} color="#059669" />
                                <Text style={[styles.actionBtnSmallText, { color: '#059669' }]}>Restore</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtnSmall, { borderColor: '#E11D48' }]} onPress={() => handleDeleteLead(item)}>
                                <Ionicons name="trash-outline" size={16} color="#E11D48" />
                                <Text style={[styles.actionBtnSmallText, { color: '#E11D48' }]}>Delete</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                style={[styles.actionBtnSmall, !canAssign && { opacity: 0.5 }]}
                                disabled={!canAssign}
                                onPress={() => openAssignModal(item)}
                            >
                                <Ionicons name="person-add-outline" size={16} color="#434AFA" />
                                <Text style={styles.actionBtnSmallText}>Assign</Text>
                            </TouchableOpacity>
                            
                            {canJunk && (
                                <TouchableOpacity style={[styles.actionBtnSmall, { borderColor: '#E11D48' }]} onPress={() => openJunkModal(item)}>
                                    <Ionicons name="warning-outline" size={16} color="#E11D48" />
                                    <Text style={[styles.actionBtnSmallText, { color: '#E11D48' }]}>Junk</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                    <TouchableOpacity style={styles.remarkIconBtn} onPress={() => navigation.navigate('IndiaMartRemark', { lead: item, isJunkMode })}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color="#434AFA" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const renderTableItem = ({ item }) => {
        const canAssign = !item.is_processed && item.status?.toLowerCase() !== 'junk';
        const canJunk = !item.is_processed && !item.sales_record_id && !isJunkMode;

        return (
            <TouchableOpacity
                style={styles.tableRow}
                onPress={() => navigation.navigate('IndiaMartRemark', { lead: item, isJunkMode })}
            >
                {/* 1. Time */}
                <Text style={[styles.tableCell, { width: 130 }]} numberOfLines={1}>
                    {formatDateTime(item.query_time)}
                </Text>

                {/* 2. Status */}
                <View style={[styles.tableCell, { width: 110, alignItems: 'center' }]}>
                    {renderStatusBadge(item.status)}
                </View>

                {/* 3. Product */}
                <Text style={[styles.tableCell, { width: 160 }]} numberOfLines={2}>
                    {item.query_product_name || item.product_name || '-'}
                </Text>

                {/* 4. Sender Name */}
                <Text style={[styles.tableCell, { width: 140 }]} numberOfLines={1}>
                    {item.sender_name || '-'}
                </Text>

                {/* 5. Mobile */}
                <Text style={[styles.tableCell, { width: 120, color: '#434AFA' }]} numberOfLines={1} onPress={() => { if (item.sender_mobile) Linking.openURL(`tel:${item.sender_mobile}`) }}>
                    {item.sender_mobile || '-'}
                </Text>

                {/* 6. Company */}
                <Text style={[styles.tableCell, { width: 160 }]} numberOfLines={1}>
                    {item.sender_company || '-'}
                </Text>

                {/* 7. City */}
                <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>
                    {item.sender_city || '-'}
                </Text>

                {/* 8. Latest Remark */}
                <Text style={[styles.tableCell, { width: 180 }]} numberOfLines={2}>
                    {item.latest_remark || '-'}
                </Text>
                
                {/* 9. Junk Reason */}
                {isJunkMode && (
                    <Text style={[styles.tableCell, { width: 180, color: '#E11D48' }]} numberOfLines={2}>
                        {item.junk_reason || '-'}
                    </Text>
                )}

                {/* 10. Actions Column */}
                <View style={[styles.tableCell, { width: 140, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }]}>
                    {isJunkMode ? (
                        <>
                            <TouchableOpacity onPress={() => handleRestoreLead(item)} style={styles.tableActionIcon}>
                                <Ionicons name="refresh-circle" size={20} color="#059669" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteLead(item)} style={styles.tableActionIcon}>
                                <Ionicons name="trash" size={20} color="#E11D48" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity disabled={!canAssign} style={[styles.tableActionIcon, !canAssign && { opacity: 0.3 }]} onPress={() => openAssignModal(item)}>
                                <Ionicons name="person-add" size={20} color="#434AFA" />
                            </TouchableOpacity>
                            {canJunk && (
                                <TouchableOpacity style={styles.tableActionIcon} onPress={() => openJunkModal(item)}>
                                    <Ionicons name="warning" size={20} color="#E11D48" />
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                    <TouchableOpacity style={styles.tableActionIcon} onPress={() => navigation.navigate('IndiaMartRemark', { lead: item, isJunkMode })}>
                        <Ionicons name="chatbubble-ellipses" size={20} color="#555" />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    const renderTableHeader = () => (
        <View style={styles.tableHeader}>
            <View style={{ width: 130 }}><Text style={styles.tableHeaderText}>Query Time</Text></View>
            <View style={{ width: 110, alignItems: 'center' }}><Text style={styles.tableHeaderText}>Status</Text></View>
            <View style={{ width: 160 }}><Text style={styles.tableHeaderText}>Product</Text></View>
            <View style={{ width: 140 }}><Text style={styles.tableHeaderText}>Sender</Text></View>
            <View style={{ width: 120 }}><Text style={styles.tableHeaderText}>Mobile</Text></View>
            <View style={{ width: 160 }}><Text style={styles.tableHeaderText}>Company</Text></View>
            <View style={{ width: 120 }}><Text style={styles.tableHeaderText}>City</Text></View>
            <View style={{ width: 180 }}><Text style={styles.tableHeaderText}>Latest Remark</Text></View>
            {isJunkMode && <View style={{ width: 180 }}><Text style={[styles.tableHeaderText, { color: '#E11D48' }]}>Junk Reason</Text></View>}
            <View style={{ width: 140, alignItems: 'center' }}><Text style={styles.tableHeaderText}>Actions</Text></View>
        </View>
    );

    const renderList = () => {
        if (loading && pagination.current_page === 1 && !refreshing) {
            return (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#434AFA" />
                    <Text style={{ marginTop: 10, color: '#666' }}>Loading external leads...</Text>
                </View>
            );
        }

        if (viewMode === 'card') {
            return (
                <View style={{ flex: 1 }}>
                    <FlatList
                        data={leads}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderCardItem}
                        contentContainerStyle={styles.listContent}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                        ListEmptyComponent={!loading && <Text style={styles.emptyText}>No IndiaMART leads found.</Text>}
                    />
                    {leads.length > 0 && <PaginationControls />}
                </View>
            );
        } else {
            return (
                <View style={{ flex: 1 }}>
                    <ScrollView horizontal bounces={false}>
                        <View>
                            {renderTableHeader()}
                            <FlatList
                                data={leads}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={renderTableItem}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                                ListEmptyComponent={!loading && <Text style={styles.emptyText}>No IndiaMART leads found.</Text>}
                            />
                        </View>
                    </ScrollView>
                    {leads.length > 0 && <PaginationControls />}
                </View>
            );
        }
    };

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

    return (
        <View style={styles.container}>
            <Header title={isJunkMode ? "IndiaMART Junk" : "IndiaMART Leads"} />

            {!isJunkMode && renderSummaryStats()}

            {/* Control Bar */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 10 }}>
                <View style={[styles.searchContainer, { margin: 0, flex: 1 }]}>
                    <Ionicons name="search" size={20} color="#999" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search sender, company, product..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                    />
                </View>

                <View style={styles.toggleContainer}>
                    <TouchableOpacity style={[styles.toggleButton, viewMode === 'card' && styles.activeToggle]} onPress={() => setViewMode('card')}>
                        <Ionicons name="grid-outline" size={20} color={viewMode === 'card' ? '#fff' : '#666'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.toggleButton, viewMode === 'table' && styles.activeToggle]} onPress={() => setViewMode('table')}>
                        <Ionicons name="list-outline" size={20} color={viewMode === 'table' ? '#fff' : '#666'} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.toggleContainer, { padding: 8, marginLeft: 8, backgroundColor: '#fff' }]}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons name="filter" size={20} color="#434AFA" />
                </TouchableOpacity>
            </View>

            {renderList()}

            {/* ASSIGN LEAD MODAL */}
            <Modal visible={assignModalVisible} transparent animationType="slide" onRequestClose={() => setAssignModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeaderLayout}>
                            <Text style={styles.modalTitleText}>Assign External Lead</Text>
                            <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.assignSearchBox}>
                            <Ionicons name="search" size={18} color="#666" />
                            <TextInput
                                style={styles.assignSearchInput}
                                placeholder="Search team members..."
                                value={memberSearch}
                                onChangeText={(txt) => { setMemberSearch(txt); fetchTeamMembers(txt); }}
                            />
                        </View>
                        <FlatList
                            data={teamMembers}
                            keyExtractor={(item) => item.id.toString()}
                            style={{ maxHeight: 250 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[styles.memberRow, selectedUserId === item.id && { backgroundColor: '#EEF2FF' }]}
                                    onPress={() => setSelectedUserId(item.id)}
                                >
                                    <Ionicons
                                        name={selectedUserId === item.id ? "radio-button-on" : "radio-button-off"}
                                        size={20}
                                        color={selectedUserId === item.id ? "#434AFA" : "#666"}
                                    />
                                    <Text style={[styles.memberName, selectedUserId === item.id && { fontWeight: 'bold', color: '#434AFA' }]}>
                                        {item.name}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        />
                        <View style={styles.modalFooterAction}>
                            <TouchableOpacity
                                style={[styles.primaryButton, { flex: 1 }, !selectedUserId && { backgroundColor: '#CCC' }]}
                                disabled={assignLoading || !selectedUserId}
                                onPress={handleAssignSubmit}
                            >
                                {assignLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Confirm Assignment</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* JUNK REPORT MODAL */}
            <Modal visible={junkModalVisible} transparent animationType="fade" onRequestClose={() => setJunkModalVisible(false)}>
                <View style={[styles.modalOverlay, { justifyContent: 'center', padding: 20 }]}>
                    <View style={[styles.modalContainer, { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, height: 'auto', paddingBottom: 20 }]}>
                        <View style={styles.modalHeaderLayout}>
                            <Text style={styles.modalTitleText}>Mark as Junk</Text>
                            <TouchableOpacity onPress={() => setJunkModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <View style={{ padding: 16 }}>
                            <Text style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Please enter a reason for flagging this lead as Junk:</Text>
                            <TextInput
                                style={styles.reasonInput}
                                multiline
                                numberOfLines={4}
                                placeholder="Type junk reason here..."
                                value={junkReason}
                                onChangeText={setJunkReason}
                            />
                        </View>
                        <View style={{ flexDirection: 'row', paddingHorizontal: 16, gap: 10 }}>
                            <TouchableOpacity style={[styles.primaryButton, { flex: 1, backgroundColor: '#E11D48' }]} disabled={junkSubmitting} onPress={handleJunkSubmit}>
                                {junkSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Submit</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* FILTER MODAL */}
            <Modal visible={filterModalVisible} transparent animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { height: '65%' }]}>
                        <View style={styles.modalHeaderLayout}>
                            <Text style={styles.modalTitleText}>Filter External Leads</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#333" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={{ padding: 16 }}>
                            <Text style={styles.filterLabel}>Query Type</Text>
                            <View style={styles.filterGrid}>
                                {['All', ...(filterOptions.query_types || [])].map((qt) => {
                                    const val = qt === 'All' ? '' : qt;
                                    const isSel = filters.query_type === val;
                                    return (
                                        <TouchableOpacity
                                            key={qt}
                                            style={[styles.filterItem, isSel && styles.filterItemSel]}
                                            onPress={() => setFilters({ ...filters, query_type: val })}
                                        >
                                            <Text style={[styles.filterText, isSel && styles.filterTextSel]}>{qt}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <Text style={[styles.filterLabel, { marginTop: 20 }]}>Lead Status</Text>
                            <View style={styles.filterGrid}>
                                {['All', ...(filterOptions.statuses || [])].map((st) => {
                                    const val = st === 'All' ? '' : st;
                                    const isSel = filters.status === val;
                                    return (
                                        <TouchableOpacity
                                            key={st}
                                            style={[styles.filterItem, isSel && styles.filterItemSel]}
                                            onPress={() => setFilters({ ...filters, status: val })}
                                        >
                                            <Text style={[styles.filterText, isSel && styles.filterTextSel]}>{st}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </ScrollView>
                        <View style={{ flexDirection: 'row', padding: 16, borderTopColor: '#EEE', borderTopWidth: 1, gap: 10 }}>
                            <TouchableOpacity style={[styles.primaryButton, { flex: 1, backgroundColor: '#666' }]} onPress={handleResetFilters}>
                                <Text style={styles.primaryButtonText}>Reset</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={() => handleApplyFilters(filters)}>
                                <Text style={styles.primaryButtonText}>Apply</Text>
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
    statsScroll: { marginVertical: 10, flexGrow: 0, height: 80 },
    statsCard: {
        backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginRight: 10,
        minWidth: 130, height: 66, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 2
    },
    statsIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
    statsCount: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    statsLabel: { fontSize: 11, color: '#666' },
    
    searchContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', height: 46,
        paddingHorizontal: 12, borderRadius: 10, elevation: 1
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 15, color: '#333' },
    toggleContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: '#FFF', borderRadius: 8, padding: 3, elevation: 1 },
    toggleButton: { padding: 8, borderRadius: 6 },
    activeToggle: { backgroundColor: '#434AFA' },

    listContent: { paddingHorizontal: 16, paddingBottom: 40 },
    emptyText: { textAlign: 'center', marginTop: 30, color: '#999', fontSize: 14 },
    
    card: {
        backgroundColor: '#FFF', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    leadName: { fontSize: 16, fontWeight: 'bold', color: '#111827', flex: 1, marginRight: 10 },
    cardBody: { borderTopColor: '#F3F4F6', borderTopWidth: 1, paddingTop: 10 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    icon: { marginRight: 8, width: 16 },
    infoText: { fontSize: 13, color: '#4B5563', flex: 1 },
    remarkContainer: { marginTop: 8, backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10 },
    remarkLabel: { fontSize: 12, fontWeight: 'bold', color: '#434AFA', marginBottom: 4 },
    remarkText: { fontSize: 12, color: '#374151', fontStyle: 'italic' },

    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
    badgeText: { fontSize: 10, color: '#FFF', fontWeight: 'bold' },

    cardFooter: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14,
        borderTopColor: '#F3F4F6', borderTopWidth: 1, paddingTop: 12
    },
    actionBtnSmall: {
        flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#434AFA',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6
    },
    actionBtnSmallText: { fontSize: 12, color: '#434AFA', fontWeight: 'bold' },
    remarkIconBtn: { padding: 6 },

    // Table styling
    tableHeader: { flexDirection: 'row', backgroundColor: '#ECEFF1', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#CFD8DC' },
    tableHeaderText: { fontSize: 11, fontWeight: 'bold', color: '#455A64', paddingHorizontal: 6 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, backgroundColor: '#FFF', borderBottomColor: '#EEE', borderBottomWidth: 1 },
    tableCell: { fontSize: 12, color: '#333', paddingHorizontal: 6 },
    tableActionIcon: { padding: 6 },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '55%', overflow: 'hidden' },
    modalHeaderLayout: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomColor: '#EEE', borderBottomWidth: 1 },
    modalTitleText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    assignSearchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 12, margin: 16, height: 40 },
    assignSearchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
    memberRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomColor: '#F3F4F6', borderBottomWidth: 1 },
    memberName: { marginLeft: 10, fontSize: 15, color: '#333' },
    modalFooterAction: { padding: 16 },
    primaryButton: { backgroundColor: '#434AFA', borderRadius: 10, height: 48, justifyContent: 'center', alignItems: 'center' },
    primaryButtonText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },

    reasonInput: { borderColor: '#DDD', borderWidth: 1, borderRadius: 8, padding: 10, height: 100, textAlignVertical: 'top', color: '#333' },

    filterLabel: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    filterGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    filterItem: { backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    filterItemSel: { backgroundColor: '#434AFA' },
    filterText: { fontSize: 12, color: '#333' },
    filterTextSel: { color: '#FFF', fontWeight: 'bold' },

    paginationContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    pageButton: { padding: 8, backgroundColor: '#F9FAFB', borderRadius: 8, marginHorizontal: 15, borderWidth: 1, borderColor: '#EEE' },
    disabledButton: { opacity: 0.4 },
    pageInfoText: { fontSize: 13, fontWeight: 'bold', color: '#374151' }
});

export default IndiaMartLeadScreen;
