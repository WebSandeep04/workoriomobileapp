import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Header from '../components/Header';
import { useAppDispatch } from '../store/hooks';
import { logoutUser } from '../store/slices/authSlice';
import { styles } from '../css/ProfileScreenStyles';

const ProfileScreen = () => {
    const navigation = useNavigation();
    const dispatch = useAppDispatch();

    const handleLogout = () => {
        Alert.alert(
            "Logout",
            "Are you sure you want to logout?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Logout",
                    style: 'destructive',
                    onPress: async () => {
                        await dispatch(logoutUser());
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Login' }],
                        });
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Header title="Profile" subtitle="Manage your account" />
            <View style={styles.content}>
                <Text style={styles.placeholderText}>User Profile Details Here</Text>

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>Logout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

export default ProfileScreen;
