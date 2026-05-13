import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import StackNavigator from './StackNavigator';
import { AuthProvider } from './AuthContext';

const AppNavigator = () => {
    return (
        <AuthProvider>
            <SafeAreaProvider>
                <NavigationContainer>
                    <StackNavigator />
                </NavigationContainer>
            </SafeAreaProvider>
        </AuthProvider>
    );
};

export default AppNavigator;