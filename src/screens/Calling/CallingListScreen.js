import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    RefreshControl,
    TouchableOpacity,
    Alert
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../api/client';
import Header from '../../components/Header';

const CallingListScreen = () => {
    const [segments, setSegments] = useState([]);
    const [totalLeads, setTotalLeads] = useState(0);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState('--');

    useEffect(() => {
        loadSegments(1, false);
    }, []);

    const loadSegments = async (page = 1, refresh = false) => {
        if (refresh) setRefreshing(true);
        else setLoading(true);

        try {
            const res = await api.get('/calling/lists', {
                params: { page, per_page: 10 }
            });

            const { lists, total_leads } = res.data;

            setSegments(lists?.data || []);
            setTotalLeads(total_leads || 0);
            setPagination({
                current_page: lists?.current_page || 1,
                last_page: lists?.last_page || 1,
                total: lists?.total || 0
            });

            const now = new Date();
            setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        } catch (err) {
            console.log('Error fetching segments list:', err);
            Alert.alert('Connection Error', 'Failed to load segment collection from repository.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        loadSegments(1, true);
    };

    const confirmDelete = (item) => {
        Alert.alert(
            'Remove Segment',
            `Are you sure you want to remove '${item.name}'? This will permanently delete all associated calling records! This action cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete List',
                    style: 'destructive',
                    onPress: () => performDelete(item.id)
                }
            ]
        );
    };

    const performDelete = async (id) => {
        try {
            const res = await api.delete(`/calling/lists/${id}`);
            if (res.data.success) {
                Alert.alert('Success', res.data.message || 'Segment removed.');
                loadSegments(1, false);
            } else {
                Alert.alert('Error', res.data.message || 'Deletion failed.');
            }
        } catch (err) {
            console.log('Failed to delete segment', err);
            Alert.alert('Failed Action', 'Internal server encountered error during list purge.');
        }
    };

    const formatTimestamp = (dateStr) => {
        if (!dateStr) return 'Unknown';
        try {
            const dateObj = new Date(dateStr);
            return dateObj.toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit', hour12: true
            });
        } catch (e) {
            return dateStr;
        }
    };

    const renderSummaryStats = () => {
        const stats = [
            { label: 'Total Segments', count: pagination.total, color: '#3B82F6', icon: 'layers-outline' },
            { label: 'Total Leads', count: totalLeads.toLocaleString('en-IN'), color: '#F59E0B', icon: 'people-outline' },
            { label: 'Last Refresh', count: lastUpdated, color: '#10B981', icon: 'sync-outline' },
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

    const renderListItem = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.cardMain}>
                <View style={styles.badgeId}>
                    <Text style={styles.badgeIdText}>#{item.id}</Text>
                </View>
                <View style={styles.cardMeta}>
                    <Text style={styles.segmentName}>{item.name}</Text>
                    <View style={styles.row}>
                        <Ionicons name="time-outline" size={13} color="#64748B" style={{ marginRight: 4 }} />
                        <Text style={styles.dateText}>{formatTimestamp(item.created_at)}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item)}>
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
            </View>
            
            <View style={styles.cardFooter}>
                <View style={styles.recordContainer}>
                    <Ionicons name="list" size={14} color="#434AFA" style={{ marginRight: 6 }} />
                    <Text style={styles.recordVolume}>{(item.total_records || 0).toLocaleString()} Contacts</Text>
                </View>
            </View>
        </View>
    );

    const PaginationControls = () => (
        <View style={styles.pagination}>
            <TouchableOpacity
                disabled={pagination.current_page === 1 || loading}
                style={[styles.pageBtn, pagination.current_page === 1 && styles.disabledBtn]}
                onPress={() => loadSegments(pagination.current_page - 1)}
            >
                <Ionicons name="chevron-back" size={20} color={pagination.current_page === 1 ? '#CCC' : '#333'} />
            </TouchableOpacity>
            <Text style={styles.pageText}>Page {pagination.current_page} of {pagination.last_page}</Text>
            <TouchableOpacity
                disabled={pagination.current_page === pagination.last_page || loading}
                style={[styles.pageBtn, pagination.current_page === pagination.last_page && styles.disabledBtn]}
                onPress={() => loadSegments(pagination.current_page + 1)}
            >
                <Ionicons name="chevron-forward" size={20} color={pagination.current_page === pagination.last_page ? '#CCC' : '#333'} />
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            <Header title="Lead Segments" />

            {renderSummaryStats()}

            {loading && pagination.current_page === 1 && !refreshing ? (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#434AFA" />
                    <Text style={styles.loadingText}>Indexing repositories...</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <FlatList
                        data={segments}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderListItem}
                        contentContainerStyle={styles.listContainer}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <Ionicons name="cloud-offline-outline" size={48} color="#CBD5E1" />
                                <Text style={styles.emptyText}>No imported segments found.</Text>
                            </View>
                        }
                    />
                    {segments.length > 0 && <PaginationControls />}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F7F8FC' },

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
    statsCount: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
    statsLabel: { fontSize: 10, color: '#64748B' },

    listContainer: { paddingHorizontal: 16, paddingBottom: 30 },
    card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, elevation: 2, overflow: 'hidden' },
    cardMain: { flexDirection: 'row', padding: 16, alignItems: 'center' },
    badgeId: {
        backgroundColor: '#F1F5F9', width: 36, height: 36, borderRadius: 8,
        justifyContent: 'center', alignItems: 'center', marginRight: 12
    },
    badgeIdText: { fontSize: 12, fontWeight: 'bold', color: '#64748B' },
    cardMeta: { flex: 1 },
    segmentName: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center' },
    dateText: { fontSize: 12, color: '#64748B' },
    deleteBtn: { padding: 8, borderRadius: 8, backgroundColor: '#FEF2F2' },

    cardFooter: {
        backgroundColor: '#F8FAFC', paddingHorizontal: 16, paddingVertical: 10,
        borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center'
    },
    recordContainer: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#EEF2FF',
        paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6
    },
    recordVolume: { fontSize: 12, fontWeight: 'bold', color: '#434AFA' },

    pagination: {
        flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
        paddingVertical: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0'
    },
    pageBtn: { padding: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, marginHorizontal: 15 },
    disabledBtn: { opacity: 0.4 },
    pageText: { fontSize: 14, color: '#333', fontWeight: '600' },

    centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#64748B' },
    emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
    emptyText: { marginTop: 12, fontSize: 14, color: '#94A3B8' }
});

export default CallingListScreen;
