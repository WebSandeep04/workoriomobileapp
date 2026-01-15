import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HomeScreen from '../screens/HomeScreen';
import LeadScreen from '../screens/LeadScreen';
import AttandanceScreen from '../screens/AttandanceScreen';
import Header from '../components/Header';
import Subscription from '../screens/Subscription';

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
                    } else if (route.name === 'Lead') {
                        iconName = focused ? 'people' : 'people-outline';
                    } else if (route.name === 'Attandance') {
                        iconName = focused ? 'calendar' : 'calendar-outline';
                    } else if (route.name === 'Subscription') {
                        iconName = focused ? 'ticket' : 'ticket-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#434AFA',
                tabBarInactiveTintColor: 'gray',
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Lead" component={LeadScreen} />
            <Tab.Screen name="Attandance" component={AttandanceScreen} />
            <Tab.Screen name="Subscription" component={Subscription} />
        </Tab.Navigator>
    );
}
