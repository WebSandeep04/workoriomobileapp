import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, ScrollView, TextInput, RefreshControl,
    Modal, Alert, Image, Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import Toast from 'react-native-toast-message';
import { launchImageLibrary } from 'react-native-image-picker';

import Header from '../components/Header';
import {
    fetchPettyCashEntries,
    fetchPettyCashStats,
    fetchPettyCashFormOptions,
    createPettyCashEntry,
    updatePettyCashEntry,
    togglePettyCashApproval,
    deletePettyCashEntry,
    clearPettyCashMessages
} from '../store/slices/pettyCashSlice';

const PettyCashScreen = () => {
    const dispatch = useDispatch();
    
    // Redux selectors
    const {
        entries,
        stats,
        formOptions,
        pagination,
        loading,
        statsLoading,
        actionLoading,
        error,
        successMessage
    } = useSelector((state) => state.pettyCash);

    // Local state: Display Mode & Filters
    const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
    const [searchQuery, setSearchQuery] = useState('');
    
    // Advanced Filters state
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterWallet, setFilterWallet] = useState(null); // Department
    const [filterExpense, setFilterExpense] = useState(null);
    const [filterStatus, setFilterStatus] = useState(null);
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');
    const [filterMonth, setFilterMonth] = useState(null);

    // Add/Edit Form state
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [selectedEntryId, setSelectedEntryId] = useState(null);
    const [formWallet, setFormWallet] = useState('');
    const [formExpense, setFormExpense] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formRemark, setFormRemark] = useState('');
    const [formAttachment, setFormAttachment] = useState(null);
    const [formApproved, setFormApproved] = useState(false);

    // Sub-picker states (for modals since RN doesn't have native drop downs)
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerType, setPickerType] = useState(''); // 'wallet', 'expense', 'status', 'month', 'form_wallet', 'form_expense'

    // Initial Bootstrap Loads
    useEffect(() => {
        dispatch(fetchPettyCashFormOptions());
        loadData(1);
    }, []);

    // React to Redux action feedback
    useEffect(() => {
        if (successMessage) {
            Toast.show({ type: 'success', text1: successMessage, visibilityTime: 3000 });
            setAddModalVisible(false);
            resetForm();
            dispatch(clearPettyCashMessages());
            loadData(1); // Refresh lists
        }
        if (error) {
            Toast.show({ type: 'error', text1: error, visibilityTime: 4000 });
            dispatch(clearPettyCashMessages());
        }
    }, [successMessage, error]);

    // Main Loader helper
    const loadData = (page = 1) => {
        const params = {
            page,
            search: searchQuery,
            department_id: filterWallet || '',
            expense_id: filterExpense || '',
            status: filterStatus !== null ? filterStatus : '',
            from_date: filterFromDate,
            to_date: filterToDate,
            month: filterMonth || ''
        };
        dispatch(fetchPettyCashEntries(params));
        
        // For stats, we mirror the web feature which filters stats by department!
        dispatch(fetchPettyCashStats({ department_id: filterWallet || '' }));
    };

    // Live searching with 500ms debounce equivalent
    useEffect(() => {
        const handler = setTimeout(() => {
            loadData(1);
        }, 600);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const onRefresh = () => {
        loadData(1);
    };

    // Reset & Helper Functions
    const resetForm = () => {
        setEditMode(false);
        setSelectedEntryId(null);
        setFormWallet('');
        setFormExpense('');
        setFormPrice('');
        setFormRemark('');
        setFormAttachment(null);
        setFormApproved(false);
    };

    const getAppliedFilterCount = () => {
        let count = 0;
        if (filterWallet) count++;
        if (filterExpense) count++;
        if (filterStatus !== null) count++;
        if (filterFromDate) count++;
        if (filterToDate) count++;
        if (filterMonth) count++;
        return count;
    };

    const clearAllFilters = () => {
        setFilterWallet(null);
        setFilterExpense(null);
        setFilterStatus(null);
        setFilterFromDate('');
        setFilterToDate('');
        setFilterMonth(null);
        setFilterModalVisible(false);
        // Refreshing after resetting state
        setTimeout(() => loadData(1), 100);
    };

    const pickImage = () => {
        launchImageLibrary({ mediaType: 'photo', quality: 0.7, maxWidth: 1200, maxHeight: 1200 }, (response) => {
            if (response.didCancel) return;
            if (response.errorCode) {
                Toast.show({ type: 'error', text1: 'Image picking error', text2: response.errorMessage });
                return;
            }
            if (response.assets && response.assets.length > 0) {
                setFormAttachment(response.assets[0]);
            }
        });
    };

    const handleSaveEntry = () => {
        if (!formWallet || !formExpense || !formPrice) {
            Alert.alert('Missing Fields', 'Wallet, Expense Type, and Price are mandatory.');
            return;
        }

        const formData = new FormData();
        formData.append('department_id', formWallet);
        formData.append('expense_id', formExpense);
        formData.append('price', formPrice);
        formData.append('remark', formRemark || '');
        
        if (editMode) {
            formData.append('is_approved', formApproved ? '1' : '0');
        }

        if (formAttachment && formAttachment.uri) {
            formData.append('attachment', {
                uri: Platform.OS === 'android' ? formAttachment.uri : formAttachment.uri.replace('file://', ''),
                type: formAttachment.type || 'image/jpeg',
                name: formAttachment.fileName || `receipt_${Date.now()}.jpg`,
            });
        }

        if (editMode) {
            dispatch(updatePettyCashEntry({ id: selectedEntryId, formData }));
        } else {
            dispatch(createPettyCashEntry(formData));
        }
    };

    const handleEditClick = (item) => {
        setEditMode(true);
        setSelectedEntryId(item.id);
        setFormWallet(item.department_id);
        setFormExpense(item.expense_id);
        setFormPrice(item.price?.toString() || '');
        setFormRemark(item.remark || '');
        setFormApproved(item.is_approved === 1 || item.is_approved === true);
        setFormAttachment(item.attachment ? { uri: item.attachment_url } : null);
        setAddModalVisible(true);
    };

    const handleDeleteClick = (id) => {
        Alert.alert(
            'Confirm Deletion',
            'Are you sure you want to remove this petty cash transaction?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => dispatch(deletePettyCashEntry(id)) }
            ]
        );
    };

    const handleToggleApprovalClick = (id) => {
        dispatch(togglePettyCashApproval(id));
    };

    // Helpers for dynamic Picker Renderings
    const openOptionPicker = (type) => {
        setPickerType(type);
        setPickerVisible(true);
    };

    const handleOptionSelect = (value) => {
        switch (pickerType) {
            case 'wallet_filter': setFilterWallet(value); break;
            case 'expense_filter': setFilterExpense(value); break;
            case 'status_filter': setFilterStatus(value); break;
            case 'month_filter': setFilterMonth(value); break;
            case 'wallet_form': setFormWallet(value); break;
            case 'expense_form': setFormExpense(value); break;
        }
        setPickerVisible(false);
    };

    const getPickerData = () => {
        switch (pickerType) {
            case 'wallet_filter':
            case 'wallet_form':
                return formOptions.departments || [];
            case 'expense_filter':
            case 'expense_form':
                return formOptions.expenses || [];
            case 'status_filter':
                return [
                    { id: 1, name: 'Approved Only' },
                    { id: 0, name: 'Pending Only' }
                ];
            case 'month_filter':
                return [
                    { id: 1, name: 'January' }, { id: 2, name: 'February' }, { id: 3, name: 'March' },
                    { id: 4, name: 'April' }, { id: 5, name: 'May' }, { id: 6, name: 'June' },
                    { id: 7, name: 'July' }, { id: 8, name: 'August' }, { id: 9, name: 'September' },
                    { id: 10, name: 'October' }, { id: 11, name: 'November' }, { id: 12, name: 'December' },
                ];
            default: return [];
        }
    };

    // Helper string Resolvers
    const getWalletName = (id) => formOptions.departments?.find(d => d.id === id)?.name || 'Unselected';
    const getExpenseName = (id) => formOptions.expenses?.find(e => e.id === id)?.name || 'Unselected';
    const getMonthName = (id) => {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return id ? months[id - 1] : 'Unselected';
    };
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // ==========================================================
    // COMPONENT RENDERING PARTS
    // ==========================================================
    
    // 1. Generic Item Dropdown view for filters and forms
    const renderOptionTrigger = (label, currentVal, type, resolverFn, placeholder) => {
        const resolvedText = currentVal ? resolverFn(currentVal) : placeholder;
        return (
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{label}</Text>
                <TouchableOpacity 
                    style={styles.pickerTrigger} 
                    onPress={() => openOptionPicker(type)}
                >
                    <Text style={[styles.pickerTriggerText, !currentVal && { color: '#94A3B8' }]}>
                        {resolvedText}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>
            </View>
        );
    };

    // 2. Card Mode Item view
    const renderCardItem = ({ item }) => (
        <View style={styles.ledgerCard}>
            <View style={styles.ledgerCardHeader}>
                <View>
                    <Text style={styles.ledgerTitle}>{item.expense?.name || 'Misc Expense'}</Text>
                    <Text style={styles.ledgerDate}>{formatDate(item.created_at)}</Text>
                </View>
                <View style={styles.badgeContainer}>
                    <Text style={[styles.approvedBadge, item.is_approved ? styles.approvedGreen : styles.pendingOrange]}>
                        {item.is_approved ? 'Approved' : 'Pending'}
                    </Text>
                </View>
            </View>

            <View style={styles.ledgerCardBody}>
                <View style={styles.cardDataRow}>
                    <Ionicons name="wallet-outline" size={15} color="#64748B" />
                    <Text style={styles.cardDataLabel}>Wallet:</Text>
                    <Text style={styles.cardDataValue}>{item.department?.name || 'Default'}</Text>
                </View>

                <View style={styles.cardDataRow}>
                    <FontAwesome name="rupee" size={14} color="#EF4444" style={{ marginLeft: 2, marginRight: 1 }} />
                    <Text style={styles.cardDataLabel}>Price:</Text>
                    <Text style={[styles.cardDataValue, { fontWeight: '700', color: '#EF4444' }]}>
                        ₹{parseFloat(item.price || 0).toFixed(2)}
                    </Text>
                </View>

                {item.remark && (
                    <View style={[styles.cardDataRow, { alignItems: 'flex-start' }]}>
                        <Ionicons name="chatbox-ellipses-outline" size={15} color="#64748B" style={{ marginTop: 1 }} />
                        <Text style={styles.cardDataLabel}>Remark:</Text>
                        <Text style={[styles.cardDataValue, { color: '#475569', fontStyle: 'italic' }]} numberOfLines={2}>
                            {item.remark}
                        </Text>
                    </View>
                )}

                {item.attachment_url && (
                    <View style={styles.cardDataRow}>
                        <Ionicons name="attach" size={18} color="#434AFA" />
                        <Text style={{ color: '#434AFA', fontWeight: '600', fontSize: 12 }}>Receipt Attached</Text>
                    </View>
                )}
            </View>

            <View style={styles.ledgerCardActions}>
                <TouchableOpacity 
                    style={[styles.cardActBtn, { backgroundColor: '#F8FAFC' }]}
                    onPress={() => handleEditClick(item)}
                >
                    <Ionicons name="pencil" size={16} color="#4F46E5" />
                    <Text style={[styles.cardActBtnText, { color: '#4F46E5' }]}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.cardActBtn, { backgroundColor: '#FEF2F2' }]}
                    onPress={() => handleDeleteClick(item.id)}
                >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
            </View>
        </View>
    );

    // 3. Horizontal Table View Mode
    const renderTableContent = () => (
        <View style={styles.tableWrapper}>
            <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
                <View>
                    {/* Table Head */}
                    <View style={styles.tableRowHead}>
                        <Text style={[styles.tableHeaderCell, { width: 100 }]}>Date</Text>
                        <Text style={[styles.tableHeaderCell, { width: 120 }]}>Wallet (Dept)</Text>
                        <Text style={[styles.tableHeaderCell, { width: 150 }]}>Expense Type</Text>
                        <Text style={[styles.tableHeaderCell, { width: 100 }]}>Price (₹)</Text>
                        <Text style={[styles.tableHeaderCell, { width: 100 }]}>Status</Text>
                        <Text style={[styles.tableHeaderCell, { width: 80 }]}>Actions</Text>
                    </View>

                    {/* Table Body Rows */}
                    {entries.length === 0 ? (
                        <View style={styles.tableRowEmpty}>
                            <Text style={styles.emptyTableText}>No records matching filters</Text>
                        </View>
                    ) : (
                        entries.map((item, index) => (
                            <View 
                                key={item.id} 
                                style={[
                                    styles.tableRowBody, 
                                    { backgroundColor: index % 2 === 0 ? '#FFF' : '#F8FAFC' }
                                ]}
                            >
                                <Text style={[styles.tableCell, { width: 100 }]} numberOfLines={1}>
                                    {formatDate(item.created_at)}
                                </Text>
                                <Text style={[styles.tableCell, { width: 120 }]} numberOfLines={1}>
                                    {item.department?.name || '-'}
                                </Text>
                                <Text style={[styles.tableCell, { width: 150, fontWeight: '700', color: '#1E293B' }]} numberOfLines={1}>
                                    {item.expense?.name || '-'}
                                </Text>
                                <Text style={[styles.tableCell, { width: 100, fontWeight: '700', color: '#EF4444' }]}>
                                    ₹{parseFloat(item.price || 0).toFixed(2)}
                                </Text>
                                <View style={[styles.tableCell, { width: 100, justifyContent: 'center' }]}>
                                    <View style={[
                                        styles.badgeMin, 
                                        { backgroundColor: item.is_approved ? '#D1FAE5' : '#FEF3C7' }
                                    ]}>
                                        <Text style={[
                                            styles.badgeMinText, 
                                            { color: item.is_approved ? '#065F46' : '#92400E' }
                                        ]}>
                                            {item.is_approved ? 'Approved' : 'Pending'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={[styles.tableCell, { width: 80, flexDirection: 'row', gap: 12 }]}>
                                    <TouchableOpacity onPress={() => handleEditClick(item)}>
                                        <Ionicons name="pencil" size={18} color="#4F46E5" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteClick(item.id)}>
                                        <Ionicons name="trash" size={18} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))
                    )}
                </View>
            </ScrollView>
        </View>
    );

    const renderListContent = () => {
        if (loading && entries.length === 0) {
            return (
                <View style={{ paddingVertical: 50, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#434AFA" />
                    <Text style={{ color: '#64748B', marginTop: 10 }}>Loading transactions...</Text>
                </View>
            );
        }

        if (viewMode === 'table') {
            return (
                <ScrollView 
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
                >
                    {renderTableContent()}
                    {renderPaginationControls()}
                </ScrollView>
            );
        }

        return (
            <FlatList
                data={entries}
                renderItem={renderCardItem}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
                ListEmptyComponent={
                    <View style={styles.emptyPlaceholder}>
                        <Ionicons name="file-tray-outline" size={50} color="#CBD5E1" />
                        <Text style={styles.emptyPlaceholderText}>No petty cash logs found.</Text>
                    </View>
                }
                ListFooterComponent={renderPaginationControls()}
            />
        );
    };

    const renderPaginationControls = () => {
        if (pagination.last_page <= 1) return null;

        return (
            <View style={styles.pagerContainer}>
                <TouchableOpacity 
                    disabled={pagination.current_page === 1} 
                    style={[styles.pagerBtn, pagination.current_page === 1 && styles.pagerBtnDisabled]}
                    onPress={() => loadData(pagination.current_page - 1)}
                >
                    <Ionicons name="chevron-back" size={18} color={pagination.current_page === 1 ? '#94A3B8' : '#1E293B'} />
                </TouchableOpacity>

                <Text style={styles.pagerInfo}>
                    Page {pagination.current_page} of {pagination.last_page}
                </Text>

                <TouchableOpacity 
                    disabled={pagination.current_page === pagination.last_page} 
                    style={[styles.pagerBtn, pagination.current_page === pagination.last_page && styles.pagerBtnDisabled]}
                    onPress={() => loadData(pagination.current_page + 1)}
                >
                    <Ionicons name="chevron-forward" size={18} color={pagination.current_page === pagination.last_page ? '#94A3B8' : '#1E293B'} />
                </TouchableOpacity>
            </View>
        );
    };

    // ==========================================================
    // CORE MASTER RETURN
    // ==========================================================
    return (
        <View style={styles.mainWrapper}>
            <Header title="Petty Cash Logs" />

            {/* A. High-End Metric Cards Ribbon */}
            {statsLoading ? (
                <View style={[styles.metricsRibbon, { justifyContent: 'center', height: 70 }]}>
                    <ActivityIndicator size="small" color="#7C3AED" />
                </View>
            ) : (
                <ScrollView 
                    horizontal 
                    style={{ flexGrow: 0 }} 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={styles.metricsRibbon}
                >
                    {/* Card 1: Opening Balance */}
                    <View style={[styles.kpiCard, { borderLeftColor: '#8B5CF6' }]}>
                        <View style={[styles.kpiIconBox, { backgroundColor: '#F3E8FF' }]}>
                            <Ionicons name="wallet" size={16} color="#8B5CF6" />
                        </View>
                        <View>
                            <Text style={styles.kpiValue}>₹{parseFloat(stats.total_opening_balance || 0).toFixed(2)}</Text>
                            <Text style={styles.kpiLabel}>Opening</Text>
                        </View>
                    </View>

                    {/* Card 2: Expenses */}
                    <View style={[styles.kpiCard, { borderLeftColor: '#EC4899' }]}>
                        <View style={[styles.kpiIconBox, { backgroundColor: '#FCE7F3' }]}>
                            <Ionicons name="cash" size={16} color="#EC4899" />
                        </View>
                        <View>
                            <Text style={[styles.kpiValue, { color: '#D1D5DB' && '#EC4899' }]}>
                                ₹{parseFloat(stats.total_expense || 0).toFixed(2)}
                            </Text>
                            <Text style={styles.kpiLabel}>Total Expense</Text>
                        </View>
                    </View>

                    {/* Card 3: Remaining */}
                    <View style={[styles.kpiCard, { borderLeftColor: '#F59E0B' }]}>
                        <View style={[styles.kpiIconBox, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="piggy-bank" size={16} color="#F59E0B" />
                        </View>
                        <View>
                            <Text style={[styles.kpiValue, { color: '#10B981' }]}>
                                ₹{parseFloat(stats.remaining_balance || 0).toFixed(2)}
                            </Text>
                            <Text style={styles.kpiLabel}>Remaining</Text>
                        </View>
                    </View>
                </ScrollView>
            )}

            {/* B. Integrated Action Row (Search, Toggle View, Open Filters) */}
            <View style={styles.actionRow}>
                <View style={styles.searchField}>
                    <Ionicons name="search" size={18} color="#94A3B8" style={{ marginRight: 6 }} />
                    <TextInput
                        style={styles.searchInputText}
                        placeholder="Search ledger..."
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

                {/* Switcher */}
                <View style={styles.viewSwitcherGroup}>
                    <TouchableOpacity 
                        style={[styles.switchBtn, viewMode === 'card' && styles.switchBtnActive]}
                        onPress={() => setViewMode('card')}
                    >
                        <Ionicons name="grid" size={16} color={viewMode === 'card' ? '#FFF' : '#64748B'} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.switchBtn, viewMode === 'table' && styles.switchBtnActive]}
                        onPress={() => setViewMode('table')}
                    >
                        <Ionicons name="list" size={16} color={viewMode === 'table' ? '#FFF' : '#64748B'} />
                    </TouchableOpacity>
                </View>

                {/* Advanced Filter Opener Trigger */}
                <TouchableOpacity 
                    style={[
                        styles.filterTriggerBtn, 
                        getAppliedFilterCount() > 0 && styles.filterTriggerBtnActive
                    ]}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons 
                        name="filter" 
                        size={18} 
                        color={getAppliedFilterCount() > 0 ? '#434AFA' : '#64748B'} 
                    />
                    {getAppliedFilterCount() > 0 && (
                        <View style={styles.countBadge}>
                            <Text style={styles.countBadgeText}>{getAppliedFilterCount()}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* C. The Main Content Display Engine */}
            <View style={{ flex: 1 }}>
                {renderListContent()}
            </View>

            {/* D. Floating Action Button to Add Record */}
            <TouchableOpacity 
                style={styles.floatingFab} 
                onPress={() => { resetForm(); setAddModalVisible(true); }}
            >
                <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>

            {/* ========================================================== */}
            {/* MODAL: ADVANCED OVERLAY FILTERS */}
            {/* ========================================================== */}
            <Modal 
                visible={filterModalVisible} 
                transparent 
                animationType="slide" 
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <View style={styles.overlayModal}>
                    <View style={styles.overlaySheet}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Advanced Filters</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close-circle" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1, paddingHorizontal: 16 }}>
                            {renderOptionTrigger(
                                'Wallet (Department)', 
                                filterWallet, 
                                'wallet_filter', 
                                getWalletName, 
                                'All Departments'
                            )}

                            {renderOptionTrigger(
                                'Expense Type', 
                                filterExpense, 
                                'expense_filter', 
                                getExpenseName, 
                                'All Expense Types'
                            )}

                            {renderOptionTrigger(
                                'Approval Status', 
                                filterStatus, 
                                'status_filter', 
                                (val) => val === 1 ? 'Approved Only' : 'Pending Only', 
                                'All Statuses'
                            )}

                            <View style={styles.dateRowContainer}>
                                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                                    <Text style={styles.inputLabel}>From Date</Text>
                                    <TextInput
                                        style={styles.textInputBox}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#94A3B8"
                                        value={filterFromDate}
                                        onChangeText={setFilterFromDate}
                                    />
                                </View>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={styles.inputLabel}>To Date</Text>
                                    <TextInput
                                        style={styles.textInputBox}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#94A3B8"
                                        value={filterToDate}
                                        onChangeText={setFilterToDate}
                                    />
                                </View>
                            </View>

                            {renderOptionTrigger(
                                'Transaction Month', 
                                filterMonth, 
                                'month_filter', 
                                getMonthName, 
                                'All Months'
                            )}
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={styles.resetBtn}
                                onPress={clearAllFilters}
                            >
                                <Text style={styles.resetBtnText}>Clear Filters</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.applyBtn}
                                onPress={() => {
                                    setFilterModalVisible(false);
                                    loadData(1);
                                }}
                            >
                                <Text style={styles.applyBtnText}>Apply Filters</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ========================================================== */}
            {/* MODAL: ADD & EDIT TRANSACTION MODAL */}
            {/* ========================================================== */}
            <Modal 
                visible={addModalVisible} 
                transparent 
                animationType="slide" 
                onRequestClose={() => setAddModalVisible(false)}
            >
                <View style={styles.overlayModal}>
                    <View style={[styles.overlaySheet, { height: '80%' }]}>
                        <View style={[styles.modalHeader, { backgroundColor: '#434AFA' }]}>
                            <Text style={[styles.modalTitle, { color: '#FFF' }]}>
                                {editMode ? 'Update Petty Cash Record' : 'Add Petty Cash Entry'}
                            </Text>
                            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                                <Ionicons name="close-circle" size={26} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled">
                            
                            {renderOptionTrigger(
                                'Select Wallet *', 
                                formWallet, 
                                'wallet_form', 
                                getWalletName, 
                                'Choose Department / Wallet'
                            )}

                            {renderOptionTrigger(
                                'Expense Type *', 
                                formExpense, 
                                'expense_form', 
                                getExpenseName, 
                                'Choose Category'
                            )}

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Price Amount *</Text>
                                <View style={styles.currencyInputWrapper}>
                                    <Text style={styles.currencySymbol}>₹</Text>
                                    <TextInput
                                        style={[styles.textInputBox, { borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, flex: 1 }]}
                                        placeholder="0.00"
                                        keyboardType="numeric"
                                        value={formPrice}
                                        onChangeText={setFormPrice}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Add Remark / Comment</Text>
                                <TextInput
                                    style={[styles.textInputBox, { height: 60, textAlignVertical: 'top', paddingVertical: 8 }]}
                                    placeholder="Describe this expense..."
                                    multiline
                                    numberOfLines={3}
                                    value={formRemark}
                                    onChangeText={setFormRemark}
                                />
                            </View>

                            {/* Attachment Selector */}
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Invoice Attachment / Receipt</Text>
                                <View style={styles.photoBoxRow}>
                                    {formAttachment ? (
                                        <View style={styles.photoPreviewBox}>
                                            <Image 
                                                source={{ uri: formAttachment.uri }} 
                                                style={styles.previewImage} 
                                            />
                                            <TouchableOpacity 
                                                style={styles.photoClearBtn} 
                                                onPress={() => setFormAttachment(null)}
                                            >
                                                <Ionicons name="close-circle" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity style={styles.photoPickerBox} onPress={pickImage}>
                                            <Ionicons name="camera" size={26} color="#6366F1" />
                                            <Text style={styles.photoPickerTxt}>Attach Receipt</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        </ScrollView>

                        <View style={styles.modalFooter}>
                            <TouchableOpacity 
                                style={[styles.resetBtn, { flex: 0.4 }]}
                                onPress={() => setAddModalVisible(false)}
                            >
                                <Text style={styles.resetBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.applyBtn, { flex: 0.6, backgroundColor: '#434AFA' }]}
                                disabled={actionLoading}
                                onPress={handleSaveEntry}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.applyBtnText}>
                                        {editMode ? 'Update Log' : 'Save Entry'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ========================================================== */}
            {/* GENERIC OPTIONS PICKER SHEET (FOR CUSTOM SELECTS) */}
            {/* ========================================================== */}
            <Modal visible={pickerVisible} transparent animationType="fade">
                <TouchableOpacity 
                    style={styles.popOverlay} 
                    activeOpacity={1} 
                    onPress={() => setPickerVisible(false)}
                >
                    <View style={styles.popSheet}>
                        <View style={styles.popHeader}>
                            <Text style={styles.popTitle}>Select Option</Text>
                        </View>
                        <FlatList
                            data={getPickerData()}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.popItem}
                                    onPress={() => handleOptionSelect(item.id)}
                                >
                                    <Text style={styles.popItemText}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={{ padding: 20, alignItems: 'center' }}>
                                    <Text style={{ color: '#94A3B8' }}>No options loaded</Text>
                                </View>
                            }
                            style={{ maxHeight: 300 }}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    mainwrapper: { flex: 1, backgroundColor: '#FFFFFF' },
    
    // 1. Metrics Strip styling
    metricsRibbon: { 
        flexDirection: 'row', 
        paddingVertical: 12, 
        paddingHorizontal: 16, 
        backgroundColor: '#FFF', 
        gap: 12 
    },
    kpiCard: {
        minWidth: 135, 
        backgroundColor: '#FFF', 
        borderRadius: 8, 
        borderWidth: 1, 
        borderColor: '#E2E8F0',
        borderLeftWidth: 4, 
        padding: 12, 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 8,
        shadowColor: '#000', 
        shadowOpacity: 0.03, 
        elevation: 1,
    },
    kpiIconBox: { 
        width: 32, 
        height: 32, 
        borderRadius: 8, 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    kpiValue: { 
        fontSize: 14, 
        fontWeight: '800', 
        color: '#1E293B' 
    },
    kpiLabel: { 
        fontSize: 10, 
        fontWeight: '700', 
        color: '#94A3B8', 
        textTransform: 'capitalize' 
    },

    // 2. Top Action Search Row styling
    actionRow: { 
        flexDirection: 'row', 
        padding: 12, 
        backgroundColor: '#FFF', 
        alignItems: 'center', 
        gap: 8,
        borderBottomWidth: 1, 
        borderBottomColor: '#E2E8F0' 
    },
    searchField: { 
        flex: 1, 
        height: 38, 
        backgroundColor: '#F1F5F9', 
        borderRadius: 6, 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 10 
    },
    searchInputText: { 
        flex: 1, 
        fontSize: 13, 
        color: '#1E293B', 
        padding: 0 
    },
    viewSwitcherGroup: { 
        flexDirection: 'row', 
        backgroundColor: '#F1F5F9', 
        borderRadius: 6, 
        padding: 3 
    },
    switchBtn: { 
        padding: 6, 
        borderRadius: 4 
    },
    switchBtnActive: { 
        backgroundColor: '#434AFA' 
    },
    filterTriggerBtn: { 
        padding: 8, 
        borderRadius: 6, 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        backgroundColor: '#F8FAFC' 
    },
    filterTriggerBtnActive: { 
        backgroundColor: '#EEF2FF', 
        borderColor: '#C7D2FE' 
    },
    countBadge: { 
        position: 'absolute', 
        top: -5, 
        right: -5, 
        backgroundColor: '#434AFA', 
        borderRadius: 10, 
        width: 16, 
        height: 16, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    countBadgeText: { 
        color: '#FFF', 
        fontSize: 9, 
        fontWeight: 'bold' 
    },

    // 3. Ledger Cards layout styling
    ledgerCard: { 
        backgroundColor: '#FFF', 
        borderRadius: 8, 
        marginBottom: 12, 
        padding: 12, 
        borderWidth: 1, 
        borderColor: '#E2E8F0',
        shadowColor: '#000', 
        shadowOpacity: 0.04, 
        elevation: 2 
    },
    ledgerCardHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        borderBottomWidth: 1, 
        borderBottomColor: '#F1F5F9', 
        paddingBottom: 8 
    },
    ledgerTitle: { 
        fontSize: 14, 
        fontWeight: '700', 
        color: '#1E293B' 
    },
    ledgerDate: { 
        fontSize: 11, 
        color: '#64748B', 
        marginTop: 2 
    },
    badgeContainer: { 
        alignSelf: 'flex-start' 
    },
    approvedBadge: { 
        fontSize: 10, 
        fontWeight: 'bold', 
        paddingHorizontal: 8, 
        paddingVertical: 3, 
        borderRadius: 12 
    },
    approvedGreen: { 
        backgroundColor: '#D1FAE5', 
        color: '#065F46' 
    },
    pendingOrange: { 
        backgroundColor: '#FEF3C7', 
        color: '#92400E' 
    },
    ledgerCardBody: { 
        paddingVertical: 8, 
        gap: 6 
    },
    cardDataRow: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    cardDataLabel: { 
        fontSize: 12, 
        color: '#64748B', 
        width: 60, 
        marginLeft: 4 
    },
    cardDataValue: { 
        fontSize: 12, 
        fontWeight: '600', 
        color: '#1E293B', 
        flex: 1 
    },
    ledgerCardActions: { 
        flexDirection: 'row', 
        gap: 8, 
        marginTop: 6, 
        paddingTop: 8, 
        borderTopWidth: 1, 
        borderTopColor: '#F1F5F9' 
    },
    cardActBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 10, 
        paddingVertical: 6, 
        borderRadius: 6, 
        gap: 4 
    },
    cardActBtnText: { 
        fontSize: 11, 
        fontWeight: '700' 
    },

    // 4. Horizontal Table styling
    tableWrapper: { 
        backgroundColor: '#FFF', 
        marginTop: 10, 
        borderTopWidth: 1, 
        borderTopColor: '#E2E8F0' 
    },
    tableRowHead: { 
        flexDirection: 'row', 
        backgroundColor: '#EEF2FF', 
        borderBottomWidth: 1, 
        borderBottomColor: '#C7D2FE' 
    },
    tableHeaderCell: { 
        fontSize: 11, 
        fontWeight: '800', 
        color: '#312E81', 
        padding: 10, 
        textAlign: 'left', 
        textTransform: 'capitalize' 
    },
    tableRowBody: { 
        flexDirection: 'row', 
        borderBottomWidth: 1, 
        borderBottomColor: '#E2E8F0', 
        alignItems: 'center' 
    },
    tableCell: { 
        padding: 10, 
        fontSize: 12, 
        color: '#475569', 
        textAlign: 'left' 
    },
    badgeMin: { 
        paddingHorizontal: 6, 
        paddingVertical: 2, 
        borderRadius: 4, 
        alignSelf: 'flex-start' 
    },
    badgeMinText: { 
        fontSize: 10, 
        fontWeight: '700' 
    },
    tableRowEmpty: { 
        padding: 30, 
        alignItems: 'center' 
    },
    emptyTableText: { 
        color: '#94A3B8', 
        fontStyle: 'italic' 
    },

    // 5. Pagination & Empty States styling
    pagerContainer: { 
        flexDirection: 'row', 
        justifyContent: 'center', 
        alignItems: 'center', 
        paddingVertical: 16, 
        gap: 12 
    },
    pagerBtn: { 
        padding: 8, 
        backgroundColor: '#FFF', 
        borderWidth: 1, 
        borderColor: '#CBD5E1', 
        borderRadius: 6 
    },
    pagerBtnDisabled: { 
        opacity: 0.4 
    },
    pagerInfo: { 
        fontSize: 12, 
        fontWeight: '700', 
        color: '#475569' 
    },
    emptyPlaceholder: { 
        alignItems: 'center', 
        justifyContent: 'center', 
        paddingVertical: 60 
    },
    emptyPlaceholderText: { 
        color: '#94A3B8', 
        marginTop: 10, 
        fontSize: 14 
    },

    // 6. Floating Fab
    floatingFab: { 
        position: 'absolute', 
        bottom: 24, 
        right: 20, 
        width: 52, 
        height: 52, 
        borderRadius: 26, 
        backgroundColor: '#434AFA', 
        justifyContent: 'center', 
        alignItems: 'center', 
        elevation: 6, 
        shadowColor: '#000', 
        shadowOpacity: 0.2 
    },

    // 7. Overlay Drawer Modals Sheets styling
    overlayModal: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.4)', 
        justifyContent: 'flex-end' 
    },
    overlaySheet: { 
        backgroundColor: '#FFF', 
        borderTopLeftRadius: 16, 
        borderTopRightRadius: 16, 
        height: '70%', 
        paddingBottom: 16 
    },
    modalHeader: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: 16, 
        borderBottomWidth: 1, 
        borderBottomColor: '#F1F5F9' 
    },
    modalTitle: { 
        fontSize: 16, 
        fontWeight: '800', 
        color: '#1E293B' 
    },
    modalFooter: { 
        flexDirection: 'row', 
        paddingHorizontal: 16, 
        paddingTop: 12, 
        borderTopWidth: 1, 
        borderTopColor: '#F1F5F9', 
        gap: 10 
    },
    resetBtn: { 
        flex: 1, 
        height: 44, 
        borderRadius: 8, 
        borderWidth: 1, 
        borderColor: '#E2E8F0', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    resetBtnText: { 
        color: '#64748B', 
        fontWeight: '700' 
    },
    applyBtn: { 
        flex: 1, 
        height: 44, 
        borderRadius: 8, 
        backgroundColor: '#1E293B', 
        alignItems: 'center', 
        justifyContent: 'center' 
    },
    applyBtnText: { 
        color: '#FFF', 
        fontWeight: '700' 
    },

    // 8. Inputs, Forms and Custom Pickers styling
    inputGroup: { 
        marginVertical: 8 
    },
    inputLabel: { 
        fontSize: 12, 
        fontWeight: '800', 
        color: '#475569', 
        marginBottom: 6 
    },
    pickerTrigger: { 
        height: 42, 
        borderWidth: 1, 
        borderColor: '#CBD5E1', 
        borderRadius: 6, 
        paddingHorizontal: 12, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        backgroundColor: '#FAFAFA' 
    },
    pickerTriggerText: { 
        fontSize: 13, 
        color: '#1E293B', 
        fontWeight: '600' 
    },
    textInputBox: { 
        height: 42, 
        borderWidth: 1, 
        borderColor: '#CBD5E1', 
        borderRadius: 6, 
        paddingHorizontal: 12, 
        fontSize: 13, 
        color: '#1E293B', 
        backgroundColor: '#FAFAFA' 
    },
    dateRowContainer: { 
        flexDirection: 'row' 
    },
    currencyInputWrapper: { 
        flexDirection: 'row', 
        alignItems: 'center' 
    },
    currencySymbol: { 
        height: 42, 
        paddingHorizontal: 14, 
        backgroundColor: '#EEF2FF', 
        borderWidth: 1, 
        borderColor: '#CBD5E1', 
        borderRightWidth: 0, 
        borderTopLeftRadius: 6, 
        borderBottomLeftRadius: 6, 
        textAlignVertical: 'center', 
        fontSize: 15, 
        fontWeight: '800', 
        color: '#434AFA' 
    },

    // 9. Image Attachment Row
    photoBoxRow: { 
        flexDirection: 'row', 
        marginTop: 4 
    },
    photoPickerBox: { 
        height: 90, 
        width: 120, 
        borderWidth: 2, 
        borderStyle: 'dashed', 
        borderColor: '#6366F1', 
        borderRadius: 8, 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#EEF2FF' 
    },
    photoPickerTxt: { 
        fontSize: 11, 
        color: '#434AFA', 
        fontWeight: 'bold', 
        marginTop: 4 
    },
    photoPreviewBox: { 
        width: 100, 
        height: 100, 
        borderRadius: 8, 
        overflow: 'hidden', 
        borderWidth: 1, 
        borderColor: '#CBD5E1' 
    },
    previewImage: { 
        width: '100%', 
        height: '100%', 
        resizeMode: 'cover' 
    },
    photoClearBtn: { 
        position: 'absolute', 
        top: 2, 
        right: 2, 
        backgroundColor: '#FFF', 
        borderRadius: 10 
    },

    approvalRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginTop: 14, 
        gap: 8 
    },
    checkboxCircle: { 
        width: 20, 
        height: 20, 
        borderRadius: 4, 
        borderWidth: 1.5, 
        borderColor: '#CBD5E1', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    checkboxChecked: { 
        backgroundColor: '#10B981', 
        borderColor: '#10B981' 
    },
    approvalText: { 
        fontSize: 13, 
        fontWeight: '700', 
        color: '#1E293B' 
    },

    // 10. Popup Overlay Flatlist styling
    popOverlay: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.5)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    popSheet: { 
        backgroundColor: '#FFF', 
        width: '85%', 
        borderRadius: 8, 
        paddingBottom: 12, 
        overflow: 'hidden' 
    },
    popHeader: { 
        padding: 14, 
        borderBottomWidth: 1, 
        borderBottomColor: '#F1F5F9', 
        backgroundColor: '#F8FAFC' 
    },
    popTitle: { 
        fontSize: 14, 
        fontWeight: '800', 
        color: '#1E293B' 
    },
    popItem: { 
        padding: 14, 
        borderBottomWidth: 1, 
        borderBottomColor: '#F1F5F9' 
    },
    popItemText: { 
        fontSize: 13, 
        color: '#334155', 
        fontWeight: '600' 
    }
});

export default PettyCashScreen;
