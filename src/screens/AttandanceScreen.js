import { View, Text, StyleSheet } from 'react-native';
const AttandanceScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>AttandanceScreen</Text>
        </View>
    );
};

export default AttandanceScreen;
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