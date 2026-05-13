import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Linking
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../api/client';
import Header from '../../components/Header';

const CallingRemarkScreen = () => {
    const route = useRoute();
    const { callingId } = route.params;

    const [loading, setLoading] = useState(true);
    const [leadData, setLeadData] = useState(null);
    const [remarks, setRemarks] = useState([]);

    useEffect(() => {
        fetchRemarks();
    }, [callingId]);

    const fetchRemarks = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/calling/${callingId}/remarks`);
            setLeadData(res.data.lead);
            setRemarks(res.data.remarks || []);
        } catch (err) {
            console.log('Failed to fetch interaction logs for calling', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#434AFA" />
                <Text style={styles.loadingText}>Loading interaction timeline...</Text>
            </View>
        );
    }

    if (!leadData) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                <Text style={styles.errorText}>Record not found.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header title="Call Timeline" showBack={true} />

            <ScrollView contentContainerStyle={styles.content}>
                
                {/* TOP LEAD INFO CARD */}
                <View style={styles.banner}>
                    <View style={styles.bannerHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.leadName}>{leadData.name || 'Unnamed Lead'}</Text>
                            <Text style={styles.businessName}>{leadData.company_name || 'No Company Info'}</Text>
                        </View>
                        {leadData.status_name && (
                            <View style={styles.statusBadge}>
                                <Text style={styles.statusBadgeText}>{leadData.status_name.toUpperCase()}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.bannerInfoGrid}>
                        <View style={styles.infoRow}>
                            <Ionicons name="person-outline" size={14} color="#666" />
                            <Text style={styles.infoLabel}>Contact:</Text>
                            <Text style={styles.infoValue}>{leadData.contact_person || '-'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="call-outline" size={14} color="#666" />
                            <Text style={styles.infoLabel}>Phone:</Text>
                            <Text
                                style={[styles.infoValue, { color: '#434AFA', fontWeight: 'bold' }]}
                                onPress={() => leadData.phone && Linking.openURL(`tel:${leadData.phone}`)}
                            >
                                {leadData.phone || '-'}
                            </Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="mail-outline" size={14} color="#666" />
                            <Text style={styles.infoLabel}>Email:</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>{leadData.email || '-'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="location-outline" size={14} color="#666" />
                            <Text style={styles.infoLabel}>Location:</Text>
                            <Text style={styles.infoValue}>{[leadData.city, leadData.state].filter(Boolean).join(', ') || '-'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="megaphone-outline" size={14} color="#666" />
                            <Text style={styles.infoLabel}>Campaign:</Text>
                            <Text style={styles.infoValue}>{leadData.campaign_name || '-'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Ionicons name="wallet-outline" size={14} color="#666" />
                            <Text style={styles.infoLabel}>Turnover:</Text>
                            <Text style={styles.infoValue}>{leadData.turnover || '-'}</Text>
                        </View>
                    </View>

                    <View style={styles.nextFollowupBar}>
                        <Ionicons name="alarm-outline" size={16} color="#8B5CF6" />
                        <Text style={styles.nextFollowupText}>
                            Next Scheduled Interaction: <Text style={{ fontWeight: 'bold' }}>{leadData.next_followup_date || '-'}</Text>
                        </Text>
                    </View>
                </View>

                {/* TIMELINE SECTION */}
                <Text style={styles.sectionTitle}>Timeline Remarks Trail</Text>
                
                <View style={styles.timelineContainer}>
                    {remarks.length === 0 ? (
                        <View style={styles.emptyTrail}>
                            <Text style={styles.emptyTrailText}>No logs found for this record.</Text>
                        </View>
                    ) : (
                        remarks.map((item, idx) => {
                            const isLast = idx === remarks.length - 1;
                            return (
                                <View key={item.id || idx} style={styles.timelineItem}>
                                    <View style={styles.timelineLeft}>
                                        <View style={styles.circleNode} />
                                        {!isLast && <View style={styles.verticalLine} />}
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <View style={styles.bubble}>
                                            <View style={styles.bubbleHeader}>
                                                <Text style={styles.bubbleUser}><Ionicons name="person-circle" size={12} /> {item.user}</Text>
                                                <Text style={styles.bubbleDate}>{item.date}</Text>
                                            </View>
                                            <Text style={styles.bubbleText}>{item.remark}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F3F4F6' },
    content: { padding: 16, paddingBottom: 40 },

    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
    loadingText: { marginTop: 12, color: '#666' },
    errorText: { marginTop: 12, fontSize: 16, color: '#EF4444', fontWeight: '600' },

    banner: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 20, elevation: 2 },
    bannerHeader: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 12
    },
    leadName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
    businessName: { fontSize: 13, color: '#64748B', marginTop: 2 },
    statusBadge: { backgroundColor: '#D1FAE5', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 12 },
    statusBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#065F46' },

    bannerInfoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    infoRow: { width: '48%', flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 },
    infoLabel: { fontSize: 12, color: '#64748B' },
    infoValue: { fontSize: 12, color: '#1E293B', flex: 1 },

    nextFollowupBar: {
        flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F5F3FF',
        padding: 10, borderRadius: 8, marginTop: 16
    },
    nextFollowupText: { fontSize: 12, color: '#6D28D9' },

    sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#374151', marginBottom: 12, paddingLeft: 4 },
    
    timelineContainer: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, elevation: 2 },
    emptyTrail: { padding: 20, alignItems: 'center' },
    emptyTrailText: { fontSize: 13, color: '#94A3B8', fontStyle: 'italic' },

    timelineItem: { flexDirection: 'row', minHeight: 80 },
    timelineLeft: { width: 20, alignItems: 'center' },
    circleNode: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#434AFA', marginTop: 8, elevation: 2, borderWidth: 2, borderColor: '#FFF' },
    verticalLine: { flex: 1, width: 2, backgroundColor: '#E2E8F0' },
    timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
    
    bubble: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#EDF2F7' },
    bubbleHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    bubbleUser: { fontSize: 11, fontWeight: 'bold', color: '#434AFA' },
    bubbleDate: { fontSize: 10, color: '#64748B' },
    bubbleText: { fontSize: 13, color: '#334155', lineHeight: 18 }
});

export default CallingRemarkScreen;
