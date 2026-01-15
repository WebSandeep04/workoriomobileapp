import { View, Text, StyleSheet } from 'react-native';
const Subscription = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Subscription</Text>
        </View>
    );
};

export default Subscription;
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