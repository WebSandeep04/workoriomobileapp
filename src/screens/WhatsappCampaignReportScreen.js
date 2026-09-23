import React, { useState, useEffect } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    FlatList, 
    ActivityIndicator,
    Modal
} from 'react-native';
import Header from '../components/Header';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';

const WhatsappCampaignReportScreen = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [detailLoading, setDetailLoading] = useState(false);
    
    // Detail Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedCampaign, setSelectedCampaign] = useState(null);

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const response = await api.get('/whatsapp-campaigns/report');
            if (response.data?.success) {
                setCampaigns(response.data.data.data || []);
            } else {
                Toast.show({ type: 'error', text1: 'Load Failed', text2: 'Unable to load campaigns.' });
            }
        } catch (error) {
            console.error('[WhatsAppReport] fetch failed:', error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch campaigns.' });
        } finally {
            setLoading(false);
        }
    };

    const fetchCampaignDetails = async (id) => {
        setDetailLoading(true);
        setModalVisible(true);
        try {
            const response = await api.get(`/whatsapp-campaigns/report/${id}`);
            if (response.data?.success) {
                setSelectedCampaign(response.data.data);
            } else {
                Toast.show({ type: 'error', text1: 'Load Failed', text2: 'Unable to load details.' });
                setModalVisible(false);
            }
        } catch (error) {
            console.error('[WhatsAppReport] detail fetch failed:', error);
            Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to fetch details.' });
            setModalVisible(false);
        } finally {
            setDetailLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const s = (status || '').toLowerCase();
        if (['sent', 'delivered', 'read', 'completed'].includes(s)) return '#10B981';
        if (s === 'failed') return '#EF4444';
        return '#F59E0B'; // Pending
    };

    return (
        <View style={styles.mainWrapper}>
            <Header title="WhatsApp Campaigns" />
            
            <View style={styles.toolbar}>
                <TouchableOpacity style={styles.actionBtn} onPress={fetchCampaigns} disabled={loading}>
                    <Ionicons name="refresh" size={16} color="#FFF" />
                    <Text style={styles.actionBtnTxt}>Refresh List</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#25D366" />
                </View>
            ) : (
                <FlatList
                    data={campaigns}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ padding: 16 }}
                    ListEmptyComponent={<Text style={styles.emptyTxt}>No WhatsApp campaigns found.</Text>}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.card} onPress={() => fetchCampaignDetails(item.id)}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardTitle}>{item.name}</Text>
                                <View style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                    <Text style={[styles.statusTxt, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                                </View>
                            </View>
                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLbl}>Sent</Text>
                                    <Text style={[styles.statVal, { color: '#10B981' }]}>{item.sent_count || 0}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLbl}>Failed</Text>
                                    <Text style={[styles.statVal, { color: '#EF4444' }]}>{item.failed_count || 0}</Text>
                                </View>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLbl}>Total</Text>
                                    <Text style={styles.statVal}>{item.members_count || 0}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            )}

            {/* Detail Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.sheetContainer}>
                        <View style={styles.sheetHead}>
                            <Text style={styles.sheetTitle}>Campaign Details</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#475569" />
                            </TouchableOpacity>
                        </View>
                        
                        {detailLoading ? (
                            <ActivityIndicator size="large" color="#25D366" style={{ marginTop: 40 }} />
                        ) : selectedCampaign ? (
                            <FlatList
                                data={selectedCampaign.members}
                                keyExtractor={(item) => item.id.toString()}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                renderItem={({ item }) => (
                                    <View style={styles.memberRow}>
                                        <View>
                                            <Text style={styles.memberName}>{item.name}</Text>
                                            <Text style={styles.memberPhone}>{item.phone_number}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={[styles.memberStatus, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                                            {!!item.error_message && (
                                                <Text style={styles.memberError} numberOfLines={1}>{item.error_message}</Text>
                                            )}
                                        </View>
                                    </View>
                                )}
                            />
                        ) : (
                            <Text style={{ textAlign: 'center', marginTop: 20 }}>No details available.</Text>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: '#F1F5F9' },
    toolbar: { padding: 16, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'flex-end' },
    actionBtn: { backgroundColor: '#25D366', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
    actionBtnTxt: { color: '#FFF', fontWeight: 'bold' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyTxt: { textAlign: 'center', color: '#94A3B8', marginTop: 20 },
    card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', flex: 1 },
    statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    statusTxt: { fontSize: 12, fontWeight: 'bold' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12 },
    statBox: { alignItems: 'center', flex: 1 },
    statLbl: { fontSize: 12, color: '#64748B', marginBottom: 4 },
    statVal: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheetContainer: { backgroundColor: '#FFF', height: '80%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
    sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    memberRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    memberName: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
    memberPhone: { fontSize: 12, color: '#64748B', marginTop: 2 },
    memberStatus: { fontSize: 13, fontWeight: 'bold' },
    memberError: { fontSize: 10, color: '#EF4444', maxWidth: 120, marginTop: 2 }
});

export default WhatsappCampaignReportScreen;
