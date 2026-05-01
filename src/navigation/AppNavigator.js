import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import StackNavigator from './StackNavigator';
import { AuthProvider } from './AuthContext';

const AppNavigator = () => {
    return (
        <AuthProvider>
            <NavigationContainer>
                <StackNavigator />
            </NavigationContainer>
        </AuthProvider>
    );
};

export default AppNavigator;