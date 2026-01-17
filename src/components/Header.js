import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const Header = ({ title = "Dashboard", subtitle }) => {
    const navigation = useNavigation();

    // Helper to get formatted date string if no subtitle is provided
    const getDateString = () => {
        const date = new Date();
        const options = { month: 'long', day: 'numeric', year: 'numeric' };
        return `${date.toLocaleDateString('en-US', options)}`; // Mocking task count as per design
    };

    return (
        <SafeAreaView edges={['top']} style={styles.safeArea}>
            <View style={styles.container}>
                {/* Left: Avatar */}
                <View style={styles.leftContainer}>
                    <TouchableOpacity style={styles.avatarContainer} onPress={() => navigation.navigate('Profile')}>
                        <Ionicons name="person" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {/* Center: Title and Date */}
                <View style={styles.titleContainer} pointerEvents="none">
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle || getDateString()}</Text>
                </View>

                {/* Right: Notification */}
                <View style={styles.rightContainer}>
                    <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="notifications-outline" size={24} color="#D02090" />
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        zIndex: 100,
    },
    container: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: '#fff',
        position: 'relative', // Ensure absolute positioning works relative to this
    },
    leftContainer: {
        justifyContent: 'center',
        alignItems: 'flex-start',
        zIndex: 10, // Ensure clickable
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#434AFA', // Blue color from previous theme
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    titleContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1, // Behind buttons
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
        color: '#888',
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        zIndex: 10, // Ensure clickable
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    }
});

export default Header;
