import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import LeadScreen from '../screens/LeadScreen';
import Header from '../components/Header';
import Subscription from '../screens/Subscription';
import TimeSheet from '../screens/TimeSheet';
import Task from '../screens/Task';
import { AuthContext } from './AuthContext';
import { bottomTabsConfig } from './menuConfig';
import { canViewMenuItem } from './permissionsHelper';

const Tab = createBottomTabNavigator();

const componentMap = {
  Home: HomeScreen,
  TimeSheet: TimeSheet,
  Task: Task,
  Lead: LeadScreen,
  Subscription: Subscription
};

export default function BottomTabs() {
  const { user, permissions, featureFlags } = useContext(AuthContext);

  const visibleTabs = bottomTabsConfig.filter(tab => 
    canViewMenuItem(tab, permissions, featureFlags, user?.role_name)
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        header: ({ options }) => {
          const title = options.title !== undefined ? options.title : route.name;
          return <Header title={title} />;
        },
        tabBarIcon: ({ focused, color, size }) => {
          const tabConfig = bottomTabsConfig.find(t => t.name === route.name);
          const iconName = tabConfig 
            ? (focused ? tabConfig.icon : (tabConfig.iconOutline || tabConfig.icon)) 
            : 'apps-outline';
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#434afa',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      {visibleTabs.map(tab => {
        const Comp = componentMap[tab.name];
        if (!Comp) return null;
        return (
          <Tab.Screen 
            key={tab.name}
            name={tab.name} 
            component={Comp} 
            options={{ headerShown: tab.name === 'Home' ? undefined : false }} 
          />
        );
      })}
    </Tab.Navigator>
  );
}
