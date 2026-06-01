import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../navigation/AuthContext';


const Header = ({ title = "Dashboard", subtitle, showBack = false }) => {
    const navigation = useNavigation();
    const { user } = useContext(AuthContext);

    // Local Notifications Tray Visibility
    const [trayVisible, setTrayVisible] = useState(false);

    // Helper to get formatted date string if no subtitle is provided
    const getDateString = () => {
        const date = new Date();
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return `${date.toLocaleDateString('en-US', options)}`;
    };

    // Extract initials for a sleek custom profile badge
    const getInitials = (name) => {
        if (!name) return 'U';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[1][0]}`;
        }
        return name.substring(0, 2);
    };

    // Context-Aware Premium System Notifications 
    const mockNotifications = [
        {
            id: 1,
            type: 'info',
            title: 'Runtime Security Active',
            msg: 'Your local secure credential cache is fully validated and active.',
            time: 'Just now',
            unread: true,
            icon: 'shield-checkmark-outline',
            color: '#3B82F6'
        },
        {
            id: 2,
            type: 'success',
            title: 'Greetings, ' + (user?.name?.split(' ')[0] || 'Partner'),
            msg: 'Daily sync checks established. Tap dashboard shortcut grids to log metrics.',
            time: '5 mins ago',
            unread: true,
            icon: 'sparkles-outline',
            color: '#8B5CF6'
        },
        {
            id: 3,
            type: 'task',
            title: 'Operation Sync Log',
            msg: 'Confirm complete timesheet submissions and field visit entries before cycle resets.',
            time: '1 hr ago',
            unread: false,
            icon: 'time-outline',
            color: '#F59E0B'
        },
        {
            id: 4,
            type: 'check',
            title: 'GPS Dispatch Engaged',
            msg: 'Autonomous background presence coordinates are running normal pings.',
            time: '2 hrs ago',
            unread: false,
            icon: 'navigate-outline',
            color: '#10B981'
        }
    ];

    const unreadCount = mockNotifications.filter(n => n.unread).length;

    // Dynamic Bottom-Sheet Notifications Drawer
    const renderNotificationsTray = () => {
        return (
            <Modal
                visible={trayVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setTrayVisible(false)}
            >
                <Pressable style={styles.trayOverlay} onPress={() => setTrayVisible(false)}>
                    <Pressable style={styles.trayContent} onPress={(e) => e.stopPropagation()}>
                        
                        {/* Grab Handle bar for native feel */}
                        <View style={styles.dragHandle} />

                        {/* Header Header */}
                        <View style={styles.trayHeader}>
                            <View>
                                <Text style={styles.trayTitle}>Alerts Hub</Text>
                                <Text style={styles.traySubtitle}>{unreadCount} pending system notices</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.clearAllBtn}
                                onPress={() => setTrayVisible(false)}
                            >
                                <Text style={styles.clearAllText}>Dismiss All</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Scrollable Feed Body */}
                        <ScrollView 
                            style={styles.alertsList} 
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        >
                            {mockNotifications.map((item) => (
                                <View key={item.id} style={[styles.alertItem, item.unread && styles.alertItemUnread]}>
                                    {/* Accent Rounded Icon Box */}
                                    <View style={[styles.alertIconWrap, { backgroundColor: `${item.color}15` }]}>
                                        <Ionicons name={item.icon} size={18} color={item.color} />
                                    </View>

                                    {/* Message Data Column */}
                                    <View style={styles.alertBody}>
                                        <View style={styles.alertMetaRow}>
                                            <Text style={styles.alertTitle} numberOfLines={1}>{item.title}</Text>
                                            <Text style={styles.alertTime}>{item.time}</Text>
                                        </View>
                                        <Text style={styles.alertMsg} numberOfLines={2}>{item.msg}</Text>
                                    </View>

                                    {/* High contrast unread dot indicator */}
                                    {item.unread && <View style={styles.unreadPill} />}
                                </View>
                            ))}
                        </ScrollView>

                    </Pressable>
                </Pressable>
            </Modal>
        );
    };

    return (
        <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.container}>
                
               {/* Left Section: Avatar/Back + Left-Aligned Typography */}
<View style={styles.leftSection}>
    {showBack ? (
        <TouchableOpacity
            style={styles.backButton}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
        >
            <Ionicons name="chevron-back-outline" size={22} color="#1E293B" />
        </TouchableOpacity>
    ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            
            {/* Hamburger Toggle */}
            <TouchableOpacity
                style={styles.menuButton}
                activeOpacity={0.7}
                onPress={() => navigation.openDrawer()}
            >
                <Ionicons name="menu-outline" size={26} color="#1E293B" />
            </TouchableOpacity>

            {/* Avatar */}
            <TouchableOpacity
                style={styles.avatarCircle}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('Profile')}
            >
                {user?.image ? (
                    <Image
                        source={{ uri: user.image }}
                        style={styles.profileImage}
                    />
                ) : (
                    <Ionicons
                        name="person"
                        size={22}
                        color="#FFFFFF"
                    />
                )}
            </TouchableOpacity>
        </View>
    )}

    <View style={styles.titleArea}>
        <Text style={styles.titleText} numberOfLines={1}>
            {title}
        </Text>

        <Text style={styles.subtitleText} numberOfLines={1}>
            {subtitle || getDateString()}
        </Text>
    </View>
</View>

                {/* Right Section: Action Bell with Unread Indicator */}
                <View style={styles.rightSection}>
                    <TouchableOpacity 
                        style={styles.actionBtn} 
                        activeOpacity={0.75}
                        onPress={() => setTrayVisible(true)}
                    >
                        <Ionicons name="notifications-outline" size={21} color="#1E293B" />
                        
                        {/* Floating indicator only renders when notifications actually require attention */}
                        {unreadCount > 0 && (
                            <View style={styles.notificationDot} />
                        )}
                    </TouchableOpacity>
                </View>

            </View>

            {/* Slide up bottom sheet component */}
            {renderNotificationsTray()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        zIndex: 100,
    },

    profileImage: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
},

    container: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
    },
    leftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },

    menuButton: {
        marginRight: 10,
        padding: 6,
        justifyContent: 'center',
        alignItems: 'center',
    },

    backButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#EEF2FF',
        borderWidth: 1.5,
        borderColor: '#E0E7FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#434AFA',
    },
    titleArea: {
        justifyContent: 'center',
        flex: 1,
    },
    titleText: {
        fontSize: 18,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: -0.5,
    },
    subtitleText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'capitalize',
        letterSpacing: 0.8,
        marginTop: 1,
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionBtn: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notificationDot: {
        position: 'absolute',
        top: 9,
        right: 9,
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#EF4444', // High intensity alert crimson
        borderWidth: 1.5,
        borderColor: '#FFFFFF',
    },

    // --- Notification Bottom Sheet Styles ---
    trayOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)', // Slate glass backdrop
        justifyContent: 'flex-end',
    },
    trayContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        paddingBottom: 16,
        maxHeight: '70%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 20,
    },
    dragHandle: {
        width: 44,
        height: 4.5,
        borderRadius: 2.5,
        backgroundColor: '#E2E8F0',
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 16,
    },
    trayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    trayTitle: {
        fontSize: 19,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: -0.4,
    },
    traySubtitle: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '700',
        marginTop: 1,
    },
    clearAllBtn: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
    },
    clearAllText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#475569',
    },
    alertsList: {
        paddingHorizontal: 16,
    },
    alertItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 14,
        marginBottom: 8,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        position: 'relative',
    },
    alertItemUnread: {
        backgroundColor: '#FFFFFF',
        borderColor: '#E0E7FF',
        shadowColor: '#434AFA',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    alertIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    alertBody: {
        flex: 1,
    },
    alertMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    alertTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#1E293B',
        flex: 1,
        paddingRight: 10,
    },
    alertTime: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600',
    },
    alertMsg: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500',
        lineHeight: 15,
    },
    unreadPill: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#434AFA',
    }
});

export default Header;
