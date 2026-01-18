import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert, StyleSheet, PermissionsAndroid, TextInput, KeyboardAvoidingView } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import Header from '../components/Header';
import Ionicons from 'react-native-vector-icons/Ionicons';
import api from '../api/client';

const Scanner = () => {
    const [scannedText, setScannedText] = useState('');
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState('scan'); // 'scan' or 'edit'

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

    // Auto-open camera removed to prevent crash
    // Camera will open when user clicks the button

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
                    Alert.alert("Permission Denied", "Camera permission is required to scan cards.");
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
                Alert.alert('Camera Error', result.errorMessage || 'Unknown error');
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
            Alert.alert('Error', 'Failed to scan card: ' + error.message);
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

            Alert.alert('Processing Note', 'API call failed (likely 404), switched to manual edit mode with extracted text.');
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

    const handleSave = () => {
        console.log('Final Submission Data:', JSON.stringify(formData, null, 2));
        Alert.alert('Success', 'Contact details saved successfully!');
        // Here you would send formData to your backend to save the contact
    };

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
                            <Text style={styles.saveButtonText}>Save Details</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={() => setViewMode('scan')}>
                            <Text style={styles.cancelButtonText}>Cancel / Rescan</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Header title="Scanner" />

            <View style={styles.content}>
                {scannedText ? (
                    <View style={styles.resultContainer}>
                        <Text style={styles.resultTitle}>Extracted Text:</Text>
                        <ScrollView style={styles.resultScroll}>
                            <Text style={styles.resultText}>{scannedText}</Text>
                        </ScrollView>
                    </View>
                ) : (
                    <View style={styles.placeholderContainer}>
                        <Ionicons name="scan-outline" size={60} color="#E5E7EB" />
                        <Text style={styles.placeholderText}>Tap the button below to scan a visiting card</Text>
                    </View>
                )}
            </View>

            <TouchableOpacity
                style={styles.scanButton}
                onPress={scanVisitingCard}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Ionicons name="scan-outline" size={30} color="#fff" />
                )}
            </TouchableOpacity>
        </View >
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
    }
});

export default Scanner;
