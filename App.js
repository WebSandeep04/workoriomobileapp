import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { store } from './src/store/store';
import AppNavigator from './src/navigation/AppNavigator';
import { initAuth } from './src/store/slices/authSlice';

function App() {
  useEffect(() => {
    store.dispatch(initAuth());
  }, []);
  return (
    <Provider store={store}>
      <AppNavigator />
    </Provider>
  );
}

export default App;