import { useEffect } from 'react';
import { Platform } from 'react-native';
import app from '@react-native-firebase/app';
import { getMessaging, requestPermission, getToken, onMessage, AuthorizationStatus } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import client from '../api/client';

const usePushNotifications = () => {
  useEffect(() => {
    requestUserPermission();
    setupForegroundMessageListener();
  }, []);

  const requestUserPermission = async () => {
    if (Platform.OS === 'ios') {
      const authStatus = await requestPermission(getMessaging());
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('Authorization status:', authStatus);
        getFcmToken();
      }
    } else {
      // Android
      // Notifee can be used to request Android 13+ permissions
      await notifee.requestPermission();
      getFcmToken();
    }
  };

  const getFcmToken = async () => {
    try {
      const token = await getToken(getMessaging());
      console.log('FCM Token:', token);
      // TODO: Send this token to Laravel Backend API
      sendTokenToBackend(token);
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  };

  const sendTokenToBackend = async (token) => {
    try {
      // Sending token to Laravel Backend API
      await client.post('/user/fcm-token', { fcm_token: token });
      console.log('Token successfully sent to backend');
    } catch (error) {
      console.error('Failed to send token to backend:', error);
    }
  };

  const setupForegroundMessageListener = () => {
    const unsubscribe = onMessage(getMessaging(), async remoteMessage => {
      console.log('A new FCM message arrived in the foreground!', remoteMessage);
      
      // Display a local notification using Notifee
      await displayLocalNotification(remoteMessage);
    });

    return unsubscribe;
  };

  const displayLocalNotification = async (remoteMessage) => {
    // Create a channel (required for Android)
    const channelId = await notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });

    // Display a notification
    await notifee.displayNotification({
      title: remoteMessage.notification?.title || 'New Notification',
      body: remoteMessage.notification?.body || '',
      android: {
        channelId,
        // smallIcon: 'ic_launcher', // Default icon
        pressAction: {
          id: 'default',
        },
      },
    });
  };
};

export default usePushNotifications;
