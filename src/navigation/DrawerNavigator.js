import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { CustomDrawerContent } from './CustomDrawerContent';
import BottomNavigator from './BottomNavigator';
import AttandanceScreen from '../screens/AttandanceScreen';
import AttandanceSummary from '../screens/AttandanceSummary';
import ApplyLeave from '../screens/ApplyLeave';
import LeaveBalance from '../screens/LeaveBalance';
import Scanner from '../screens/Scanner';
import ProfileScreen from '../screens/ProfileScreen';
import LeadRemarkScreen from '../screens/LeadRemark/LeadRemarkScreen';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="MainTabs"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Drawer.Screen name="MainTabs" component={BottomNavigator} />
      <Drawer.Screen name="Attandance" component={AttandanceScreen} />
      <Drawer.Screen name="AttandanceSummary" component={AttandanceSummary} />
      <Drawer.Screen name="ApplyLeave" component={ApplyLeave} />
      <Drawer.Screen name="LeaveBalance" component={LeaveBalance} />
      <Drawer.Screen name="Scanner" component={Scanner} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      <Drawer.Screen name="LeadRemark" component={LeadRemarkScreen} />
    </Drawer.Navigator>
  );
}
