import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert, StyleSheet, PermissionsAndroid, TextInput, KeyboardAvoidingView, FlatList } from 'react-native';
import Toast from 'react-native-toast-message';
import { useDispatch, useSelector } from 'react-redux';
import { saveBusinessCard, fetchBusinessCards, updateBusinessCard, deleteBusinessCard } from '../store/slices/businessCardSlice';
import { launchCamera } from 'react-native-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import Header from '../components/Header';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';

const Scanner = () => {
    const dispatch = useDispatch();
    const { cards, loading: cardsLoading } = useSelector(state => state.businessCard);

    const [scannedText, setScannedText] = useState('');
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('list'); // 'list' (default) or 'edit'

    const initialFormState = {
        name: null,
        designation: null,
        company_name: null,
        email: null,
        phone_primary: null,
        phone_secondary: null,
        website: null,
        address: null,
        city: null,
        state: null,
        pincode: null,
        country: null,
        social_links: {
            linkedin: null,
            twitter: null,
            facebook: null,
            instagram: null,
            other: []
        },
        raw_text: null,
        card_image_url: null,
        raw_ai_response: null
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        if (viewMode === 'list') {
            dispatch(fetchBusinessCards());
        }
    }, [viewMode, dispatch]);

    // Function to handle new scan initiation
    const startNewScan = () => {
        setScannedText('');
        setFormData(initialFormState);
        scanVisitingCard();
    };

    const requestCameraPermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    {
                        title: "Camera Permission",
                        message: "Workorio needs access to your camera to scan visiting cards.",
                        buttonNeutral: "Ask Me Later",
                        buttonNegative: "Cancel",
                        buttonPositive: "OK"
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) {
                console.warn(err);
                return false;
            }
        }
        return true;
    };

    const scanVisitingCard = async () => {
        setLoading(true);
        setScannedText('');

        try {
            if (Platform.OS === 'android') {
                const hasPermission = await requestCameraPermission();
                if (!hasPermission) {
                    Toast.show({
                        type: 'error',
                        text1: 'Permission Denied',
                        text2: 'Camera permission is required to scan cards.'
                    });
                    setLoading(false);
                    return;
                }
            }

            const result = await launchCamera({
                mediaType: 'photo',
                cameraType: 'back',
                quality: 1,
            });

            if (result.didCancel) {
                console.log('Camera cancelled by user');
                setLoading(false);
                return;
            }

            if (result.errorCode) {
                Toast.show({
                    type: 'error',
                    text1: 'Camera Error',
                    text2: result.errorMessage || 'Unknown error'
                });
                setLoading(false);
                return;
            }

            if (!result.assets || !result.assets.length) {
                console.log('No image captured');
                setLoading(false);
                return;
            }

            // Get URI and prepare for ML Kit
            // Note: On Android, passing the URI directly usually works with react-native-ml-kit
            const imageUri = result.assets[0].uri;

            // Perform OCR
            const ocrResult = await TextRecognition.recognize(imageUri);

            console.log('----- OCR RESULT START -----');
            console.log(ocrResult.text);
            console.log('----- OCR RESULT END -----');

            setScannedText(ocrResult.text);

            // Process with Gemini
            await processCardWithGemini(ocrResult.text);

        } catch (error) {
            console.error('OCR Error:', error);
            Toast.show({
                type: 'error',
                text1: 'Scan Failed',
                text2: error.message
            });
        } finally {
            setLoading(false);
        }
    };

    const processCardWithGemini = async (text) => {
        try {
            // Uncomment to use real API
            const response = await api.post('/gemini/parse-card', { text });
            if (response.data) {
                const mergedData = {
                    ...initialFormState,
                    ...response.data,
                    raw_text: text, // Ensure raw text is preserved
                    social_links: {
                        ...initialFormState.social_links,
                        ...(response.data.social_links || {})
                    }
                };
                setFormData(mergedData);
                setViewMode('edit');
            }
        } catch (error) {
            console.error('Gemini API Error:', error);
            // Fallback for demo if API fails/is 404
            const mockData = {
                ...initialFormState,
                raw_text: text,
                name: "Extracted Name", // Placeholder to show form works
            };
            setFormData(mockData);
            setViewMode('edit');

            Toast.show({
                type: 'info',
                text1: 'Processing Note',
                text2: 'API call failed (likely 404), switched to manual edit mode.'
            });
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSocialChange = (platform, value) => {
        setFormData(prev => ({
            ...prev,
            social_links: {
                ...prev.social_links,
                [platform]: value
            }
        }));
    };

    const handleSave = async () => {
        // Basic validation
        if (!formData.name) {
            Toast.show({
                type: 'error',
                text1: 'Validation Error',
                text2: 'Name is required'
            });
            return;
        }

        try {
            if (formData.id) {
                // Update existing
                await dispatch(updateBusinessCard({ id: formData.id, data: formData })).unwrap();
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Business card updated successfully!'
                });
            } else {
                // Create new
                await dispatch(saveBusinessCard(formData)).unwrap();
                Toast.show({
                    type: 'success',
                    text1: 'Success',
                    text2: 'Business card saved successfully!'
                });
            }
            setViewMode('list');
            setFormData(initialFormState);
        } catch (error) {
            console.error('Save Error:', error);
            // Alert is already handled in slice, but strictly validaiton errors might come here
        }
    };

    const handleEditCard = (card) => {
        setFormData(card);
        setViewMode('edit');
    };

    const handleDeleteCard = (id) => {
        Alert.alert(
            'Confirm Delete',
            'Are you sure you want to delete this card?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await dispatch(deleteBusinessCard(id));
                    }
                }
            ]
        );
    };


    const renderListing = () => (
        <View style={styles.listContainer}>
            {cardsLoading && <ActivityIndicator size="large" color="#434AFA" style={{ marginVertical: 20 }} />}
            <FlatList
                data={cards}
                keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
                renderItem={({ item }) => (
                    <View style={styles.cardItem}>
                        <View style={styles.cardItemContent}>
                            <Text style={styles.cardItemName}>{item.name}</Text>
                            <Text style={styles.cardItemSub}>{item.designation} {item.company_name ? `at ${item.company_name}` : ''}</Text>

                            <View style={styles.cardItemRow}>
                                {item.phone_primary && (
                                    <View style={styles.iconRow}>
                                        <Ionicons name="call-outline" size={14} color="#6B7280" />
                                        <Text style={styles.cardItemDetail}>{item.phone_primary}</Text>
                                    </View>
                                )}
                                {item.email && (
                                    <View style={styles.iconRow}>
                                        <Ionicons name="mail-outline" size={14} color="#6B7280" />
                                        <Text style={styles.cardItemDetail}>{item.email}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <View style={styles.cardActions}>
                            <TouchableOpacity onPress={() => handleEditCard(item)} style={styles.actionButton}>
                                <Ionicons name="create-outline" size={20} color="#434AFA" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteCard(item.id)} style={styles.actionButton}>
                                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                ListEmptyComponent={<Text style={styles.emptyText}>No saved business cards found. Tap the scan button to add one.</Text>}
            />
        </View>
    );

    if (viewMode === 'edit') {
        return (
            <View style={styles.container}>
                <Header title="Edit Details" />
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.formContainer}>
                        <Text style={styles.sectionTitle}>Basic Info</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Name</Text>
                            <TextInput style={styles.input} value={formData.name || ''} onChangeText={(t) => handleInputChange('name', t)} placeholder="Full Name" />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Designation</Text>
                            <TextInput style={styles.input} value={formData.designation || ''} onChangeText={(t) => handleInputChange('designation', t)} placeholder="Job Title" />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Company</Text>
                            <TextInput style={styles.input} value={formData.company_name || ''} onChangeText={(t) => handleInputChange('company_name', t)} placeholder="Company Name" />
                        </View>

                        <Text style={styles.sectionTitle}>Contact Details</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput style={styles.input} value={formData.email || ''} onChangeText={(t) => handleInputChange('email', t)} keyboardType="email-address" placeholder="email@example.com" />
                        </View>
                        <View style={styles.rowInputs}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Primary Phone</Text>
                                <TextInput style={styles.input} value={formData.phone_primary || ''} onChangeText={(t) => handleInputChange('phone_primary', t)} keyboardType="phone-pad" />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Secondary Phone</Text>
                                <TextInput style={styles.input} value={formData.phone_secondary || ''} onChangeText={(t) => handleInputChange('phone_secondary', t)} keyboardType="phone-pad" />
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Website</Text>
                            <TextInput style={styles.input} value={formData.website || ''} onChangeText={(t) => handleInputChange('website', t)} autoCapitalize="none" />
                        </View>

                        <Text style={styles.sectionTitle}>Address</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Full Address</Text>
                            <TextInput style={styles.input} value={formData.address || ''} onChangeText={(t) => handleInputChange('address', t)} multiline />
                        </View>
                        <View style={styles.rowInputs}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>City</Text>
                                <TextInput style={styles.input} value={formData.city || ''} onChangeText={(t) => handleInputChange('city', t)} />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>State</Text>
                                <TextInput style={styles.input} value={formData.state || ''} onChangeText={(t) => handleInputChange('state', t)} />
                            </View>
                        </View>
                        <View style={styles.rowInputs}>
                            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.label}>Pincode</Text>
                                <TextInput style={styles.input} value={formData.pincode || ''} onChangeText={(t) => handleInputChange('pincode', t)} keyboardType="numeric" />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Country</Text>
                                <TextInput style={styles.input} value={formData.country || ''} onChangeText={(t) => handleInputChange('country', t)} />
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Social Links</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>LinkedIn</Text>
                            <TextInput style={styles.input} value={formData.social_links?.linkedin || ''} onChangeText={(t) => handleSocialChange('linkedin', t)} autoCapitalize="none" />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Twitter</Text>
                            <TextInput style={styles.input} value={formData.social_links?.twitter || ''} onChangeText={(t) => handleSocialChange('twitter', t)} autoCapitalize="none" />
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                            <Text style={styles.saveButtonText}>{formData.id ? 'Update' : 'Save'} Details</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setViewMode('list')}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        );
    }

    // Default View: List of Saved Cards + Scan Button
    return (
        <View style={styles.container}>
            <Header title="Business Cards" />
            {renderListing()}

            <TouchableOpacity
                style={styles.scanButton}
                onPress={startNewScan}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Ionicons name="scan-outline" size={30} color="#fff" />
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    cardContainer: {
        backgroundColor: '#F9FAFB',
        padding: 24,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 20,
    },
    instructions: {
        fontSize: 16,
        color: '#4B5563',
        marginBottom: 20,
        textAlign: 'center',
    },
    scanButton: {
        position: 'absolute',
        bottom: 60,
        right: 30,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#434AFA',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#434AFA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    resultContainer: {
        flex: 1,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        padding: 16,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
    },
    resultScroll: {
        flex: 1,
    },
    resultText: {
        fontSize: 14,
        color: '#374151',
        lineHeight: 22,
    },
    cardResult: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    avatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#434AFA',
    },
    cardName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    cardRole: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    cardBody: {
        gap: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    rowText: {
        fontSize: 15,
        color: '#374151',
        flex: 1,
    },
    // Form Styles
    formContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 10,
        marginBottom: 15,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    inputGroup: {
        marginBottom: 15,
    },
    rowInputs: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        color: '#111827',
    },
    saveButton: {
        backgroundColor: '#434AFA',
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    cancelButton: {
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
    },
    cancelButtonText: {
        color: '#4B5563',
        fontSize: 16,
        fontWeight: '600',
    },
    // Tab Styles
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        marginBottom: 10,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#434AFA',
        backgroundColor: 'transparent',
        elevation: 0,
        shadowOpacity: 0,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    activeTabText: {
        color: '#434AFA',
    },
    // List Styles
    listContainer: {
        flex: 1,
        paddingHorizontal: 20,
        marginTop: 20
    },
    cardItem: {
        backgroundColor: '#fff',
        padding: 16,
        marginBottom: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 1,
    },
    cardItemContent: {
        flex: 1,
    },
    cardItemName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
    },
    cardItemSub: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 6,
    },
    cardItemRow: {
        marginTop: 4,
        gap: 6
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    cardItemDetail: {
        fontSize: 13,
        color: '#4B5563',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 10,
        paddingLeft: 10,
    },
    actionButton: {
        padding: 8,
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
        color: '#9CA3AF',
    }
});

export default Scanner;
