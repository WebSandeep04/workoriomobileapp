import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import AttandanceScreen from '../screens/AttandanceScreen';
import BottomNavigator from './BottomNavigator';
const Stack = createStackNavigator();

const StackNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="BottomTabs" component={BottomNavigator} />
      <Stack.Screen name="Attandance" component={AttandanceScreen} />
    </Stack.Navigator>
  );
};

export default StackNavigator;
