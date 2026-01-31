import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useRoute, useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../api/client';
import Header from '../../components/Header';
import { fetchFilterOptions } from '../../store/slices/leadSlice';

const LeadRemarkScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const dispatch = useDispatch();
    const { leadId } = route.params;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [leadData, setLeadData] = useState(null);
    const [remarks, setRemarks] = useState([]);

    // Form State
    const [remarkText, setRemarkText] = useState('');
    const [ticketValue, setTicketValue] = useState('');
    const [statusId, setStatusId] = useState(null);
    const [nextFollowUpDate, setNextFollowUpDate] = useState('');

    // Edit Mode State
    const [remarkDate, setRemarkDate] = useState(new Date().toISOString().split('T')[0]);
    const [editMode, setEditMode] = useState(false);

    const { filterOptions } = useSelector((state) => state.lead);

    useEffect(() => {
        fetchLeadDetails();
        dispatch(fetchFilterOptions());
    }, [leadId]);

    const fetchLeadDetails = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/leads/${leadId}`);
            const data = response.data.data;
            setLeadData(data);
            // Sort remarks by date descending (Newest First)
            const sortedRemarks = (data.remarks || []).sort((a, b) => new Date(b.remark_date) - new Date(a.remark_date));
            setRemarks(sortedRemarks);

            // Initialize Form with Current Lead Data
            setTicketValue(data.ticket_value ? String(data.ticket_value) : '');
            setStatusId(data.status?.id || null);
            setNextFollowUpDate(data.next_follow_up_date ? data.next_follow_up_date.split('T')[0] : '');

            setLoading(false);
        } catch (error) {
            console.error("Fetch Lead Error", error);
            Alert.alert("Error", "Failed to fetch lead details");
            setLoading(false);
        }
    };

    const handleEditRemark = (item) => {
        setRemarkText(item.remark);
        // Ensure we only get the date part YYYY-MM-DD
        const dateOnly = item.remark_date ? item.remark_date.split('T')[0].split(' ')[0] : '';
        setRemarkDate(dateOnly);
        setEditMode(true);
    };

    const handleCancelEdit = () => {
        setEditMode(false);
        setRemarkText('');
        setRemarkDate(new Date().toISOString().split('T')[0]); // Reset to today
    };

    const handleSubmitRemark = async () => {
        if (!remarkText || !statusId || !nextFollowUpDate) {
            Alert.alert("Required", "Remark, Status, and Next Follow Up Date are required.");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                sales_record_id: leadId,
                remark_date: remarkDate, // Use state date (either today or old date)
                remark: remarkText,
                ticket_value: ticketValue,
                status_id: statusId,
                next_follow_up_date: nextFollowUpDate
            };

            await api.post('/remarks', payload);

            Alert.alert("Success", editMode ? "Remark updated successfully" : "Remark added successfully");
            setRemarkText('');
            if (editMode) handleCancelEdit();
            fetchLeadDetails();
            setSubmitting(false);

        } catch (error) {
            console.error("Submit Remark Error", error);
            Alert.alert("Error", error.response?.data?.message || "Failed to save remark");
            setSubmitting(false);
        }
    };

    const renderStatusSelector = () => {
        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
                {filterOptions.statuses?.map(status => (
                    <TouchableOpacity
                        key={status.id}
                        style={[
                            styles.statusChip,
                            statusId === status.id && styles.activeStatusChip
                        ]}
                        onPress={() => setStatusId(status.id)}
                    >
                        <Text style={[
                            styles.statusText,
                            statusId === status.id && styles.activeStatusText
                        ]}>
                            {status.status_name}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#434AFA" />
            </View>
        );
    }

    if (!leadData) return null;

    return (
        <View style={styles.container}>
            <Header title="Lead Details" showBack={true} />

            <ScrollView contentContainerStyle={styles.content}>

                {/* Lead Info Card */}
                <View style={styles.card}>
                    <Text style={styles.leadName}>{leadData.leads_name}</Text>
                    <Text style={styles.companyName}>{leadData.prospectus?.prospectus_name}</Text>

                    <View style={styles.infoRow}>
                        <Ionicons name="person" size={16} color="#666" />
                        <Text style={styles.infoText}>{leadData.prospectus?.contact_person}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="call" size={16} color="#666" />
                        <Text style={styles.infoText}>{leadData.contact_number || leadData.prospectus?.contact_number}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Ionicons name="mail" size={16} color="#666" />
                        <Text style={styles.infoText}>{leadData.email || leadData.prospectus?.email}</Text>
                    </View>
                </View>

                {/* Action Form */}
                <View style={[styles.formSection, editMode && { borderColor: '#434AFA', borderWidth: 1 }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={[styles.sectionTitle, { flex: 1, marginRight: 8 }]}>
                            {editMode ? `Editing Remark - ${remarkDate}` : 'Add New Remark'}
                        </Text>
                        {editMode && (
                            <TouchableOpacity onPress={handleCancelEdit} style={{ padding: 6, backgroundColor: '#FFEBEE', borderRadius: 6 }}>
                                <Text style={{ color: '#D32F2F', fontSize: 12, fontWeight: '600' }}>Cancel Edit</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <Text style={styles.label}>Status</Text>
                    {renderStatusSelector()}

                    <Text style={styles.label}>Ticket Value</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={ticketValue}
                        onChangeText={setTicketValue}
                    />

                    <Text style={styles.label}>Next Follow Up (YYYY-MM-DD)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD"
                        value={nextFollowUpDate}
                        onChangeText={setNextFollowUpDate}
                    />

                    <Text style={styles.label}>Remark</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Enter remark..."
                        multiline
                        numberOfLines={4}
                        value={remarkText}
                        onChangeText={setRemarkText}
                    />

                    {!editMode && (
                        <Text style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                            * Adding a remark for today will update the lead's main status.
                        </Text>
                    )}

                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmitRemark}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {editMode ? "Update Details" : "Add Remark"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* History */}
                <View style={styles.historySection}>
                    <Text style={styles.sectionTitle}>Remark History</Text>
                    {remarks.length > 0 ? (
                        remarks.map((item) => (
                            <View key={item.id} style={styles.historyItem}>
                                <View style={styles.historyHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Ionicons name="calendar-outline" size={14} color="#434AFA" style={{ marginRight: 4 }} />
                                        <Text style={styles.historyDate}>
                                            {item.remark_date ? item.remark_date.split('T')[0].split(' ')[0] : ''}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        onPress={() => handleEditRemark(item)}
                                        style={styles.editIconBtn}
                                    >
                                        <Ionicons name="create-outline" size={20} color="#666" />
                                    </TouchableOpacity>
                                </View>
                                <Text style={styles.historyText}>{item.remark}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>No remarks yet.</Text>
                    )}
                </View>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        justifyContent: 'space-between'
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333'
    },
    content: {
        padding: 16,
        paddingBottom: 40
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
    },
    leadName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 4,
    },
    companyName: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    infoText: {
        marginLeft: 10,
        color: '#444',
        fontSize: 14,
    },
    formSection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 0, // removed bottom margin here, handled by row layout
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        marginTop: 8,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    statusScroll: {
        marginBottom: 10,
    },
    statusChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#ddd'
    },
    activeStatusChip: {
        backgroundColor: '#EEF2FF',
        borderColor: '#434AFA',
    },
    statusText: {
        color: '#666',
        fontSize: 14,
    },
    activeStatusText: {
        color: '#434AFA',
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: '#434AFA',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 20,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    historySection: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        elevation: 2,
    },
    historyItem: {
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        paddingVertical: 12,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    historyDate: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#434AFA',
    },
    historyText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    emptyText: {
        color: '#999',
        textAlign: 'center',
        padding: 20,
    },
    editIconBtn: {
        padding: 4,
        borderRadius: 4,
        backgroundColor: '#F3F4F6',
    }
});

export default LeadRemarkScreen;
