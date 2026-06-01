import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    TextInput,
    ScrollView,
    Alert,
    Platform,
    KeyboardAvoidingView,
    Switch,
    RefreshControl
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import Header from '../components/Header';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    fetchSubscriptions,
    fetchSubscriptionStats,
    createSubscription,
    updateSubscriptionStatus,
    fetchSubscriptionHistory,
    fetchSubscriptionFormOptions,
    clearSubscriptionMessages,
    resetHistory
} from '../store/slices/subscriptionSlice';

const Subscription = () => {
    const dispatch = useDispatch();
    const isFocused = useIsFocused();

    const {
        subscriptions,
        pagination,
        history,
        formOptions,
        stats,
        loading,
        statsLoading,
        actionLoading,
        historyLoading,
        error,
        successMessage
    } = useSelector((state) => state.subscription);

    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'active', 'recurring'
    
    // Screen View Modes: Match Sales UI
    const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
    
    // Filters State
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [activeFilterDropdown, setActiveFilterDropdown] = useState(null);
    
    const [filterCustomer, setFilterCustomer] = useState(null);
    const [filterProduct, setFilterProduct] = useState(null);
    const [filterRecurrence, setFilterRecurrence] = useState(null);
    const [filterStatus, setFilterStatus] = useState(null);
    const [filterActive, setFilterActive] = useState(null);
    const [viewGroup, setViewGroup] = useState(false); // Aggregate Customers View

    // Add Modal States
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [activeFormDropdown, setActiveFormDropdown] = useState(null);
    const [formData, setFormData] = useState({
        customer_id: null,
        subscription_name: '',
        product_id: null,
        amount: '',
        billing_type: 'Prepaid',
        start_date: new Date().toISOString().split('T')[0],
        status: 'pending',
        is_recurring: true,
        recurrence_type: 'monthly',
        recurrence_interval: '1',
        alert_before_days: '5',
        notes: '',
    });

    // Other Modals
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [selectedSub, setSelectedSub] = useState(null);
    const [renewModalVisible, setRenewModalVisible] = useState(false);
    const [renewalStatus, setRenewalStatus] = useState('Payment Received');
    
    const [customerSearchText, setCustomerSearchText] = useState('');
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

    // Count Applied Filters for Visual Badge indicator
    const getAppliedFilterCount = () => {
        let count = 0;
        if (filterCustomer) count++;
        if (filterProduct) count++;
        if (filterRecurrence) count++;
        if (filterStatus) count++;
        if (filterActive !== null) count++;
        if (viewGroup) count++;
        return count;
    };

    const loadData = useCallback((page = 1, shouldRefresh = false) => {
        const params = {
            page,
            search: searchQuery,
            view_group: viewGroup ? 1 : 0,
        };

        if (filterCustomer) params.customer_id = filterCustomer;
        if (filterProduct) params.product_id = filterProduct;
        if (filterRecurrence) params.recurrence_type = filterRecurrence;
        if (filterStatus) params.status = filterStatus;
        if (filterActive !== null) params.is_active = filterActive ? 1 : 0;

        // Legacy quick tab mappings
        if (filterActive === null && activeTab === 'active') params.is_active = 1;
        if (filterRecurrence === null) {
            if (activeTab === 'recurring') params.is_recurring = 1;
            if (activeTab === 'non-recurring') params.is_recurring = 0;
        }

        if (shouldRefresh) setRefreshing(true);
        dispatch(fetchSubscriptions(params)).finally(() => setRefreshing(false));
    }, [dispatch, searchQuery, filterCustomer, filterProduct, filterRecurrence, filterStatus, filterActive, viewGroup, activeTab]);

    const fetchAllDashboardData = useCallback(() => {
        loadData(1, false);
        dispatch(fetchSubscriptionStats());
        dispatch(fetchSubscriptionFormOptions());
    }, [loadData, dispatch]);

    useEffect(() => {
        if (isFocused) {
            fetchAllDashboardData();
        }
    }, [isFocused, searchQuery, filterCustomer, filterProduct, filterRecurrence, filterStatus, filterActive, viewGroup, activeTab]);

    useEffect(() => {
        if (successMessage) {
            Alert.alert("Success", successMessage);
            setAddModalVisible(false);
            setRenewModalVisible(false);
            dispatch(clearSubscriptionMessages());
            resetForm();
            fetchAllDashboardData();
        }
        if (error) {
            Alert.alert("Error", typeof error === 'string' ? error : JSON.stringify(error));
            dispatch(clearSubscriptionMessages());
        }
    }, [successMessage, error, dispatch, fetchAllDashboardData]);

    const resetForm = () => {
        setFormData({
            customer_id: null,
            subscription_name: '',
            product_id: null,
            amount: '',
            billing_type: 'Prepaid',
            start_date: new Date().toISOString().split('T')[0],
            status: 'pending',
            is_recurring: true,
            recurrence_type: 'monthly',
            recurrence_interval: '1',
            alert_before_days: '5',
            notes: '',
        });
        setCustomerSearchText('');
        setActiveFormDropdown(null);
        setShowCustomerDropdown(false);
    };

    const handleClearFilters = () => {
        setFilterCustomer(null);
        setFilterProduct(null);
        setFilterRecurrence(null);
        setFilterStatus(null);
        setFilterActive(null);
        setViewGroup(false);
        setFilterModalVisible(false);
    };

    const handleAddSubmit = () => {
        if (!formData.customer_id && !formData.subscription_name) {
            Alert.alert("Error", "Please link Customer or enter Subscription Name.");
            return;
        }
        if (!formData.amount || !formData.start_date || !formData.status) {
            Alert.alert("Error", "Required fields missing (Amount, Start Date, Status).");
            return;
        }
        dispatch(createSubscription(formData));
    };

    const handleStatusRenewal = () => {
        if (!selectedSub) return;
        dispatch(updateSubscriptionStatus({
            id: selectedSub.id,
            data: { status: renewalStatus }
        }));
    };

    const viewHistoryDetails = (sub) => {
        setSelectedSub(sub);
        dispatch(resetHistory());
        dispatch(fetchSubscriptionHistory({ id: sub.id }));
        setHistoryModalVisible(true);
    };

    const openRenewalView = (sub) => {
        setSelectedSub(sub);
        setRenewalStatus('Payment Received');
        setRenewModalVisible(true);
    };

    const handleFormChange = (name, val) => {
        setFormData(prev => ({ ...prev, [name]: val }));
    };

    const filteredCustomers = (formOptions.customers || []).filter(c => 
        (c.name || '').toLowerCase().includes(customerSearchText.toLowerCase()) || 
        (c.company_name || '').toLowerCase().includes(customerSearchText.toLowerCase())
    );

    const selectCustomer = (cust) => {
        handleFormChange('customer_id', cust.id);
        setCustomerSearchText(cust.name || cust.company_name);
        setShowCustomerDropdown(false);
    };

    // ===========================================================
    // DROPDOWN HELPER METHODS
    // ===========================================================
    const renderInlineFormDropdown = (label, valueKey, options, labelField = 'name', placeholder = 'Select') => {
        const currentVal = formData[valueKey];
        const selected = options.find(o => String(o.id || o.status_name || o.val) === String(currentVal));
        const displayText = selected ? (selected[labelField] || selected.name || selected.status_name || selected.label) : placeholder;
        const isOpen = activeFormDropdown === valueKey;

        return (
            <View style={{ marginBottom: 12, zIndex: isOpen ? 1000 : 1 }}>
                <Text style={styles.formLabel}>{label}</Text>
                <TouchableOpacity
                    style={[styles.formInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                    onPress={() => setActiveFormDropdown(isOpen ? null : valueKey)}
                >
                    <Text style={{ color: currentVal ? '#1E293B' : '#94A3B8', fontSize: 13 }}>{displayText}</Text>
                    <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color="#64748B" />
                </TouchableOpacity>

                {isOpen && (
                    <ScrollView style={styles.dropdownList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                        {options.map((opt, idx) => {
                            const optVal = opt.id || opt.status_name || opt.val;
                            const optLabel = opt[labelField] || opt.name || opt.status_name || opt.label;
                            return (
                                <TouchableOpacity
                                    key={optVal || idx}
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                        handleFormChange(valueKey, optVal);
                                        setActiveFormDropdown(null);
                                    }}
                                >
                                    <Text style={styles.dropdownItemText}>{optLabel}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}
            </View>
        );
    };

    const renderFilterDropdown = (label, currentValue, options, onSelect, valueKey, labelField = 'name', defaultLabel = 'All') => {
        const selected = options.find(o => String(o.id || o.status_name || o.val || o.value) === String(currentValue));
        const displayText = selected ? (selected[labelField] || selected.name || selected.status_name || selected.label) : defaultLabel;
        const isOpen = activeFilterDropdown === valueKey;

        return (
            <View style={{ marginBottom: 12, zIndex: isOpen ? 5000 : 1 }}>
                <Text style={styles.filterFieldLabel}>{label}</Text>
                <TouchableOpacity
                    style={[styles.filterFieldInput, isOpen && styles.filterFieldInputActive]}
                    onPress={() => setActiveFilterDropdown(isOpen ? null : valueKey)}
                >
                    <Text style={styles.filterFieldText} numberOfLines={1}>{displayText}</Text>
                    <Ionicons name="chevron-down" size={14} color="#64748B" />
                </TouchableOpacity>
                {isOpen && (
                    <View style={styles.filterDropdownFloat}>
                        <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                            <TouchableOpacity
                                style={styles.dropdownItem}
                                onPress={() => {
                                    onSelect(null);
                                    setActiveFilterDropdown(null);
                                }}
                            >
                                <Text style={styles.dropdownItemText}>{defaultLabel}</Text>
                            </TouchableOpacity>
                            {options.map((opt, idx) => {
                                const optVal = (opt.id !== undefined) ? opt.id : (opt.status_name || opt.val || opt.value);
                                const optLabel = opt[labelField] || opt.name || opt.status_name || opt.label;
                                return (
                                    <TouchableOpacity
                                        key={optVal || idx}
                                        style={styles.dropdownItem}
                                        onPress={() => {
                                            onSelect(optVal);
                                            setActiveFilterDropdown(null);
                                        }}
                                    >
                                        <Text style={styles.dropdownItemText}>{optLabel}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}
            </View>
        );
    };

    // ===========================================================
    // RENDER CARD ROW UTILS
    // ===========================================================
    const getStatusVisuals = (status) => {
        const lowerStatus = (status || '').toLowerCase();
        let color = '#FFFBEB';
        let textCol = '#D97706';
        if (lowerStatus === 'paid' || lowerStatus === 'payment received' || lowerStatus === 'active') {
            color = '#F0FDF4';
            textCol = '#16A34A';
        } else if (lowerStatus === 'overdue' || lowerStatus === 'cancelled' || lowerStatus === 'failed') {
            color = '#FEF2F2';
            textCol = '#DC2626';
        }
        return { color, textCol };
    };

    const renderCardItem = ({ item }) => {
        const custName = item.customer ? (item.customer.name || item.customer.company_name) : 'Custom Subscription';
        const { color: statusBg, textCol: statusText } = getStatusVisuals(item.status);

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{item.subscription_name || custName}</Text>
                        {item.customer && item.subscription_name && (
                            <Text style={styles.cardSubtitle}>{item.customer.company_name || item.customer.name}</Text>
                        )}
                    </View>
                    <View style={[styles.badge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.badgeText, { color: statusText }]}>
                            {(item.status || 'pending')}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View style={styles.metaGrid}>
                        <View style={styles.metaCol}>
                            <Text style={styles.metaLabel}>Product</Text>
                            <Text style={styles.metaVal}>{item.product?.product_name || 'Default Service'}</Text>
                        </View>
                        <View style={styles.metaCol}>
                            <Text style={styles.metaLabel}>Renewal Type</Text>
                            <Text style={styles.metaVal}>
                                {item.is_recurring ? `Recurring (${item.recurrence_type})` : 'One-time'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.metaGrid}>
                        <View style={styles.metaCol}>
                            <Text style={styles.metaLabel}>Amount</Text>
                            <Text style={[styles.metaVal, { color: '#1E293B', fontWeight: 'bold' }]}>₹{item.amount || 0}</Text>
                        </View>
                        <View style={styles.metaCol}>
                            <Text style={styles.metaLabel}>Next Due</Text>
                            <Text style={styles.metaVal}>{item.latest_history?.due_date || item.start_date || 'N/A'}</Text>
                        </View>
                    </View>

                    {item.notes ? (
                        <View style={styles.notesBox}>
                            <Text style={styles.notesText} numberOfLines={2}>{item.notes}</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.cardActions}>
                    <TouchableOpacity style={[styles.actBtn, styles.btnSecondary]} onPress={() => viewHistoryDetails(item)}>
                        <Ionicons name="time-outline" size={14} color="#475569" />
                        <Text style={styles.actBtnTextSecondary}>History</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={[styles.actBtn, styles.btnPrimary]} onPress={() => openRenewalView(item)}>
                        <Ionicons name="checkmark-done-outline" size={14} color="#FFF" />
                        <Text style={styles.actBtnTextPrimary}>Renew</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderGroupedCardItem = ({ item }) => {
        const initial = (item.name || 'C').charAt(0);
        return (
            <View style={styles.groupedCard}>
                <View style={styles.groupTop}>
                    <View style={styles.avatarCircle}>
                        <Text style={styles.avatarChar}>{initial}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.groupedCardTitle}>{item.name || 'Unnamed Customer'}</Text>
                        <Text style={styles.groupedCardSubtitle}>{item.company_name || 'Individual'}</Text>
                    </View>
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{item.subscriptions_count || 0} Subs</Text>
                    </View>
                </View>
                <View style={styles.groupedCardBody}>
                    {item.email && (
                        <View style={styles.groupDetailRow}>
                            <Ionicons name="mail-outline" size={13} color="#64748B" />
                            <Text style={styles.groupDetailText}>{item.email}</Text>
                        </View>
                    )}
                    {item.phone && (
                        <View style={styles.groupDetailRow}>
                            <Ionicons name="call-outline" size={13} color="#64748B" />
                            <Text style={styles.groupDetailText}>{item.phone}</Text>
                        </View>
                    )}
                </View>
                <TouchableOpacity 
                    style={styles.groupedBtn} 
                    onPress={() => {
                        setFilterCustomer(item.id);
                        setViewGroup(false);
                    }}
                >
                    <Text style={styles.groupedBtnTxt}>View Subscriptions</Text>
                    <Ionicons name="arrow-forward" size={14} color="#4F46E5" />
                </TouchableOpacity>
            </View>
        );
    };

    // ===========================================================
    // RENDER TABLE MODE UTILS
    // ===========================================================

    // TABLE RENDER A: Subscriptions
    const renderSubTableHeader = () => (
        <View style={styles.tableHeader}>
            <View style={{ width: 100 }}><Text style={styles.tableHeaderText}>Status</Text></View>
            <View style={{ width: 150 }}><Text style={styles.tableHeaderText}>Subscription Name</Text></View>
            <View style={{ width: 150 }}><Text style={styles.tableHeaderText}>Customer</Text></View>
            <View style={{ width: 140 }}><Text style={styles.tableHeaderText}>Product</Text></View>
            <View style={{ width: 100 }}><Text style={styles.tableHeaderText}>Amount</Text></View>
            <View style={{ width: 120 }}><Text style={styles.tableHeaderText}>Type</Text></View>
            <View style={{ width: 120 }}><Text style={styles.tableHeaderText}>Next Due</Text></View>
            <View style={{ width: 100 }}><Text style={styles.tableHeaderText}>Billing</Text></View>
            <View style={{ width: 140, alignItems: 'center' }}><Text style={styles.tableHeaderText}>Actions</Text></View>
        </View>
    );

    const renderSubTableRow = ({ item }) => {
        const custName = item.customer ? (item.customer.name || item.customer.company_name) : '-';
        const { color: statusBg, textCol: statusText } = getStatusVisuals(item.status);
        
        return (
            <View style={styles.tableRow}>
                <View style={{ width: 100 }}>
                    <View style={[styles.badge, { backgroundColor: statusBg, paddingVertical: 2, alignSelf: 'flex-start' }]}>
                        <Text style={[styles.badgeText, { color: statusText, fontSize: 8 }]}>
                            {(item.status || 'pending')}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.tableCell, { width: 150, fontWeight: '600' }]} numberOfLines={1}>{item.subscription_name || 'Subscription'}</Text>
                <Text style={[styles.tableCell, { width: 150 }]} numberOfLines={1}>{custName}</Text>
                <Text style={[styles.tableCell, { width: 140 }]} numberOfLines={1}>{item.product?.product_name || 'Service'}</Text>
                <Text style={[styles.tableCell, { width: 100, fontWeight: 'bold' }]}>₹{item.amount || 0}</Text>
                <Text style={[styles.tableCell, { width: 120 }]}>{item.is_recurring ? `Recurring (${item.recurrence_type})` : 'One-Time'}</Text>
                <Text style={[styles.tableCell, { width: 120 }]}>{item.latest_history?.due_date || item.start_date || 'N/A'}</Text>
                <Text style={[styles.tableCell, { width: 100 }]}>{item.billing_type || 'Prepaid'}</Text>
                <View style={{ width: 140, flexDirection: 'row', gap: 8, justifyContent: 'center' }}>
                    <TouchableOpacity onPress={() => viewHistoryDetails(item)}>
                        <Ionicons name="time-outline" size={18} color="#475569" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => openRenewalView(item)}>
                        <Ionicons name="checkmark-done-circle-outline" size={18} color="#4F46E5" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // TABLE RENDER B: Grouped Customers
    const renderGroupTableHeader = () => (
        <View style={styles.tableHeader}>
            <View style={{ width: 150 }}><Text style={styles.tableHeaderText}>Customer Name</Text></View>
            <View style={{ width: 150 }}><Text style={styles.tableHeaderText}>Company Name</Text></View>
            <View style={{ width: 180 }}><Text style={styles.tableHeaderText}>Email</Text></View>
            <View style={{ width: 120 }}><Text style={styles.tableHeaderText}>Phone</Text></View>
            <View style={{ width: 100, alignItems: 'center' }}><Text style={styles.tableHeaderText}>Subs Count</Text></View>
            <View style={{ width: 120, alignItems: 'center' }}><Text style={styles.tableHeaderText}>Action</Text></View>
        </View>
    );

    const renderGroupTableRow = ({ item }) => {
        return (
            <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { width: 150, fontWeight: '600' }]} numberOfLines={1}>{item.name || 'Unnamed'}</Text>
                <Text style={[styles.tableCell, { width: 150 }]} numberOfLines={1}>{item.company_name || 'Individual'}</Text>
                <Text style={[styles.tableCell, { width: 180 }]} numberOfLines={1}>{item.email || '-'}</Text>
                <Text style={[styles.tableCell, { width: 120 }]}>{item.phone || '-'}</Text>
                <View style={{ width: 100, alignItems: 'center' }}>
                    <View style={styles.countBadge}>
                        <Text style={styles.countBadgeText}>{item.subscriptions_count || 0}</Text>
                    </View>
                </View>
                <View style={{ width: 120, alignItems: 'center' }}>
                    <TouchableOpacity 
                        style={[styles.groupedBtn, { marginTop: 0, paddingVertical: 4, paddingHorizontal: 8 }]}
                        onPress={() => {
                            setFilterCustomer(item.id);
                            setViewGroup(false);
                        }}
                    >
                        <Text style={[styles.groupedBtnTxt, { fontSize: 11 }]}>View</Text>
                        <Ionicons name="arrow-forward" size={11} color="#4F46E5" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // ===========================================================
    // MAIN CONTENT SWITCHER
    // ===========================================================
    const renderListContent = () => {
        if (loading && subscriptions.length === 0) {
            return (
                <View style={styles.centerBox}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loadingText}>Loading records...</Text>
                </View>
            );
        }

        const isEmpty = subscriptions.length === 0;
        const emptyView = (
            <View style={styles.emptyContainer}>
                <Ionicons name={viewGroup ? "people-outline" : "card-outline"} size={60} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Records Found</Text>
                <Text style={styles.emptySubtitle}>Adjust filters or try searching different keywords.</Text>
            </View>
        );

        if (viewMode === 'card') {
            // Vertical Card Rendering
            return (
                <FlatList
                    data={subscriptions}
                    renderItem={viewGroup ? renderGroupedCardItem : renderCardItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.scrollContainer}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(1, true)} />}
                    ListEmptyComponent={emptyView}
                />
            );
        } else {
            // Horizontal Table Rendering (Ported from LeadScreen)
            return (
                <View style={{ flex: 1 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
                        <View style={{ flex: 1 }}>
                            {viewGroup ? renderGroupTableHeader() : renderSubTableHeader()}
                            <FlatList
                                data={subscriptions}
                                renderItem={viewGroup ? renderGroupTableRow : renderSubTableRow}
                                keyExtractor={(item) => item.id.toString()}
                                contentContainerStyle={{ paddingBottom: 80 }}
                                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadData(1, true)} />}
                                ListEmptyComponent={!loading && emptyView}
                            />
                        </View>
                    </ScrollView>
                </View>
            );
        }
    };

    return (
        <View style={styles.wrapper}>
            <Header title="Subscriptions" />

            {/* Top KPIs View */}
            {statsLoading ? (
                <View style={[styles.statsRibbon, { justifyContent: 'center', height: 70 }]}>
                    <ActivityIndicator size="small" color="#6366F1" />
                </View>
            ) : (
                <ScrollView 
                    horizontal 
                    style={{ flexGrow: 0 }} 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.statsRibbon}
                >
                    <View style={[styles.statCard, { borderLeftColor: '#6366F1' }]}>
                        <View style={[styles.statIconBox, { backgroundColor: '#EEF2FF' }]}>
                            <Ionicons name="people" size={16} color="#6366F1" />
                        </View>
                        <View>
                            <Text style={styles.statCount}>{stats?.total_customers || 0}</Text>
                            <Text style={styles.statName}>Customers</Text>
                        </View>
                    </View>

                    <View style={[styles.statCard, { borderLeftColor: '#3B82F6' }]}>
                        <View style={[styles.statIconBox, { backgroundColor: '#EFF6FF' }]}>
                            <Ionicons name="card-outline" size={16} color="#3B82F6" />
                        </View>
                        <View>
                            <Text style={styles.statCount}>{stats?.total_subscriptions || 0}</Text>
                            <Text style={styles.statName}>Total Subs</Text>
                        </View>
                    </View>

                    <View style={[styles.statCard, { borderLeftColor: '#F59E0B' }]}>
                        <View style={[styles.statIconBox, { backgroundColor: '#FFFBEB' }]}>
                            <Ionicons name="hourglass-outline" size={16} color="#F59E0B" />
                        </View>
                        <View>
                            <Text style={styles.statCount}>{stats?.coming_due || 0}</Text>
                            <Text style={styles.statName}>Due (15d)</Text>
                        </View>
                    </View>

                    <View style={[styles.statCard, { borderLeftColor: '#EF4444' }]}>
                        <View style={[styles.statIconBox, { backgroundColor: '#FEF2F2' }]}>
                            <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                        </View>
                        <View>
                            <Text style={styles.statCount}>{stats?.overdue || 0}</Text>
                            <Text style={styles.statName}>Overdue</Text>
                        </View>
                    </View>
                </ScrollView>
            )}

            {/* ========================================================== */}
            {/* SEARCH BAR, SWITCHERS, AND FILTER ACTIONS (MATCHES SALES SCREEN) */}
            {/* ========================================================== */}
            <View style={styles.actionBarContainer}>
                {/* 1. Search Input Field */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 6 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder={viewGroup ? "Search customer groups..." : "Search ledger records..."}
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={16} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* 2. Grid vs Table Mode Toggle Switchers */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleButton, viewMode === 'card' && styles.activeToggle]}
                        onPress={() => setViewMode('card')}
                    >
                        <Ionicons name="grid-outline" size={18} color={viewMode === 'card' ? '#fff' : '#64748B'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleButton, viewMode === 'table' && styles.activeToggle]}
                        onPress={() => setViewMode('table')}
                    >
                        <Ionicons name="list-outline" size={18} color={viewMode === 'table' ? '#fff' : '#64748B'} />
                    </TouchableOpacity>
                </View>

                {/* 3. Filter Activation Trigger */}
                <TouchableOpacity
                    style={[
                        styles.toggleContainer, 
                        { padding: 8 }, 
                        getAppliedFilterCount() > 0 && { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE', borderWidth: 1 }
                    ]}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons 
                        name="filter" 
                        size={18} 
                        color={getAppliedFilterCount() > 0 ? '#4F46E5' : '#64748B'} 
                    />
                    {getAppliedFilterCount() > 0 && (
                        <View style={styles.filterBadgeDot}>
                            <Text style={styles.filterBadgeDotText}>{getAppliedFilterCount()}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Secondary Action tabs bar - Keep it static */}
            <View style={styles.tabSectionSticky}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
                    {['All', 'Active', 'Recurring', 'non-recurring'].map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab === 'non-recurring' ? 'One-Time' : tab.charAt(0) + tab.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* DATA VIEW AREA */}
            <View style={{ flex: 1 }}>
                {renderListContent()}
            </View>

            {/* Floating Add Action Button */}
            <TouchableOpacity style={styles.fab} onPress={() => { resetForm(); setAddModalVisible(true); }}>
                <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>

            {/* ========================================================== */}
            {/* MODAL: SALES-STYLE SUBSCRIPTION ADVANCED FILTERS MODAL */}
            {/* ========================================================== */}
            <Modal visible={filterModalVisible} transparent animationType="slide" onRequestClose={() => setFilterModalVisible(false)}>
                <View style={styles.ovlWrapper}>
                    <View style={[styles.ovlSheet, { height: '75%', maxHeight: '75%' }]}>
                        <View style={styles.popupHeader}>
                            <Text style={styles.popupTitle}>Advanced Subscription Filters</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close-circle" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
                            {renderFilterDropdown(
                                'Customer Linkage',
                                filterCustomer,
                                formOptions.customers || [],
                                setFilterCustomer,
                                'customer_filter',
                                'name',
                                'All Customers'
                            )}

                            {renderFilterDropdown(
                                'Product / Service Offered',
                                filterProduct,
                                formOptions.products || [],
                                setFilterProduct,
                                'product_filter',
                                'product_name',
                                'All Products'
                            )}

                            {renderFilterDropdown(
                                'Recurrence Cycle Type',
                                filterRecurrence,
                                [
                                    { val: 'daily', label: 'Daily' },
                                    { val: 'weekly', label: 'Weekly' },
                                    { val: 'monthly', label: 'Monthly' },
                                    { val: 'quarterly', label: 'Quarterly' },
                                    { val: 'half_yearly', label: 'Half Yearly' },
                                    { val: 'yearly', label: 'Yearly' },
                                ],
                                setFilterRecurrence,
                                'recurrence_filter',
                                'label',
                                'All Cycles'
                            )}

                            {renderFilterDropdown(
                                'Specific Subscription Status',
                                filterStatus,
                                formOptions.statuses || [],
                                setFilterStatus,
                                'status_filter',
                                'status_name',
                                'All Statuses'
                            )}

                            {renderFilterDropdown(
                                'Operational Status',
                                filterActive,
                                [
                                    { value: true, label: 'Active Subscriptions' },
                                    { value: false, label: 'Inactive / Suspended' }
                                ],
                                setFilterActive,
                                'active_filter',
                                'label',
                                'Active + Inactive'
                            )}

                            {/* Customer Grouping Mode Toggle */}
                            <View style={styles.filterSwitchBlock}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.filterSwitchTitle}>Group By Customer</Text>
                                    <Text style={styles.filterSwitchSubtitle}>Aggregate the dashboard to display client portfolios instead of single contracts.</Text>
                                </View>
                                <Switch
                                    value={viewGroup}
                                    onValueChange={setViewGroup}
                                    trackColor={{ false: '#E2E8F0', true: '#C7D2FE' }}
                                    thumbColor={viewGroup ? '#4F46E5' : '#94A3B8'}
                                />
                            </View>
                        </ScrollView>

                        <View style={styles.filterActionRow}>
                            <TouchableOpacity style={styles.filterClearBtn} onPress={handleClearFilters}>
                                <Text style={styles.filterClearBtnTxt}>Clear All</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.filterApplyBtn} onPress={() => setFilterModalVisible(false)}>
                                <Text style={styles.filterApplyBtnTxt}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ========================================================== */}
            {/* MODAL: ADD NEW SUBSCRIPTION */}
            {/* ========================================================== */}
            <Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.ovlWrapper}>
                        <View style={[styles.ovlSheet, { height: '90%', maxHeight: '90%' }]}>
                            <View style={[styles.popupHeader, { backgroundColor: '#6366F1' }]}>
                                <Text style={[styles.popupTitle, { color: '#FFF' }]}>New Renewal Contract</Text>
                                <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                                    <Ionicons name="close-circle" size={24} color="#FFF" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
                                <View style={[styles.inputGroupBlock, { zIndex: 3000 }]}>
                                    <Text style={styles.formLabel}>Link Customer <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="Search customer name..."
                                        value={customerSearchText}
                                        onChangeText={(txt) => {
                                            setCustomerSearchText(txt);
                                            setShowCustomerDropdown(txt.length > 0);
                                            if (!txt) handleFormChange('customer_id', null);
                                        }}
                                    />
                                    {showCustomerDropdown && (
                                        <View style={styles.searchDropdown}>
                                            <ScrollView style={{ maxHeight: 180 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                                                {filteredCustomers.map((c) => (
                                                    <TouchableOpacity key={c.id} style={styles.dropdownItem} onPress={() => selectCustomer(c)}>
                                                        <Text style={styles.dropdownItemText}>{c.name} ({c.company_name || 'N/A'})</Text>
                                                    </TouchableOpacity>
                                                ))}
                                                {filteredCustomers.length === 0 && (
                                                    <Text style={{ padding: 12, color: '#94A3B8' }}>No match found</Text>
                                                )}
                                            </ScrollView>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.inputGroupBlock}>
                                    <Text style={styles.formLabel}>Custom Contract Name</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="e.g., Monthly Maintenance"
                                        value={formData.subscription_name}
                                        onChangeText={(t) => handleFormChange('subscription_name', t)}
                                    />
                                </View>

                                <View style={styles.rowGrid}>
                                    <View style={{ flex: 1, zIndex: 2000 }}>
                                        {renderInlineFormDropdown('Product Service', 'product_id', formOptions.products || [], 'product_name', 'Select Product')}
                                    </View>
                                    <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                        <Text style={styles.formLabel}>Amount (₹) <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Amount"
                                            keyboardType="numeric"
                                            value={formData.amount}
                                            onChangeText={(t) => handleFormChange('amount', t)}
                                        />
                                    </View>
                                </View>

                                <View style={styles.rowGrid}>
                                    <View style={{ flex: 1, zIndex: 1500 }}>
                                        {renderInlineFormDropdown('Billing Mode', 'billing_type', [
                                            { id: 'Prepaid', label: 'Prepaid (Advance)' },
                                            { id: 'Postpaid', label: 'Postpaid (Arrears)' }
                                        ], 'label', 'Select')}
                                    </View>
                                    <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                        <Text style={styles.formLabel}>Start Date <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="YYYY-MM-DD"
                                            value={formData.start_date}
                                            onChangeText={(t) => handleFormChange('start_date', t)}
                                        />
                                    </View>
                                </View>

                                <View style={{ zIndex: 1400 }}>
                                    {renderInlineFormDropdown('Initial Contract Status *', 'status', formOptions.statuses || [], 'status_name', 'Select Status')}
                                </View>

                                <View style={styles.switchBlock}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.switchLabel}>Auto-Recurring Lifecycle</Text>
                                        <Text style={styles.switchDesc}>Enable automatic billing creation after payments.</Text>
                                    </View>
                                    <Switch
                                        value={formData.is_recurring}
                                        onValueChange={(val) => handleFormChange('is_recurring', val)}
                                        trackColor={{ false: '#E2E8F0', true: '#A5B4FC' }}
                                        thumbColor={formData.is_recurring ? '#4F46E5' : '#64748B'}
                                    />
                                </View>

                                {formData.is_recurring && (
                                    <View style={styles.recurringDetailBox}>
                                        <View style={styles.rowGrid}>
                                            <View style={{ flex: 1, zIndex: 1300 }}>
                                                {renderInlineFormDropdown('Recurrence Type', 'recurrence_type', [
                                                    { id: 'daily', name: 'Daily' },
                                                    { id: 'weekly', name: 'Weekly' },
                                                    { id: 'monthly', name: 'Monthly' },
                                                    { id: 'quarterly', name: 'Quarterly' },
                                                    { id: 'half_yearly', name: 'Half Yearly' },
                                                    { id: 'yearly', name: 'Yearly' },
                                                ], 'name')}
                                            </View>
                                            <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                                <Text style={styles.formLabel}>Cycle Interval</Text>
                                                <TextInput
                                                    style={styles.formInput}
                                                    placeholder="e.g. 1"
                                                    keyboardType="numeric"
                                                    value={formData.recurrence_interval}
                                                    onChangeText={(t) => handleFormChange('recurrence_interval', t)}
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.inputGroupBlock}>
                                            <Text style={styles.formLabel}>Alert Buffer (Days Before Due)</Text>
                                            <TextInput
                                                style={styles.formInput}
                                                placeholder="e.g. 5"
                                                keyboardType="numeric"
                                                value={formData.alert_before_days}
                                                onChangeText={(t) => handleFormChange('alert_before_days', t)}
                                            />
                                        </View>
                                    </View>
                                )}

                                <View style={[styles.inputGroupBlock, { marginTop: 12 }]}>
                                    <Text style={styles.formLabel}>Special Notes / Contract Terms</Text>
                                    <TextInput
                                        style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                                        placeholder="Add notes..."
                                        multiline
                                        value={formData.notes}
                                        onChangeText={(t) => handleFormChange('notes', t)}
                                    />
                                </View>
                            </ScrollView>

                            <View style={styles.ovlFooter}>
                                <TouchableOpacity
                                    style={[styles.sheetBtn, styles.sheetBtnApply, actionLoading && { opacity: 0.6 }]}
                                    onPress={handleAddSubmit}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? (
                                        <ActivityIndicator size="small" color="#FFF" />
                                    ) : (
                                        <Text style={styles.sheetBtnApplyTxt}>Commit Subscription</Text>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* ========================================================== */}
            {/* MODAL: HISTORY TIMELINE */}
            {/* ========================================================== */}
            <Modal visible={historyModalVisible} transparent animationType="slide" onRequestClose={() => setHistoryModalVisible(false)}>
                <View style={styles.ovlWrapper}>
                    <View style={[styles.ovlSheet, { height: '80%', maxHeight: '80%' }]}>
                        <View style={styles.popupHeader}>
                            <Text style={styles.popupTitle}>Billing Schedule History</Text>
                            <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                                <Ionicons name="close-circle" size={24} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {historyLoading && history.length === 0 ? (
                            <View style={styles.centerBox}>
                                <ActivityIndicator size="small" color="#6366F1" />
                            </View>
                        ) : (
                            <FlatList
                                data={history}
                                keyExtractor={(item, index) => index.toString()}
                                contentContainerStyle={{ padding: 16 }}
                                renderItem={({ item }) => {
                                    const subPaid = item.status?.toLowerCase() === 'payment received' || item.status?.toLowerCase() === 'paid';
                                    return (
                                        <View style={styles.historyRow}>
                                            <View style={styles.historyDotWrap}>
                                                <View style={[styles.historyDot, { backgroundColor: subPaid ? '#10B981' : '#F59E0B' }]} />
                                                <View style={styles.historyLine} />
                                            </View>
                                            <View style={styles.historyInfo}>
                                                <View style={styles.rowBetween}>
                                                    <Text style={styles.historyPeriod}>Period: {item.period_start} - {item.period_end || 'N/A'}</Text>
                                                    <Text style={[styles.historyStatus, { color: subPaid ? '#10B981' : '#F59E0B' }]}>
                                                        {item.status || 'pending'}
                                                    </Text>
                                                </View>
                                                <View style={[styles.rowBetween, { marginTop: 4 }]}>
                                                    <Text style={styles.historyLabel}>Due: {item.due_date || 'N/A'}</Text>
                                                    <Text style={styles.historyAmount}>₹{item.amount || 0}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    );
                                }}
                                ListEmptyComponent={
                                    <Text style={{ textAlign: 'center', color: '#94A3B8', marginTop: 40 }}>No schedules generated.</Text>
                                }
                            />
                        )}
                    </View>
                </View>
            </Modal>

            {/* ========================================================== */}
            {/* MODAL: RENEWAL COLLECT */}
            {/* ========================================================== */}
            <Modal visible={renewModalVisible} transparent animationType="fade" onRequestClose={() => setRenewModalVisible(false)}>
                <View style={[styles.ovlWrapper, { justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                    <View style={styles.smallPopup}>
                        <Text style={styles.popupTitle}>Confirm Payment & Renew</Text>
                        <Text style={styles.popupSubtitle}>Updating status advances the billing cycles automatically.</Text>

                        <View style={{ marginTop: 16, marginBottom: 16 }}>
                            <Text style={styles.formLabel}>Resolution Status</Text>
                            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                {['Payment Received', 'Paid'].map(s => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[styles.statusPill, renewalStatus === s && styles.statusPillActive]}
                                        onPress={() => setRenewalStatus(s)}
                                    >
                                        <Text style={[styles.statusPillText, renewalStatus === s && styles.statusPillTextActive]}>{s}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>

                        <View style={styles.rowGrid}>
                            <TouchableOpacity style={[styles.sheetBtn, { backgroundColor: '#F1F5F9' }]} onPress={() => setRenewModalVisible(false)}>
                                <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.sheetBtn, { backgroundColor: '#10B981' }, actionLoading && { opacity: 0.6 }]}
                                onPress={handleStatusRenewal}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Confirm</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
};

export default Subscription;

const styles = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: '#FFFFFF' },
    scrollContainer: { padding: 16, paddingBottom: 100 },
    
    // Top Statistics
    statsRibbon: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#FFF', gap: 10 },
    statCard: {
        minWidth: 115, backgroundColor: '#FFF', borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0',
        borderLeftWidth: 4, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8,
        shadowColor: '#000', shadowOpacity: 0.03, elevation: 1,
    },
    statIconBox: { width: 30, height: 30, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    statCount: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
    statName: { fontSize: 8, color: '#64748B', fontWeight: '700', textTransform: 'capitalize' },

    // ===========================================================
    // COMPONENT 1: SEARCH & TOGGLE TOOLBAR (MATCHES SALES UI)
    // ===========================================================
    actionBarContainer: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingVertical: 12, 
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0'
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        height: 40,
        paddingHorizontal: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchInput: { flex: 1, color: '#1E293B', fontSize: 13, padding: 0 },
    
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        padding: 4,
        marginLeft: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    toggleButton: {
        width: 32, height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 6,
    },
    activeToggle: { backgroundColor: '#4F46E5' },
    filterBadgeDot: {
        position: 'absolute', top: -6, right: -6,
        backgroundColor: '#EF4444', borderRadius: 8,
        width: 16, height: 16, justifyContent: 'center', alignItems: 'center',
    },
    filterBadgeDotText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },

    // Sticky Subtabs
    tabSectionSticky: { backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    tabRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, paddingVertical: 10 },
    tabItem: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#E2E8F0' },
    tabItemActive: { backgroundColor: '#4F46E5' },
    tabText: { fontSize: 11, color: '#475569', fontWeight: '600' },
    tabTextActive: { color: '#FFF', fontWeight: '700' },

    // ===========================================================
    // COMPONENT 2: DYNAMIC TABLE DESIGN (PORTED FROM SALES SCREEN)
    // ===========================================================
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#E5E7EB',
        borderBottomWidth: 1,
        borderBottomColor: '#CBD5E1',
    },
    tableHeaderText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#475569',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
        backgroundColor: '#FFF',
    },
    tableCell: {
        fontSize: 12,
        color: '#334155',
        paddingRight: 10,
    },

    // Advanced Filter Modal Elements
    filterFieldLabel: { fontSize: 12, fontWeight: 'bold', color: '#475569', marginBottom: 6 },
    filterFieldInput: {
        flexDirection: 'row', height: 40, borderWidth: 1, borderColor: '#CBD5E1',
        borderRadius: 8, alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 12, backgroundColor: '#FFF',
    },
    filterFieldInputActive: { borderColor: '#4F46E5', borderWidth: 1.5 },
    filterFieldText: { fontSize: 13, color: '#1E293B' },
    
    filterDropdownFloat: {
        position: 'absolute', top: 62, left: 0, right: 0,
        backgroundColor: '#FFF', borderRadius: 8,
        borderWidth: 1, borderColor: '#E2E8F0', elevation: 6,
        zIndex: 9999,
    },
    filterSwitchBlock: { 
        flexDirection: 'row', alignItems: 'center', marginVertical: 16, 
        padding: 14, backgroundColor: '#EEF2FF', borderRadius: 10 
    },
    filterSwitchTitle: { fontWeight: 'bold', color: '#312E81', fontSize: 13 },
    filterSwitchSubtitle: { fontSize: 10, color: '#4F46E5', marginTop: 2, lineHeight: 14 },

    filterActionRow: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#E2E8F0', gap: 12, backgroundColor: '#FFF' },
    filterClearBtn: { flex: 1, height: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1' },
    filterClearBtnTxt: { color: '#475569', fontWeight: 'bold', fontSize: 13 },
    filterApplyBtn: { flex: 1.5, height: 42, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: '#4F46E5' },
    filterApplyBtnTxt: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

    // Card Designs
    card: {
        backgroundColor: '#FFF', borderRadius: 12,
        padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
        elevation: 1.5, shadowColor: '#000', shadowOpacity: 0.05,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 12, marginBottom: 12 },
    cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
    cardSubtitle: { fontSize: 11, color: '#64748B', marginTop: 2 },
    badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    badgeText: { fontSize: 9, fontWeight: 'bold' },
    cardBody: { gap: 12 },
    metaGrid: { flexDirection: 'row', justifyContent: 'space-between' },
    metaCol: { flex: 1 },
    metaLabel: { fontSize: 9, color: '#94A3B8', fontWeight: 'bold', letterSpacing: 0.5 },
    metaVal: { fontSize: 12, color: '#475569', marginTop: 2, fontWeight: '600' },
    notesBox: { backgroundColor: '#F8FAFC', padding: 8, borderRadius: 6, marginTop: 4 },
    notesText: { fontSize: 11, color: '#64748B', fontStyle: 'italic' },

    cardActions: { flexDirection: 'row', marginTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 12, gap: 10 },
    actBtn: { flex: 1, height: 36, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    btnSecondary: { backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    btnPrimary: { backgroundColor: '#4F46E5' },
    actBtnTextSecondary: { fontSize: 12, color: '#475569', fontWeight: '700' },
    actBtnTextPrimary: { fontSize: 12, color: '#FFF', fontWeight: '700' },

    groupedCard: {
        backgroundColor: '#FFF', borderRadius: 12,
        padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E2E8F0',
    },
    groupTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
    avatarChar: { fontSize: 14, fontWeight: 'bold', color: '#4F46E5' },
    groupedCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#1E293B' },
    groupedCardSubtitle: { fontSize: 11, color: '#64748B', marginTop: 1 },
    countBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    countBadgeText: { fontSize: 10, color: '#475569', fontWeight: 'bold' },
    groupedCardBody: { marginTop: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 4 },
    groupDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    groupDetailText: { fontSize: 12, color: '#475569' },
    groupedBtn: {
        marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#FFF', borderWidth: 1, borderColor: '#C7D2FE',
        paddingVertical: 8, borderRadius: 8, gap: 6
    },
    groupedBtnTxt: { color: '#4F46E5', fontSize: 12, fontWeight: 'bold' },

    // Utilities
    centerBox: { flex: 1, minHeight: 200, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, color: '#64748B', fontSize: 12 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', marginTop: 12 },
    emptySubtitle: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 6 },

    fab: {
        position: 'absolute', bottom: 24, right: 24,
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center',
        elevation: 5, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4,
    },

    // Base Popups / Sheets
    ovlWrapper: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    ovlSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    popupHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, alignItems: 'center', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    popupTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    popupSubtitle: { fontSize: 12, color: '#64748B', marginTop: 4 },

    inputGroupBlock: { marginBottom: 12 },
    rowGrid: { flexDirection: 'row', gap: 10 },
    formLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 5 },
    formInput: { height: 38, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, paddingHorizontal: 10, color: '#1E293B', backgroundColor: '#FAFAFA', fontSize: 13 },

    searchDropdown: {
        position: 'absolute', top: 60, left: 0, right: 0,
        backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1', maxHeight: 180, zIndex: 5000,
    },
    dropdownList: {
        marginTop: 4, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 6,
        backgroundColor: '#FFF', maxHeight: 150, zIndex: 4000
    },
    dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    dropdownItemText: { fontSize: 12.5, color: '#1E293B' },

    switchBlock: { flexDirection: 'row', alignItems: 'center', marginVertical: 12, padding: 12, backgroundColor: '#EEF2FF', borderRadius: 8 },
    switchLabel: { fontWeight: 'bold', color: '#312E81', fontSize: 13 },
    switchDesc: { fontSize: 10, color: '#4F46E5', marginTop: 2 },
    recurringDetailBox: { padding: 12, borderLeftWidth: 3, borderLeftColor: '#4F46E5', backgroundColor: '#F8FAFC', gap: 2 },

    ovlFooter: { padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FFF' },
    sheetBtn: { flex: 1, height: 42, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    sheetBtnApply: { backgroundColor: '#4F46E5' },
    sheetBtnApplyTxt: { color: '#FFF', fontWeight: '700', fontSize: 13 },

    historyRow: { flexDirection: 'row', marginBottom: 16 },
    historyDotWrap: { alignItems: 'center', marginRight: 12 },
    historyDot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
    historyLine: { flex: 1, width: 2, backgroundColor: '#E2E8F0', marginVertical: 4 },
    historyInfo: { flex: 1, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#E2E8F0' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between' },
    historyPeriod: { fontSize: 12, fontWeight: 'bold', color: '#1E293B' },
    historyStatus: { fontSize: 10, fontWeight: 'bold' },
    historyLabel: { fontSize: 11, color: '#64748B' },
    historyAmount: { fontSize: 12, fontWeight: 'bold', color: '#334155' },

    smallPopup: { backgroundColor: '#FFF', width: '90%', alignSelf: 'center', borderRadius: 12, padding: 20, elevation: 10 },
    statusPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#E2E8F0' },
    statusPillActive: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
    statusPillText: { color: '#64748B', fontSize: 12, fontWeight: 'bold' },
    statusPillTextActive: { color: '#065F46' },
});