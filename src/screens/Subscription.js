import { View, Text, StyleSheet } from 'react-native';
import Header from '../components/Header';

const Subscription = () => {
    return (
        <View style={{ flex: 1 }}>
            <Header title="Subscription" />
            <View style={styles.container}>
                <Text style={styles.text}>Subscription</Text>
            </View>
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