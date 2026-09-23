/**
 * @format
 */

import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { AppRegistry } from 'react-native';
import app from '@react-native-firebase/app';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

// Register background handler
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
