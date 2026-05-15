import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../navigation/AuthContext';

const Header = ({ title = "Dashboard", subtitle, showBack = false }) => {
    const navigation = useNavigation();
    const { user } = useContext(AuthContext);

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
            return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
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
                        <TouchableOpacity 
                            style={styles.avatarCircle} 
                            activeOpacity={0.8}
                            onPress={() => navigation.navigate('Profile')}
                        >
                            <Text style={styles.avatarText}>
                                {getInitials(user?.name || user?.username)}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <View style={styles.titleArea}>
                        <Text style={styles.titleText} numberOfLines={1}>{title}</Text>
                        <Text style={styles.subtitleText} numberOfLines={1}>
                            {subtitle || getDateString()}
                        </Text>
                    </View>
                </View>

                {/* Right Section: Clean Modern Action Shell with Alert Indicator */}
                <View style={styles.rightSection}>
                    <TouchableOpacity style={styles.actionBtn} activeOpacity={0.75}>
                        <Ionicons name="notifications-outline" size={21} color="#1E293B" />
                        {/* Tiny dynamic visual accent dot */}
                        <View style={styles.notificationDot} />
                    </TouchableOpacity>
                </View>

            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9', // Ultra clean flat pixel border divider
        zIndex: 100,
    },
    container: {
        height: 64, // Elegantly spaced vertical height for breathable typography
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
        backgroundColor: '#EEF2FF', // Brand indigo tint
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
        color: '#1E293B', // Heavy high-contrast slate for dynamic hierarchy
        letterSpacing: -0.5,
    },
    subtitleText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#94A3B8',
        textTransform: 'uppercase',
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
        top: 10,
        right: 10,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#EF4444', // Alert accent
        borderWidth: 1,
        borderColor: '#FFFFFF',
    }
});

export default Header;
