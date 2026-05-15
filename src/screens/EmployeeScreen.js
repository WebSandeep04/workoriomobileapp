import React, { useEffect, useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    ScrollView, 
    FlatList, 
    ActivityIndicator, 
    Modal, 
    TextInput, 
    Dimensions,
    Platform,
    Linking,
    RefreshControl,
    Image,
    Alert,
    Switch
} from 'react-native';
import Header from '../components/Header';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const EmployeeScreen = () => {
    const [employees, setEmployees] = useState([]);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeStatus, setActiveStatus] = useState(''); // '', 'active', 'inactive'
    const [viewMode, setViewMode] = useState('card'); // 'card' or 'table'
    
    // Detail Modal State
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('personal'); // 'personal', 'employment', 'education', 'banking', 'medical'

    // Master Options
    const [options, setOptions] = useState({
        branches: [], departments: [], designations: [],
        employmentTypes: [], shifts: [], roles: [], places: []
    });

    // CRUD Add/Edit Modal States
    const [formModalVisible, setFormModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [formState, setFormState] = useState(getDefaultForm());

    // Picker Modal Generic State
    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerData, setPickerData] = useState([]);
    const [pickerTitle, setPickerTitle] = useState('');
    const [pickerSearch, setPickerSearch] = useState('');
    const [activePickerKey, setActivePickerKey] = useState(''); // 'branch_id', 'department_id', etc.

    // Places Modal Multi-Select State
    const [placesPickerVisible, setPlacesPickerVisible] = useState(false);
    const [placesSearchQuery, setPlacesSearchQuery] = useState('');

    function getDefaultForm(emp = null) {
        if (emp) {
            return {
                id: emp.id,
                name: emp.name || '',
                email: emp.email || '',
                phone: emp.phone || '',
                employee_code: emp.employee_code || '',
                branch_id: emp.branch_id || '',
                department_id: emp.department_id || '',
                designation_id: emp.designation_id || '',
                employment_type_id: emp.employment_type_id || '',
                shift_id: emp.shift_id || '',
                working_type: emp.working_type || 'Office',
                is_tracking: emp.is_tracking ? 1 : 0,
                date_of_joining: emp.date_of_joining ? emp.date_of_joining.substring(0, 10) : '',
                status: emp.status || 'active',
                personal_email: emp.personal_email || '',
                blood_group: emp.blood_group || '',
                marital_status: emp.marital_status || '',
                spouse_name: emp.spouse_name || '',
                emergency_contact_name: emp.emergency_contact_name || '',
                emergency_contact_phone: emp.emergency_contact_phone || '',
                emergency_contact_relation: emp.emergency_contact_relation || '',
                date_of_birth: emp.date_of_birth ? emp.date_of_birth.substring(0, 10) : '',
                aadhaar_number: emp.aadhaar_number || '',
                pan_number: emp.pan_number || '',
                highest_qualification: emp.highest_qualification || '',
                bank_name: emp.bank_name || '',
                bank_account_number: emp.bank_account_number || '',
                ifsc_code: emp.ifsc_code || '',
                is_place_allowed: emp.is_place_allowed ? 1 : 0,
                places: emp.places ? emp.places.map(p => Number(p.id)) : [],
                is_login: 0,
                password: '',
                role_id: '',
            };
        }
        return {
            name: '', email: '', phone: '', employee_code: '',
            branch_id: '', department_id: '', designation_id: '',
            employment_type_id: '', shift_id: '', working_type: 'Office',
            is_tracking: 0, date_of_joining: new Date().toISOString().substring(0, 10),
            status: 'active', personal_email: '', blood_group: '', marital_status: '', spouse_name: '',
            emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
            date_of_birth: '', aadhaar_number: '', pan_number: '', highest_qualification: '',
            bank_name: '', bank_account_number: '', ifsc_code: '',
            is_place_allowed: 0, places: [],
            is_login: 0, password: '', role_id: ''
        };
    }

    useEffect(() => {
        loadEmployees();
        loadFormOptions();
    }, []);

    const loadEmployees = async (showRefreshing = false) => {
        if (showRefreshing) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        try {
            const response = await api.get('/employees', {
                params: {
                    search: searchQuery,
                    status: activeStatus
                }
            });

            if (response.data && response.data.success) {
                setEmployees(response.data.data || []);
                if (response.data.stats) {
                    setStats(response.data.stats);
                }
            } else {
                Toast.show({ type: 'error', text1: 'Failed to fetch employees ledger.' });
            }
        } catch (error) {
            console.log("Load Employees error:", error);
            Toast.show({ type: 'error', text1: 'Failed to load employees.' });
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const loadFormOptions = async () => {
        try {
            const response = await api.get('/employees/form-options');
            if (response.data && response.data.success) {
                setOptions({
                    branches: response.data.branches || [],
                    departments: response.data.departments || [],
                    designations: response.data.designations || [],
                    employmentTypes: response.data.employmentTypes || [],
                    shifts: response.data.shifts || [],
                    roles: response.data.roles || [],
                    places: response.data.places || []
                });
            }
        } catch (error) {
            console.log('Error loading form options:', error);
        }
    };

    const handleSearch = () => {
        loadEmployees();
    };

    const handleRefresh = () => {
        loadEmployees(true);
    };

    const openAddModal = () => {
        setIsEditing(false);
        setFormState(getDefaultForm());
        setFormModalVisible(true);
    };

    const openEditModal = (emp) => {
        setDetailModalVisible(false);
        setIsEditing(true);
        setFormState(getDefaultForm(emp));
        setFormModalVisible(true);
    };

    const handleSaveEmployee = async () => {
        if (!formState.name) {
            Toast.show({ type: 'error', text1: 'Full Name is required.' });
            return;
        }

        setActionLoading(true);
        try {
            const payload = { ...formState };
            let res;
            
            if (isEditing) {
                res = await api.put(`/employees/${formState.id}`, payload);
            } else {
                res = await api.post('/employees', payload);
            }

            if (res.data && res.data.success) {
                Toast.show({ type: 'success', text1: res.data.message || 'Employee details saved.' });
                setFormModalVisible(false);
                loadEmployees();
            } else {
                Toast.show({ type: 'error', text1: 'Failed to save entry.' });
            }
        } catch (error) {
            console.log('Save employee error:', error.response?.data || error);
            const errMsg = error.response?.data?.message || 'Error occurred while saving record.';
            Toast.show({ type: 'error', text1: errMsg });
        } finally {
            setActionLoading(false);
        }
    };

    const confirmDelete = (emp) => {
        Alert.alert(
            "Delete Employee Record",
            `Are you absolute sure you wish to permanently remove ${emp.name}? This action cannot be reverted.`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: () => handleDelete(emp.id) }
            ]
        );
    };

    const handleDelete = async (empId) => {
        setDetailModalVisible(false);
        setLoading(true);
        try {
            const res = await api.delete(`/employees/${empId}`);
            if (res.data && res.data.success) {
                Toast.show({ type: 'success', text1: 'Employee purged successfully.' });
                loadEmployees();
            } else {
                Toast.show({ type: 'error', text1: 'Purge failed.' });
            }
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Access denied or connection failure.' });
        } finally {
            setLoading(false);
        }
    };

    const handleCall = (phone) => {
        if (!phone) {
            Toast.show({ type: 'info', text1: 'No phone number.' });
            return;
        }
        Linking.openURL(`tel:${phone}`).catch(() => Toast.show({ type: 'error', text1: 'Fail dial.' }));
    };

    const handleEmail = (email) => {
        if (!email) {
            Toast.show({ type: 'info', text1: 'No email.' });
            return;
        }
        Linking.openURL(`mailto:${email}`).catch(() => Toast.show({ type: 'error', text1: 'Fail compose.' }));
    };

    const viewProfileDetails = (emp) => {
        setSelectedEmployee(emp);
        setActiveTab('personal');
        setDetailModalVisible(true);
    };

    // Generic Picker Trigger Helper
    const triggerPicker = (key, title, data) => {
        setActivePickerKey(key);
        setPickerTitle(title);
        setPickerData(data);
        setPickerSearch('');
        setPickerVisible(true);
    };

    const handlePickerSelect = (item) => {
        setFormState(prev => {
            const updated = { ...prev, [activePickerKey]: item.id };
            // If Branch is changed, reset department automatically
            if (activePickerKey === 'branch_id') {
                updated.department_id = '';
            }
            return updated;
        });
        setPickerVisible(false);
    };

    // UI Renders
    const renderDashboardCounters = () => {
        const cards = [
            { id: '', label: 'All Staff', count: stats.total, color: '#434AFA', icon: 'people' },
            { id: 'active', label: 'Active', count: stats.active, color: '#10B981', icon: 'checkmark-circle' },
            { id: 'inactive', label: 'Inactive', count: stats.inactive, color: '#EF4444', icon: 'close-circle' },
        ];

        return (
            <View style={styles.counterRow}>
                {cards.map((c) => {
                    const isSelected = activeStatus === c.id;
                    return (
                        <TouchableOpacity 
                            key={c.id} 
                            activeOpacity={0.8}
                            onPress={() => {
                                setActiveStatus(c.id);
                                setTimeout(() => loadEmployees(), 50);
                            }}
                            style={[
                                styles.counterCard, 
                                isSelected && { borderColor: c.color, borderWidth: 2, backgroundColor: c.color + '08' }
                            ]}
                        >
                            <View style={[styles.iconBadge, { backgroundColor: c.color + '15' }]}>
                                <Ionicons name={c.icon} size={18} color={c.color} />
                            </View>
                            <View>
                                <Text style={styles.counterNum}>{c.count}</Text>
                                <Text style={styles.counterTxt}>{c.label}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
        );
    };

    const renderEmployeeCard = ({ item }) => {
        const isActive = item.status?.toLowerCase() === 'active';
        const designation = item.designation_relation?.title || item.designation || 'Unspecified Role';
        const department = item.department_relation?.name || item.department || '';
        
        return (
            <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => viewProfileDetails(item)}
                style={styles.empCard}
            >
                <View style={styles.cardTopRow}>
                    <Image source={{ uri: item.profile_pic_url }} style={styles.cardAvatar} />
                    <View style={styles.cardPrimaryMeta}>
                        <Text style={styles.cardEmpName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.cardEmpCode}>{item.employee_code || 'N/A'}</Text>
                        <Text style={styles.cardDesignation} numberOfLines={1}>
                            {designation} {department ? `• ${department}` : ''}
                        </Text>
                    </View>
                    <View style={styles.cardActionBundle}>
                        <TouchableOpacity onPress={() => handleCall(item.phone)} style={styles.circBtn}>
                            <Ionicons name="call" size={13} color="#434AFA" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => openEditModal(item)} style={[styles.circBtn, { marginLeft: 6, borderColor: '#FCD34D', backgroundColor: '#FEF3C7' }]}>
                            <Ionicons name="pencil" size={13} color="#D97706" />
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBotRow}>
                    <Text style={styles.cardFooterTxt}>
                        Joined: {item.date_of_joining ? item.date_of_joining.substring(0, 10) : 'N/A'}
                    </Text>
                    <View style={[styles.statusChip, { backgroundColor: isActive ? '#DCFCE7' : '#FEE2E2' }]}>
                        <Text style={[styles.statusChipTxt, { color: isActive ? '#166534' : '#991B1B' }]}>
                            {isActive ? 'Active' : 'Inactive'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderTableMode = () => {
        return (
            <View style={{ marginTop: 10, marginBottom: 24 }}>
                <View style={styles.matrixHeaderMessage}>
                    <Ionicons name="information-circle" size={14} color="#434AFA" />
                    <Text style={styles.matrixHeaderMessageTxt}>Swipe horizontally to view entire roster</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={true} bounces={false}>
                    <View>
                        <View style={styles.matrixHeaderRow}>
                            <View style={[styles.matrixCell, styles.matrixLeftPinned, { width: 80, backgroundColor: '#FFF' }]}><Text style={styles.matrixColHeaderTxt}>ACTION</Text></View>
                            <View style={[styles.matrixCell, { width: 130, backgroundColor: '#FFF', alignItems: 'flex-start', paddingLeft: 10 }]}><Text style={styles.matrixColHeaderTxt}>NAME</Text></View>
                            <View style={[styles.matrixCell, { width: 80 }]}><Text style={styles.matrixColHeaderTxt}>CODE</Text></View>
                            <View style={[styles.matrixCell, { width: 120 }]}><Text style={styles.matrixColHeaderTxt}>PHONE</Text></View>
                            <View style={[styles.matrixCell, { width: 120 }]}><Text style={styles.matrixColHeaderTxt}>BRANCH</Text></View>
                            <View style={[styles.matrixCell, { width: 120 }]}><Text style={styles.matrixColHeaderTxt}>DESIG</Text></View>
                            <View style={[styles.matrixCell, { width: 90 }]}><Text style={styles.matrixColHeaderTxt}>STATUS</Text></View>
                        </View>

                        {employees.map((emp, idx) => {
                            const isEven = idx % 2 === 0;
                            const bgCol = isEven ? '#FFF' : '#F8FAFC';
                            const isActive = emp.status?.toLowerCase() === 'active';

                            return (
                                <View key={emp.id || idx} style={[styles.matrixRow, { backgroundColor: bgCol }]}>
                                    <View style={[styles.matrixCell, styles.matrixLeftPinned, { width: 80, backgroundColor: bgCol, flexDirection: 'row', gap: 8 }]}>
                                        <TouchableOpacity onPress={() => viewProfileDetails(emp)}>
                                            <Ionicons name="eye" size={16} color="#434AFA" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => openEditModal(emp)}>
                                            <Ionicons name="pencil" size={16} color="#D97706" />
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity onPress={() => viewProfileDetails(emp)} style={[styles.matrixCell, { width: 130, alignItems: 'flex-start', paddingLeft: 10 }]}>
                                        <Text style={[styles.rowText, { fontWeight: '700', color: '#1E293B' }]} numberOfLines={1}>{emp.name}</Text>
                                    </TouchableOpacity>
                                    <View style={[styles.matrixCell, { width: 80 }]}><Text style={styles.rowText}>{emp.employee_code || '-'}</Text></View>
                                    <View style={[styles.matrixCell, { width: 120 }]}><Text style={styles.rowText}>{emp.phone || '-'}</Text></View>
                                    <View style={[styles.matrixCell, { width: 120 }]}><Text style={styles.rowText} numberOfLines={1}>{emp.branch?.name || '-'}</Text></View>
                                    <View style={[styles.matrixCell, { width: 120 }]}><Text style={styles.rowText} numberOfLines={1}>{emp.designation_relation?.title || '-'}</Text></View>
                                    <View style={[styles.matrixCell, { width: 90 }]}>
                                        <Text style={{ fontSize: 10, fontWeight: '800', color: isActive ? '#10B981' : '#EF4444' }}>{emp.status?.toUpperCase()}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        );
    };

    // Detailed Views Tabs Content
    const renderDetailTabContent = () => {
        if (!selectedEmployee) return null;
        const emp = selectedEmployee;

        const FieldRow = ({ label, value, icon }) => (
            <View style={styles.detFieldRow}>
                <View style={styles.detIconWrap}><Ionicons name={icon} size={16} color="#64748B" /></View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.detLabel}>{label}</Text>
                    <Text style={styles.detValue}>{value || '--'}</Text>
                </View>
            </View>
        );

        switch (activeTab) {
            case 'personal':
                return (
                    <ScrollView style={styles.sheetTabBody}>
                        <View style={styles.fieldGrid}>
                            <FieldRow label="Date of Birth" value={emp.date_of_birth} icon="calendar" />
                            <FieldRow label="Blood Group" value={emp.blood_group} icon="water" />
                            <FieldRow label="Marital Status" value={emp.marital_status} icon="heart" />
                            <FieldRow label="Personal Email" value={emp.personal_email} icon="mail" />
                            <FieldRow label="Address Line" value={emp.address_line} icon="location" />
                            <FieldRow label="Emergency Contact" value={emp.emergency_contact_name} icon="call" />
                            <FieldRow label="Emergency Phone" value={emp.emergency_contact_phone} icon="call" />
                        </View>
                    </ScrollView>
                );
            case 'employment':
                return (
                    <ScrollView style={styles.sheetTabBody}>
                        <View style={styles.fieldGrid}>
                            <FieldRow label="Employee Code" value={emp.employee_code} icon="barcode" />
                            <FieldRow label="Branch" value={emp.branch?.name} icon="business" />
                            <FieldRow label="Department" value={emp.department_relation?.name || emp.department} icon="briefcase" />
                            <FieldRow label="Designation" value={emp.designation_relation?.title} icon="ribbon" />
                            <FieldRow label="Working Type" value={emp.working_type} icon="desktop" />
                            <FieldRow label="Official Email" value={emp.email} icon="mail" />
                            <FieldRow label="Official Phone" value={emp.phone} icon="call" />
                        </View>
                    </ScrollView>
                );
            case 'banking':
                return (
                    <ScrollView style={styles.sheetTabBody}>
                        <View style={styles.fieldGrid}>
                            <FieldRow label="Aadhaar Card No." value={emp.aadhaar_number} icon="finger-print" />
                            <FieldRow label="PAN Card No." value={emp.pan_number} icon="card" />
                            <FieldRow label="Bank Name" value={emp.bank_name} icon="cash" />
                            <FieldRow label="Account No." value={emp.bank_account_number} icon="card" />
                            <FieldRow label="IFSC Code" value={emp.ifsc_code} icon="barcode" />
                        </View>
                    </ScrollView>
                );
            default:
                return null;
        }
    };

    // Full Details Modal Component
    const renderEmployeeDetailsModal = () => {
        if (!selectedEmployee) return null;
        const emp = selectedEmployee;

        const tabs = [
            { key: 'personal', label: 'Personal', icon: 'person' },
            { key: 'employment', label: 'Employment', icon: 'briefcase' },
            { key: 'banking', label: 'Finance & Docs', icon: 'cash' }
        ];

        return (
            <Modal animationType="slide" transparent={true} visible={detailModalVisible} onRequestClose={() => setDetailModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.sheetContainer}>
                        <View style={styles.sheetGrabber} />
                        
                        <View style={styles.sheetHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <Image source={{ uri: emp.profile_pic_url }} style={styles.sheetAvatar} />
                                <View style={{ marginLeft: 12, flex: 1 }}>
                                    <Text style={styles.sheetName}>{emp.name}</Text>
                                    <Text style={styles.sheetCode}>{emp.employee_code || '---'}</Text>
                                    <Text style={styles.sheetDesignation}>{emp.designation_relation?.title || 'Employee'}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.sheetCloseBtn}>
                                <Ionicons name="close" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.sheetActionPad}>
                            <TouchableOpacity onPress={() => openEditModal(emp)} style={[styles.actionPadBtn, { backgroundColor: '#F59E0B' }]}>
                                <Ionicons name="pencil" size={14} color="#FFF" />
                                <Text style={styles.actionPadBtnTxt}>Edit</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => confirmDelete(emp)} style={[styles.actionPadBtn, { backgroundColor: '#EF4444' }]}>
                                <Ionicons name="trash" size={14} color="#FFF" />
                                <Text style={styles.actionPadBtnTxt}>Delete</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={{ borderBottomWidth: 1, borderBottomColor: '#E2E8F0' }}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabStrip}>
                                {tabs.map((t) => {
                                    const isSel = activeTab === t.key;
                                    return (
                                        <TouchableOpacity key={t.key} onPress={() => setActiveTab(t.key)} style={[styles.tabItem, isSel && styles.tabItemActive]}>
                                            <Ionicons name={t.icon} size={14} color={isSel ? '#434AFA' : '#64748B'} style={{ marginRight: 4 }} />
                                            <Text style={[styles.tabItemTxt, isSel && styles.tabItemTxtActive]}>{t.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        <View style={{ flex: 1 }}>{renderDetailTabContent()}</View>
                    </View>
                </View>
            </Modal>
        );
    };

    // Advanced CRUD Add/Edit Form Component
    const renderAddEditModal = () => {
        const filteredDept = options.departments.filter(d => 
            !formState.branch_id || Number(d.branch_id) === Number(formState.branch_id)
        );

        const FormInput = ({ label, value, onChangeText, placeholder, keyboardType = 'default', secureTextEntry = false }) => (
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{label}</Text>
                <TextInput 
                    style={styles.formTextInput}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor="#94A3B8"
                    keyboardType={keyboardType}
                    secureTextEntry={secureTextEntry}
                />
            </View>
        );

        const FormPicker = ({ label, value, placeholder, onPress }) => (
            <View style={styles.formGroup}>
                <Text style={styles.formLabel}>{label}</Text>
                <TouchableOpacity style={styles.formPickerBtn} onPress={onPress}>
                    <Text style={[styles.formPickerBtnTxt, !value && { color: '#94A3B8' }]}>
                        {value || placeholder}
                    </Text>
                    <Ionicons name="chevron-down" size={16} color="#64748B" />
                </TouchableOpacity>
            </View>
        );

        const getLabelFromId = (id, array, key = 'name') => {
            if (!id || !array) return '';
            const matched = array.find(i => Number(i.id) === Number(id));
            return matched ? matched[key] : '';
        };

        return (
            <Modal animationType="slide" transparent={true} visible={formModalVisible} onRequestClose={() => setFormModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={[styles.sheetContainer, { height: SCREEN_HEIGHT * 0.85 }]}>
                        <View style={styles.sheetGrabber} />
                        <View style={styles.sheetHeader}>
                            <Text style={styles.modalHeaderTitle}>{isEditing ? 'Edit Employee' : 'Add New Employee'}</Text>
                            <TouchableOpacity onPress={() => setFormModalVisible(false)} style={styles.sheetCloseBtn}>
                                <Ionicons name="close" size={20} color="#1E293B" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.formScrollBody} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
                            {/* SECTION 1: BASIC PROFILE */}
                            <View style={styles.formSectionHeader}><Text style={styles.formSectionTitle}>Basic Profile</Text></View>
                            
                            <FormInput label="Full Name *" value={formState.name} onChangeText={txt => setFormState({...formState, name: txt})} placeholder="Enter Name" />
                            <FormInput label="Official Email" value={formState.email} onChangeText={txt => setFormState({...formState, email: txt})} placeholder="email@company.com" keyboardType="email-address" />
                            <FormInput label="Official Phone" value={formState.phone} onChangeText={txt => setFormState({...formState, phone: txt})} placeholder="9876543210" keyboardType="phone-pad" />
                            <FormInput label="Emp Code (Optional)" value={formState.employee_code} onChangeText={txt => setFormState({...formState, employee_code: txt})} placeholder="Leave blank to auto-gen" />

                            {/* SECTION 2: EMPLOYMENT PROFILE */}
                            <View style={styles.formSectionHeader}><Text style={styles.formSectionTitle}>Work & Assignment</Text></View>
                            
                            <FormPicker 
                                label="Branch" 
                                value={getLabelFromId(formState.branch_id, options.branches)} 
                                placeholder="Select Branch" 
                                onPress={() => triggerPicker('branch_id', 'Select Branch', options.branches)} 
                            />
                            <FormPicker 
                                label="Department" 
                                value={getLabelFromId(formState.department_id, options.departments)} 
                                placeholder="Select Department" 
                                onPress={() => triggerPicker('department_id', 'Select Department', filteredDept)} 
                            />
                            <FormPicker 
                                label="Designation" 
                                value={getLabelFromId(formState.designation_id, options.designations, 'title')} 
                                placeholder="Select Designation" 
                                onPress={() => triggerPicker('designation_id', 'Select Designation', options.designations.map(d => ({id: d.id, name: d.title})))} 
                            />
                            <FormPicker 
                                label="Employment Type" 
                                value={getLabelFromId(formState.employment_type_id, options.employmentTypes)} 
                                placeholder="Select Emp Type" 
                                onPress={() => triggerPicker('employment_type_id', 'Select Employment Type', options.employmentTypes)} 
                            />
                            <FormPicker 
                                label="Work Shift" 
                                value={getLabelFromId(formState.shift_id, options.shifts)} 
                                placeholder="Select Shift" 
                                onPress={() => triggerPicker('shift_id', 'Select Shift', options.shifts)} 
                            />

                            <View style={styles.formSwitchGroup}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.switchTitle}>Location Tracking</Text>
                                    <Text style={styles.switchSub}>Track dynamic GPS coordinates via App</Text>
                                </View>
                                <Switch 
                                    value={Boolean(formState.is_tracking)} 
                                    onValueChange={val => setFormState({...formState, is_tracking: val ? 1 : 0})} 
                                    trackColor={{ true: '#434AFA' }}
                                />
                            </View>

                            <View style={styles.formSwitchGroup}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.switchTitle}>Restrict Clock-in Location?</Text>
                                    <Text style={styles.switchSub}>Limit check-in to selected Geofence areas</Text>
                                </View>
                                <Switch 
                                    value={Boolean(formState.is_place_allowed)} 
                                    onValueChange={val => {
                                        setFormState({...formState, is_place_allowed: val ? 1 : 0});
                                        if (val && (!formState.places || formState.places.length === 0)) {
                                            setPlacesPickerVisible(true);
                                        }
                                    }} 
                                    trackColor={{ true: '#434AFA' }}
                                />
                            </View>

                            {Boolean(formState.is_place_allowed) && (
                                <View style={styles.formGroup}>
                                    <Text style={styles.formLabel}>Allowed Geofence Areas</Text>
                                    <TouchableOpacity 
                                        style={styles.formPickerBtn} 
                                        onPress={() => setPlacesPickerVisible(true)}
                                    >
                                        <Text style={styles.formPickerBtnTxt}>
                                            {formState.places && formState.places.length > 0 
                                                ? `${formState.places.length} Places Selected` 
                                                : 'Select Allowed Geofences'}
                                        </Text>
                                        <Ionicons name="map" size={16} color="#434AFA" />
                                    </TouchableOpacity>
                                </View>
                            )}

                            <FormPicker 
                                label="Working Type" 
                                value={formState.working_type} 
                                placeholder="Office" 
                                onPress={() => triggerPicker('working_type', 'Working Type', [{id:'Office', name:'Office'}, {id:'Remote', name:'Remote'}])} 
                            />

                            <FormPicker 
                                label="Status" 
                                value={formState.status} 
                                placeholder="active" 
                                onPress={() => triggerPicker('status', 'Select Account Status', [{id:'active', name:'active'}, {id:'inactive', name:'inactive'}])} 
                            />

                            {/* SECTION 3: PERSONAL */}
                            <View style={styles.formSectionHeader}><Text style={styles.formSectionTitle}>Personal Details</Text></View>
                            <FormInput label="Date of Birth" value={formState.date_of_birth} onChangeText={txt => setFormState({...formState, date_of_birth: txt})} placeholder="YYYY-MM-DD" />
                            <FormInput label="Blood Group" value={formState.blood_group} onChangeText={txt => setFormState({...formState, blood_group: txt})} placeholder="O+" />
                            <FormInput label="Personal Email" value={formState.personal_email} onChangeText={txt => setFormState({...formState, personal_email: txt})} placeholder="Personal email" keyboardType="email-address" />
                            <FormInput label="Emergency Name" value={formState.emergency_contact_name} onChangeText={txt => setFormState({...formState, emergency_contact_name: txt})} placeholder="Emergency Contact Person" />
                            <FormInput label="Emergency Phone" value={formState.emergency_contact_phone} onChangeText={txt => setFormState({...formState, emergency_contact_phone: txt})} placeholder="Emergency Phone" keyboardType="phone-pad" />

                            {/* SECTION 4: FINANCE */}
                            <View style={styles.formSectionHeader}><Text style={styles.formSectionTitle}>Finance & KYC</Text></View>
                            <FormInput label="Aadhaar Card No" value={formState.aadhaar_number} onChangeText={txt => setFormState({...formState, aadhaar_number: txt})} placeholder="0000 0000 0000" keyboardType="number-pad" />
                            <FormInput label="PAN Card No" value={formState.pan_number} onChangeText={txt => setFormState({...formState, pan_number: txt})} placeholder="ABCDE1234F" />
                            <FormInput label="Bank Name" value={formState.bank_name} onChangeText={txt => setFormState({...formState, bank_name: txt})} placeholder="Enter Bank Name" />
                            <FormInput label="Bank Account No" value={formState.bank_account_number} onChangeText={txt => setFormState({...formState, bank_account_number: txt})} placeholder="Bank Account Number" />
                            <FormInput label="IFSC Code" value={formState.ifsc_code} onChangeText={txt => setFormState({...formState, ifsc_code: txt})} placeholder="BANK0123456" />

                            {/* SECTION 5: CREDENTIALS ON ADD */}
                            {!isEditing && (
                                <>
                                    <View style={styles.formSectionHeader}><Text style={styles.formSectionTitle}>Mobile Login Access</Text></View>
                                    <View style={styles.formSwitchGroup}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.switchTitle}>Enable Portal Login?</Text>
                                            <Text style={styles.switchSub}>Creates active system User for this record</Text>
                                        </View>
                                        <Switch 
                                            value={Boolean(formState.is_login)} 
                                            onValueChange={val => setFormState({...formState, is_login: val ? 1 : 0})} 
                                            trackColor={{ true: '#434AFA' }}
                                        />
                                    </View>
                                    {Boolean(formState.is_login) && (
                                        <View style={{ marginTop: 10 }}>
                                            <FormInput label="Setup Password" value={formState.password} onChangeText={txt => setFormState({...formState, password: txt})} placeholder="Min 6 characters" secureTextEntry={true} />
                                            <FormPicker 
                                                label="Assign Access Role" 
                                                value={getLabelFromId(formState.role_id, options.roles)} 
                                                placeholder="Select User Role" 
                                                onPress={() => triggerPicker('role_id', 'Assign Access Role', options.roles)} 
                                            />
                                        </View>
                                    )}
                                </>
                            )}
                        </ScrollView>

                        <View style={styles.formFooterAction}>
                            <TouchableOpacity 
                                onPress={handleSaveEmployee} 
                                disabled={actionLoading} 
                                style={[styles.formSaveBtn, actionLoading && { opacity: 0.6 }]}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <>
                                        <Ionicons name="save" size={18} color="#FFF" />
                                        <Text style={styles.formSaveBtnTxt}>Save Profile Record</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    // Dynamic Selector Picker Modal
    const renderPickerModal = () => {
        const cleanData = pickerData || [];
        const filteredOptions = cleanData.filter(i => 
            String(i.name || '').toLowerCase().includes(pickerSearch.toLowerCase())
        );

        return (
            <Modal animationType="fade" transparent={true} visible={pickerVisible} onRequestClose={() => setPickerVisible(false)}>
                <View style={styles.modalOverlayDark}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHead}>
                            <Text style={styles.pickerTitle}>{pickerTitle}</Text>
                            <TouchableOpacity onPress={() => setPickerVisible(false)}><Ionicons name="close" size={20} color="#1E293B" /></TouchableOpacity>
                        </View>

                        <View style={styles.pickerSearchWrap}>
                            <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                            <TextInput 
                                style={styles.pickerSearchInput}
                                placeholder="Search options..."
                                placeholderTextColor="#94A3B8"
                                value={pickerSearch}
                                onChangeText={setPickerSearch}
                            />
                        </View>

                        <FlatList 
                            data={filteredOptions}
                            keyExtractor={(item, idx) => String(item.id || idx)}
                            style={{ maxHeight: 280 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.pickerItemRow} onPress={() => handlePickerSelect(item)}>
                                    <Text style={styles.pickerItemTxt}>{item.name}</Text>
                                    {String(formState[activePickerKey]) === String(item.id) && (
                                        <Ionicons name="checkmark-circle" size={18} color="#434AFA" />
                                    )}
                                </TouchableOpacity>
                            )}
                            ListEmptyComponent={<Text style={styles.pickerNoResult}>No matching items found</Text>}
                        />
                    </View>
                </View>
            </Modal>
        );
    };

    // Dynamic Places Modal Multi-Select Selector
    const renderPlacesPickerModal = () => {
        const placesOptions = options.places || [];
        const filteredPlaces = placesOptions.filter(p => 
            String(p.name || '').toLowerCase().includes(placesSearchQuery.toLowerCase())
        );

        const togglePlaceSelection = (placeId) => {
            const numericId = Number(placeId);
            setFormState(prev => {
                const currentPlaces = prev.places || [];
                let updatedPlaces;
                if (currentPlaces.includes(numericId)) {
                    updatedPlaces = currentPlaces.filter(id => id !== numericId);
                } else {
                    updatedPlaces = [...currentPlaces, numericId];
                }
                return { ...prev, places: updatedPlaces };
            });
        };

        return (
            <Modal animationType="fade" transparent={true} visible={placesPickerVisible} onRequestClose={() => setPlacesPickerVisible(false)}>
                <View style={styles.modalOverlayDark}>
                    <View style={styles.pickerContainer}>
                        <View style={styles.pickerHead}>
                            <Text style={styles.pickerTitle}>Select Allowed Places</Text>
                            <TouchableOpacity onPress={() => setPlacesPickerVisible(false)}><Ionicons name="close" size={20} color="#1E293B" /></TouchableOpacity>
                        </View>

                        <View style={styles.pickerSearchWrap}>
                            <Ionicons name="search" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
                            <TextInput 
                                style={styles.pickerSearchInput}
                                placeholder="Search Geofences..."
                                placeholderTextColor="#94A3B8"
                                value={placesSearchQuery}
                                onChangeText={setPlacesSearchQuery}
                            />
                        </View>

                        <FlatList 
                            data={filteredPlaces}
                            keyExtractor={(item, idx) => String(item.id || idx)}
                            style={{ maxHeight: 280 }}
                            renderItem={({ item }) => {
                                const isSelected = (formState.places || []).includes(Number(item.id));
                                return (
                                    <TouchableOpacity style={styles.pickerItemRow} onPress={() => togglePlaceSelection(item.id)}>
                                        <Text style={styles.pickerItemTxt}>{item.name}</Text>
                                        <Ionicons 
                                            name={isSelected ? "checkbox" : "square-outline"} 
                                            size={20} 
                                            color={isSelected ? "#434AFA" : "#94A3B8"} 
                                        />
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={<Text style={styles.pickerNoResult}>No matching locations found</Text>}
                        />

                        <TouchableOpacity 
                            style={[styles.formSaveBtn, { marginTop: 16, height: 36 }]} 
                            onPress={() => setPlacesPickerVisible(false)}
                        >
                            <Text style={styles.formSaveBtnTxt}>Confirm Selection</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <View style={styles.mainContainer}>
            <Header title="Master Employees" />
            
            <View style={styles.filterRow}>
                <View style={styles.searchFieldWrap}>
                    <Ionicons name="search" size={16} color="#94A3B8" />
                    <TextInput 
                        style={styles.searchInput}
                        placeholder="Search employees..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery !== '' && (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); setTimeout(() => loadEmployees(), 50); }}>
                            <Ionicons name="close-circle" size={18} color="#94A3B8" />
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.modeToggleWrap}>
                    <TouchableOpacity onPress={() => setViewMode('card')} style={[styles.modeBtn, viewMode === 'card' && styles.modeBtnActive]}>
                        <Ionicons name="grid" size={16} color={viewMode === 'card' ? '#FFF' : '#64748B'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setViewMode('table')} style={[styles.modeBtn, viewMode === 'table' && styles.modeBtnActive]}>
                        <Ionicons name="list" size={16} color={viewMode === 'table' ? '#FFF' : '#64748B'} />
                    </TouchableOpacity>
                </View>
            </View>

            {viewMode === 'card' ? (
                <FlatList
                    data={employees}
                    keyExtractor={(item) => item.id?.toString()}
                    renderItem={renderEmployeeCard}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
                    ListHeaderComponent={
                        <>
                            {renderDashboardCounters()}
                            <View style={styles.listHeadline}>
                                <Text style={styles.listHeadlineTxt}>Staff Ledger</Text>
                                <Text style={styles.listHeadlineBadge}>{employees.length} Records</Text>
                            </View>
                        </>
                    }
                    ListEmptyComponent={
                        !loading && (
                            <View style={styles.noDataBox}>
                                <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                                <Text style={styles.noDataTitle}>No records found</Text>
                            </View>
                        )
                    }
                    ListFooterComponent={
                        loading && !refreshing ? (
                            <View style={styles.loaderFoot}><ActivityIndicator size="small" color="#434AFA" /></View>
                        ) : <View style={{ height: 60 }} />
                    }
                />
            ) : (
                <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
                    <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>{renderDashboardCounters()}</View>
                    {loading && !refreshing ? (
                        <View style={styles.loaderFoot}><ActivityIndicator size="small" color="#434AFA" /></View>
                    ) : employees.length === 0 ? (
                        <View style={styles.noDataBox}><Ionicons name="people-outline" size={40} color="#CBD5E1" /></View>
                    ) : renderTableMode()}
                </ScrollView>
            )}

            {/* FAB Floating Action Button to add profile */}
            <TouchableOpacity activeOpacity={0.85} style={styles.fab} onPress={openAddModal}>
                <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>

            {renderEmployeeDetailsModal()}
            {renderAddEditModal()}
            {renderPickerModal()}
            {renderPlacesPickerModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#FFFFFF' },
    
    // Action bar
    filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', gap: 8, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    searchFieldWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, height: 38 },
    searchInput: { flex: 1, fontSize: 13, color: '#1E293B', marginLeft: 6, paddingVertical: 0 },
    modeToggleWrap: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 8, padding: 2, alignItems: 'center' },
    modeBtn: { width: 32, height: 32, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
    modeBtnActive: { backgroundColor: '#434AFA' },

    // Counters
    counterRow: { flexDirection: 'row', gap: 8, marginBottom: 12, marginTop: 10 },
    counterCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', alignItems: 'center', gap: 8, height: 54 },
    iconBadge: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    counterNum: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    counterTxt: { fontSize: 9, color: '#64748B', fontWeight: '600' },

    // Headings
    listContent: { paddingHorizontal: 16, paddingBottom: 20 },
    listHeadline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    listHeadlineTxt: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    listHeadlineBadge: { backgroundColor: '#EEF2FF', color: '#434AFA', fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },

    // Cards
    empCard: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', padding: 12, marginBottom: 10 },
    cardTopRow: { flexDirection: 'row', alignItems: 'center' },
    cardAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F1F5F9' },
    cardPrimaryMeta: { flex: 1, marginLeft: 10, marginRight: 6 },
    cardEmpName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    cardEmpCode: { fontSize: 10, fontWeight: '700', color: '#434AFA', marginTop: 1 },
    cardDesignation: { fontSize: 11, color: '#64748B', marginTop: 1 },
    cardActionBundle: { flexDirection: 'row' },
    circBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#C7D2FE' },
    cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
    cardBotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    cardFooterTxt: { fontSize: 10, color: '#64748B' },
    statusChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    statusChipTxt: { fontSize: 9, fontWeight: '800' },

    // Matrix Spreadsheet
    matrixHeaderMessage: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 6, alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', borderRadius: 6, marginHorizontal: 16, marginBottom: 8 },
    matrixHeaderMessageTxt: { fontSize: 10, color: '#434AFA', fontWeight: '600' },
    matrixHeaderRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#CBD5E1' },
    matrixRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    matrixCell: { height: 40, justifyContent: 'center', alignItems: 'center', borderRightWidth: 1, borderRightColor: '#E2E8F0', paddingHorizontal: 6 },
    matrixLeftPinned: { borderRightWidth: 2, borderRightColor: '#CBD5E1' },
    matrixColHeaderTxt: { fontSize: 9, color: '#64748B', fontWeight: '800' },
    rowText: { fontSize: 10, color: '#475569', fontWeight: '600' },

    // Modals & Sheets
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
    sheetContainer: { backgroundColor: '#FFF', borderTopLeftRadius: 16, borderTopRightRadius: 16, height: SCREEN_HEIGHT * 0.75 },
    sheetGrabber: { width: 36, height: 4, backgroundColor: '#E2E8F0', borderRadius: 2, alignSelf: 'center', marginTop: 6 },
    sheetHeader: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    modalHeaderTitle: { fontSize: 16, fontWeight: '800', color: '#1E293B', flex: 1 },
    sheetAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F1F5F9' },
    sheetName: { fontSize: 16, fontWeight: '800', color: '#1E293B' },
    sheetCode: { fontSize: 10, fontWeight: '800', color: '#434AFA' },
    sheetDesignation: { fontSize: 12, color: '#64748B' },
    sheetCloseBtn: { padding: 4, backgroundColor: '#F1F5F9', borderRadius: 12 },
    sheetActionPad: { flexDirection: 'row', padding: 10, backgroundColor: '#F8FAFC', borderBottomWidth: 1, borderBottomColor: '#E2E8F0', gap: 6 },
    actionPadBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 32, borderRadius: 6, gap: 4 },
    actionPadBtnTxt: { color: '#FFF', fontSize: 11, fontWeight: '800' },

    // Tabs
    tabStrip: { paddingHorizontal: 16, height: 38, alignItems: 'center' },
    tabItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, height: '100%', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: '#434AFA' },
    tabItemTxt: { fontSize: 11, color: '#64748B', fontWeight: '700' },
    tabItemTxtActive: { color: '#434AFA', fontWeight: '800' },

    // Field detail Rows
    sheetTabBody: { flex: 1, backgroundColor: '#FFF', paddingHorizontal: 16, paddingTop: 12 },
    fieldGrid: { gap: 8, paddingBottom: 20 },
    detFieldRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#F1F5F9' },
    detIconWrap: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    detLabel: { fontSize: 9, color: '#94A3B8', fontWeight: '800', textTransform: 'uppercase' },
    detValue: { fontSize: 12, color: '#1E293B', fontWeight: '700', marginTop: 1 },

    // Forms Controls
    formScrollBody: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
    formSectionHeader: { marginTop: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 4 },
    formSectionTitle: { fontSize: 12, fontWeight: '800', color: '#434AFA', textTransform: 'uppercase', letterSpacing: 0.5 },
    formGroup: { marginBottom: 12 },
    formLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 4 },
    formTextInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, height: 38, fontSize: 13, color: '#1E293B' },
    formPickerBtn: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 10, height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    formPickerBtnTxt: { fontSize: 13, color: '#1E293B' },
    formSwitchGroup: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 10 },
    switchTitle: { fontSize: 12, fontWeight: '700', color: '#1E293B' },
    switchSub: { fontSize: 10, color: '#64748B', marginTop: 1 },
    formFooterAction: { padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    formSaveBtn: { backgroundColor: '#434AFA', height: 42, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    formSaveBtnTxt: { color: '#FFF', fontSize: 13, fontWeight: '800' },

    // Generic Custom Pickers
    modalOverlayDark: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    pickerContainer: { backgroundColor: '#FFF', width: '95%', borderRadius: 12, padding: 16, shadowColor: '#000', elevation: 10 },
    pickerHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    pickerTitle: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
    pickerSearchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, height: 36, marginBottom: 10 },
    pickerSearchInput: { flex: 1, fontSize: 12, color: '#1E293B', paddingVertical: 0 },
    pickerItemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    pickerItemTxt: { fontSize: 13, color: '#334155', fontWeight: '600' },
    pickerNoResult: { textAlign: 'center', color: '#94A3B8', fontSize: 12, marginTop: 10, fontStyle: 'italic' },

    // Global Floaters
    fab: { position: 'absolute', bottom: 20, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: '#434AFA', justifyContent: 'center', alignItems: 'center', shadowColor: '#434AFA', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6, zIndex: 99 },
    noDataBox: { padding: 40, justifyContent: 'center', alignItems: 'center' },
    noDataTitle: { fontSize: 14, fontWeight: '700', color: '#64748B', marginTop: 8 },
    loaderFoot: { padding: 20, alignItems: 'center' }
});

export default EmployeeScreen;
