import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import AttandanceScreen from '../screens/AttandanceScreen';
import AttandanceSummary from '../screens/AttandanceSummary';
import ApplyLeave from '../screens/ApplyLeave';
import LeaveBalance from '../screens/LeaveBalance';
import BottomNavigator from './BottomNavigator';
import ProfileScreen from '../screens/ProfileScreen';
import Scanner from '../screens/Scanner';
import LeadRemarkScreen from '../screens/LeadRemark/LeadRemarkScreen';

const Stack = createStackNavigator();

const StackNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="BottomTabs" component={BottomNavigator} />
      <Stack.Screen name="Attandance" component={AttandanceScreen} />
      <Stack.Screen name="AttandanceSummary" component={AttandanceSummary} />
      <Stack.Screen name="ApplyLeave" component={ApplyLeave} />
      <Stack.Screen name="LeaveBalance" component={LeaveBalance} />
      <Stack.Screen name="Scanner" component={Scanner} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="LeadRemark" component={LeadRemarkScreen} />
    </Stack.Navigator>
  );
};

export default StackNavigator;
