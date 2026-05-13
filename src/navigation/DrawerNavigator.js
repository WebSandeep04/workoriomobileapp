import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { CustomDrawerContent } from './CustomDrawerContent';
import HomeScreen from '../screens/HomeScreen';
import AttandanceScreen from '../screens/AttandanceScreen';
import AttandanceSummary from '../screens/AttandanceSummary';
import ApplyLeave from '../screens/ApplyLeave';
import LeaveBalance from '../screens/LeaveBalance';
import Scanner from '../screens/Scanner';
import ProfileScreen from '../screens/ProfileScreen';
import TimeSheet from '../screens/TimeSheet';
import Task from '../screens/Task';
import LeadScreen from '../screens/LeadScreen';
import Subscription from '../screens/Subscription';
import IndiaMartLeadScreen from '../screens/IndiaMartLeadScreen';
import CallingAllScreen from '../screens/Calling/CallingAllScreen';
import CallingListScreen from '../screens/Calling/CallingListScreen';
import CallingCampaignScreen from '../screens/Calling/CallingCampaignScreen';
import CallingLockScreen from '../screens/Calling/CallingLockScreen';
import MyCallingScreen from '../screens/Calling/MyCallingScreen';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      initialRouteName="Home"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {/* Base & Root */}
      <Drawer.Screen name="Home" component={HomeScreen} />
      
      {/* Attendance Management mapped to menuConfig.js keys */}
      <Drawer.Screen name="attendance" component={AttandanceScreen} />
      <Drawer.Screen name="attendance.history" component={AttandanceSummary} />
      <Drawer.Screen name="leave.index" component={ApplyLeave} />
      
      {/* Core App Views */}
      <Drawer.Screen name="Attandance" component={AttandanceScreen} />
      <Drawer.Screen name="AttandanceSummary" component={AttandanceSummary} />
      <Drawer.Screen name="ApplyLeave" component={ApplyLeave} />
      <Drawer.Screen name="LeaveBalance" component={LeaveBalance} />
      <Drawer.Screen name="Scanner" component={Scanner} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
      
      {/* Worklog & Timesheet Section */}
      <Drawer.Screen name="worklog" component={TimeSheet} />
      <Drawer.Screen 
        name="worklog-history" 
        component={TimeSheet} 
        initialParams={{ activeTab: 'history' }} 
      />
      
      {/* Task & Reminders Section */}
      <Drawer.Screen 
        name="all-tasks.index" 
        component={Task} 
        initialParams={{ activeTab: 'assigned' }} 
      />
      <Drawer.Screen 
        name="task.index" 
        component={Task} 
        initialParams={{ activeTab: 'created' }} 
      />
      <Drawer.Screen 
        name="my-tasks.index" 
        component={Task} 
        initialParams={{ activeTab: 'assigned' }} 
      />
      
      {/* Sales & CRM Section */}
      <Drawer.Screen name="alldata" component={LeadScreen} />
      <Drawer.Screen name="myleads" component={LeadScreen} />
      <Drawer.Screen name="teamleads" component={LeadScreen} />
      <Drawer.Screen name="assignedleads" component={LeadScreen} />
      <Drawer.Screen 
        name="followup" 
        component={LeadScreen} 
        initialParams={{ filterType: 'today_followups' }} 
      />
      <Drawer.Screen name="quotation" component={LeadScreen} />
      <Drawer.Screen name="payment-followup" component={LeadScreen} />
      <Drawer.Screen name="formbuilder.index" component={LeadScreen} />
      <Drawer.Screen name="indiamart.index" component={IndiaMartLeadScreen} />
      <Drawer.Screen name="indiamart.junk.index" component={IndiaMartLeadScreen} />
      <Drawer.Screen name="calling.all" component={CallingAllScreen} />
      <Drawer.Screen name="calling.list.index" component={CallingListScreen} />
      <Drawer.Screen name="calling" component={CallingCampaignScreen} />
      <Drawer.Screen name="calling.lock" component={CallingLockScreen} />
      <Drawer.Screen name="calling.my" component={MyCallingScreen} />
      
      {/* Subscription & Renewals */}
      <Drawer.Screen name="subscriptions.index" component={Subscription} />
      
    </Drawer.Navigator>
  );
}
