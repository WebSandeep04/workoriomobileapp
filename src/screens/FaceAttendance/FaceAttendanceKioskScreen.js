import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    ScrollView,
    Switch,
    Alert,
    StatusBar
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Header from '../../components/Header';

const { width, height } = Dimensions.get('window');

export default function FaceAttendanceKioskScreen({ navigation }) {
    // Kiosk State Manager
    const [isOnline, setIsOnline] = useState(true);
    const [attendanceQueue, setAttendanceQueue] = useState([
        { id: 1, name: 'Aditya Kumar', time: '10:15 AM', status: 'Synced' },
        { id: 2, name: 'Sneha Gupta', time: '10:22 AM', status: 'Synced' }
    ]);

    // Mock Scanner Scanning & Detection Sequence
    const [scanningState, setScanningState] = useState('idle'); // 'idle' | 'detecting' | 'recognized'
    const [detectedName, setDetectedName] = useState('');
    const [scannedCount, setScannedCount] = useState(2);

    // Animations
    const scanLineAnim = useRef(new Animated.Value(0)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Simulate live target tracker movement
    useEffect(() => {
        const runAnimations = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanLineAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
                    Animated.timing(scanLineAnim, { toValue: 0, duration: 2500, useNativeDriver: true })
                ])
            ).start();

            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.1, duration: 1200, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1.0, duration: 1200, useNativeDriver: true })
                ])
            ).start();
        };

        runAnimations();
    }, []);

    // Simulator Engine: Auto cycles detections every 8 seconds for UI demonstration
    useEffect(() => {
        let scanTimer;
        let successTimer;
        let resetTimer;

        const runSimSequence = () => {
            // 1. Enter Detecting Phase
            scanTimer = setTimeout(() => {
                setScanningState('detecting');
                
                // 2. Enter Recognized Phase
                successTimer = setTimeout(() => {
                    const mockEmployees = ['Rohan Sharma', 'Priya Patel', 'Amit Verma', 'Karan Singh'];
                    const randomName = mockEmployees[Math.floor(Math.random() * mockEmployees.length)];
                    
                    setDetectedName(randomName);
                    setScanningState('recognized');
                    
                    // Push log
                    const now = new Date();
                    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    setAttendanceQueue(prev => [
                        { id: Date.now(), name: randomName, time: timeStr, status: isOnline ? 'Synced' : 'Pending Sync' },
                        ...prev
                    ]);
                    setScannedCount(c => c + 1);

                    // 3. Reset back to scanning
                    resetTimer = setTimeout(() => {
                        setScanningState('idle');
                        setDetectedName('');
                        runSimSequence(); // Repeat cycle
                    }, 3000);

                }, 2000);

            }, 6000);
        };

        runSimSequence();

        return () => {
            clearTimeout(scanTimer);
            clearTimeout(successTimer);
            clearTimeout(resetTimer);
        };
    }, [isOnline]);

    const triggerManualSync = () => {
        if (!isOnline) {
            Alert.alert('Offline Mode', 'Cannot sync pending logs while device connection is disabled.');
            return;
        }
        
        Alert.alert('Sync Success', 'Successfully uploaded remaining local logs to Laravel central node!');
        setAttendanceQueue(prev => prev.map(item => ({ ...item, status: 'Synced' })));
    };

    // Calculate interpolations
    const translateY = scanLineAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 260]
    });

    return (
        <View style={styles.mainContainer}>
            <StatusBar backgroundColor="#0F172A" barStyle="light-content" />
            
            {/* Standard App Header Hook */}
            <Header title="AI Face Kiosk (Preview)" />

            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Top Info Bar */}
                <View style={styles.kioskHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10B981' : '#EF4444' }]} />
                        <Text style={styles.kioskTitle}>Entrance Kiosk Terminal 01</Text>
                    </View>
                    <View style={styles.pillBadge}>
                        <Text style={styles.pillText}>FPS: 30.2 (SIM)</Text>
                    </View>
                </View>

                {/* 📸 1. The Digital Mirror Scanner Display */}
                <View style={styles.mirrorContainer}>
                    {/* Simulated Mirror Grid Background */}
                    <View style={styles.videoViewport}>
                        {/* If scanning is IDLE or DETECTING */}
                        {scanningState !== 'recognized' ? (
                            <View style={styles.centerPromptWrapper}>
                                <Animated.View style={[styles.scanReticle, { transform: [{ scale: pulseAnim }] }, scanningState === 'detecting' && { borderColor: '#EAB308' }]}>
                                    {/* Animated Scanning Line */}
                                    <Animated.View style={[styles.scanLine, { transform: [{ translateY }] }]} />
                                    
                                    <Ionicons 
                                        name="person-outline" 
                                        size={120} 
                                        color={scanningState === 'detecting' ? '#EAB308' : '#475569'} 
                                        style={{ opacity: 0.4 }} 
                                    />
                                </Animated.View>
                                
                                <Text style={[styles.actionCallout, scanningState === 'detecting' && { color: '#EAB308' }]}>
                                    {scanningState === 'detecting' ? 'Analyzing Face Signatures...' : 'Align Face to Automated Frame'}
                                </Text>
                            </View>
                        ) : (
                            /* SUCCESS/RECOGNIZED OVERLAY */
                            <View style={styles.successOverlay}>
                                <Ionicons name="checkmark-circle" size={100} color="#10B981" />
                                <Text style={styles.successName}>{detectedName}</Text>
                                <Text style={styles.successSubtitle}>Attendance Logged Automatically!</Text>
                                
                                <View style={[styles.pillBadge, { backgroundColor: 'rgba(16, 185, 129, 0.15)', marginTop: 10 }]}>
                                    <Text style={[styles.pillText, { color: '#10B981' }]}>Confidence Match: 94.2%</Text>
                                </View>
                            </View>
                        )}
                    </View>
                </View>

                {/* 🚀 2. Dependency & Setup Guidance Block */}
                <View style={styles.guideCard}>
                    <View style={styles.cardHeadlineRow}>
                        <Ionicons name="construct-outline" size={22} color="#4F46E5" />
                        <Text style={styles.cardHeadline}>Kiosk Native Integration Steps</Text>
                    </View>
                    <Text style={styles.guideDesc}>
                        The user interface above is running in **Simulation Preview** mode. To link the true physical camera lenses and launch the local edge-AI, complete the following steps:
                    </Text>
                    
                    <View style={styles.stepRow}>
                        <View style={styles.bullet}><Text style={styles.bulletText}>1</Text></View>
                        <Text style={styles.stepDesc}>Install visual frame processor plugins:</Text>
                    </View>
                    <View style={styles.codeBlock}>
                        <Text style={styles.codeText}>npm install react-native-vision-camera vision-camera-face-detector</Text>
                    </View>

                    <View style={styles.stepRow}>
                        <View style={styles.bullet}><Text style={styles.bulletText}>2</Text></View>
                        <Text style={styles.stepDesc}>Enable Android Manifest camera & audio strings to unlock Continuous Framing.</Text>
                    </View>
                </View>

                {/* ⚙️ 3. Diagnostic Config Controls */}
                <View style={styles.controlCard}>
                    <Text style={styles.sectionLabel}>DIAGNOSTICS & SIMULATOR</Text>
                    
                    <View style={styles.rowToggle}>
                        <View>
                            <Text style={styles.toggleLabel}>Simulate Offline Mode</Text>
                            <Text style={styles.toggleDesc}>Switches logging to SQLite local queue</Text>
                        </View>
                        <Switch value={!isOnline} onValueChange={(v) => setIsOnline(!v)} trackColor={{ true: '#4F46E5' }} />
                    </View>

                    <View style={[styles.rowToggle, { marginTop: 16 }]}>
                        <View>
                            <Text style={styles.toggleLabel}>System Wakelock</Text>
                            <Text style={styles.toggleDesc}>Keeps tablet panel powered on 24/7</Text>
                        </View>
                        <Switch value={true} disabled trackColor={{ true: '#4F46E5' }} />
                    </View>
                </View>

                {/* 📋 4. Local Attendance Logs & Sync Queue */}
                <View style={styles.logsCard}>
                    <View style={styles.logsHeader}>
                        <View>
                            <Text style={styles.logsTitle}>Offline Local Queue</Text>
                            <Text style={styles.logsSub}>Buffered logs tracking queue (Simulated SQLite)</Text>
                        </View>
                        <TouchableOpacity style={styles.syncBtn} onPress={triggerManualSync}>
                            <Ionicons name="sync-outline" size={16} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.syncBtnText}>Sync Now</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.statRow}>
                        <View style={styles.miniStat}>
                            <Text style={styles.miniStatVal}>{scannedCount}</Text>
                            <Text style={styles.miniStatLbl}>Logged Total</Text>
                        </View>
                        <View style={styles.miniStat}>
                            <Text style={[styles.miniStatVal, { color: isOnline ? '#10B981' : '#EAB308' }]}>
                                {attendanceQueue.filter(i => i.status === 'Pending Sync').length}
                            </Text>
                            <Text style={styles.miniStatLbl}>Pending Sync</Text>
                        </View>
                    </View>

                    {/* Queue list */}
                    <View style={{ marginTop: 16 }}>
                        {attendanceQueue.map((item) => (
                            <View key={item.id} style={styles.queueRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <View style={styles.queueAvatar}>
                                        <Text style={styles.avatarLetter}>{item.name.charAt(0)}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.queueName}>{item.name}</Text>
                                        <Text style={styles.queueTime}>{item.time}</Text>
                                    </View>
                                </View>
                                <View style={[styles.statusTag, { backgroundColor: item.status === 'Synced' ? '#ECFDF5' : '#FFFBEB' }]}>
                                    <Text style={[styles.statusTagText, { color: item.status === 'Synced' ? '#10B981' : '#D97706' }]}>
                                        {item.status}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    kioskHeader: {
        backgroundColor: '#0F172A',
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    kioskTitle: {
        color: '#F8FAFC',
        fontWeight: '700',
        fontSize: 14,
        letterSpacing: 0.5,
    },
    pillBadge: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    pillText: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '800',
    },
    // Camera Viewer Styles
    mirrorContainer: {
        backgroundColor: '#0F172A',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    videoViewport: {
        width: 300,
        height: 380,
        backgroundColor: '#1E293B',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#334155',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    centerPromptWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanReticle: {
        width: 220,
        height: 260,
        borderWidth: 3,
        borderColor: '#4F46E5',
        borderRadius: 110, 
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        borderStyle: 'dashed',
    },
    scanLine: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: 'rgba(79, 70, 229, 0.8)',
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 10,
    },
    actionCallout: {
        color: '#94A3B8',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 24,
        textAlign: 'center',
    },
    successOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    successName: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '800',
        marginTop: 16,
        textAlign: 'center',
    },
    successSubtitle: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 4,
        textAlign: 'center',
    },
    // Guidance Card
    guideCard: {
        margin: 16,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    cardHeadlineRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    cardHeadline: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
    },
    guideDesc: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 18,
        marginBottom: 12,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    bullet: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#4F46E5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    bulletText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },
    stepDesc: {
        fontSize: 12,
        color: '#1E293B',
        fontWeight: '600',
    },
    codeBlock: {
        backgroundColor: '#0F172A',
        padding: 10,
        borderRadius: 8,
        marginVertical: 8,
        marginLeft: 26,
    },
    codeText: {
        color: '#38BDF8',
        fontFamily: 'monospace',
        fontSize: 10,
    },
    // Diagnostic Control
    controlCard: {
        marginHorizontal: 16,
        marginBottom: 16,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
        borderRadius: 12,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 1,
        marginBottom: 12,
    },
    rowToggle: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    toggleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B',
    },
    toggleDesc: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    // Logs Card
    logsCard: {
        marginHorizontal: 16,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 16,
        borderRadius: 12,
    },
    logsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    logsTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    logsSub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    syncBtn: {
        backgroundColor: '#4F46E5',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    syncBtnText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    statRow: {
        flexDirection: 'row',
        marginTop: 16,
        gap: 10,
    },
    miniStat: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    miniStatVal: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B',
    },
    miniStatLbl: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 2,
        fontWeight: '600',
    },
    queueRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    queueAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarLetter: {
        color: '#4F46E5',
        fontWeight: '700',
        fontSize: 12,
    },
    queueName: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E293B',
    },
    queueTime: {
        fontSize: 11,
        color: '#64748B',
        marginTop: 1,
    },
    statusTag: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    statusTagText: {
        fontSize: 10,
        fontWeight: '700',
    }
});
