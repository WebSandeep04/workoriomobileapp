import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../api/client';
import Header from '../../components/Header';

const IndiaMartRemarkScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { lead, isJunkMode } = route.params;

    const [remarks, setRemarks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        fetchRemarks();
    }, []);

    const fetchRemarks = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/indiamart/leads/${lead.id}/followups`);
            setRemarks(res.data.data || []);
        } catch (err) {
            console.log('Error fetching external followups', err);
            Alert.alert('Error', 'Failed to load lead remark trail.');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitRemark = async () => {
        if (!newComment.trim()) {
            Alert.alert('Warning', 'Please type a remark first.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.post('/indiamart/leads/followup', {
                lead_id: lead.id,
                comment: newComment.trim()
            });
            if (res.data.success) {
                Alert.alert('Success', 'Remark recorded successfully.');
                setNewComment('');
                fetchRemarks();
            }
        } catch (err) {
            Alert.alert('Error', 'Could not post remark. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatDateTime = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <View style={styles.container}>
            <Header title="Lead Remarks" showBack={true} />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Lead Information Banner */}
                <View style={styles.bannerCard}>
                    <Text style={styles.leadName}>{lead.sender_name || 'No Sender'}</Text>
                    <Text style={styles.productName}>{lead.query_product_name || lead.product_name || 'Product Unspecified'}</Text>
                    
                    <View style={styles.divider} />
                    
                    <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>{lead.sender_company || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="call-outline" size={16} color="#666" />
                        <Text style={styles.infoText}>{lead.sender_mobile || 'N/A'}</Text>
                    </View>
                    {lead.query_message && (
                        <View style={[styles.infoRow, { alignItems: 'flex-start', marginTop: 4 }]}>
                            <Ionicons name="chatbox-ellipses-outline" size={16} color="#666" style={{ marginTop: 2 }} />
                            <Text style={[styles.infoText, { fontStyle: 'italic', color: '#555' }]}>{lead.query_message}</Text>
                        </View>
                    )}
                </View>

                {/* Add Remark Section (Disabled in Junk mode as per web app alignment) */}
                {!isJunkMode && !lead.is_processed && (
                    <View style={styles.formCard}>
                        <Text style={styles.sectionTitle}>Add Follow Up Remark</Text>
                        <TextInput
                            style={styles.textArea}
                            multiline
                            numberOfLines={4}
                            placeholder="Enter your interaction details..."
                            value={newComment}
                            onChangeText={setNewComment}
                            placeholderTextColor="#999"
                        />
                        <TouchableOpacity 
                            style={[styles.submitButton, submitting && { opacity: 0.7 }]} 
                            disabled={submitting} 
                            onPress={handleSubmitRemark}
                        >
                            {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>Submit Remark</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                {/* History Trail */}
                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Remark Trail</Text>
                    
                    {loading ? (
                        <ActivityIndicator size="small" color="#434AFA" style={{ marginVertical: 20 }} />
                    ) : remarks.length > 0 ? (
                        remarks.map((item) => (
                            <View key={item.id} style={styles.historyCard}>
                                <View style={styles.historyHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Ionicons name="person-circle-outline" size={18} color="#666" />
                                        <Text style={styles.authorText}>{item.user?.name || 'User'}</Text>
                                    </View>
                                    <Text style={styles.timeText}>{formatDateTime(item.created_at)}</Text>
                                </View>
                                <Text style={styles.commentText}>{item.comment}</Text>
                            </View>
                        ))
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="chatbubbles-outline" size={40} color="#CCC" />
                            <Text style={styles.emptyText}>No follow-up history found.</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    content: { padding: 16, paddingBottom: 40 },
    
    bannerCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 1 },
    leadName: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    productName: { fontSize: 14, color: '#434AFA', fontWeight: '600', marginTop: 2 },
    divider: { height: 1, backgroundColor: '#EEE', marginVertical: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 10 },
    infoText: { fontSize: 13, color: '#4B5563', flex: 1 },

    formCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 1 },
    sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
    textArea: {
        borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F9FAFB', borderRadius: 8,
        padding: 12, height: 100, textAlignVertical: 'top', color: '#333', fontSize: 14, marginBottom: 12
    },
    submitButton: { backgroundColor: '#434AFA', height: 46, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    submitBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },

    historySection: { marginTop: 8 },
    historyCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, marginBottom: 12, elevation: 1 },
    historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    authorText: { fontSize: 13, fontWeight: 'bold', color: '#4B5563' },
    timeText: { fontSize: 11, color: '#9CA3AF' },
    commentText: { fontSize: 13, color: '#374151', lineHeight: 18 },

    emptyContainer: { alignItems: 'center', marginTop: 24 },
    emptyText: { marginTop: 8, fontSize: 14, color: '#999' }
});

export default IndiaMartRemarkScreen;
