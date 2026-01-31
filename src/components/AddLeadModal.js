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
    Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { addLead, fetchCities, resetCityOptions, clearLeadMessages } from '../store/slices/leadSlice';
import { fetchProspects } from '../store/slices/prospectSlice';
import Ionicons from 'react-native-vector-icons/Ionicons';

const AddLeadModal = ({ visible, onClose }) => {
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
            leads_name: prospect.prospectus_name,
            contact_person: prospect.contact_person,
            contact_number: prospect.contact_number,
            email: prospect.email,
            address: prospect.address,
            state_id: prospect.state_id,
            city_id: prospect.city_id,
            business_type_id: prospect.business_type_id,
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

    const renderDropdown = (label, valueKey, options, labelKey = 'name', onSelect, placeholder = 'Select') => {
        const selectedOption = options.find(opt => opt.id === formData[valueKey]);
        const displayText = selectedOption
            ? (selectedOption[labelKey] || selectedOption.name || selectedOption.state_name || selectedOption.city_name || selectedOption.business_name || selectedOption.business_type_name || selectedOption.status_name || selectedOption.source_name || selectedOption.product_name || "Selected")
            : placeholder;
        const isOpen = activeDropdown === valueKey;

        return (
            <View>
                <Text style={styles.label}>{label}</Text>
                <TouchableOpacity
                    style={styles.input}
                    onPress={() => toggleDropdown(valueKey)}
                >
                    <Text style={{ color: formData[valueKey] ? '#000' : '#999' }}>
                        {displayText}
                    </Text>
                    <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#999" />
                </TouchableOpacity>

                {isOpen && (
                    <ScrollView
                        style={styles.dropdownList}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                    >
                        {options.length > 0 ? options.map(opt => {
                            const label = opt[labelKey] || opt.name || opt.state_name || opt.city_name || opt.business_name || opt.status_name || opt.business_type_name || opt.source_name || opt.product_name || opt.type_name || opt.title || "Unknown";
                            return (
                                <TouchableOpacity
                                    key={opt.id}
                                    style={styles.dropdownItem}
                                    onPress={() => {
                                        onSelect ? onSelect(opt.id) : handleChange(valueKey, opt.id);
                                        if (!onSelect) setActiveDropdown(null);
                                    }}
                                >
                                    <Text style={styles.dropdownItemText}>{label}</Text>
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
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Add New Lead</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">

                        {/* Prospect Search */}
                        <Text style={styles.label}>Select Prospect *</Text>
                        <View style={{ zIndex: 1000 }}>
                            <TextInput
                                style={styles.input}
                                placeholder="Search Company Name..."
                                value={prospectSearch}
                                onChangeText={handleProspectSearch}
                            />

                            {showProspectDropdown && (
                                <View style={styles.searchDropdown}>
                                    {prospectLoading ? (
                                        <ActivityIndicator size="small" color="#434AFA" style={{ padding: 10 }} />
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

                        {renderDropdown('Status *', 'status_id', filterOptions.statuses || [], 'status_name')}

                        <Text style={styles.label}>Lead Name</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Acme Corp"
                            value={formData.leads_name}
                            onChangeText={(text) => handleChange('leads_name', text)}
                        />

                        <Text style={styles.label}>Contact Person</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="John Doe"
                            value={formData.contact_person}
                            onChangeText={(text) => handleChange('contact_person', text)}
                        />

                        <Text style={styles.label}>Contact Number</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="1234567890"
                            keyboardType="phone-pad"
                            value={formData.contact_number}
                            onChangeText={(text) => handleChange('contact_number', text)}
                        />

                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="john@example.com"
                            keyboardType="email-address"
                            value={formData.email}
                            onChangeText={(text) => handleChange('email', text)}
                        />

                        <Text style={styles.label}>Address</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="123 Main St"
                            value={formData.address}
                            onChangeText={(text) => handleChange('address', text)}
                        />

                        {renderDropdown('State', 'state_id', filterOptions.states || [], 'name', handleStateChange)}

                        {renderDropdown('City', 'city_id', cityOptions || [], 'name', null, formData.state_id ? 'Select City' : 'Select State First')}

                        {renderDropdown('Business Type', 'business_type_id', filterOptions.business_types || [], 'business_name')}

                        {renderDropdown('Lead Source', 'lead_source_id', filterOptions.lead_sources || [], 'source_name')}

                        {renderDropdown('Interested Product', 'products_id', filterOptions.products || [], 'product_name')}

                        <Text style={styles.label}>Next Follow Up (YYYY-MM-DD) *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="2026-01-31" // Updated generic year
                            value={formData.next_follow_up_date}
                            onChangeText={(text) => handleChange('next_follow_up_date', text)}
                        />

                        <Text style={styles.label}>Remark *</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Enter initial remarks..."
                            multiline
                            numberOfLines={3}
                            value={formData.remark}
                            onChangeText={(text) => handleChange('remark', text)}
                        />

                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={actionLoading}>
                            {actionLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Create Lead</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '95%',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    formContent: {
        padding: 20,
        paddingBottom: 40,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
        marginTop: 12,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        color: '#333',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    textArea: {
        height: 80,
        textAlignVertical: 'top',
    },
    dropdownList: {
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        backgroundColor: '#fff',
        maxHeight: 200,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        zIndex: 1000,
    },
    dropdownItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownItemText: {
        fontSize: 16,
        color: '#333',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    searchDropdown: {
        position: 'absolute',
        top: 55, // Height of input + margin
        left: 0,
        right: 0,
        borderWidth: 1,
        borderColor: '#434AFA',
        borderRadius: 8,
        backgroundColor: '#fff',
        maxHeight: 200,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        zIndex: 2000,
    },
    searchItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    searchItemText: {
        fontWeight: 'bold',
        color: '#333',
    },
    searchItemSubResponse: {
        fontSize: 12,
        color: '#666',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        backgroundColor: '#fff',
    },
    submitButton: {
        backgroundColor: '#434AFA',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default AddLeadModal;
