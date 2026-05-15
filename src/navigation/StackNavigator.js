import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoginScreen from '../screens/LoginScreen';
import DrawerNavigator from './DrawerNavigator';
import LeadRemarkScreen from '../screens/LeadRemark/LeadRemarkScreen';
import IndiaMartRemarkScreen from '../screens/LeadRemark/IndiaMartRemarkScreen';
import CallingRemarkScreen from '../screens/Calling/CallingRemarkScreen';
import ProjectDetailsScreen from '../screens/ProjectDetailsScreen';

const Stack = createStackNavigator();

const StackNavigator = () => {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFF' }} edges={['bottom']}>
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        {/* Primary System Auth Hub */}
        <Stack.Screen name="Login" component={LoginScreen} />
        
        {/* Primary Application Hub (Encloses all internal app logic within unified Drawer navigation) */}
        <Stack.Screen name="MainDrawer" component={DrawerNavigator} />
        
        {/* Transient Detail Overlays (Requires isolated stack history without persistent drawer context) */}
        <Stack.Screen name="LeadRemark" component={LeadRemarkScreen} />
        <Stack.Screen name="IndiaMartRemark" component={IndiaMartRemarkScreen} />
        <Stack.Screen name="CallingRemark" component={CallingRemarkScreen} />
        <Stack.Screen name="ProjectDetails" component={ProjectDetailsScreen} />
      </Stack.Navigator>
    </SafeAreaView>
  );
};

export default StackNavigator;
