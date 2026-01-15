import { View, Text, StyleSheet } from 'react-native';
const LeadScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>LeadScreen</Text>
        </View>
    );
};

export default LeadScreen;
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    text: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
});