import React, { useEffect } from 'react';
import Toast from 'react-native-toast-message';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { initAuth } from './src/store/slices/authSlice';

import LocationTracker from './src/components/LocationTracker/LocationTracker';

function App() {
  useEffect(() => {
    store.dispatch(initAuth());
  }, []);
  return (
    <Provider store={store}>
      <AppNavigator />
      <LocationTracker />
      <Toast />
    </Provider>
  );
}

export default App;