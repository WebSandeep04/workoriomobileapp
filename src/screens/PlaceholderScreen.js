import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Header from '../components/Header';
import Ionicons from 'react-native-vector-icons/Ionicons';

const PlaceholderScreen = ({ route }) => {
    const screenName = route.name || 'Screen';
    
    // Clean up name to make it look nice
    let displayTitle = 'Module Under Development';
    if (screenName.includes('projects')) displayTitle = 'Projects & Tasks';
    else if (screenName.includes('tracking')) displayTitle = 'Live Tracking';
    else if (screenName.includes('petty-cash')) displayTitle = 'Petty Cash';
    else if (screenName.includes('contactmanagement')) displayTitle = 'Contact Management';
    else if (screenName.includes('asset-management')) displayTitle = 'Asset Management';

    return (
        <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
            <Header title={displayTitle} />
            <View style={styles.container}>
                <View style={styles.circle}>
                    <Ionicons name="construct-outline" size={48} color="#6366F1" />
                </View>
                <Text style={styles.title}>{displayTitle}</Text>
                <Text style={styles.subtitle}>This module is currently being integrated into the mobile platform. Check back soon!</Text>
            </View>
        </View>
    );
};

export default PlaceholderScreen;

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    circle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1E293B',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
    },
});
