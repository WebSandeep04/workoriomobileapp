import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Alert, StyleSheet, PermissionsAndroid } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import Header from '../components/Header';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Scanner = () => {
    const [scannedText, setScannedText] = useState('');
    const [loading, setLoading] = useState(false);

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

        } catch (error) {
            console.error('OCR Error:', error);
            Alert.alert('Error', 'Failed to scan card: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

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
                ) : null}
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
});

export default Scanner;
