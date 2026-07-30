import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, ScrollView, TextInput, RefreshControl,
    Modal, Alert, Platform, Image
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
    updatePettyCashEntry,
    togglePettyCashApproval,
    approvePettyCashBulk,
    deletePettyCashEntry,
    clearPettyCashMessages
} from '../store/slices/pettyCashSlice';

const PettyCashApprovalsScreen = () => {
    const dispatch = useDispatch();
    
    // Redux Selectors
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

    // Local state
    const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    
    // Filter configurations
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [filterWallet, setFilterWallet] = useState(null); // Department
    const [filterExpense, setFilterExpense] = useState(null);
    const [filterFromDate, setFilterFromDate] = useState('');
    const [filterToDate, setFilterToDate] = useState('');
    const [filterMonth, setFilterMonth] = useState(null);

    // Edit Form overlay states
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedEntryId, setSelectedEntryId] = useState(null);
    const [formWallet, setFormWallet] = useState('');
    const [formExpense, setFormExpense] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formRemark, setFormRemark] = useState('');
    const [formAttachment, setFormAttachment] = useState(null);
    const [formApproved, setFormApproved] = useState(false);

    // Custom select picker states
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerType, setPickerType] = useState(''); // 'wallet_filter', 'expense_filter', 'month_filter', 'wallet_form', 'expense_form'

    // Initialize data: Form dropdowns and initial list (status = 0)
    useEffect(() => {
        dispatch(fetchPettyCashFormOptions());
        loadData(1);
    }, []);

    // Handle server feedback
    useEffect(() => {
        if (successMessage) {
            Toast.show({ type: 'success', text1: successMessage, visibilityTime: 3000 });
            setEditModalVisible(false);
            setSelectedIds([]); // Reset selection on success
            dispatch(clearPettyCashMessages());
            loadData(1); 
        }
        if (error) {
            Toast.show({ type: 'error', text1: error, visibilityTime: 4000 });
            dispatch(clearPettyCashMessages());
        }
    }, [successMessage, error]);

    // Master data loader helper (Always binds status = 0)
    const loadData = (page = 1) => {
        const params = {
            page,
            search: searchQuery,
            department_id: filterWallet || '',
            expense_id: filterExpense || '',
            status: 0, // FORCE "0" to only load pending approvals
            from_date: filterFromDate,
            to_date: filterToDate,
            month: filterMonth || ''
        };
        dispatch(fetchPettyCashEntries(params));
        dispatch(fetchPettyCashStats({ department_id: filterWallet || '' }));
    };

    // Search debounce
    useEffect(() => {
        const timer = setTimeout(() => {
            loadData(1);
        }, 600);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const onRefresh = () => {
        loadData(1);
        setSelectedIds([]);
    };

    // Advanced Filter counts and clearing routines
    const getAppliedFilterCount = () => {
        let count = 0;
        if (filterWallet) count++;
        if (filterExpense) count++;
        if (filterFromDate) count++;
        if (filterToDate) count++;
        if (filterMonth) count++;
        return count;
    };

    const clearAllFilters = () => {
        setFilterWallet(null);
        setFilterExpense(null);
        setFilterFromDate('');
        setFilterToDate('');
        setFilterMonth(null);
        setFilterModalVisible(false);
        setSelectedIds([]);
        setTimeout(() => loadData(1), 100);
    };

    // Checkbox Multi-selection handlers
    const handleSelectToggle = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(x => x !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSelectAllToggle = () => {
        if (selectedIds.length === entries.length && entries.length > 0) {
            setSelectedIds([]);
        } else {
            setSelectedIds(entries.map(e => e.id));
        }
    };

    // Image handling for update
    const pickImage = () => {
        launchImageLibrary({ mediaType: 'photo', quality: 0.7, maxWidth: 1200, maxHeight: 1200 }, (response) => {
            if (response.didCancel) return;
            if (response.errorCode) {
                Toast.show({ type: 'error', text1: 'Image error', text2: response.errorMessage });
                return;
            }
            if (response.assets && response.assets.length > 0) {
                setFormAttachment(response.assets[0]);
            }
        });
    };

    // Entry Operations: Edit & Save
    const openEditModal = (item) => {
        setSelectedEntryId(item.id);
        setFormWallet(item.department_id);
        setFormExpense(item.expense_id);
        setFormPrice(item.price?.toString() || '');
        setFormRemark(item.remark || '');
        setFormApproved(item.is_approved === 1 || item.is_approved === true);
        setFormAttachment(item.attachment ? { uri: item.attachment_url } : null);
        setEditModalVisible(true);
    };

    const handleUpdateSave = () => {
        if (!formWallet || !formExpense || !formPrice) {
            Alert.alert('Mandatory Fields', 'Wallet, Category and Price are required.');
            return;
        }

        const formData = new FormData();
        formData.append('department_id', formWallet);
        formData.append('expense_id', formExpense);
        formData.append('price', formPrice);
        formData.append('remark', formRemark || '');
        formData.append('is_approved', formApproved ? '1' : '0');

        if (formAttachment && formAttachment.uri && !formAttachment.uri.startsWith('http')) {
            formData.append('attachment', {
                uri: Platform.OS === 'android' ? formAttachment.uri : formAttachment.uri.replace('file://', ''),
                type: formAttachment.type || 'image/jpeg',
                name: formAttachment.fileName || `receipt_${Date.now()}.jpg`,
            });
        }

        dispatch(updatePettyCashEntry({ id: selectedEntryId, formData }));
    };

    // Core Action Resolvers
    const handleApproveSingle = (id) => {
        dispatch(togglePettyCashApproval(id));
    };

    const handleApproveBulk = () => {
        if (selectedIds.length === 0) return;
        Alert.alert(
            'Bulk Approval',
            `Are you sure you want to approve the ${selectedIds.length} selected logs?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Confirm Approve', 
                    onPress: () => {
                        dispatch(approvePettyCashBulk(selectedIds));
                    }
                }
            ]
        );
    };

    const handleDeleteClick = (id) => {
        Alert.alert(
            'Delete Voucher',
            'Remove this petty cash ledger voucher permanently?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => dispatch(deletePettyCashEntry(id)) }
            ]
        );
    };

    // Dropdown Option Picker utility hooks
    const openPicker = (type) => {
        setPickerType(type);
        setPickerVisible(true);
    };

    const onOptionSelected = (id) => {
        switch (pickerType) {
            case 'wallet_filter': setFilterWallet(id); break;
            case 'expense_filter': setFilterExpense(id); break;
            case 'month_filter': setFilterMonth(id); break;
            case 'wallet_form': setFormWallet(id); break;
            case 'expense_form': setFormExpense(id); break;
        }
        setPickerVisible(false);
    };

    const getPickerOptions = () => {
        switch (pickerType) {
            case 'wallet_filter':
            case 'wallet_form':
                return formOptions.departments || [];
            case 'expense_filter':
            case 'expense_form':
                return formOptions.expenses || [];
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

    // Text string parsers
    const getWalletLabel = (id) => formOptions.departments?.find(d => d.id === id)?.name || 'Unselected';
    const getExpenseLabel = (id) => formOptions.expenses?.find(e => e.id === id)?.name || 'Unselected';
    const getMonthLabel = (id) => {
        const names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return id ? names[id - 1] : 'Unselected';
    };
    const formatDate = (str) => {
        if (!str) return '';
        return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    // RENDER PIECE: Standard select component
    const renderSelectField = (title, val, type, parseFn, emptyHint) => (
        <View style={styles.inputBoxGroup}>
            <Text style={styles.inputHeadText}>{title}</Text>
            <TouchableOpacity 
                style={styles.selectPickerTrigger} 
                onPress={() => openPicker(type)}
            >
                <Text style={[styles.selectValueStr, !val && { color: '#94A3B8' }]}>
                    {val ? parseFn(val) : emptyHint}
                </Text>
                <Ionicons name="chevron-down" size={16} color="#64748B" />
            </TouchableOpacity>
        </View>
    );

    // RENDER PIECE: Card UI listing component
    const renderApprovalCard = ({ item }) => {
        const isSelected = selectedIds.includes(item.id);
        return (
            <View style={[styles.approvalCard, isSelected && styles.approvalCardActive]}>
                <View style={styles.cardHeadContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <TouchableOpacity 
                            style={[styles.checkboxSelector, isSelected && styles.checkboxSelectorChecked]}
                            onPress={() => handleSelectToggle(item.id)}
                        >
                            {isSelected && <Ionicons name="checkmark" size={12} color="#FFF" />}
                        </TouchableOpacity>
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.voucherTitle} numberOfLines={1}>
                                {item.expense?.name || 'General Expense'}
                            </Text>
                            <Text style={styles.voucherTime}>{formatDate(item.created_at)}</Text>
                        </View>
                    </View>
                    <View style={styles.statusVoucherBox}>
                        <Text style={styles.statusPendingVoucher}>Pending</Text>
                    </View>
                </View>

                <View style={styles.voucherDetailsGrid}>
                    <View style={styles.dataRow}>
                        <Ionicons name="business-outline" size={14} color="#64748B" />
                        <Text style={styles.dataLabel}>Wallet:</Text>
                        <Text style={styles.dataVal} numberOfLines={1}>
                            {item.department?.name || 'Default'}
                        </Text>
                    </View>
                    <View style={styles.dataRow}>
                        <FontAwesome name="rupee" size={13} color="#EF4444" style={{ marginLeft: 2, marginRight: 2 }} />
                        <Text style={styles.dataLabel}>Price:</Text>
                        <Text style={[styles.dataVal, { fontWeight: '700', color: '#EF4444' }]}>
                            ₹{parseFloat(item.price || 0).toFixed(2)}
                        </Text>
                    </View>
                    {item.remark ? (
                        <View style={[styles.dataRow, { alignItems: 'flex-start' }]}>
                            <Ionicons name="chatbox-ellipses-outline" size={14} color="#64748B" style={{ marginTop: 2 }} />
                            <Text style={styles.dataLabel}>Remark:</Text>
                            <Text style={[styles.dataVal, { fontStyle: 'italic', color: '#475569' }]} numberOfLines={2}>
                                {item.remark}
                            </Text>
                        </View>
                    ) : null}
                    {item.attachment_url ? (
                        <View style={styles.dataRow}>
                            <Ionicons name="attach" size={16} color="#6366F1" />
                            <Text style={{ color: '#6366F1', fontWeight: '600', fontSize: 11 }}>Receipt File Attached</Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.cardActionPanel}>
                    <TouchableOpacity 
                        style={[styles.panelActionBtn, { backgroundColor: '#ECFDF5' }]}
                        onPress={() => handleApproveSingle(item.id)}
                    >
                        <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                        <Text style={[styles.panelActionStr, { color: '#059669' }]}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.panelActionBtn, { backgroundColor: '#F1F5F9' }]}
                        onPress={() => openEditModal(item)}
                    >
                        <Ionicons name="pencil" size={14} color="#4F46E5" />
                        <Text style={[styles.panelActionStr, { color: '#4F46E5' }]}>Edit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={[styles.panelActionBtn, { backgroundColor: '#FEF2F2', flex: 0 }]}
                        onPress={() => handleDeleteClick(item.id)}
                    >
                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // RENDER PIECE: Table UI component
    const renderTableApproval = () => {
        const areAllChecked = selectedIds.length === entries.length && entries.length > 0;
        return (
            <View style={styles.tableContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
                    <View>
                        {/* Table head line with toggle all check */}
                        <View style={styles.headerRowStyle}>
                            <View style={{ width: 40, justifyContent: 'center', alignItems: 'center' }}>
                                <TouchableOpacity 
                                    style={[styles.checkboxSelector, areAllChecked && styles.checkboxSelectorChecked]}
                                    onPress={handleSelectAllToggle}
                                >
                                    {areAllChecked && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.columnHeadTitle, { width: 90 }]}>Date</Text>
                            <Text style={[styles.columnHeadTitle, { width: 130 }]}>Expense Name</Text>
                            <Text style={[styles.columnHeadTitle, { width: 100 }]}>Wallet</Text>
                            <Text style={[styles.columnHeadTitle, { width: 90 }]}>Price (₹)</Text>
                            <Text style={[styles.columnHeadTitle, { width: 110 }]}>Quick Actions</Text>
                        </View>

                        {entries.length === 0 ? (
                            <View style={styles.noDataTableCell}>
                                <Text style={styles.emptyTextInfo}>No pending items match criteria.</Text>
                            </View>
                        ) : (
                            entries.map((item, idx) => {
                                const isChecked = selectedIds.includes(item.id);
                                return (
                                    <View 
                                        key={item.id}
                                        style={[
                                            styles.bodyRowStyle,
                                            { backgroundColor: idx % 2 === 0 ? '#FFF' : '#F8FAFC' },
                                            isChecked && { backgroundColor: '#EFF6FF' }
                                        ]}
                                    >
                                        <View style={{ width: 40, justifyContent: 'center', alignItems: 'center' }}>
                                            <TouchableOpacity 
                                                style={[styles.checkboxSelector, isChecked && styles.checkboxSelectorChecked]}
                                                onPress={() => handleSelectToggle(item.id)}
                                            >
                                                {isChecked && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={[styles.columnBodyCell, { width: 90 }]}>{formatDate(item.created_at)}</Text>
                                        <Text style={[styles.columnBodyCell, { width: 130, fontWeight: '700', color: '#1E293B' }]} numberOfLines={1}>
                                            {item.expense?.name || '-'}
                                        </Text>
                                        <Text style={[styles.columnBodyCell, { width: 100 }]} numberOfLines={1}>
                                            {item.department?.name || '-'}
                                        </Text>
                                        <Text style={[styles.columnBodyCell, { width: 90, fontWeight: '700', color: '#EF4444' }]}>
                                            ₹{parseFloat(item.price || 0).toFixed(2)}
                                        </Text>
                                        <View style={[styles.columnBodyCell, { width: 110, flexDirection: 'row', gap: 14 }]}>
                                            <TouchableOpacity onPress={() => handleApproveSingle(item.id)}>
                                                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => openEditModal(item)}>
                                                <Ionicons name="pencil" size={16} color="#4F46E5" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeleteClick(item.id)}>
                                                <Ionicons name="trash" size={16} color="#EF4444" />
                                            </TouchableOpacity>
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

    // RENDER ENGINE: Content director
    const renderMasterDisplay = () => {
        if (loading && entries.length === 0) {
            return (
                <View style={styles.middleLoaderBox}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loaderHelpText}>Pulling pending requests...</Text>
                </View>
            );
        }

        if (viewMode === 'table') {
            return (
                <ScrollView 
                    style={{ flex: 1 }}
                    refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
                >
                    {renderTableApproval()}
                    {renderPagerBlock()}
                </ScrollView>
            );
        }

        return (
            <FlatList
                data={entries}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderApprovalCard}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
                ListHeaderComponent={
                    entries.length > 0 ? (
                        <View style={styles.bulkActionCardHead}>
                            <TouchableOpacity 
                                style={styles.bulkPressBlock}
                                onPress={handleSelectAllToggle}
                            >
                                <TouchableOpacity 
                                    style={[styles.checkboxSelector, selectedIds.length === entries.length && styles.checkboxSelectorChecked]}
                                    onPress={handleSelectAllToggle}
                                >
                                    {selectedIds.length === entries.length && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                </TouchableOpacity>
                                <Text style={styles.bulkCheckLabel}>
                                    {selectedIds.length === entries.length ? 'Deselect All Vouchers' : 'Select All Pending Vouchers'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ) : null
                }
                ListEmptyComponent={
                    <View style={styles.emptySheetBlock}>
                        <Ionicons name="shield-checkmark-outline" size={56} color="#CBD5E1" />
                        <Text style={styles.emptySheetStrongText}>All Clear!</Text>
                        <Text style={styles.emptySheetMutedText}>No pending petty cash approvals found matching current selection.</Text>
                    </View>
                }
                ListFooterComponent={renderPagerBlock()}
            />
        );
    };

    const renderPagerBlock = () => {
        if (pagination.last_page <= 1) return <View style={{ height: 20 }} />;
        return (
            <View style={styles.paginationRow}>
                <TouchableOpacity 
                    disabled={pagination.current_page === 1}
                    style={[styles.pagerTriggerIcon, pagination.current_page === 1 && styles.pagerTriggerDisabled]}
                    onPress={() => loadData(pagination.current_page - 1)}
                >
                    <Ionicons name="chevron-back" size={16} color={pagination.current_page === 1 ? '#CBD5E1' : '#334155'} />
                </TouchableOpacity>
                <Text style={styles.pagerBreadcrumb}>Page {pagination.current_page} / {pagination.last_page}</Text>
                <TouchableOpacity 
                    disabled={pagination.current_page === pagination.last_page}
                    style={[styles.pagerTriggerIcon, pagination.current_page === pagination.last_page && styles.pagerTriggerDisabled]}
                    onPress={() => loadData(pagination.current_page + 1)}
                >
                    <Ionicons name="chevron-forward" size={16} color={pagination.current_page === pagination.last_page ? '#CBD5E1' : '#334155'} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.screenWrapper}>
            <Header title="Petty Cash Approvals" />

            {/* 1. Summary Analytics Banner */}
            {statsLoading ? (
                <View style={styles.kpiSectionPlaceholder}>
                    <ActivityIndicator size="small" color="#F59E0B" />
                </View>
            ) : (
                <View style={styles.kpiSectionContainer}>
                    <View style={[styles.metricBox, { borderLeftColor: '#F59E0B' }]}>
                        <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="hourglass-outline" size={16} color="#F59E0B" />
                        </View>
                        <View>
                            <Text style={styles.kpiCoreVal}>{stats.total_pending_count || 0}</Text>
                            <Text style={styles.kpiCoreLabel}>Pending Logs</Text>
                        </View>
                    </View>
                    
                    <View style={[styles.metricBox, { borderLeftColor: '#EF4444' }]}>
                        <View style={[styles.kpiIconWrap, { backgroundColor: '#FEF2F2' }]}>
                            <FontAwesome name="money" size={15} color="#EF4444" />
                        </View>
                        <View>
                            <Text style={[styles.kpiCoreVal, { color: '#EF4444' }]}>₹{parseFloat(stats.total_pending_amount || 0).toFixed(2)}</Text>
                            <Text style={styles.kpiCoreLabel}>Pending Money</Text>
                        </View>
                    </View>
                </View>
            )}

            {/* 2. Top search and toggle controls */}
            <View style={styles.utilityDockBar}>
                <View style={styles.searchFormDock}>
                    <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                    <TextInput
                        style={styles.textInputControl}
                        placeholder="Search Pending Requests..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={15} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.viewModeSelectBlock}>
                    <TouchableOpacity 
                        style={[styles.viewModeBtn, viewMode === 'card' && styles.viewModeBtnActive]} 
                        onPress={() => setViewMode('card')}
                    >
                        <Ionicons name="grid-outline" size={15} color={viewMode === 'card' ? '#FFF' : '#64748B'} />
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.viewModeBtn, viewMode === 'table' && styles.viewModeBtnActive]} 
                        onPress={() => setViewMode('table')}
                    >
                        <Ionicons name="list-outline" size={15} color={viewMode === 'table' ? '#FFF' : '#64748B'} />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity 
                    style={[styles.advancedFilterBadge, getAppliedFilterCount() > 0 && styles.advancedFilterBadgeActive]}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <Ionicons name="options-outline" size={18} color={getAppliedFilterCount() > 0 ? '#6366F1' : '#64748B'} />
                    {getAppliedFilterCount() > 0 ? (
                        <View style={styles.badgeOverlay}>
                            <Text style={styles.badgeOverlayText}>{getAppliedFilterCount()}</Text>
                        </View>
                    ) : null}
                </TouchableOpacity>
            </View>

            {/* 3. The display grid list view */}
            <View style={{ flex: 1 }}>
                {renderMasterDisplay()}
            </View>

            {/* 4. Bulk approval action drawer popup at bottom */}
            {selectedIds.length > 0 ? (
                <View style={styles.bulkStickyFooter}>
                    <View style={styles.bulkSummarySide}>
                        <Text style={styles.bulkCountStr}>{selectedIds.length} Selected Items</Text>
                        <Text style={styles.bulkPromptStr}>Ready for instant approval</Text>
                    </View>
                    <TouchableOpacity 
                        style={styles.bulkCommitButton} 
                        onPress={handleApproveBulk}
                        disabled={actionLoading}
                    >
                        {actionLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-done" size={18} color="#FFF" />
                                <Text style={styles.bulkCommitButtonLabel}>Approve All</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            ) : null}

            {/* ========================================================== */}
            {/* OVERLAY COMPONENT: Advanced filters sheet */}
            {/* ========================================================== */}
            <Modal 
                visible={filterModalVisible} 
                transparent 
                animationType="slide"
                onRequestClose={() => setFilterModalVisible(false)}
            >
                <View style={styles.bottomDrawerModal}>
                    <View style={styles.bottomDrawerSheet}>
                        <View style={styles.drawerHeaderLine}>
                            <Text style={styles.drawerHeadline}>Advanced Request Filters</Text>
                            <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                                <Ionicons name="close-circle-outline" size={24} color="#94A3B8" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1, padding: 16 }}>
                            {renderSelectField(
                                'Wallet / Department Origin',
                                filterWallet,
                                'wallet_filter',
                                getWalletLabel,
                                'View all departments'
                            )}

                            {renderSelectField(
                                'Expense Classification',
                                filterExpense,
                                'expense_filter',
                                getExpenseLabel,
                                'View all categories'
                            )}

                            <View style={styles.sideBySideFlex}>
                                <View style={[styles.inputBoxGroup, { flex: 1, marginRight: 10 }]}>
                                    <Text style={styles.inputHeadText}>Voucher From Date</Text>
                                    <TextInput
                                        style={styles.standardTextInputField}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#94A3B8"
                                        value={filterFromDate}
                                        onChangeText={setFilterFromDate}
                                    />
                                </View>
                                <View style={[styles.inputBoxGroup, { flex: 1 }]}>
                                    <Text style={styles.inputHeadText}>Voucher To Date</Text>
                                    <TextInput
                                        style={styles.standardTextInputField}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#94A3B8"
                                        value={filterToDate}
                                        onChangeText={setFilterToDate}
                                    />
                                </View>
                            </View>

                            {renderSelectField(
                                'Accounting Month',
                                filterMonth,
                                'month_filter',
                                getMonthLabel,
                                'Filter by calendar month'
                            )}
                        </ScrollView>

                        <View style={styles.drawerActionToolbar}>
                            <TouchableOpacity style={styles.toolbarClearBtn} onPress={clearAllFilters}>
                                <Text style={styles.toolbarClearBtnText}>Reset Filters</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.toolbarApplyBtn} 
                                onPress={() => { setFilterModalVisible(false); setSelectedIds([]); loadData(1); }}
                            >
                                <Text style={styles.toolbarApplyBtnText}>Apply View</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ========================================================== */}
            {/* OVERLAY COMPONENT: Edit approval voucher modal */}
            {/* ========================================================== */}
            <Modal
                visible={editModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setEditModalVisible(false)}
            >
                <View style={styles.bottomDrawerModal}>
                    <View style={[styles.bottomDrawerSheet, { height: '80%' }]}>
                        <View style={[styles.drawerHeaderLine, { backgroundColor: '#6366F1' }]}>
                            <Text style={[styles.drawerHeadline, { color: '#FFF' }]}>Edit Pending Voucher</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={26} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled">
                            {renderSelectField(
                                'Origin Wallet / Department *',
                                formWallet,
                                'wallet_form',
                                getWalletLabel,
                                'Assign Wallet'
                            )}

                            {renderSelectField(
                                'Expense Classification Category *',
                                formExpense,
                                'expense_form',
                                getExpenseLabel,
                                'Select Category'
                            )}

                            <View style={styles.inputBoxGroup}>
                                <Text style={styles.inputHeadText}>Voucher Price Amount *</Text>
                                <View style={styles.inlineCurrencyBlock}>
                                    <Text style={styles.blockCurrencySymbol}>₹</Text>
                                    <TextInput
                                        style={[styles.standardTextInputField, { borderLeftWidth: 0, borderTopLeftRadius: 0, borderBottomLeftRadius: 0, flex: 1 }]}
                                        placeholder="0.00"
                                        keyboardType="numeric"
                                        value={formPrice}
                                        onChangeText={setFormPrice}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputBoxGroup}>
                                <Text style={styles.inputHeadText}>Verification Note / Remarks</Text>
                                <TextInput
                                    style={[styles.standardTextInputField, { height: 64, textAlignVertical: 'top', paddingVertical: 8 }]}
                                    placeholder="Brief remark about this transaction..."
                                    multiline
                                    numberOfLines={3}
                                    value={formRemark}
                                    onChangeText={setFormRemark}
                                />
                            </View>

                            <View style={styles.inputBoxGroup}>
                                <Text style={styles.inputHeadText}>Voucher Receipt File Attachment</Text>
                                <View style={{ flexDirection: 'row', marginTop: 6 }}>
                                    {formAttachment ? (
                                        <View style={styles.previewImageShell}>
                                            <Image source={{ uri: formAttachment.uri }} style={styles.previewImageTag} />
                                            <TouchableOpacity 
                                                style={styles.imageDelBtn} 
                                                onPress={() => setFormAttachment(null)}
                                            >
                                                <Ionicons name="close-circle" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity style={styles.attachFileDashedBox} onPress={pickImage}>
                                            <Ionicons name="camera" size={26} color="#6366F1" />
                                            <Text style={styles.attachHintText}>Update Receipt</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            <TouchableOpacity 
                                style={styles.instantApproveOption} 
                                onPress={() => setFormApproved(!formApproved)}
                            >
                                <TouchableOpacity 
                                    style={[styles.checkboxSelector, formApproved && styles.checkboxSelectorChecked]}
                                    onPress={() => setFormApproved(!formApproved)}
                                >
                                    {formApproved && <Ionicons name="checkmark" size={12} color="#FFF" />}
                                </TouchableOpacity>
                                <Text style={styles.instantApproveLabel}>Auto Approve and Release Voucher</Text>
                            </TouchableOpacity>
                        </ScrollView>

                        <View style={styles.drawerActionToolbar}>
                            <TouchableOpacity style={[styles.toolbarClearBtn, { flex: 0.4 }]} onPress={() => setEditModalVisible(false)}>
                                <Text style={styles.toolbarClearBtnText}>Discard</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.toolbarApplyBtn, { flex: 0.6, backgroundColor: '#6366F1' }]} 
                                onPress={handleUpdateSave}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.toolbarApplyBtnText}>Save Updates</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ========================================================== */}
            {/* OVERLAY COMPONENT: General Select Options Popover List */}
            {/* ========================================================== */}
            <Modal visible={pickerVisible} transparent animationType="fade">
                <TouchableOpacity 
                    style={styles.popBackground} 
                    activeOpacity={1} 
                    onPress={() => setPickerVisible(false)}
                >
                    <View style={styles.popOptionBox}>
                        <View style={styles.popOptionHeadline}>
                            <Text style={styles.popOptionTitle}>Select Target Choice</Text>
                        </View>
                        <FlatList
                            data={getPickerOptions()}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <TouchableOpacity 
                                    style={styles.popItemRow}
                                    onPress={() => onOptionSelected(item.id)}
                                >
                                    <Text style={styles.popItemRowText}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={
                                <View style={{ padding: 24, alignItems: 'center' }}>
                                    <Text style={{ color: '#94A3B8' }}>No choices loaded</Text>
                                </View>
                            }
                            style={{ maxHeight: 280 }}
                        />
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    screenWrapper: { flex: 1, backgroundColor: '#FFFFFF' },

    // 1. Analytics strip styling
    kpiSectionContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        gap: 12
    },
    kpiSectionPlaceholder: {
        height: 70,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center'
    },
    metricBox: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderLeftWidth: 4,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        elevation: 1,
        shadowColor: '#000',
        shadowOpacity: 0.02
    },
    kpiIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center'
    },
    kpiCoreVal: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    kpiCoreLabel: { fontSize: 9, fontWeight: '700', color: '#94A3B8', textTransform: 'capitalize', marginTop: 1 },

    // 2. Utility Search Strip styling
    utilityDockBar: {
        flexDirection: 'row',
        padding: 12,
        backgroundColor: '#FFF',
        alignItems: 'center',
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0'
    },
    searchFormDock: {
        flex: 1,
        height: 38,
        backgroundColor: '#F1F5F9',
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10
    },
    textInputControl: {
        flex: 1,
        fontSize: 12,
        color: '#1E293B',
        padding: 0
    },
    viewModeSelectBlock: {
        flexDirection: 'row',
        backgroundColor: '#F1F5F9',
        borderRadius: 6,
        padding: 3
    },
    viewModeBtn: { padding: 6, borderRadius: 4 },
    viewModeBtnActive: { backgroundColor: '#6366F1' },
    advancedFilterBadge: {
        padding: 8,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        backgroundColor: '#F8FAFC'
    },
    advancedFilterBadgeActive: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
    badgeOverlay: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 8,
        width: 14,
        height: 14,
        justifyContent: 'center',
        alignItems: 'center'
    },
    badgeOverlayText: { color: '#FFF', fontSize: 8, fontWeight: 'bold' },

    // 3. Checkbox widget
    checkboxSelector: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: '#CBD5E1',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF'
    },
    checkboxSelectorChecked: { backgroundColor: '#10B981', borderColor: '#10B981' },

    // 4. Voucher Card layout styling
    approvalCard: {
        backgroundColor: '#FFF',
        borderRadius: 10,
        marginBottom: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOpacity: 0.03,
        elevation: 1.5
    },
    approvalCardActive: { borderColor: '#93C5FD', backgroundColor: '#F8FAFC' },
    cardHeadContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        paddingBottom: 10
    },
    voucherTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
    voucherTime: { fontSize: 11, color: '#64748B', marginTop: 2 },
    statusVoucherBox: { alignSelf: 'flex-start' },
    statusPendingVoucher: {
        fontSize: 9,
        fontWeight: '800',
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 10,
        backgroundColor: '#FEF3C7',
        color: '#92400E'
    },
    voucherDetailsGrid: { paddingVertical: 10, gap: 7 },
    dataRow: { flexDirection: 'row', alignItems: 'center' },
    dataLabel: { fontSize: 12, color: '#64748B', width: 52, marginLeft: 4 },
    dataVal: { fontSize: 12, fontWeight: '600', color: '#334155', flex: 1 },

    cardActionPanel: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 6,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9'
    },
    panelActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 7,
        borderRadius: 6,
        gap: 5
    },
    panelActionStr: { fontSize: 11, fontWeight: '700' },

    // 5. Main Bulk select row styling
    bulkActionCardHead: {
        flexDirection: 'row',
        marginBottom: 12,
        backgroundColor: '#EEF2FF',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#C7D2FE'
    },
    bulkPressBlock: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    bulkCheckLabel: { fontSize: 12, fontWeight: '700', color: '#4F46E5', marginLeft: 10 },

    // 6. Table Layout components
    tableContainer: { backgroundColor: '#FFF', marginTop: 12, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    headerRowStyle: { flexDirection: 'row', backgroundColor: '#EEF2FF', borderBottomWidth: 1, borderBottomColor: '#C7D2FE' },
    columnHeadTitle: { fontSize: 10, fontWeight: '800', color: '#312E81', padding: 10, textTransform: 'capitalize' },
    bodyRowStyle: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', alignItems: 'center' },
    columnBodyCell: { padding: 10, fontSize: 11, color: '#475569' },
    noDataTableCell: { padding: 32, alignItems: 'center' },

    // 7. Empty list & Loader components
    middleLoaderBox: { paddingVertical: 60, alignItems: 'center' },
    loaderHelpText: { color: '#64748B', marginTop: 12, fontSize: 13 },
    emptySheetBlock: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 30 },
    emptySheetStrongText: { fontSize: 16, fontWeight: '800', color: '#334155', marginTop: 16 },
    emptySheetMutedText: { fontSize: 12, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18 },
    emptyTextInfo: { fontStyle: 'italic', color: '#94A3B8' },

    // 8. Bottom Sticky Sticky Dock for Bulk Approval
    bulkStickyFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1E293B',
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1
    },
    bulkSummarySide: { flex: 1 },
    bulkCountStr: { fontSize: 14, fontWeight: '800', color: '#FFF' },
    bulkPromptStr: { fontSize: 10, color: '#94A3B8', marginTop: 2 },
    bulkCommitButton: {
        backgroundColor: '#10B981',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 6
    },
    bulkCommitButtonLabel: { color: '#FFF', fontWeight: '800', fontSize: 13 },

    // 9. Pagination blocks
    paginationRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, gap: 12 },
    pagerTriggerIcon: { padding: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6 },
    pagerTriggerDisabled: { opacity: 0.4 },
    pagerBreadcrumb: { fontSize: 11, fontWeight: '700', color: '#475569' },

    // 10. Bottom modal drawer overlays
    bottomDrawerModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    bottomDrawerSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, height: '70%', paddingBottom: 16 },
    drawerHeaderLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    drawerHeadline: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    drawerActionToolbar: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10 },
    toolbarClearBtn: { flex: 1, height: 44, borderRadius: 6, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
    toolbarClearBtnText: { color: '#64748B', fontWeight: '700', fontSize: 13 },
    toolbarApplyBtn: { flex: 1, height: 44, borderRadius: 6, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
    toolbarApplyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

    // 11. Form & text widgets
    inputBoxGroup: { marginVertical: 8 },
    inputHeadText: { fontSize: 12, fontWeight: '800', color: '#475569', marginBottom: 6 },
    selectPickerTrigger: {
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
    selectValueStr: { fontSize: 13, color: '#1E293B', fontWeight: '600' },
    standardTextInputField: {
        height: 42,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRadius: 6,
        paddingHorizontal: 12,
        fontSize: 13,
        color: '#1E293B',
        backgroundColor: '#FAFAFA'
    },
    sideBySideFlex: { flexDirection: 'row' },
    inlineCurrencyBlock: { flexDirection: 'row', alignItems: 'center' },
    blockCurrencySymbol: {
        height: 42,
        paddingHorizontal: 14,
        backgroundColor: '#EEF2FF',
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderRightWidth: 0,
        borderTopLeftRadius: 6,
        borderBottomLeftRadius: 6,
        textAlignVertical: 'center',
        fontSize: 14,
        fontWeight: '800',
        color: '#6366F1'
    },

    // 12. Attachment and quick toggle items
    previewImageShell: { width: 90, height: 90, borderRadius: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#CBD5E1' },
    previewImageTag: { width: '100%', height: '100%', resizeMode: 'cover' },
    imageDelBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: '#FFF', borderRadius: 10 },
    attachFileDashedBox: {
        height: 80,
        width: 110,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#6366F1',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EEF2FF'
    },
    attachHintText: { fontSize: 10, color: '#6366F1', fontWeight: 'bold', marginTop: 4 },
    instantApproveOption: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 8 },
    instantApproveLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },

    // 13. Custom generic select popover items
    popBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    popOptionBox: { backgroundColor: '#FFF', width: '85%', borderRadius: 8, paddingBottom: 12, overflow: 'hidden' },
    popOptionHeadline: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', backgroundColor: '#F8FAFC' },
    popOptionTitle: { fontSize: 13, fontWeight: '800', color: '#1E293B' },
    popItemRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    popItemRowText: { fontSize: 13, color: '#334155', fontWeight: '600' }
});

export default PettyCashApprovalsScreen;
