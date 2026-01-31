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
import { createProspect, clearProspectMessages } from '../store/slices/prospectSlice';
import { fetchFilterOptions, fetchCities, resetCityOptions } from '../store/slices/leadSlice'; // Reuse lead slice options
import Ionicons from 'react-native-vector-icons/Ionicons';

const AddProspectModal = ({ visible, onClose }) => {
    const dispatch = useDispatch();
    const { actionLoading, successMessage, error } = useSelector((state) => state.prospect);
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
        if (visible) {
            dispatch(fetchFilterOptions());
        }
    }, [visible, dispatch]);

    useEffect(() => {
        if (successMessage) {
            Alert.alert("Success", "Prospect Added Successfully");
            dispatch(clearProspectMessages());
            resetForm();
            onClose();
        }
        if (error) {
            Alert.alert("Error", typeof error === 'string' ? error : "Failed to add prospect");
            dispatch(clearProspectMessages());
        }
    }, [successMessage, error, dispatch, onClose]);

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
            Alert.alert("Required", "Please fill Name, Contact Person and Number.");
            return;
        }
        dispatch(createProspect(formData));
    };

    const toggleDropdown = (name) => {
        setActiveDropdown(activeDropdown === name ? null : name);
    };

    const renderDropdown = (label, valueKey, options, labelKey = 'name', onSelect, placeholder = 'Select') => {
        const selectedOption = options.find(opt => opt.id === formData[valueKey]);
        const displayText = selectedOption
            ? (selectedOption[labelKey] || selectedOption.name || selectedOption.state_name || selectedOption.city_name || selectedOption.business_name || selectedOption.status_name || "Selected")
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
                            const label = opt[labelKey] || opt.name || opt.state_name || opt.city_name || opt.business_name || opt.status_name || opt.type_name || opt.title || "Unknown";
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
                        <Text style={styles.headerTitle}>Add New Prospect</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">

                        <Text style={styles.label}>Company/Prospect Name *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. Acme Corp"
                            value={formData.prospectus_name}
                            onChangeText={(text) => handleChange('prospectus_name', text)}
                        />

                        <Text style={styles.label}>Contact Person *</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="John Doe"
                            value={formData.contact_person}
                            onChangeText={(text) => handleChange('contact_person', text)}
                        />

                        <Text style={styles.label}>Contact Number *</Text>
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

                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={actionLoading}>
                            {actionLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>Create Prospect</Text>
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
        height: '90%',
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
    dropdownList: {
        marginTop: 5,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        backgroundColor: '#fff',
        maxHeight: 200,
        elevation: 5,
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

export default AddProspectModal;
