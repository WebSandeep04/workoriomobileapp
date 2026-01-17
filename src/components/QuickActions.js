import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';

const ActionItem = ({ title, icon, onPress }) => (
    <TouchableOpacity style={styles.itemContainer} onPress={onPress}>
        <View style={styles.iconBox}>
            <Ionicons name={icon} size={28} color="#434AFA" />
        </View>
        <Text style={styles.label}>{title}</Text>
    </TouchableOpacity>
);

const QuickActions = ({ actions = [] }) => {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            {actions.map((action, index) => (
                <ActionItem
                    key={action.id || index}
                    title={action.title}
                    icon={action.icon}
                    onPress={() => {
                        if (action.route) {
                            navigation.navigate(action.route, action.params);
                        } else if (action.onPress) {
                            action.onPress();
                        }
                    }}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    itemContainer: {
        alignItems: 'center',
        flex: 1,
    },
    iconBox: {
        width: 65,
        height: 65,
        backgroundColor: '#F3F4F6', // Light grey matching the image
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    label: {
        fontSize: 12,
        color: '#1F2937',
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 16,
    },
});

export default QuickActions;
