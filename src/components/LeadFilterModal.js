import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TextInput
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const LeadFilterModal = ({ visible, onClose, filterOptions, onApply, onReset, currentFilters }) => {
    const [filters, setFilters] = useState(currentFilters || {});

    const handleChange = (name, value) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleApply = () => {
        onApply(filters);
        onClose();
    };

    const handleReset = () => {
        const resetFilters = {}; // Define your default empty filter state if needed
        setFilters(resetFilters);
        onReset();
        onClose();
    };

    const renderDropdownSection = (title, key, options, labelKey = 'name') => {
        if (!options || options.length === 0) return null;

        return (
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <View style={styles.tagContainer}>
                    {options.map(opt => {
                        const isSelected = filters[key] === opt.id;
                        return (
                            <TouchableOpacity
                                key={opt.id}
                                style={[styles.tag, isSelected && styles.activeTag]}
                                onPress={() => handleChange(key, isSelected ? null : opt.id)}
                            >
                                <Text style={[styles.tagText, isSelected && styles.activeTagText]}>
                                    {opt[labelKey] || opt.name || opt.status_name || opt.source_name || opt.business_name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Filter Leads</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body}>
                        {renderDropdownSection('Status', 'status_id', filterOptions.statuses, 'status_name')}
                        {renderDropdownSection('Lead Source', 'source_id', filterOptions.lead_sources, 'source_name')}
                        {renderDropdownSection('Business Type', 'business_type_id', filterOptions.business_types, 'business_name')}

                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Date Range</Text>
                            <View style={styles.row}>
                                <View style={styles.dateInputContainer}>
                                    <Text style={styles.label}>From</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="YYYY-MM-DD"
                                        value={filters.start_date}
                                        onChangeText={(text) => handleChange('start_date', text)}
                                    />
                                </View>
                                <View style={styles.dateInputContainer}>
                                    <Text style={styles.label}>To</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="YYYY-MM-DD"
                                        value={filters.end_date}
                                        onChangeText={(text) => handleChange('end_date', text)}
                                    />
                                </View>
                            </View>
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
                            <Text style={styles.resetButtonText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
                            <Text style={styles.applyButtonText}>Apply Filters</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '80%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    body: {
        padding: 20,
    },
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 10,
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    tag: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#f0f0f0',
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    activeTag: {
        backgroundColor: '#EEF2FF',
        borderColor: '#434AFA',
    },
    tagText: {
        fontSize: 14,
        color: '#666',
    },
    activeTagText: {
        color: '#434AFA',
        fontWeight: '600',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    dateInputContainer: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: '#333',
    },
    footer: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        gap: 10,
    },
    resetButton: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    resetButtonText: {
        color: '#666',
        fontWeight: '600',
    },
    applyButton: {
        flex: 1,
        padding: 15,
        borderRadius: 12,
        backgroundColor: '#434AFA',
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
});

export default LeadFilterModal;
