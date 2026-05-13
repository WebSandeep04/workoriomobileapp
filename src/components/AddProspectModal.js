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
import { createProspect, clearProspectMessages } from '../store/slices/prospectSlice';
import { fetchCities, resetCityOptions } from '../store/slices/leadSlice';
import Ionicons from 'react-native-vector-icons/Ionicons';

const AddProspectModal = ({ visible, onClose }) => {
    const dispatch = useDispatch();
    const { actionLoading, successMessage } = useSelector((state) => state.prospect);
    const { filterOptions, cityOptions } = useSelector((state) => state.lead);

    const [formData, setFormData] = useState({
        prospectus_name: '',
        contact_person: '',
        contact_number: '',
        email: '',
        address: '',
        state_id: null,
        city_id: null,
        business_type_id: null,
    });

    const [activeDropdown, setActiveDropdown] = useState(null);

    useEffect(() => {
        if (successMessage) {
            resetForm();
            dispatch(clearProspectMessages());
            onClose();
        }
    }, [successMessage, onClose, dispatch]);

    const resetForm = () => {
        setFormData({
            prospectus_name: '',
            contact_person: '',
            contact_number: '',
            email: '',
            address: '',
            state_id: null,
            city_id: null,
            business_type_id: null,
        });
        dispatch(resetCityOptions());
        setActiveDropdown(null);
    };

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleStateChange = (id) => {
        setFormData(prev => ({ ...prev, state_id: id, city_id: null }));
        dispatch(fetchCities(id));
        setActiveDropdown(null);
    };

    const handleSubmit = () => {
        if (!formData.prospectus_name || !formData.contact_person || !formData.contact_number) {
            Alert.alert("Validation Error", "Please fill required fields.");
            return;
        }

        dispatch(createProspect(formData));
    };

    const toggleDropdown = (name) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    const renderInlineDropdown = (label, valueKey, options, labelKey = 'name', onSelect, placeholder = 'Select') => {
        const selectedOption = options && Array.isArray(options) ? options.find(opt => String(opt.id) === String(formData[valueKey])) : null;
        const displayText = selectedOption
            ? (selectedOption[labelKey] || selectedOption.name || selectedOption.state_name || selectedOption.city_name || selectedOption.business_name || "Selected")
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
                            const optLabel = opt[labelKey] || opt.name || opt.state_name || opt.city_name || opt.business_name || "Unknown";
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
                    <View style={[styles.ovlSheet, { height: '85%', maxHeight: '85%' }]}>
                        <View style={[styles.popupHeader, { backgroundColor: '#6366F1', margin: 0, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 }]}>
                            <Text style={[styles.popupTitle, { color: '#FFF' }]}>Record New Entity</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ flex: 1, padding: 16 }} keyboardShouldPersistTaps="handled">

                            <View style={styles.inputGroupBlock}>
                                <Text style={styles.formLabel}>Company/Prospect Name <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="e.g. Acme Corp"
                                    value={formData.prospectus_name}
                                    onChangeText={(text) => handleChange('prospectus_name', text)}
                                />
                            </View>

                            <View style={styles.rowInputsGrid}>
                                <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>Contact Person <Text style={{ color: '#EF4444' }}>*</Text></Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="John Doe"
                                        value={formData.contact_person}
                                        onChangeText={(text) => handleChange('contact_person', text)}
                                    />
                                </View>
                                <View style={[styles.inputGroupBlock, { flex: 1 }]}>
                                    <Text style={styles.formLabel}>Contact Number <Text style={{ color: '#EF4444' }}>*</Text></Text>
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

                            <View style={{ zIndex: 8, marginBottom: 32 }}>
                                {renderInlineDropdown('B2B Business Scale', 'business_type_id', filterOptions.business_types || [], 'business_name')}
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
                                    <Text style={styles.sheetBtnApplyTxt}>Commit Prospect</Text>
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

export default AddProspectModal;
