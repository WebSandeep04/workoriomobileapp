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
    Linking,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../../api/client';
import Header from '../../components/Header';
import { fetchLeadGenLeads, fetchLeadGenStats, fetchLeadGenFilters, addLeadGen, reassignLeadGen, updateLeadGenCities } from '../../store/slices/leadGenSlice';
import { fetchProspects, createProspect } from '../../store/slices/prospectSlice';

const MyLeadGenScreen = () => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();
    const dispatch = useDispatch();

    // Data sources from Redux
    const { leads, pagination, stats, filterOptions, loading, actionLoading } = useSelector(state => state.leadGen);
    const { prospects: prospectList, loading: prospectLoading, actionLoading: submittingProspect } = useSelector(state => state.prospect);

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('card'); // card | table

    // Dropdown selector states
    const [activeSelector, setActiveSelector] = useState(null); // { title, key, options, onSelect }
    const [selectorVisible, setSelectorVisible] = useState(false);

    // Filters variables
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filters, setFilters] = useState({
        status_id: '',
        state_id: '',
        city_id: '',
        business_type_id: '',
        lead_source_id: '',
        products_id: ''
    });
    const [activeFiltersCount, setActiveFiltersCount] = useState(0);

    // Reassignment dialog
    const [reassignModalVisible, setReassignModalVisible] = useState(false);
    const [selectedLeadForTransfer, setSelectedLeadForTransfer] = useState(null);
    const [targetUserId, setTargetUserId] = useState('');
    const [savingTransfer, setSavingTransfer] = useState(false);

    // =================== ADD LEAD STATES ===================
    const [addLeadModalVisible, setAddLeadModalVisible] = useState(false);
    const [leadForm, setLeadForm] = useState({
        prospectus_id: '',
        prospectus_name: '',
        leads_name: '',
        contact_person: '',
        contact_number: '',
        status_id: '',
        address: '',
        state_id: '',
        city_id: '',
        email: '',
        website_link: '',
        next_follow_up_date: new Date().toISOString().split('T')[0],
        business_type_id: '',
        lead_source_id: '',
        products_id: '',
        remark: '',
        user_id: ''
    });
    const [submittingLead, setSubmittingLead] = useState(false);

    // Prospectus Picker Modal states
    const [prospectPickerVisible, setProspectPickerVisible] = useState(false);
    const [prospectSearch, setProspectSearch] = useState('');
    
    // Inline Dropdown State
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Inline Prospect Add states
    const [addProspectVisible, setAddProspectVisible] = useState(false);
    const [prospectForm, setProspectForm] = useState({
        prospectus_name: '',
        contact_person: '',
        contact_number: '',
        address: '',
        state_id: '',
        city_id: '',
        email: '',
        website_link: '',
        business_type_id: ''
    });
    // ===========================================================

    useEffect(() => {
        if (isFocused) {
            dispatch(fetchLeadGenFilters());
            dispatch(fetchLeadGenStats());
            loadLeads(1, false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFocused, dispatch]);



    const fetchCitiesForState = async (stateId) => {
        if (!stateId) {
            dispatch(updateLeadGenCities([]));
            return;
        }
        try {
            const res = await api.get(`/leads/cities/${stateId}`);
            let data = res.data?.data || res.data?.cities || res.data;
            if (!Array.isArray(data)) data = [];
            dispatch(updateLeadGenCities(data));
        } catch (err) {
            console.log('City lazy-load error:', err);
            dispatch(updateLeadGenCities([]));
        }
    };



    const loadLeads = (pageNumber = 1, refresh = false, activeFilters = filters, term = searchQuery) => {
        if (refresh) setRefreshing(true);

        const params = {
            page: pageNumber,
            per_page: 10,
            search: term.trim(),
            ...activeFilters
        };

        dispatch(fetchLeadGenLeads(params))
            .finally(() => {
                if (refresh) setRefreshing(false);
            });

        // Compute filters active count
        let count = 0;
        if (term.trim()) count++;
        Object.values(activeFilters).forEach(val => {
            if (val !== '' && val !== null && val !== undefined) count++;
        });
        setActiveFiltersCount(count);
    };

    const handleRefresh = () => {
        dispatch(fetchLeadGenStats());
        loadLeads(1, true);
    };

    const triggerHistoryLogs = (leadId) => {
        navigation.navigate('LeadRemark', { leadId, isLeadGen: true });
    };

    const openReassignPanel = (lead) => {
        setSelectedLeadForTransfer(lead);
        setTargetUserId(lead.user_id ? String(lead.user_id) : '');
        setReassignModalVisible(true);
    };

    const handleReassignSubmit = () => {
        if (!targetUserId) {
            Alert.alert('Validation', 'Please select a destination executive for the lead assignment.');
            return;
        }

        setSavingTransfer(true);
        dispatch(reassignLeadGen({ lead_id: selectedLeadForTransfer.id, new_user_id: targetUserId }))
            .unwrap()
            .then(msg => {
                Alert.alert('Transfer Executed', msg || 'Owner redistribution recorded.');
                setReassignModalVisible(false);
                setSelectedLeadForTransfer(null);
                loadLeads(pagination.current_page, false);
            })
            .catch(err => {
                Alert.alert('Operation Denied', err || 'Failed mapping ownership reassignment.');
            })
            .finally(() => {
                setSavingTransfer(false);
            });
    };

    const applyIsolatedFilters = (compiled) => {
        setFilters(compiled);
        setFilterModalVisible(false);
        loadLeads(1, false, compiled);
    };

    const clearIsolatedFilters = () => {
        const reset = { status_id: '', state_id: '', city_id: '', business_type_id: '', lead_source_id: '', products_id: '' };
        setFilters(reset);
        setFilterModalVisible(false);
        loadLeads(1, false, reset);
    };

    // ======================== FORM INTERACTION HELPERS ========================
    const toggleDropdown = (name) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    const renderInlineDropdown = (label, value, options, onSelect, placeholder = 'Select') => {
        const selectedOption = options && Array.isArray(options) ? options.find(opt => String(opt.id) === String(value)) : null;
        const displayText = selectedOption
            ? (selectedOption.name || selectedOption.status_name || selectedOption.state_name || selectedOption.city_name || selectedOption.business_name || selectedOption.source_name || selectedOption.product_name || "Selected")
            : placeholder;
        const isOpen = activeDropdown === label;

        return (
            <View style={{ marginBottom: 16, zIndex: isOpen ? 1000 : 1 }}>
                <Text style={styles.formLabel}>{label}</Text>
                <TouchableOpacity
                    style={[styles.formInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                    onPress={() => toggleDropdown(label)}
                >
                    <Text style={{ color: value ? '#000' : '#999' }}>{displayText}</Text>
                    <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#999" />
                </TouchableOpacity>

                {isOpen && (
                    <ScrollView
                        style={styles.dropdownList}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                    >
                        {options && options.length > 0 ? options.map(opt => {
                            const optLabel = opt.name || opt.status_name || opt.state_name || opt.city_name || opt.business_name || opt.source_name || opt.product_name || "Unknown";
                            return (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                        onSelect(opt.id);
                                        setActiveDropdown(null);
                                    }}
                                >
                                    <Text style={styles.dropdownItemText}>{optLabel}</Text>
                                </TouchableOpacity>
                            );
                        }) : (
                            <View style={styles.dropdownItem}>
                                <Text style={styles.dropdownItemText}>No options available</Text>
                            </View>
                        )}
                    </ScrollView>
                )}
            </View>
        );
    };



    const openProspectSearch = () => {
        setProspectPickerVisible(true);
        triggerProspectQuery('');
    };

    const triggerProspectQuery = (q) => {
        dispatch(fetchProspects({ search: q, per_page: 500 }));
    };

    const selectProspect = (item) => {
        const stateId = item.state_id ? String(item.state_id) : '';
        
        setLeadForm(prev => ({
            ...prev,
            prospectus_id: String(item.id),
            prospectus_name: item.prospectus_name || '',
            leads_name: item.prospectus_name || '',
            contact_person: item.contact_person || '',
            contact_number: item.contact_number || '',
            address: item.address || '',
            email: item.email || '',
            website_link: item.website_link || '',
            business_type_id: item.business_type_id ? String(item.business_type_id) : '',
            state_id: stateId,
            city_id: item.city_id ? String(item.city_id) : ''
        }));
        
        if (stateId) {
            fetchCitiesForState(stateId);
        }
        
        setProspectPickerVisible(false);
    };

    // --- SUBMISSION DISPATCHERS ---
    const handleLeadSubmit = () => {
        const { prospectus_id, status_id, next_follow_up_date, remark, user_id } = leadForm;
        if (!prospectus_id || !status_id || !next_follow_up_date || !remark || !user_id) {
            Alert.alert('Invalid Submission', 'Required inputs missing:\nEnsure Prospectus, Status, Follow-up Date, Remarks, and Assignee are provided.');
            return;
        }

        setSubmittingLead(true);
        dispatch(addLeadGen(leadForm))
            .unwrap()
            .then(msg => {
                Alert.alert('Lead Recorded', msg || 'Generated lead submitted and synchronized!');
                setAddLeadModalVisible(false);
                // Reset form
                setLeadForm({
                    prospectus_id: '', prospectus_name: '', leads_name: '', contact_person: '', contact_number: '',
                    status_id: '', address: '', state_id: '', city_id: '', email: '', website_link: '',
                    next_follow_up_date: new Date().toISOString().split('T')[0], business_type_id: '',
                    lead_source_id: '', products_id: '', remark: '', user_id: ''
                });
                dispatch(fetchLeadGenStats());
                loadLeads(1, false);
            })
            .catch(err => {
                Alert.alert('Rejected', err || 'Unable to save.');
            })
            .finally(() => {
                setSubmittingLead(false);
            });
    };

    const handleProspectSubmit = () => {
        if (!prospectForm.prospectus_name) {
            Alert.alert('Required Field', 'Prospect Name is mandatory.');
            return;
        }

        dispatch(createProspect(prospectForm))
            .unwrap()
            .then(data => {
                Alert.alert('Prospect Saved', 'New corporate entity registered.');
                setAddProspectVisible(false);
                selectProspect(data);
                setProspectForm({
                    prospectus_name: '', contact_person: '', contact_number: '', address: '',
                    state_id: '', city_id: '', email: '', website_link: '', business_type_id: ''
                });
            })
            .catch(err => {
                Alert.alert('Execution Failure', err || 'Network layer error saving prospect.');
            });
    };
    // ==========================================================================

    const renderSummaryCards = () => {
        const summary = stats.summary || { today_followups: 0, under_process: 0, today_completed: 0, today_pending: 0, today_new: 0 };
        
        const metricCards = [
            { count: summary.today_followups, label: "Today's Follow Ups", tint: '#D97706', icon: 'alarm-outline', bg: '#FEF3C7' },
            { count: summary.under_process, label: 'Under Process', tint: '#4F46E5', icon: 'sync-outline', bg: '#E0E7FF' },
            { count: summary.today_completed, label: 'Today Completed', tint: '#10B981', icon: 'checkmark-done-circle-outline', bg: '#D1FAE5' },
            { count: summary.today_pending, label: 'Today Pending', tint: '#EF4444', icon: 'hourglass-outline', bg: '#FEE2E2' },
            { count: summary.today_new, label: 'Today New', tint: '#0EA5E9', icon: 'sparkles-outline', bg: '#E0F2FE' }
        ];

        return (
            <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardScrollWrapper}>
                    {metricCards.map((card, idx) => (
                        <View key={idx} style={[styles.webStyleMetricCard, { borderLeftColor: card.tint }]}>
                            <View style={[styles.webStyleIconCircle, { backgroundColor: card.bg }]}>
                                <Ionicons name={card.icon} size={18} color={card.tint} />
                            </View>
                            <View style={{ marginLeft: 10, flex: 1 }}>
                                <Text style={styles.webStyleCardLabel} numberOfLines={1}>{card.label}</Text>
                                <Text style={styles.webStyleCardValue}>{card.count || 0}</Text>
                            </View>
                        </View>
                    ))}
                </ScrollView>

                {/* Dynamic Status Counts Segment */}
                {stats.status_counts && stats.status_counts.length > 0 && (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusBadgeWrapper}>
                        {stats.status_counts.map((sc, i) => (
                            <View key={i} style={styles.statusBadgeItem}>
                                <Text style={styles.statusBadgeLabel}>{sc.status_name}</Text>
                                <View style={styles.statusBadgeCount}>
                                    <Text style={styles.statusBadgeCountTxt}>{sc.count || 0}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        );
    };

    const renderCardItem = ({ item }) => {
        const statusName = item.status?.status_name || 'Undetermined';
        const isSuccess = ['converted', 'completed', 'won'].some(v => statusName.toLowerCase().includes(v));
        
        return (
            <View style={styles.metricCard}>
                <View style={styles.cardHead}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.leads_name || 'Unnamed Entity'}</Text>
                        <Text style={styles.subProductText}>
                            <Ionicons name="cube-outline" size={11} color="#64748B" /> {item.product?.product_name || 'General Domain'}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isSuccess ? '#DCFCE7' : '#EEF2FF' }]}>
                        <Text style={[styles.statusLabel, { color: isSuccess ? '#16A34A' : '#6366F1' }]}>{statusName.toUpperCase()}</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.agentPill}>
                        <Ionicons name="person-circle" size={13} color="#4F46E5" />
                        <Text style={styles.agentName}>Sales: <Text style={{fontWeight:'800'}}>{item.user?.name || 'Delegation Pending'}</Text></Text>
                    </View>

                    <View style={styles.detailRow}>
                        <Ionicons name="business-outline" size={13} color="#64748B" style={styles.rowIcon} />
                        <Text style={styles.rowText} numberOfLines={1}>Prospect: <Text style={{ fontWeight: '600', color: '#1E293B' }}>{item.prospectus?.prospectus_name || 'N/A'}</Text></Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="person-outline" size={13} color="#64748B" style={styles.rowIcon} />
                        <Text style={styles.rowText} numberOfLines={1}>{item.contact_person || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={13} color="#64748B" style={styles.rowIcon} />
                        <Text style={[styles.rowText, { color: '#2563EB', fontWeight: '700' }]} onPress={() => item.contact_number && Linking.openURL(`tel:${item.contact_number}`)}>
                            {item.contact_number || 'No Contact'}
                        </Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="earth-outline" size={13} color="#64748B" style={styles.rowIcon} />
                        <Text style={styles.rowText} numberOfLines={1}>
                            {[item.city?.city_name, item.state?.state_name].filter(Boolean).join(', ') || 'Geography not set'}
                        </Text>
                    </View>
                    <TouchableOpacity style={styles.remarkBlock} activeOpacity={0.7} onPress={() => triggerHistoryLogs(item.id)}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.remarkSubject}>Audit Trail & History:</Text>
                            <Ionicons name="chevron-forward" size={12} color="#94A3B8" />
                        </View>
                        <Text style={[styles.remarkMsg, !(item.latest_remark?.remark || item.latestRemark?.remark) && { color: '#94A3B8', fontStyle: 'italic' }]} numberOfLines={2}>
                            {item.latest_remark?.remark || item.latestRemark?.remark || "Tap here to explore remark trails..."}
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.cardActionFooter}>
                    <TouchableOpacity style={[styles.actBtn, styles.btnReassign, { flex: 1 }]} activeOpacity={0.7} onPress={() => openReassignPanel(item)}>
                        <Ionicons name="git-compare-outline" size={14} color="#FFF" />
                        <Text style={styles.btnReassignTxt}>Reallocate to Sales Executive</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderTableHeader = () => (
        <View style={styles.thWrap}>
            <View style={{ width: 100 }}><Text style={styles.thText}>Status</Text></View>
            <View style={{ width: 130 }}><Text style={styles.thText}>Assigned To</Text></View>
            <View style={{ width: 140 }}><Text style={styles.thText}>Prospect</Text></View>
            <View style={{ width: 140 }}><Text style={styles.thText}>Lead</Text></View>
            <View style={{ width: 130 }}><Text style={styles.thText}>Contact Person</Text></View>
            <View style={{ width: 120 }}><Text style={styles.thText}>Contact No.</Text></View>
            <View style={{ width: 180 }}><Text style={styles.thText}>Remark</Text></View>
            <View style={{ width: 110 }}><Text style={styles.thText}>Next Follow</Text></View>
            <View style={{ width: 160 }}><Text style={styles.thText}>Address</Text></View>
            <View style={{ width: 110 }}><Text style={styles.thText}>State</Text></View>
            <View style={{ width: 110 }}><Text style={styles.thText}>City</Text></View>
            <View style={{ width: 150 }}><Text style={styles.thText}>Email</Text></View>
            <View style={{ width: 110 }}><Text style={styles.thText}>Business</Text></View>
            <View style={{ width: 110 }}><Text style={styles.thText}>Source</Text></View>
            <View style={{ width: 120 }}><Text style={styles.thText}>Product</Text></View>
            <View style={{ width: 90 }}><Text style={styles.thText}>Ticket</Text></View>
        </View>
    );

    const renderTableRow = ({ item }) => (
        <View style={styles.trWrap}>
            <View style={{ width: 100 }}>
                <Text style={[styles.tdText, { color: '#4F46E5', fontWeight: '700', fontSize: 11 }]} numberOfLines={1}>{item.status?.status_name || '-'}</Text>
            </View>
            <View style={{ width: 130 }}>
                <Text style={styles.tdText} numberOfLines={1}>{item.user?.name || '-'}</Text>
            </View>
            <View style={{ width: 140 }}>
                <Text style={styles.tdText} numberOfLines={1}>{item.prospectus?.prospectus_name || '-'}</Text>
            </View>
            <View style={{ width: 140 }}>
                <Text style={[styles.tdText, { fontWeight: '700' }]} numberOfLines={1}>{item.leads_name || '-'}</Text>
            </View>
            <View style={{ width: 130 }}>
                <Text style={styles.tdText} numberOfLines={1}>{item.contact_person || '-'}</Text>
            </View>
            <View style={{ width: 120 }}>
                <Text style={[styles.tdText, { color: '#2563EB' }]} numberOfLines={1} onPress={() => item.contact_number && Linking.openURL(`tel:${item.contact_number}`)}>
                    {item.contact_number || '-'}
                </Text>
            </View>
            <TouchableOpacity style={{ width: 180, backgroundColor: '#F8FAFC', paddingHorizontal: 8, justifyContent: 'center', borderRightWidth: 1, borderColor: '#F1F5F9' }} activeOpacity={0.7} onPress={() => triggerHistoryLogs(item.id)}>
                <Text style={[styles.tdText, { fontStyle: 'italic', color: '#4F46E5' }]} numberOfLines={1}>
                    {item.latest_remark?.remark || item.latestRemark?.remark || 'View remark history...'}
                </Text>
            </TouchableOpacity>
            <View style={{ width: 110 }}>
                <Text style={styles.tdText} numberOfLines={1}>{item.next_follow_up_date ? item.next_follow_up_date.split('T')[0] : '-'}</Text>
            </View>
            <View style={{ width: 160 }}>
                <Text style={styles.tdText} numberOfLines={1}>{item.address || '-'}</Text>
            </View>
            <View style={{ width: 110 }}>
                <Text style={styles.tdText} numberOfLines={1}>{item.state?.state_name || '-'}</Text>
            </View>
            <View style={{ width: 110 }}>
                <Text style={styles.tdText} numberOfLines={1}>{item.city?.city_name || '-'}</Text>
            </View>
            <View style={{ width: 150 }}>
                <Text style={styles.tdText} numberOfLines={1}>{item.email || '-'}</Text>
            </View>
            <View style={{ width: 110 }}>
                <Text style={styles.tdText} numberOfLines={1}>{item.business_type?.business_name || item.businessType?.business_name || '-'}</Text>
            </View>
            <View style={{ width: 110 }}>
                <Text style={styles.tdText} numberOfLines={1}>{item.lead_source?.source_name || item.leadSource?.source_name || '-'}</Text>
            </View>
            <View style={{ width: 120 }}>
                <Text style={styles.tdText} numberOfLines={1}>{item.product?.product_name || '-'}</Text>
            </View>
            <View style={{ width: 90 }}>
                <Text style={[styles.tdText, { fontWeight: '700' }]} numberOfLines={1}>{item.ticket_value || '0.00'}</Text>
            </View>
        </View>
    );

    const renderPaginator = () => (
        <View style={styles.pagerBand}>
            <TouchableOpacity 
                disabled={pagination.current_page === 1 || loading}
                style={[styles.pagerToggle, pagination.current_page === 1 && styles.pagerToggleDisabled]}
                onPress={() => loadLeads(pagination.current_page - 1)}
            >
                <Ionicons name="chevron-back" size={18} color={pagination.current_page === 1 ? '#94A3B8' : '#1E293B'} />
            </TouchableOpacity>
            <Text style={styles.pagerText}>Page {pagination.current_page} of {pagination.last_page}</Text>
            <TouchableOpacity 
                disabled={pagination.current_page === pagination.last_page || loading}
                style={[styles.pagerToggle, pagination.current_page === pagination.last_page && styles.pagerToggleDisabled]}
                onPress={() => loadLeads(pagination.current_page + 1)}
            >
                <Ionicons name="chevron-forward" size={18} color={pagination.current_page === pagination.last_page ? '#94A3B8' : '#1E293B'} />
            </TouchableOpacity>
        </View>
    );

    const renderFilterScrollSection = (label, key, data, mapDisplay = 'name') => (
        <View style={styles.filterSubBlock}>
            <Text style={styles.filterSectionTitle}>{label}</Text>
            <View style={styles.chipFlow}>
                <TouchableOpacity 
                    style={[styles.filterChip, !filters[key] && styles.filterChipActive]}
                    onPress={() => {
                        let f = { ...filters, [key]: '' };
                        if (key === 'state_id') {
                            f.city_id = '';
                            dispatch(updateLeadGenCities([]));
                        }
                        setFilters(f);
                    }}
                >
                    <Text style={[styles.filterChipTxt, !filters[key] && styles.filterChipTxtActive]}>All</Text>
                </TouchableOpacity>
                {data.map((entry, idx) => {
                    const isObj = typeof entry === 'object';
                    const val = isObj ? entry.id : entry;
                    const labelTxt = isObj ? (entry[mapDisplay] || entry.status_name || entry.product_name || entry.state_name || entry.city_name || entry.source_name || entry.business_name) : entry;
                    const isSel = filters[key] === val;
                    return (
                        <TouchableOpacity 
                            key={idx}
                            style={[styles.filterChip, isSel && styles.filterChipActive]}
                            onPress={() => {
                                let f = { ...filters, [key]: val };
                                if (key === 'state_id') {
                                    f.city_id = '';
                                    fetchCitiesForState(val);
                                }
                                setFilters(f);
                            }}
                        >
                            <Text style={[styles.filterChipTxt, isSel && styles.filterChipTxtActive]}>{labelTxt}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <View style={styles.screenBase}>
            <Header title="My Generated Leads" />

            {renderSummaryCards()}

            {/* CLEAN OVERFLOW-FREE TOOLBAR */}
            <View style={styles.toolBarLine}>
                <View style={styles.searchFieldWrap}>
                    <Ionicons name="search-outline" size={16} color="#94A3B8" />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search leads..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={() => loadLeads(1, false)}
                        returnKeyType="search"
                    />
                </View>

                <TouchableOpacity 
                    style={[styles.filterTrig, activeFiltersCount > 0 && styles.filterTrigActive]} 
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons name="filter" size={15} color={activeFiltersCount > 0 ? '#FFF' : '#6366F1'} />
                </TouchableOpacity>

                <View style={styles.capsuleGrid}>
                    <TouchableOpacity style={[styles.viewCap, viewMode === 'card' && styles.viewCapActive]} onPress={() => setViewMode('card')}>
                        <Ionicons name="grid-outline" size={14} color={viewMode === 'card' ? '#FFF' : '#475569'} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.viewCap, viewMode === 'table' && styles.viewCapActive]} onPress={() => setViewMode('table')}>
                        <Ionicons name="list" size={14} color={viewMode === 'table' ? '#FFF' : '#475569'} />
                    </TouchableOpacity>
                </View>
            </View>

            {loading && pagination.current_page === 1 && !refreshing ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingTxt}>Parsing active pipeline streams...</Text>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    {viewMode === 'card' ? (
                        <FlatList
                            data={leads}
                            keyExtractor={(item, idx) => `${item.id}-${idx}`}
                            renderItem={renderCardItem}
                            contentContainerStyle={styles.listPadding}
                            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                            ListEmptyComponent={
                                <View style={styles.emptyArea}>
                                    <Ionicons name="rocket-outline" size={45} color="#C7D2FE" />
                                    <Text style={styles.emptyHeading}>Generator Dashboard Blank</Text>
                                    <Text style={styles.emptySubtext}>No leads were generated. Start recording opportunities through external CRM funnels.</Text>
                                </View>
                            }
                        />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
                            <View>
                                {renderTableHeader()}
                                <FlatList
                                    data={leads}
                                    keyExtractor={(item, idx) => `${item.id}-${idx}`}
                                    renderItem={renderTableRow}
                                    contentContainerStyle={{ paddingBottom: 80 }}
                                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                                    ListEmptyComponent={
                                        <View style={[styles.emptyArea, { width: 1500 }]}>
                                            <Text style={styles.emptyHeading}>Zero Record Found</Text>
                                        </View>
                                    }
                                />
                            </View>
                        </ScrollView>
                    )}
                    {leads.length > 0 && renderPaginator()}
                </View>
            )}

            {/* FLOATING ACTION BUTTON (SAME AS TASK SCREEN) */}
            <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => setAddLeadModalVisible(true)}>
                <Ionicons name="add" size={30} color="#FFF" />
            </TouchableOpacity>

            {/* =========================================================== */}
            {/* MODAL: ADD NEW LEAD */}
            {/* =========================================================== */}
            <Modal visible={addLeadModalVisible} transparent animationType="slide" onRequestClose={() => setAddLeadModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.ovlWrapper}>
                        <View style={[styles.ovlSheet, { height: '90%', maxHeight: '90%' }]}>
                            <View style={[styles.ovlHeader, { backgroundColor: '#4F46E5' }]}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Ionicons name="person-add-outline" size={20} color="#FFF" />
                                    <Text style={[styles.ovlHeading, { color: '#FFF' }]}>Record New Opportunity</Text>
                                </View>
                                <TouchableOpacity onPress={() => setAddLeadModalVisible(false)}>
                                    <Ionicons name="close-circle" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled">
                                {/* PROSPECT SECTION */}
                                <View style={styles.inputGroupBlock}>
                                    <Text style={styles.formLabel}>Prospectus <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity style={[styles.formPickerBtn, { flex: 1 }]} onPress={openProspectSearch}>
                                            <Text style={[styles.formPickerLabel, leadForm.prospectus_id && { color: '#1E293B', fontWeight: '700' }]} numberOfLines={1}>
                                                {leadForm.prospectus_name || "Pick Registered Prospect"}
                                            </Text>
                                            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
                                        </TouchableOpacity>
                                        <TouchableOpacity 
                                            style={styles.quickAddProspectBtn} 
                                            onPress={() => setAddProspectVisible(true)}
                                        >
                                            <Ionicons name="add-circle-outline" size={22} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputGroupBlock}>
                                    <Text style={styles.formLabel}>Lead Name (Auto-populated from prospect)</Text>
                                    <TextInput 
                                        style={styles.formInput} 
                                        placeholder="Optional descriptor name" 
                                        value={leadForm.leads_name} 
                                        onChangeText={(val) => setLeadForm(p => ({ ...p, leads_name: val }))} 
                                    />
                                </View>

                                <View style={styles.rowInputsGrid}>
                                    <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                        <Text style={styles.formLabel}>Contact Person</Text>
                                        <TextInput 
                                            style={styles.formInput} 
                                            placeholder="Contact Name" 
                                            value={leadForm.contact_person} 
                                            onChangeText={(val) => setLeadForm(p => ({ ...p, contact_person: val }))} 
                                        />
                                    </View>
                                    <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                        <Text style={styles.formLabel}>Contact Number</Text>
                                        <TextInput 
                                            style={styles.formInput} 
                                            placeholder="Phone number" 
                                            keyboardType="phone-pad"
                                            value={leadForm.contact_number} 
                                            onChangeText={(val) => setLeadForm(p => ({ ...p, contact_number: val }))} 
                                        />
                                    </View>
                                </View>

                                <View style={styles.rowInputsGrid}>
                                    <View style={{ flex: 1, zIndex: 11 }}>
                                        {renderInlineDropdown('Status *', leadForm.status_id, filterOptions.statuses, (val) => setLeadForm(p => ({ ...p, status_id: val })))}
                                    </View>
                                    <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                        <Text style={styles.formLabel}>Follow-up Date <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                        <TextInput 
                                            style={styles.formInput} 
                                            placeholder="YYYY-MM-DD" 
                                            value={leadForm.next_follow_up_date} 
                                            onChangeText={(val) => setLeadForm(p => ({ ...p, next_follow_up_date: val }))} 
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroupBlock}>
                                    <Text style={styles.formLabel}>Full Street Address</Text>
                                    <TextInput 
                                        style={styles.formInput} 
                                        placeholder="Physical Location" 
                                        value={leadForm.address} 
                                        onChangeText={(val) => setLeadForm(p => ({ ...p, address: val }))} 
                                    />
                                </View>

                                <View style={styles.rowInputsGrid}>
                                    <View style={{ flex: 1, zIndex: 10 }}>
                                        {renderInlineDropdown('State', leadForm.state_id, filterOptions.states, (val) => {
                                            setLeadForm(p => ({ ...p, state_id: val, city_id: '' }));
                                            fetchCitiesForState(val);
                                        })}
                                    </View>
                                    <View style={{ flex: 1, zIndex: 9 }}>
                                        {renderInlineDropdown('City', leadForm.city_id, filterOptions.cities, (val) => setLeadForm(p => ({ ...p, city_id: val })), leadForm.state_id ? 'Select City' : 'Select State First')}
                                    </View>
                                </View>

                                <View style={styles.rowInputsGrid}>
                                    <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                        <Text style={styles.formLabel}>Email ID</Text>
                                        <TextInput 
                                            style={styles.formInput} 
                                            placeholder="client@company.com" 
                                            keyboardType="email-address"
                                            value={leadForm.email} 
                                            onChangeText={(val) => setLeadForm(p => ({ ...p, email: val }))} 
                                        />
                                    </View>
                                    <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                        <Text style={styles.formLabel}>Website Link</Text>
                                        <TextInput 
                                            style={styles.formInput} 
                                            placeholder="https://" 
                                            keyboardType="url"
                                            value={leadForm.website_link} 
                                            onChangeText={(val) => setLeadForm(p => ({ ...p, website_link: val }))} 
                                        />
                                    </View>
                                </View>

                                <View style={styles.rowInputsGrid}>
                                    <View style={{ flex: 1, zIndex: 8 }}>
                                        {renderInlineDropdown('Business Type', leadForm.business_type_id, filterOptions.business_types, (val) => setLeadForm(p => ({ ...p, business_type_id: val })))}
                                    </View>
                                    <View style={{ flex: 1, zIndex: 7 }}>
                                        {renderInlineDropdown('Lead Source', leadForm.lead_source_id, filterOptions.lead_sources, (val) => setLeadForm(p => ({ ...p, lead_source_id: val })))}
                                    </View>
                                </View>

                                <View style={{ zIndex: 6 }}>
                                    {renderInlineDropdown('Product Portfolio Type', leadForm.products_id, filterOptions.products, (val) => setLeadForm(p => ({ ...p, products_id: val })))}
                                </View>

                                <View style={{ zIndex: 5 }}>
                                    {renderInlineDropdown('Allocation Representative *', leadForm.user_id, filterOptions.sales_team, (val) => setLeadForm(p => ({ ...p, user_id: val })))}
                                </View>

                                <View style={[styles.inputGroupBlock, { marginBottom: 32 }]}>
                                    <Text style={styles.formLabel}>Initialization Remarks <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <TextInput 
                                        style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]} 
                                        placeholder="Enter initial remarks..." 
                                        multiline={true}
                                        value={leadForm.remark} 
                                        onChangeText={(val) => setLeadForm(p => ({ ...p, remark: val }))} 
                                    />
                                </View>
                            </ScrollView>

                            <View style={styles.ovlFooter}>
                                <TouchableOpacity 
                                    style={[styles.sheetBtn, styles.sheetBtnApply, submittingLead && { opacity: 0.7 }]} 
                                    onPress={handleLeadSubmit}
                                    disabled={submittingLead}
                                >
                                    {submittingLead ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.sheetBtnApplyTxt}>Commit Generated Lead</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* =========================================================== */}
            {/* MODAL: ADVANCED FILTERS */}
            {/* =========================================================== */}
            <Modal visible={filterModalVisible} transparent animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
                <View style={styles.ovlWrapper}>
                    <View style={styles.ovlSheet}>
                        <View style={styles.ovlHeader}>
                            <Text style={styles.ovlHeading}>Segment Lead Pipeline</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={{ padding: 16 }}>
                            {renderFilterScrollSection("Status Stage", "status_id", filterOptions.statuses)}
                            {renderFilterScrollSection("Product Catalog", "products_id", filterOptions.products)}
                            {renderFilterScrollSection("Lead Sourcing Channel", "lead_source_id", filterOptions.lead_sources)}
                            {renderFilterScrollSection("Geographical Region", "state_id", filterOptions.states)}
                            {renderFilterScrollSection("Locality Cluster", "city_id", filterOptions.cities)}
                            {renderFilterScrollSection("B2B Business Mode", "business_type_id", filterOptions.business_types)}
                        </ScrollView>

                        <View style={styles.ovlFooter}>
                            <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnReset]} onPress={clearIsolatedFilters}>
                                <Text style={styles.sheetBtnResetTxt}>Clear Segment</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.sheetBtn, styles.sheetBtnApply]} onPress={() => applyIsolatedFilters(filters)}>
                                <Text style={styles.sheetBtnApplyTxt}>Render Matrix</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* =========================================================== */}
            {/* MODAL: PROSPECTUS SELECTOR */}
            {/* =========================================================== */}
            <Modal visible={prospectPickerVisible} transparent animationType="fade" onRequestClose={() => setProspectPickerVisible(false)}>
                <View style={styles.overlayBlur}>
                    <View style={[styles.popupDialog, { height: '75%', padding: 0 }]}>
                        <View style={[styles.popupHeader, { padding: 16 }]}>
                            <Text style={styles.popupTitle}>Select Prospect Registry</Text>
                            <TouchableOpacity onPress={() => setProspectPickerVisible(false)}>
                                <Ionicons name="close" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                            <View style={[styles.searchFieldWrap, { borderColor: '#4F46E5' }]}>
                                <Ionicons name="search" size={16} color="#4F46E5" />
                                <TextInput 
                                    style={styles.searchInput} 
                                    placeholder="Type to find Prospect..." 
                                    value={prospectSearch}
                                    onChangeText={(val) => {
                                        setProspectSearch(val);
                                        triggerProspectQuery(val);
                                    }}
                                />
                            </View>
                        </View>

                        {prospectLoading ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <ActivityIndicator size="small" color="#4F46E5" />
                            </View>
                        ) : (
                            <FlatList
                                data={prospectList}
                                keyExtractor={(item) => String(item.id)}
                                style={{ flex: 1 }}
                                contentContainerStyle={{ paddingHorizontal: 16 }}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.prospectRecordRow} onPress={() => selectProspect(item)}>
                                        <Text style={styles.prospectRecordName}>{item.prospectus_name}</Text>
                                        <Text style={styles.prospectRecordSub}>
                                            {item.contact_person || 'No Person'} • {item.contact_number || 'No Call'}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                ListEmptyComponent={
                                    <View style={{ padding: 20, alignItems: 'center' }}>
                                        <Text style={{ color: '#64748B' }}>No prospects indexed.</Text>
                                        <TouchableOpacity style={{ marginTop: 10, backgroundColor: '#EEF2FF', padding: 6, borderRadius: 4 }} onPress={() => { setProspectPickerVisible(false); setAddProspectVisible(true); }}>
                                            <Text style={{ color: '#4F46E5', fontWeight: '700' }}>Create Prospect Inline +</Text>
                                        </TouchableOpacity>
                                    </View>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* =========================================================== */}
            {/* MODAL: INLINE ADD PROSPECT */}
            {/* =========================================================== */}
            <Modal visible={addProspectVisible} transparent animationType="slide" onRequestClose={() => setAddProspectVisible(false)}>
                <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
                    <View style={styles.overlayBlur}>
                        <View style={[styles.popupDialog, { height: '80%', maxHeight: '80%', padding: 0 }]}>
                            <View style={[styles.popupHeader, { padding: 16, backgroundColor: '#0F172A' }]}>
                                <Text style={[styles.popupTitle, { color: '#FFF' }]}>Add New Corporate Prospect</Text>
                                <TouchableOpacity onPress={() => setAddProspectVisible(false)}>
                                    <Ionicons name="close" size={20} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled">
                                <View style={styles.inputGroupBlock}>
                                    <Text style={styles.formLabel}>Prospect Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <TextInput 
                                        style={styles.formInput} 
                                        placeholder="Legal Name" 
                                        value={prospectForm.prospectus_name} 
                                        onChangeText={(val) => setProspectForm(p => ({ ...p, prospectus_name: val }))} 
                                    />
                                </View>

                                <View style={styles.rowInputsGrid}>
                                    <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                        <Text style={styles.formLabel}>Executive Name</Text>
                                        <TextInput 
                                            style={styles.formInput} 
                                            placeholder="Name" 
                                            value={prospectForm.contact_person} 
                                            onChangeText={(val) => setProspectForm(p => ({ ...p, contact_person: val }))} 
                                        />
                                    </View>
                                    <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                        <Text style={styles.formLabel}>Contact Number</Text>
                                        <TextInput 
                                            style={styles.formInput} 
                                            placeholder="Phone" 
                                            keyboardType="phone-pad"
                                            value={prospectForm.contact_number} 
                                            onChangeText={(val) => setProspectForm(p => ({ ...p, contact_number: val }))} 
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroupBlock}>
                                    <Text style={styles.formLabel}>Address</Text>
                                    <TextInput 
                                        style={styles.formInput} 
                                        placeholder="Corporate Address" 
                                        value={prospectForm.address} 
                                        onChangeText={(val) => setProspectForm(p => ({ ...p, address: val }))} 
                                    />
                                </View>

                                <View style={styles.rowInputsGrid}>
                                    <View style={{ flex: 1, zIndex: 10 }}>
                                        {renderInlineDropdown('State', prospectForm.state_id, filterOptions.states, (val) => {
                                            setProspectForm(p => ({ ...p, state_id: val, city_id: '' }));
                                            fetchCitiesForState(val);
                                        })}
                                    </View>
                                    <View style={{ flex: 1, zIndex: 9 }}>
                                        {renderInlineDropdown('City', prospectForm.city_id, filterOptions.cities, (val) => setProspectForm(p => ({ ...p, city_id: val })), prospectForm.state_id ? 'Select City' : 'Select State First')}
                                    </View>
                                </View>

                                <View style={{ zIndex: 8 }}>
                                    {renderInlineDropdown('B2B Business Scale', prospectForm.business_type_id, filterOptions.business_types, (val) => setProspectForm(p => ({ ...p, business_type_id: val })))}
                                </View>
                            </ScrollView>

                            <View style={[styles.popupActionsLine, { padding: 16, borderTopWidth: 1, borderColor: '#F1F5F9' }]}>
                                <TouchableOpacity style={styles.popupBtnCancel} onPress={() => setAddProspectVisible(false)}>
                                    <Text style={styles.popupBtnCancelTxt}>Discard</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.popupBtnCommit, { backgroundColor: '#0F172A' }]} 
                                    onPress={handleProspectSubmit}
                                    disabled={submittingProspect}
                                >
                                    {submittingProspect ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.popupBtnCommitTxt}>Create Entity</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>



            {/* =========================================================== */}
            {/* MODAL: OWNERSHIP REASSIGNMENT */}
            {/* =========================================================== */}
            <Modal visible={reassignModalVisible} transparent animationType="fade" onRequestClose={() => setReassignModalVisible(false)}>
                <View style={styles.overlayBlur}>
                    <View style={styles.popupDialog}>
                        <View style={styles.popupHeader}>
                            <Text style={styles.popupTitle}>Transfer Project Ownership</Text>
                            <Ionicons name="git-network-outline" size={20} color="#4F46E5" />
                        </View>
                        
                        {selectedLeadForTransfer && (
                            <View style={styles.popupInfoCard}>
                                <Text style={styles.popupSubjectName}>{selectedLeadForTransfer.leads_name}</Text>
                                <Text style={styles.popupCurrentHolder}>Assigned: {selectedLeadForTransfer.user?.name || 'Unallocated'}</Text>
                            </View>
                        )}

                        <Text style={styles.popupLabelSelect}>Reallocate to Sales Representative:</Text>
                        <View style={styles.executiveCatalog}>
                            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled={true}>
                                {filterOptions.sales_team.map((exec) => {
                                    const isPicked = targetUserId === String(exec.id);
                                    return (
                                        <TouchableOpacity 
                                            key={exec.id} 
                                            style={[styles.execRow, isPicked && styles.execRowPicked]}
                                            onPress={() => setTargetUserId(String(exec.id))}
                                        >
                                            <Text style={[styles.execRowLabel, isPicked && styles.execRowLabelPicked]}>{exec.name}</Text>
                                            {isPicked && <Ionicons name="checkmark-circle" size={18} color="#4F46E5" />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        <View style={styles.popupActionsLine}>
                            <TouchableOpacity style={styles.popupBtnCancel} onPress={() => setReassignModalVisible(false)}>
                                <Text style={styles.popupBtnCancelTxt}>Abort</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.popupBtnCommit} 
                                onPress={handleReassignSubmit}
                                disabled={savingTransfer}
                            >
                                {savingTransfer ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.popupBtnCommitTxt}>Confirm Reassign</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    screenBase: { flex: 1, backgroundColor: '#FFFFFF' },
    
    // Web-style Scrolling metric cards
    cardScrollWrapper: { paddingHorizontal: 12, paddingTop: 12, gap: 10, flexDirection: 'row' },
    webStyleMetricCard: { width: 145, backgroundColor: '#FFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#F1F5F9', borderLeftWidth: 4, elevation: 1.5, flexDirection: 'row', alignItems: 'center' },
    webStyleIconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    webStyleCardLabel: { fontSize: 9.5, color: '#64748B', fontWeight: '700' },
    webStyleCardValue: { fontSize: 15, fontWeight: '900', color: '#1E293B', marginTop: 2 },

    // Dynamic status counter pills scroller
    statusBadgeWrapper: { paddingHorizontal: 12, paddingTop: 10, gap: 8, flexDirection: 'row', paddingBottom: 4 },
    statusBadgeItem: { backgroundColor: '#EEF2FF', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: '#E0E7FF', flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusBadgeLabel: { fontSize: 10.5, color: '#4F46E5', fontWeight: '700' },
    statusBadgeCount: { backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1.5 },
    statusBadgeCountTxt: { fontSize: 9, color: '#FFF', fontWeight: '900' },

    // Absolute FAB (Aligned exactly with Task Screen design language)
    fab: {
        position: 'absolute',
        right: 16,
        bottom: 24,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#4F46E5',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
        zIndex: 9999
    },

    // Toolbars
    toolBarLine: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, marginVertical: 12, alignItems: 'center' },
    searchFieldWrap: { flex: 1, height: 38, backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 },
    searchInput: { flex: 1, marginLeft: 6, fontSize: 13, color: '#1E293B', padding: 0 },
    capsuleGrid: { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 6, padding: 2, borderWidth: 1, borderColor: '#E2E8F0' },
    viewCap: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderRadius: 4 },
    viewCapActive: { backgroundColor: '#6366F1' },
    filterTrig: { width: 34, height: 34, backgroundColor: '#EEF2FF', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    filterTrigActive: { backgroundColor: '#6366F1' },

    listPadding: { paddingHorizontal: 12, paddingBottom: 100 },
    metricCard: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, marginBottom: 10, elevation: 1.2, borderWidth: 1, borderColor: '#EEF2FF' },
    cardHead: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
    cardTitle: { fontSize: 14.5, fontWeight: '800', color: '#1E293B' },
    subProductText: { fontSize: 10.5, color: '#64748B', marginTop: 2, fontWeight: '600' },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, alignSelf: 'flex-start' },
    statusLabel: { fontSize: 8.5, fontWeight: '800' },

    cardBody: { paddingTop: 10 },
    agentPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderLeftWidth: 3, borderLeftColor: '#6366F1', marginBottom: 8 },
    agentName: { fontSize: 10.5, color: '#312E81', fontWeight: '600' },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
    rowIcon: { width: 16, marginRight: 6 },
    rowText: { fontSize: 12.5, color: '#475569', flex: 1 },

    remarkBlock: { marginTop: 6, backgroundColor: '#F8FAFC', padding: 8, borderRadius: 6, borderLeftWidth: 2, borderLeftColor: '#CBD5E1' },
    remarkSubject: { fontSize: 9.5, color: '#64748B', fontWeight: '700' },
    remarkMsg: { fontSize: 11.5, color: '#475569', fontStyle: 'italic', lineHeight: 15 },

    cardActionFooter: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
    actBtn: { flex: 1, height: 34, borderRadius: 6, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
    btnInspect: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    btnInspectTxt: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
    btnReassign: { backgroundColor: '#6366F1' },
    btnReassignTxt: { fontSize: 12, fontWeight: '700', color: '#FFF' },

    thWrap: { flexDirection: 'row', backgroundColor: '#EEF2FF', paddingVertical: 10, paddingHorizontal: 10 },
    thText: { fontSize: 11, fontWeight: '700', color: '#312E81' },
    trWrap: { flexDirection: 'row', backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingVertical: 8, paddingHorizontal: 10 },
    tdText: { fontSize: 12.5, color: '#334155', alignSelf: 'center', paddingRight: 5 },
    iconGridBtn: { padding: 5, borderRadius: 4, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },

    pagerBand: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    pagerToggle: { padding: 6, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 4, marginHorizontal: 12 },
    pagerToggleDisabled: { opacity: 0.35 },
    pagerText: { fontSize: 12.5, fontWeight: '700', color: '#334155' },

    loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingTxt: { marginTop: 8, color: '#64748B', fontSize: 12 },
    emptyArea: { flex: 1, alignItems: 'center', marginTop: 70, paddingHorizontal: 32 },
    emptyHeading: { fontSize: 15, fontWeight: '800', color: '#1E293B', marginTop: 14 },
    emptySubtext: { fontSize: 11.5, color: '#64748B', textAlign: 'center', marginTop: 4, lineHeight: 17 },

    ovlWrapper: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    ovlSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '75%' },
    ovlHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
    ovlHeading: { fontSize: 15.5, fontWeight: '800', color: '#1E293B' },

    filterSubBlock: { marginBottom: 16 },
    filterSectionTitle: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 },
    chipFlow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    filterChip: { backgroundColor: '#F1F5F9', paddingVertical: 5, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1, borderColor: '#E2E8F0' },
    filterChipActive: { backgroundColor: '#EEF2FF', borderColor: '#6366F1' },
    filterChipTxt: { fontSize: 11, color: '#475569', fontWeight: '600' },
    filterChipTxtActive: { color: '#312E81', fontWeight: '800' },

    ovlFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10, backgroundColor: '#FFF' },
    sheetBtn: { flex: 1, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    sheetBtnReset: { backgroundColor: '#F1F5F9' },
    sheetBtnApply: { backgroundColor: '#6366F1' },
    sheetBtnResetTxt: { color: '#475569', fontWeight: '700', fontSize: 12.5 },
    sheetBtnApplyTxt: { color: '#FFF', fontWeight: '700', fontSize: 12.5 },

    overlayBlur: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    popupDialog: { backgroundColor: '#FFF', borderRadius: 12, padding: 20, elevation: 5 },
    popupHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 12, alignItems: 'center' },
    popupTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    popupInfoCard: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
    popupSubjectName: { fontSize: 13.5, fontWeight: '800', color: '#1E293B' },
    popupCurrentHolder: { fontSize: 11, color: '#64748B', marginTop: 2 },
    popupLabelSelect: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 8 },
    executiveCatalog: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6, overflow: 'hidden', marginBottom: 16 },
    execRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#FFF' },
    execRowPicked: { backgroundColor: '#EEF2FF' },
    execRowLabel: { fontSize: 12.5, color: '#1E293B', fontWeight: '500' },
    execRowLabelPicked: { color: '#312E81', fontWeight: '700' },
    popupActionsLine: { flexDirection: 'row', gap: 10 },
    popupBtnCancel: { flex: 1, height: 38, backgroundColor: '#F1F5F9', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    popupBtnCancelTxt: { color: '#475569', fontWeight: '700', fontSize: 12 },
    popupBtnCommit: { flex: 1, height: 38, backgroundColor: '#6366F1', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    popupBtnCommitTxt: { color: '#FFF', fontWeight: '700', fontSize: 12 },

    // Forms
    inputGroupBlock: { marginBottom: 12 },
    rowInputsGrid: { flexDirection: 'row', gap: 10 },
    formLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 5 },
    formInput: { height: 38, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, paddingHorizontal: 10, color: '#1E293B', backgroundColor: '#FAFAFA', fontSize: 13 },
    formPickerBtn: { height: 38, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, paddingHorizontal: 10, backgroundColor: '#FAFAFA', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    formPickerLabel: { fontSize: 13, color: '#94A3B8' },
    quickAddProspectBtn: { width: 38, height: 38, backgroundColor: '#0F172A', borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    prospectRecordRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    prospectRecordName: { fontSize: 13.5, fontWeight: '800', color: '#1E293B' },
    prospectRecordSub: { fontSize: 11, color: '#64748B', marginTop: 2 },
    dropdownList: {
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 8,
        backgroundColor: '#FFF',
        maxHeight: 200,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        zIndex: 1000,
    },
    dropdownItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    dropdownItemText: {
        fontSize: 13,
        color: '#1E293B',
    }
});

export default MyLeadGenScreen;
