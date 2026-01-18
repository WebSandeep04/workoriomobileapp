import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import LeadScreen from '../screens/LeadScreen';

import Header from '../components/Header';
import Subscription from '../screens/Subscription';
import TimeSheet from '../screens/TimeSheet';
import Task from '../screens/Task';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                header: ({ options }) => {
                    const title = options.title !== undefined ? options.title : route.name;
                    return <Header title={title} />;
                },
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'TimeSheet') {
                        iconName = focused ? 'time' : 'time-outline';
                    } else if (route.name === 'Task') {
                        iconName = focused ? 'list' : 'list-outline';
                    } else if (route.name === 'Lead') {
                        iconName = focused ? 'people' : 'people-outline';
                    } else if (route.name === 'Subscription') {
                        iconName = focused ? 'ticket' : 'ticket-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#434afa', // later make it #434afa
                tabBarInactiveTintColor: 'gray',
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="TimeSheet" component={TimeSheet} options={{ headerShown: false }} />
            <Tab.Screen name="Task" component={Task} options={{ headerShown: false }} />
            {/* <Tab.Screen name="Lead" component={LeadScreen} />
            <Tab.Screen name="Subscription" component={Subscription} /> */}
        </Tab.Navigator>
    );
}
