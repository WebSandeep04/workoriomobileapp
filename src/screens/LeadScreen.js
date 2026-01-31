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
import AddLeadModal from '../components/AddLeadModal';
import AssignLeadModal from '../components/AssignLeadModal';
import AddProspectModal from '../components/AddProspectModal';
import Header from '../components/Header';

const LeadScreen = () => {
    const dispatch = useDispatch();
    const { leads, pagination, loading, filterOptions, cityOptions, actionLoading } = useSelector((state) => state.lead);

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [modalVisible, setModalVisible] = useState(false);
    const [prospectModalVisible, setProspectModalVisible] = useState(false);
    const [assignModalVisible, setAssignModalVisible] = useState(false);
    const [selectedLead, setSelectedLead] = useState(null);

    // Initial Fetch
    useEffect(() => {
        loadLeads(1);
        dispatch(fetchFilterOptions());
    }, [dispatch]);

    const loadLeads = (page, refresh = false) => {
        dispatch(fetchMyLeads({ page, search: searchQuery }))
            .unwrap()
            .then(() => {
                if (refresh) setRefreshing(false);
            })
            .catch(() => {
                if (refresh) setRefreshing(false);
            });
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadLeads(1, true);
    };

    const handleLoadMore = () => {
        if (!loading && pagination.current_page < pagination.last_page) {
            loadLeads(pagination.current_page + 1);
        }
    };

    const handleSearch = () => {
        loadLeads(1);
    };

    // Helper to render Status Badge
    const renderStatusBadge = (status) => {
        // You can customize colors based on status content or ID
        const color = '#434AFA';
        const backgroundColor = '#EEF2FF';

        return (
            <View style={[styles.badge, { backgroundColor }]}>
                <Text style={[styles.badgeText, { color }]}>{status?.status_name || 'Unknown'}</Text>
            </View>
        );
    };

    const renderItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.leadName}>{item.leads_name || 'No Name'}</Text>
                {renderStatusBadge(item.status)}
            </View>

            <View style={styles.cardBody}>
                <View style={styles.row}>
                    <Ionicons name="person-outline" size={16} color="#666" style={styles.icon} />
                    <Text style={styles.infoText}>{item.contact_person}</Text>
                </View>
                <View style={styles.row}>
                    <Ionicons name="call-outline" size={16} color="#666" style={styles.icon} />
                    <Text style={styles.infoText}>{item.contact_number}</Text>
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
                    onPress={() => {
                        setSelectedLead(item);
                        setAssignModalVisible(true);
                    }}
                >
                    <Ionicons name="person-add-outline" size={16} color="#434AFA" />
                    <Text style={styles.assignButtonText}>Assign</Text>
                </TouchableOpacity>
            </View>
        </View >
    );

    return (
        <View style={styles.container}>
            <Header title="Lead" />
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search leads..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                />
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#434AFA' }]} onPress={() => setProspectModalVisible(true)}>
                    <Ionicons name="business" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.actionButtonText}>Add Prospect</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10B981' }]} onPress={() => setModalVisible(true)}>
                    <Ionicons name="add-circle" size={18} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.actionButtonText}>Add Lead</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={leads}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                onEndReached={handleLoadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    loading && !refreshing ? <ActivityIndicator size="small" color="#434AFA" style={{ margin: 20 }} /> : null
                }
                ListEmptyComponent={
                    !loading && <Text style={styles.emptyText}>No leads found.</Text>
                }
            />

            <AddLeadModal visible={modalVisible} onClose={() => setModalVisible(false)} />
            <AddProspectModal visible={prospectModalVisible} onClose={() => setProspectModalVisible(false)} />

            <AssignLeadModal
                visible={assignModalVisible}
                onClose={() => setAssignModalVisible(false)}
                lead={selectedLead}
            />
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
});

export default LeadScreen;