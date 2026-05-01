import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../screens/LoginScreen';
import AttandanceScreen from '../screens/AttandanceScreen';
import AttandanceSummary from '../screens/AttandanceSummary';
import ApplyLeave from '../screens/ApplyLeave';
import LeaveBalance from '../screens/LeaveBalance';
import BottomNavigator from './BottomNavigator';
import DrawerNavigator from './DrawerNavigator';
import ProfileScreen from '../screens/ProfileScreen';
import Scanner from '../screens/Scanner';
import LeadRemarkScreen from '../screens/LeadRemark/LeadRemarkScreen';
import TimeSheet from '../screens/TimeSheet';
import Task from '../screens/Task';
import LeadScreen from '../screens/LeadScreen';

const Stack = createStackNavigator();

const StackNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="MainDrawer" component={DrawerNavigator} />
      <Stack.Screen name="BottomTabs" component={BottomNavigator} />
      <Stack.Screen name="Attandance" component={AttandanceScreen} />
      <Stack.Screen name="AttandanceSummary" component={AttandanceSummary} />
      <Stack.Screen name="ApplyLeave" component={ApplyLeave} />
      <Stack.Screen name="LeaveBalance" component={LeaveBalance} />
      <Stack.Screen name="Scanner" component={Scanner} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="LeadRemark" component={LeadRemarkScreen} />
      
      {/* TimeSheet & Worklog routes */}
      <Stack.Screen name="worklog" component={TimeSheet} />
      <Stack.Screen 
        name="worklog-history" 
        component={TimeSheet} 
        initialParams={{ activeTab: 'history' }} 
      />

      {/* Task & Reminders routes */}
      <Stack.Screen 
        name="all-tasks.index" 
        component={Task} 
        initialParams={{ activeTab: 'assigned' }} 
      />
      <Stack.Screen 
        name="task.index" 
        component={Task} 
        initialParams={{ activeTab: 'created' }} 
      />
      <Stack.Screen 
        name="my-tasks.index" 
        component={Task} 
        initialParams={{ activeTab: 'assigned' }} 
      />

      {/* Sales & CRM routes */}
      <Stack.Screen name="alldata" component={LeadScreen} />
      <Stack.Screen name="myleads" component={LeadScreen} />
      <Stack.Screen name="teamleads" component={LeadScreen} />
      <Stack.Screen name="assignedleads" component={LeadScreen} />
      <Stack.Screen 
        name="followup" 
        component={LeadScreen} 
        initialParams={{ filterType: 'today_followups' }} 
      />
      <Stack.Screen name="quotation" component={LeadScreen} />
      <Stack.Screen name="payment-followup" component={LeadScreen} />
      <Stack.Screen name="formbuilder.index" component={LeadScreen} />
      <Stack.Screen name="indiamart.index" component={LeadScreen} />
      <Stack.Screen name="indiamart.junk.index" component={LeadScreen} />
    </Stack.Navigator>
  );
};

export default StackNavigator;
