import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import DrawerNavigator from './DrawerNavigator';
import LeadRemarkScreen from '../screens/LeadRemark/LeadRemarkScreen';

const Stack = createStackNavigator();

const StackNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      {/* Primary System Auth Hub */}
      <Stack.Screen name="Login" component={LoginScreen} />
      
      {/* Primary Application Hub (Encloses all internal app logic within unified Drawer navigation) */}
      <Stack.Screen name="MainDrawer" component={DrawerNavigator} />
      
      {/* Transient Detail Overlays (Requires isolated stack history without persistent drawer context) */}
      <Stack.Screen name="LeadRemark" component={LeadRemarkScreen} />
    </Stack.Navigator>
  );
};

export default StackNavigator;
