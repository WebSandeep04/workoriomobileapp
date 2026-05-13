import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    TouchableOpacity,
    Linking,
    TextInput,
    Alert,
    Modal,
    FlatList
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../api/client';
import Header from '../../components/Header';

const CallingRemarkScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { callingId, campaignId } = route.params;

    const [loading, setLoading] = useState(true);
    const [metaLoading, setMetaLoading] = useState(true);
    const [leadData, setLeadData] = useState(null);
    const [remarks, setRemarks] = useState([]);

    // Metadata state
    const [callingTypes, setCallingTypes] = useState([]);
    const [whatsappTemplates, setWhatsappTemplates] = useState([]);
    const [salesUsers, setSalesUsers] = useState([]);

    // Form controllers
    const [remarkText, setRemarkText] = useState('');
    const [selectedTypeId, setSelectedTypeId] = useState('');
    const [nextDate, setNextDate] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Modals
    const [whatsappModalVisible, setWhatsappModalVisible] = useState(false);
    const [assigneeModalVisible, setAssigneeModalVisible] = useState(false);
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    
    const [searchAssignee, setSearchAssignee] = useState('');

    useEffect(() => {
        fetchRemarks();
        fetchMetadata();
    }, [callingId]);

    const fetchRemarks = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/calling/${callingId}/remarks`, { params: { campaign_id: campaignId } });
            setLeadData(res.data.lead);
            setRemarks(res.data.remarks || []);
            
            // Pre-fill status/date from pivot if exists
            if (res.data.lead) {
                setSelectedTypeId(res.data.lead.calling_type_id || '');
                setNextDate(res.data.lead.next_followup_date || '');
            }
        } catch (err) {
            console.log('Failed loading remarks payload:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetadata = async () => {
        setMetaLoading(true);
        try {
            const res = await api.get('/calling/remarks/meta');
            setCallingTypes(res.data.calling_types || []);
            setWhatsappTemplates(res.data.whatsapp_templates || []);
            setSalesUsers(res.data.sales_users || []);
        } catch (err) {
            console.log('Failed reading tracking metrics:', err);
        } finally {
            setMetaLoading(false);
        }
    };

    const getActiveStatusName = () => {
        const type = callingTypes.find(t => t.id === selectedTypeId);
        return type ? type.name : '';
    };

    const handleStatusChange = (typeId) => {
        setSelectedTypeId(typeId);
        setStatusModalVisible(false);
        
        // Clear conditional assignees if switching away from Interested
        const type = callingTypes.find(t => t.id === typeId);
        if (type && type.name.toLowerCase() !== 'interested') {
            setAssigneeId('');
        }
    };

    // Quick Date Calculator
    const applyQuickDate = (daysOut) => {
        const d = new Date();
        d.setDate(d.getDate() + daysOut);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setNextDate(`${yyyy}-${mm}-${dd}`);
    };

    const triggerWhatsappTrigger = (templateTxt) => {
        if (!leadData || !leadData.phone) {
            Alert.alert('Context Fault', 'Unable to locate active contact number.');
            return;
        }
        setWhatsappModalVisible(false);
        const cleanPhone = leadData.phone.replace(/\D/g, '');
        const phonePayload = cleanPhone.length === 10 ? '91' + cleanPhone : cleanPhone;
        const launchUri = `https://wa.me/${phonePayload}?text=${encodeURIComponent(templateTxt)}`;
        Linking.openURL(launchUri);
    };

    const submitInteractionLog = async () => {
        if (!remarkText.trim()) {
            Alert.alert('Required Field', 'Please supply description text capturing this interaction.');
            return;
        }

        const statusName = getActiveStatusName().toLowerCase();
        if (statusName === 'interested' && !assigneeId) {
            Alert.alert('Handover Required', 'Please designated an assignee to convert this interested lead.');
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                remark: remarkText.trim(),
                calling_type_id: selectedTypeId || null,
                next_followup_date: nextDate || null,
                campaign_id: campaignId || null,
                assign_user_id: assigneeId || null
            };

            const res = await api.post(`/calling/${callingId}/remarks`, payload);
            if (res.data.success) {
                Alert.alert('Logged', 'Interaction statement successfully logged!');
                setRemarkText('');
                fetchRemarks(); // Refresh UI
            } else {
                Alert.alert('Operation Halted', res.data.message || 'System was unable to save logs.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Network interruption saving log.';
            Alert.alert('Communication Failure', msg);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredSalesUsers = salesUsers.filter(u => 
        u.name.toLowerCase().includes(searchAssignee.toLowerCase())
    );

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#434AFA" />
                <Text style={styles.loadingText}>Gathering interaction sheet...</Text>
            </View>
        );
    }

    if (!leadData) {
        return (
            <View style={styles.centerContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                <Text style={styles.errorText}>Contact profile failed parsing.</Text>
            </View>
        );
    }

    const activeStatus = getActiveStatusName();
    const statusLower = activeStatus.toLowerCase();

    return (
        <View style={styles.container}>
            <Header title={route.params?.readOnly ? "Inspect Trail" : "Timeline Tracking"} showBack={true} />

            <ScrollView contentContainerStyle={styles.content}>
                
                {/* 1. CONTACT HEADLINE */}
                <View style={styles.banner}>
                    <View style={styles.bannerHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.leadName}>{leadData.name || 'Unnamed Direct'}</Text>
                            <Text style={styles.businessName}>{leadData.company_name || 'Enterprise unset'}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: '#EEF2FF' }]}>
                            <Text style={[styles.statusBadgeText, { color: '#434AFA' }]}>
                                {(leadData.status_name || 'PENDING').toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.bannerGrid}>
                        <View style={styles.infoCol}>
                            <Ionicons name="call" size={13} color="#64748B" />
                            <Text style={styles.gridText} onPress={() => leadData.phone && Linking.openURL(`tel:${leadData.phone}`)}>
                                {leadData.phone || '--'}
                            </Text>
                        </View>
                        <View style={styles.infoCol}>
                            <Ionicons name="location" size={13} color="#64748B" />
                            <Text style={styles.gridText} numberOfLines={1}>{[leadData.city, leadData.state].filter(Boolean).join(', ') || '--'}</Text>
                        </View>
                        <View style={styles.infoCol}>
                            <Ionicons name="person" size={13} color="#64748B" />
                            <Text style={styles.gridText} numberOfLines={1}>{leadData.contact_person || '--'}</Text>
                        </View>
                        <View style={styles.infoCol}>
                            <Ionicons name="megaphone" size={13} color="#64748B" />
                            <Text style={styles.gridText} numberOfLines={1}>{leadData.campaign_name || 'Direct Channel'}</Text>
                        </View>
                    </View>
                </View>

                {/* 2. LOGGING MODULE (Hidden if Read Only) */}
                {!route.params?.readOnly && (
                    <View style={styles.actionPanel}>
                        <Text style={styles.panelHeader}>Record Active Interaction</Text>
                        
                        <View style={styles.inputWrap}>
                            <Text style={styles.fieldLabel}>Outcome Description *</Text>
                            <TextInput
                                style={styles.memoArea}
                                placeholder="Summarize the call details, obstacles, notes..."
                                placeholderTextColor="#94A3B8"
                                multiline
                                numberOfLines={4}
                                value={remarkText}
                                onChangeText={setRemarkText}
                            />
                        </View>

                        {/* Combined Status and Meta */}
                        <View style={styles.dualFieldsRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.fieldLabel}>Sync Lead Status</Text>
                                <TouchableOpacity style={styles.pickerBtn} onPress={() => setStatusModalVisible(true)}>
                                    <Text style={[styles.pickerBtnTxt, !selectedTypeId && { color: '#94A3B8' }]}>
                                        {activeStatus || 'Select Status...'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={15} color="#475569" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Dynamic WhatsApp Block */}
                        {statusLower === 'sent details' && (
                            <TouchableOpacity 
                                style={styles.socialBannerBtn} 
                                activeOpacity={0.8} 
                                onPress={() => setWhatsappModalVisible(true)}
                            >
                                <Ionicons name="logo-whatsapp" size={18} color="#FFF" />
                                <Text style={styles.socialBannerBtnTxt}>Transmit WhatsApp Template</Text>
                            </TouchableOpacity>
                        )}

                        {/* Dynamic Assignee Block */}
                        {statusLower === 'interested' && (
                            <View style={styles.assigneeSelectionBox}>
                                <Text style={styles.assigneeLabel}>Convert & Reassign Lead To *</Text>
                                <TouchableOpacity style={styles.pickerBtn} onPress={() => setAssigneeModalVisible(true)}>
                                    <Text style={[styles.pickerBtnTxt, !assigneeId && { color: '#94A3B8' }]}>
                                        {salesUsers.find(u => u.id === assigneeId)?.name || 'Pick Account Executive...'}
                                    </Text>
                                    <Ionicons name="person-add-outline" size={16} color="#434AFA" />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Date Management */}
                        <View style={styles.datePickerBox}>
                            <Text style={styles.fieldLabel}>Next Scheduled Action</Text>
                            <View style={styles.dateInlineRow}>
                                <TextInput
                                    style={styles.datePlainInput}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#94A3B8"
                                    value={nextDate}
                                    onChangeText={setNextDate}
                                />
                                <TouchableOpacity style={styles.calCleanBtn} onPress={() => setNextDate('')}>
                                    <Ionicons name="close-circle" size={18} color="#94A3B8" />
                                </TouchableOpacity>
                            </View>

                            <View style={styles.chipsRow}>
                                <TouchableOpacity style={styles.quickChip} onPress={() => applyQuickDate(1)}>
                                    <Text style={styles.quickChipTxt}>Tomorrow</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.quickChip} onPress={() => applyQuickDate(3)}>
                                    <Text style={styles.quickChipTxt}>+3 Days</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.quickChip} onPress={() => applyQuickDate(7)}>
                                    <Text style={styles.quickChipTxt}>1 Week</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[styles.saveRecordBtn, submitting && styles.saveRecordBtnDisabled]} 
                            onPress={submitInteractionLog}
                            disabled={submitting}
                        >
                            {submitting ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-done" size={18} color="#FFF" />
                                    <Text style={styles.saveRecordBtnTxt}>Save Interaction Trail</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* 3. HISTORY CHRONICLE */}
                <Text style={styles.sectionHeader}>Contact Chronicle Logs</Text>
                <View style={styles.timelineGroup}>
                    {remarks.length === 0 ? (
                        <View style={styles.timelineEmpty}>
                            <Ionicons name="chatbubble-outline" size={36} color="#CBD5E1" />
                            <Text style={styles.timelineEmptyTxt}>History stream is blank.</Text>
                        </View>
                    ) : (
                        remarks.map((item, idx) => {
                            const isLast = idx === remarks.length - 1;
                            return (
                                <View key={item.id || idx} style={styles.timelineEntry}>
                                    <View style={styles.spineBlock}>
                                        <View style={styles.spineNode} />
                                        {!isLast && <View style={styles.spineLine} />}
                                    </View>
                                    <View style={styles.bubbleBlock}>
                                        <View style={styles.chatBubble}>
                                            <View style={styles.chatHeader}>
                                                <Text style={styles.chatCreator} numberOfLines={1}>
                                                    <Ionicons name="person-circle-outline" size={11} /> {item.user}
                                                </Text>
                                                <Text style={styles.chatTimestamp}>{item.date}</Text>
                                            </View>
                                            <Text style={styles.chatMemo}>{item.remark}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>

            </ScrollView>

            {/* SELECTIONS MODALS */}

            {/* Status Modal */}
            <Modal visible={statusModalVisible} animationType="slide" transparent onRequestClose={() => setStatusModalVisible(false)}>
                <View style={styles.modalShroud}>
                    <View style={styles.modalDeck}>
                        <View style={styles.modalDeckTitleRow}>
                            <Text style={styles.modalDeckTitle}>Select Outcome Status</Text>
                            <TouchableOpacity onPress={() => setStatusModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={callingTypes}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={[styles.modalListItem, selectedTypeId === item.id && styles.modalListItemSelected]}
                                    onPress={() => handleStatusChange(item.id)}
                                >
                                    <Text style={[styles.modalListItemTxt, selectedTypeId === item.id && styles.modalListItemTxtSelected]}>
                                        {item.name}
                                    </Text>
                                    {selectedTypeId === item.id && <Ionicons name="checkmark" size={16} color="#434AFA" />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* Assignee Picker Modal */}
            <Modal visible={assigneeModalVisible} animationType="slide" transparent onRequestClose={() => setAssigneeModalVisible(false)}>
                <View style={styles.modalShroud}>
                    <View style={styles.modalDeck}>
                        <View style={styles.modalDeckTitleRow}>
                            <Text style={styles.modalDeckTitle}>Designate Executive</Text>
                            <TouchableOpacity onPress={() => setAssigneeModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.sheetSearchBox}>
                            <Ionicons name="search-outline" size={16} color="#94A3B8" />
                            <TextInput 
                                style={styles.sheetSearchInput}
                                placeholder="Lookup Account Executives..."
                                value={searchAssignee}
                                onChangeText={setSearchAssignee}
                            />
                        </View>
                        <FlatList
                            data={filteredSalesUsers}
                            style={{ maxHeight: 300 }}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={[styles.modalListItem, assigneeId === item.id && styles.modalListItemSelected]}
                                    onPress={() => { setAssigneeId(item.id); setAssigneeModalVisible(false); }}
                                >
                                    <Text style={[styles.modalListItemTxt, assigneeId === item.id && styles.modalListItemTxtSelected]}>
                                        {item.name}
                                    </Text>
                                    {assigneeId === item.id && <Ionicons name="checkmark" size={16} color="#434AFA" />}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>

            {/* WhatsApp Template Modal */}
            <Modal visible={whatsappModalVisible} animationType="slide" transparent onRequestClose={() => setWhatsappModalVisible(false)}>
                <View style={styles.modalShroud}>
                    <View style={[styles.modalDeck, { maxHeight: '75%' }]}>
                        <View style={styles.modalDeckTitleRow}>
                            <Text style={styles.modalDeckTitle}>Choose Template</Text>
                            <TouchableOpacity onPress={() => setWhatsappModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>
                        {whatsappTemplates.length === 0 ? (
                            <View style={{ padding: 30, alignItems: 'center' }}>
                                <Text style={{ color: '#64748B' }}>No templates indexed in db.</Text>
                            </View>
                        ) : (
                            <FlatList
                                data={whatsappTemplates}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.tmplItemBtn} onPress={() => triggerWhatsappTrigger(item.text)}>
                                        <Text style={styles.tmplItemName}>{item.name}</Text>
                                        <Text style={styles.tmplItemBody} numberOfLines={2}>{item.text}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>

        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    content: { padding: 16, paddingBottom: 50 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
    loadingText: { marginTop: 12, color: '#64748B', fontSize: 13 },
    errorText: { marginTop: 12, fontSize: 14, color: '#EF4444', fontWeight: '700' },

    banner: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 1 },
    bannerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 12 },
    leadName: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
    businessName: { fontSize: 12.5, color: '#64748B', marginTop: 2, fontWeight: '500' },
    statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
    statusBadgeText: { fontSize: 10, fontWeight: '800' },

    bannerGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10, columnGap: '2%' },
    infoCol: { width: '49%', flexDirection: 'row', alignItems: 'center', gap: 6 },
    gridText: { fontSize: 12, color: '#334155', fontWeight: '600', flex: 1 },

    actionPanel: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 20, elevation: 1.5 },
    panelHeader: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#434AFA', paddingLeft: 8 },
    inputWrap: { marginBottom: 14 },
    fieldLabel: { fontSize: 11.5, fontWeight: '700', color: '#475569', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
    memoArea: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, padding: 12, color: '#1E293B', fontSize: 13, minHeight: 80, textAlignVertical: 'top', backgroundColor: '#F8FAFC' },
    
    dualFieldsRow: { marginBottom: 14 },
    pickerBtn: { height: 44, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, backgroundColor: '#F8FAFC' },
    pickerBtnTxt: { fontSize: 13, color: '#1E293B', fontWeight: '600' },

    socialBannerBtn: { backgroundColor: '#10B981', borderRadius: 8, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginVertical: 6 },
    socialBannerBtnTxt: { color: '#FFF', fontWeight: '700', fontSize: 12.5 },

    assigneeSelectionBox: { backgroundColor: '#EFF6FF', padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#3B82F6', marginVertical: 6 },
    assigneeLabel: { fontSize: 11, color: '#1D4ED8', fontWeight: '800', marginBottom: 6 },

    datePickerBox: { marginVertical: 8 },
    dateInlineRow: { flexDirection: 'row', height: 44, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 12 },
    datePlainInput: { flex: 1, fontSize: 13, color: '#1E293B', padding: 0, fontWeight: '600' },
    calCleanBtn: { paddingLeft: 10 },
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    quickChip: { backgroundColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    quickChipTxt: { fontSize: 11, color: '#475569', fontWeight: '700' },

    saveRecordBtn: { height: 46, backgroundColor: '#434AFA', borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16, elevation: 2 },
    saveRecordBtnDisabled: { opacity: 0.65 },
    saveRecordBtnTxt: { color: '#FFF', fontSize: 14, fontWeight: '800' },

    sectionHeader: { fontSize: 14.5, fontWeight: '800', color: '#0F172A', marginBottom: 12, paddingLeft: 4 },
    timelineGroup: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, elevation: 1 },
    timelineEmpty: { padding: 24, alignItems: 'center' },
    timelineEmptyTxt: { fontSize: 12.5, color: '#94A3B8', fontWeight: '600', marginTop: 8 },

    timelineEntry: { flexDirection: 'row', minHeight: 70 },
    spineBlock: { width: 20, alignItems: 'center' },
    spineNode: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#434AFA', marginTop: 6, borderWidth: 2, borderColor: '#FFF', elevation: 2 },
    spineLine: { flex: 1, width: 1.5, backgroundColor: '#E2E8F0' },
    bubbleBlock: { flex: 1, paddingLeft: 12, paddingBottom: 16 },
    chatBubble: { backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#EDF2F7' },
    chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    chatCreator: { fontSize: 11, fontWeight: '800', color: '#434AFA', flex: 1, marginRight: 6 },
    chatTimestamp: { fontSize: 9.5, color: '#64748B', fontWeight: '600' },
    chatMemo: { fontSize: 12.5, color: '#334155', lineHeight: 17, fontWeight: '500' },

    modalShroud: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    modalDeck: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 20, maxHeight: '60%' },
    modalDeckTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalDeckTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
    modalListItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    modalListItemSelected: { backgroundColor: '#EEF2FF' },
    modalListItemTxt: { fontSize: 13, color: '#334155', fontWeight: '600' },
    modalListItemTxtSelected: { color: '#434AFA', fontWeight: '800' },

    sheetSearchBox: { flexDirection: 'row', margin: 12, height: 40, backgroundColor: '#F1F5F9', borderRadius: 8, alignItems: 'center', paddingHorizontal: 12 },
    sheetSearchInput: { flex: 1, fontSize: 13, color: '#1E293B', padding: 0, marginLeft: 8, fontWeight: '500' },

    tmplItemBtn: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    tmplItemName: { fontSize: 13, fontWeight: '800', color: '#1E293B', marginBottom: 4 },
    tmplItemBody: { fontSize: 11.5, color: '#64748B', lineHeight: 16 }
});

export default CallingRemarkScreen;
