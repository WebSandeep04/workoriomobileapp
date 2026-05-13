import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addLead, fetchCities, resetCityOptions, clearLeadMessages } from '../store/slices/leadSlice';
import { fetchProspects } from '../store/slices/prospectSlice';
import Ionicons from 'react-native-vector-icons/Ionicons';

const AddLeadModal = ({ visible, onClose, onAddProspect }) => {
    const dispatch = useDispatch();
    const { filterOptions, cityOptions, actionLoading, successMessage } = useSelector((state) => state.lead);
    const { prospects, loading: prospectLoading } = useSelector((state) => state.prospect);

    // Form State
    const [formData, setFormData] = useState({
        leads_name: '',
        contact_person: '',
        contact_number: '',
        email: '',
        status_id: null,
        next_follow_up_date: '', // YYYY-MM-DD
        remark: '',
        prospectus_id: null, // Should be null initially
        address: '',
        state_id: null,
        city_id: null,
        business_type_id: null,
        lead_source_id: null,
        products_id: null,
    });

    // Prospect Search State
    const [prospectSearch, setProspectSearch] = useState('');
    const [showProspectDropdown, setShowProspectDropdown] = useState(false);

    // Dropdown visibility states
    const [activeDropdown, setActiveDropdown] = useState(null); // 'status', 'state', 'city', etc.

    useEffect(() => {
        if (successMessage) {
            resetForm();
            dispatch(clearLeadMessages()); // Clear message to prevent loop
            onClose();
        }
    }, [successMessage, onClose, dispatch]);

    const resetForm = () => {
        setFormData({
            leads_name: '',
            contact_person: '',
            contact_number: '',
            email: '',
            status_id: null,
            next_follow_up_date: '',
            remark: '',
            prospectus_id: null,
            address: '',
            state_id: null,
            city_id: null,
            business_type_id: null,
            lead_source_id: null,
            products_id: null,
        });
        setProspectSearch('');
        dispatch(resetCityOptions());
        setActiveDropdown(null);
    };

    // Fetch cities when state changes
    const handleStateChange = (id) => {
        setFormData(prev => ({ ...prev, state_id: id, city_id: null }));
        dispatch(fetchCities(id));
        setActiveDropdown(null);
    };

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleProspectSearch = (text) => {
        setProspectSearch(text);
        if (text.length > 2) {
            dispatch(fetchProspects({ search: text }));
            setShowProspectDropdown(true);
        } else {
            setShowProspectDropdown(false);
        }
    };

    const handleSelectProspect = (prospect) => {
        setProspectSearch(prospect.prospectus_name); // Show name in search box
        setShowProspectDropdown(false);

        // Auto-fill form
        setFormData(prev => ({
            ...prev,
            prospectus_id: prospect.id,
            leads_name: prospect.prospectus_name || '',
            contact_person: prospect.contact_person || '',
            contact_number: prospect.contact_number || '',
            email: prospect.email || '',
            address: prospect.address || '',
            state_id: prospect.state_id || null,
            city_id: prospect.city_id || null,
            business_type_id: prospect.business_type_id || null,
        }));

        // Fetch cities for the selected state if existing
        if (prospect.state_id) {
            dispatch(fetchCities(prospect.state_id));
        }
    };

    const handleSubmit = () => {
        if (!formData.status_id || !formData.next_follow_up_date || !formData.remark) {
            Alert.alert("Required Fields", "Please fill Status, Next Follow-up, and Remark.");
            return;
        }

        if (!formData.prospectus_id) {
            Alert.alert("Required", "Please select a valid Prospect from the search.");
            return;
        }

        dispatch(addLead(formData));
    };

    const toggleDropdown = (name) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    const renderInlineDropdown = (label, valueKey, options, labelKey = 'name', onSelect, placeholder = 'Select') => {
        const selectedOption = options && Array.isArray(options) ? options.find(opt => String(opt.id) === String(formData[valueKey])) : null;
        const displayText = selectedOption
            ? (selectedOption[labelKey] || selectedOption.name || selectedOption.status_name || selectedOption.state_name || selectedOption.city_name || selectedOption.business_name || selectedOption.source_name || selectedOption.product_name || "Selected")
            : placeholder;
        const isOpen = activeDropdown === valueKey;

        return (
            <View style={{ marginBottom: 12, zIndex: isOpen ? 1000 : 1 }}>
                <Text style={styles.formLabel}>{label}</Text>
                <TouchableOpacity
                    style={[styles.formInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                    onPress={() => toggleDropdown(valueKey)}
                >
                    <Text style={{ color: formData[valueKey] ? '#000' : '#999' }}>{displayText}</Text>
                    <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#999" />
                </TouchableOpacity>

                {isOpen && (
                    <ScrollView
                        style={styles.dropdownList}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                    >
                        {options && options.length > 0 ? options.map(opt => {
                            const optLabel = opt[labelKey] || opt.name || opt.status_name || opt.state_name || opt.city_name || opt.business_name || opt.source_name || opt.product_name || "Unknown";
                            return (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                        onSelect ? onSelect(opt.id) : handleChange(valueKey, opt.id);
                                        if (!onSelect) setActiveDropdown(null);
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

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.ovlWrapper}>
                    <View style={[styles.ovlSheet, { height: '90%', maxHeight: '90%' }]}>
                        <View style={[styles.popupHeader, { backgroundColor: '#6366F1', margin: 0, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }]}>
                            <Text style={[styles.popupTitle, { color: '#FFF' }]}>Add New Lead</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled">

                            {/* Prospect Search */}
                            <View style={[styles.inputGroupBlock, { zIndex: 2000 }]}>
                                <Text style={styles.formLabel}>Select Prospect <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ flex: 1 }}>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Search Company Name..."
                                            value={prospectSearch}
                                            onChangeText={handleProspectSearch}
                                        />

                                        {showProspectDropdown && (
                                            <View style={styles.searchDropdown}>
                                                {prospectLoading ? (
                                                    <ActivityIndicator size="small" color="#6366F1" style={{ padding: 10 }} />
                                                ) : (
                                                    <ScrollView nestedScrollEnabled={true} keyboardShouldPersistTaps="handled" style={{ maxHeight: 200 }}>
                                                        {prospects.length > 0 ? (
                                                            prospects.map((item) => (
                                                                <TouchableOpacity
                                                                    key={item.id}
                                                                    style={styles.searchItem}
                                                                    onPress={() => handleSelectProspect(item)}
                                                                >
                                                                    <Text style={styles.searchItemText}>{item.prospectus_name}</Text>
                                                                    <Text style={styles.searchItemSubResponse}>{item.contact_person}</Text>
                                                                </TouchableOpacity>
                                                            ))
                                                        ) : (
                                                            <Text style={{ padding: 10, color: '#999' }}>No prospects found</Text>
                                                        )}
                                                    </ScrollView>
                                                )}
                                            </View>
                                        )}
                                    </View>

                                    <TouchableOpacity
                                        style={styles.quickAddProspectBtn}
                                        onPress={() => {
                                            if (onAddProspect) onAddProspect();
                                        }}
                                    >
                                        <Ionicons name="add-circle-outline" size={22} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.inputGroupBlock}>
                                <Text style={styles.formLabel}>Lead Name (Auto-populated)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="e.g. Acme Corp"
                                    value={formData.leads_name}
                                    onChangeText={(text) => handleChange('leads_name', text)}
                                />
                            </View>

                            <View style={styles.rowInputsGrid}>
                                <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>Contact Person</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="Contact Name"
                                        value={formData.contact_person}
                                        onChangeText={(text) => handleChange('contact_person', text)}
                                    />
                                </View>
                                <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>Contact Number</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="Phone number"
                                        keyboardType="phone-pad"
                                        value={formData.contact_number}
                                        onChangeText={(text) => handleChange('contact_number', text)}
                                    />
                                </View>
                            </View>

                            <View style={styles.rowInputsGrid}>
                                <View style={{ flex: 1, zIndex: 11 }}>
                                    {renderInlineDropdown('Status *', 'status_id', filterOptions.statuses || [], 'status_name')}
                                </View>
                                <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>Follow-up Date <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="YYYY-MM-DD"
                                        value={formData.next_follow_up_date}
                                        onChangeText={(text) => handleChange('next_follow_up_date', text)}
                                    />
                                </View>
                            </View>

                            <View style={styles.inputGroupBlock}>
                                <Text style={styles.formLabel}>Full Street Address</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Physical Location"
                                    value={formData.address}
                                    onChangeText={(text) => handleChange('address', text)}
                                />
                            </View>

                            <View style={styles.rowInputsGrid}>
                                <View style={{ flex: 1, zIndex: 10 }}>
                                    {renderInlineDropdown('State', 'state_id', filterOptions.states || [], 'name', handleStateChange)}
                                </View>
                                <View style={{ flex: 1, zIndex: 9 }}>
                                    {renderInlineDropdown('City', 'city_id', cityOptions || [], 'name', null, formData.state_id ? 'Select City' : 'Select State First')}
                                </View>
                            </View>

                            <View style={styles.rowInputsGrid}>
                                <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>Email ID</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="client@company.com"
                                        keyboardType="email-address"
                                        value={formData.email}
                                        onChangeText={(text) => handleChange('email', text)}
                                    />
                                </View>
                                <View style={{ flex: 1, zIndex: 8 }}>
                                    {renderInlineDropdown('Business Type', 'business_type_id', filterOptions.business_types || [], 'business_name')}
                                </View>
                            </View>

                            <View style={styles.rowInputsGrid}>
                                <View style={{ flex: 1, zIndex: 7 }}>
                                    {renderInlineDropdown('Lead Source', 'lead_source_id', filterOptions.lead_sources || [], 'source_name')}
                                </View>
                                <View style={{ flex: 1, zIndex: 6 }}>
                                    {renderInlineDropdown('Interested Product', 'products_id', filterOptions.products || [], 'product_name')}
                                </View>
                            </View>

                            <View style={[styles.inputGroupBlock, { marginBottom: 32 }]}>
                                <Text style={styles.formLabel}>Initialization Remarks <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <TextInput
                                    style={[styles.formInput, { height: 60, textAlignVertical: 'top' }]}
                                    placeholder="Enter initial remarks..."
                                    multiline={true}
                                    numberOfLines={3}
                                    value={formData.remark}
                                    onChangeText={(text) => handleChange('remark', text)}
                                />
                            </View>

                        </ScrollView>

                        <View style={styles.ovlFooter}>
                            <TouchableOpacity 
                                style={[styles.sheetBtn, styles.sheetBtnApply, actionLoading && { opacity: 0.7 }]} 
                                onPress={handleSubmit} 
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.sheetBtnApplyTxt}>Commit Lead</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    ovlWrapper: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
    ovlSheet: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    popupHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', alignItems: 'center' },
    popupTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },
    
    inputGroupBlock: { marginBottom: 12 },
    rowInputsGrid: { flexDirection: 'row', gap: 10 },
    formLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 5 },
    formInput: { height: 38, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 6, paddingHorizontal: 10, color: '#1E293B', backgroundColor: '#FAFAFA', fontSize: 13 },
    quickAddProspectBtn: { width: 38, height: 38, backgroundColor: '#0F172A', borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },

    searchDropdown: {
        position: 'absolute',
        top: 45, 
        left: 0,
        right: 0,
        borderWidth: 1,
        borderColor: '#6366F1',
        borderRadius: 8,
        backgroundColor: '#fff',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 2000,
    },
    searchItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
    searchItemText: { fontWeight: 'bold', color: '#333' },
    searchItemSubResponse: { fontSize: 12, color: '#666' },

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
    dropdownItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    dropdownItemText: { fontSize: 13, color: '#1E293B' },

    ovlFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 10, backgroundColor: '#FFF' },
    sheetBtn: { flex: 1, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    sheetBtnApply: { backgroundColor: '#6366F1' },
    sheetBtnApplyTxt: { color: '#FFF', fontWeight: '700', fontSize: 12.5 },
});

export default AddLeadModal;
