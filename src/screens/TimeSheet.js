import React, { useEffect, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Modal,
    FlatList,
    Alert,
    Platform,

    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Toast from 'react-native-toast-message';

import Header from '../components/Header';
import { styles, COLORS } from '../css/TimeSheetStyles';
import {
    fetchFormData,
    fetchProjects,
    fetchServices,
    fetchModules,
    validateDate,
    submitWorklog,
    fetchHistory,
    deleteEntry,
    clearProjects,
    clearServices,
    clearModules
} from '../store/slices/worklogSlice';



const CustomPicker = ({ label, value, options, onSelect, placeholder = "Select...", disabled = false }) => {
    const [modalVisible, setModalVisible] = useState(false);

    const selectedOption = options.find(opt => opt.id === value || opt.name === value);
    const displayText = selectedOption ? selectedOption.name : value || placeholder;

    return (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={[styles.pickerButton, disabled && styles.disabledInput]}
                onPress={() => !disabled && setModalVisible(true)}
                disabled={disabled}
            >
                <Text style={[styles.pickerText, !selectedOption && styles.placeholderText]}>
                    {displayText}
                </Text>
                <Ionicons name="chevron-down" size={20} color={COLORS.textLight} />
            </TouchableOpacity>

            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select {label}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={options}
                            keyExtractor={(item) => item.id?.toString() || item.name}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.optionItem}
                                    onPress={() => {
                                        onSelect(item);
                                        setModalVisible(false);
                                    }}
                                >
                                    <Text style={[
                                        styles.optionText,
                                        (value === item.id || value === item.name) && styles.selectedOptionText
                                    ]}>
                                        {item.name}
                                    </Text>
                                    {(value === item.id || value === item.name) && (
                                        <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                                    )}
                                </TouchableOpacity>
                            )}
                        />
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const TimeSheet = () => {
    const dispatch = useDispatch();
    const {
        entryTypes,
        customers,
        projects,
        services,
        modules,
        dateValidation,
        history,
        loading
    } = useSelector((state) => state.worklog);

    const [activeTab, setActiveTab] = useState('entry'); // 'entry' | 'history'

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [pendingEntries, setPendingEntries] = useState([]);
    const [refreshing, setRefreshing] = useState(false);

    // Current Entry State
    const [entryType, setEntryType] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [project, setProject] = useState(null);
    const [service, setService] = useState(null);
    const [module, setModule] = useState(null);
    const [hours, setHours] = useState('');
    const [minutes, setMinutes] = useState('');
    const [description, setDescription] = useState('');

    // Load initial data
    useEffect(() => {
        dispatch(fetchFormData());
    }, [dispatch]);

    // Validate Date when changed
    useEffect(() => {
        if (date) {
            dispatch(validateDate(date));
        }
    }, [dispatch, date]);

    // Fetch History when tab changes
    useEffect(() => {
        if (activeTab === 'history') {
            dispatch(fetchHistory({ page: 1 }));
        }
    }, [dispatch, activeTab]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        if (activeTab === 'entry') {
            dispatch(fetchFormData())
                .finally(() => setRefreshing(false));
            // Re-validate date if needed
            if (date) {
                dispatch(validateDate(date));
            }
        } else {
            dispatch(fetchHistory({ page: 1 }))
                .finally(() => setRefreshing(false));
        }
    }, [dispatch, activeTab, date]);

    const handleCustomerSelect = (item) => {
        setCustomer(item);
        setProject(null);
        setService(null);
        setModule(null);
        dispatch(clearProjects());
        dispatch(clearServices());
        dispatch(clearModules());

        dispatch(fetchProjects(item.id));
        // Also fetch services immediately without project name roughly? 
        // Guide says: Get Services (By Customer & Optional Project). 
        // Logic: Select Customer -> Fetch Projects/Services. 
        // I'll fetch services without project first.
        dispatch(fetchServices({ customerId: item.id }));
    };

    const handleProjectSelect = (item) => {
        setProject(item);
        setService(null);
        setModule(null);
        // Re-fetch services with project name
        if (customer) {
            dispatch(fetchServices({ customerId: customer.id, projectName: item.name }));
        }
    };

    const handleServiceSelect = (item) => {
        setService(item);
        setModule(null);
        dispatch(fetchModules(item.id));
    };

    const handleAddEntry = () => {
        // Validation
        if (!dateValidation.isValid) {
            Alert.alert("Invalid Date", dateValidation.message);
            return;
        }
        if (!entryType || !customer || !service || !module || !hours || !description) {
            Alert.alert("Missing Fields", "Please fill in all required fields.");
            return;
        }

        const newEntry = {
            id: Date.now(), // temporary ID
            entry_type_id: entryType.id,
            entryTypeName: entryType.name,
            customer_id: customer.id,
            customerName: customer.name,
            project_name: project ? project.name : null,
            service_id: service.id,
            serviceName: service.name,
            module_id: module.id,
            moduleName: module.name,
            hours: parseInt(hours) || 0,
            minutes: parseInt(minutes) || 0,
            description
        };

        setPendingEntries([...pendingEntries, newEntry]);

        // Reset fields but keep Date and Entry Type as they might be same for whole day
        setService(null);
        setModule(null);
        setHours('');
        setMinutes('');
        setDescription('');
        // Optional: Keep Customer/Project? For now reset specific task details.
    };

    const handleRemoveEntry = (id) => {
        setPendingEntries(pendingEntries.filter(e => e.id !== id));
    };

    const handleSubmitAll = () => {
        if (pendingEntries.length === 0) {
            Alert.alert("No Entries", "Please add at least one worklog entry.");
            return;
        }

        // Validate total time against entry type working hours
        if (entryType) {
            const totalMinutes = pendingEntries.reduce((acc, curr) => acc + (curr.hours * 60) + curr.minutes, 0);
            const requiredMinutes = entryType.working_hours * 60;

            // This validation is enforced by API, but good to check locally too if we want strictness.
            // API returns error if mismatch.
        }

        const payload = {
            work_date: date,
            entries: pendingEntries.map(({ id, entryTypeName, customerName, serviceName, moduleName, ...rest }) => rest)
        };

        dispatch(submitWorklog(payload)).unwrap().then(() => {
            setPendingEntries([]);
            setHours('');
            setMinutes('');
            setDescription('');
            // Maybe switch to history tab?
            setActiveTab('history');
        });
    };

    const loadMoreHistory = () => {
        if (history.current_page * 20 < history.total) { // assuming per_page is 20
            dispatch(fetchHistory({ page: history.current_page + 1 }));
        }
    };

    const renderEntryForm = () => (
        <ScrollView
            style={styles.formContainer}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
        >
            {/* Date Selection */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>General Info</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                    <TextInput
                        style={[styles.input, !dateValidation.isValid && styles.inputError]}
                        value={date}
                        onChangeText={setDate}
                        placeholder="2023-10-27"
                    />
                    {!dateValidation.isValid && (
                        <Text style={styles.errorText}>{dateValidation.message}</Text>
                    )}
                </View>

                <CustomPicker
                    label="Entry Type"
                    value={entryType?.id}
                    options={entryTypes}
                    onSelect={setEntryType}
                    placeholder="Select Type"
                />
            </View>

            {/* Task Details */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Task Details</Text>

                <CustomPicker
                    label="Customer"
                    value={customer?.id}
                    options={customers}
                    onSelect={handleCustomerSelect}
                />

                <CustomPicker
                    label="Project (Optional)"
                    value={project?.name}
                    options={projects}
                    onSelect={handleProjectSelect}
                    placeholder="Select Project"
                    disabled={!customer}
                />

                <CustomPicker
                    label="Service"
                    value={service?.id}
                    options={services}
                    onSelect={handleServiceSelect}
                    disabled={!customer}
                />

                <CustomPicker
                    label="Module"
                    value={module?.id}
                    options={modules}
                    onSelect={setModule}
                    disabled={!service}
                />

                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>Hours</Text>
                        <TextInput
                            style={styles.input}
                            value={hours}
                            onChangeText={setHours}
                            keyboardType="numeric"
                            placeholder="0"
                        />
                    </View>
                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>Minutes</Text>
                        <TextInput
                            style={styles.input}
                            value={minutes}
                            onChangeText={setMinutes}
                            keyboardType="numeric"
                            placeholder="0"
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                        placeholder="What did you work on?"
                    />
                </View>

                <TouchableOpacity
                    style={[styles.addButton, (!dateValidation.isValid) && styles.disabledButton]}
                    onPress={handleAddEntry}
                    disabled={!dateValidation.isValid}
                >
                    <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.addButtonText}>Add Validated Entry</Text>
                </TouchableOpacity>
            </View>

            {/* Pending Entries List */}
            {pendingEntries.length > 0 && (
                <View style={styles.pendingSection}>
                    <Text style={styles.sectionTitle}>Pending Entries ({pendingEntries.length})</Text>
                    {pendingEntries.map((entry, index) => (
                        <View key={entry.id} style={styles.pendingCard}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.pendingTitle}>{entry.moduleName || 'Module'} - {entry.serviceName}</Text>
                                <Text style={styles.pendingSubtitle}>{entry.hours}h {entry.minutes}m • {entry.description}</Text>
                            </View>
                            <TouchableOpacity onPress={() => handleRemoveEntry(entry.id)}>
                                <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
                            </TouchableOpacity>
                        </View>
                    ))}

                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmitAll}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>Submit Timesheet</Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
        </ScrollView>
    );

    const renderHistory = () => (
        <FlatList
            data={history.data}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={{ padding: 16 }}
            renderItem={({ item }) => (
                <View style={styles.historyCard}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.historyDate}>{item.work_date?.split('T')[0]}</Text>
                        <View style={[styles.statusBadge, {
                            backgroundColor: item.status === 'approved' ? '#DEF7EC' :
                                item.status === 'rejected' ? '#FDE8E8' : '#FEF3C7'
                        }]}>
                            <Text style={[styles.statusText, {
                                color: item.status === 'approved' ? '#03543F' :
                                    item.status === 'rejected' ? '#9B1C1C' : '#92400E'
                            }]}>
                                {item.status.toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.historyContent}>
                        <View style={styles.historyRow}>
                            <Ionicons name="briefcase-outline" size={16} color={COLORS.textLight} />
                            <Text style={styles.historyText}>{item.customer?.name} • {item.entry_type?.name}</Text>
                        </View>
                        <View style={styles.historyRow}>
                            <Ionicons name="time-outline" size={16} color={COLORS.textLight} />
                            <Text style={styles.historyText}>{item.hours}h {item.minutes}m</Text>
                        </View>
                        <Text style={styles.historyDesc}>{item.description}</Text>
                    </View>

                    {item.status === 'pending' && (
                        <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => dispatch(deleteEntry(item.id))}
                        >
                            <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                            <Text style={styles.deleteText}>Delete</Text>
                        </TouchableOpacity>
                    )}
                </View>
            )}
            onEndReached={loadMoreHistory}
            onEndReachedThreshold={0.5}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
            ListEmptyComponent={
                <View style={styles.emptyState}>
                    <Text>No history found.</Text>
                </View>
            }
        />
    );

    return (
        <View style={styles.container}>
            <Header title="Worklog" subtitle="Manage your timesheets" />

            {/* Tabs */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'entry' && styles.activeTab]}
                    onPress={() => setActiveTab('entry')}
                >
                    <Text style={[styles.tabText, activeTab === 'entry' && styles.activeTabText]}>New Entry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                    onPress={() => setActiveTab('history')}
                >
                    <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'entry' ? renderEntryForm() : renderHistory()}
        </View>
    );
};

export default TimeSheet;
