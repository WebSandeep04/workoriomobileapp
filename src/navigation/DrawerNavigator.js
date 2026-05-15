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
import TodaysCallingScreen from '../screens/Calling/TodaysCallingScreen';
import JunkCallingScreen from '../screens/Calling/JunkCallingScreen';
import TeamCallingScreen from '../screens/Calling/TeamCallingScreen';
import AssignedCallingScreen from '../screens/Calling/AssignedCallingScreen';
import ConvertedCallingScreen from '../screens/Calling/ConvertedCallingScreen';
import MyLeadGenScreen from '../screens/LeadGen/MyLeadGenScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import PettyCashScreen from '../screens/PettyCashScreen';
import PettyCashApprovalsScreen from '../screens/PettyCashApprovalsScreen';
import WorklogApprovalsScreen from '../screens/WorklogApprovalsScreen';
import LeaveApprovalsScreen from '../screens/LeaveApprovalsScreen';
import AttendanceUnlockScreen from '../screens/AttendanceUnlockScreen';
import AttendanceReportScreen from '../screens/AttendanceReportScreen';
import WorklogReportScreen from '../screens/WorklogReportScreen';
import TrackingReportScreen from '../screens/TrackingReportScreen';
import EmployeeScreen from '../screens/EmployeeScreen';
import CalendarScreen from '../screens/CalendarScreen';
import TrackingScreen from '../screens/TrackingScreen';

import ProjectsListScreen from '../screens/ProjectsListScreen';
import FaceAttendanceKioskScreen from '../screens/FaceAttendance/FaceAttendanceKioskScreen';

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
      <Drawer.Screen name="attendance.facekiosk" component={FaceAttendanceKioskScreen} />
      
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
      <Drawer.Screen name="calling.todays" component={TodaysCallingScreen} />
      <Drawer.Screen name="calling.junk" component={JunkCallingScreen} />
      <Drawer.Screen name="calling.team" component={TeamCallingScreen} />
      <Drawer.Screen name="calling.assigned" component={AssignedCallingScreen} />
      <Drawer.Screen name="calling.converted" component={ConvertedCallingScreen} />
      
      {/* Lead Generation */}
      <Drawer.Screen name="leadgen.my" component={MyLeadGenScreen} />
      
      {/* Subscription & Renewals */}
      <Drawer.Screen name="subscriptions.index" component={Subscription} />
      
      {/* Module Placeholders (Routes from menuConfig) */}
      <Drawer.Screen name="projects.index" component={ProjectsListScreen} />
      <Drawer.Screen name="tracking.index" component={TrackingScreen} />
      <Drawer.Screen name="employees.index" component={EmployeeScreen} />
      <Drawer.Screen name="calendar.index" component={CalendarScreen} />
      <Drawer.Screen name="petty-cash.index" component={PettyCashScreen} />
      <Drawer.Screen name="approvals.petty" component={PettyCashApprovalsScreen} />
      <Drawer.Screen name="worklog-approvals" component={WorklogApprovalsScreen} />
      <Drawer.Screen name="leave.approvals" component={LeaveApprovalsScreen} />
      <Drawer.Screen name="attendance.unlock" component={AttendanceUnlockScreen} />
      <Drawer.Screen name="attendance.report" component={AttendanceReportScreen} />
      <Drawer.Screen name="reports.worklog" component={WorklogReportScreen} />
      <Drawer.Screen name="tracking.report" component={TrackingReportScreen} />
      <Drawer.Screen name="contactmanagement.index" component={PlaceholderScreen} />
      <Drawer.Screen name="asset-management.index" component={PlaceholderScreen} />
      
    </Drawer.Navigator>
  );
}
