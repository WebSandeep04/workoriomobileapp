import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import attendanceReducer from './slices/attendanceSlice';
import leaveReducer from './slices/leaveSlice';
import worklogReducer from './slices/worklogSlice';
import taskReducer from './slices/taskSlice';
import businessCardReducer from './slices/businessCardSlice';
import leadReducer from './slices/leadSlice';
import prospectReducer from './slices/prospectSlice';
import locationReducer from './slices/locationSlice';
import leadGenReducer from './slices/leadGenSlice';
import subscriptionReducer from './slices/subscriptionSlice';
import pettyCashReducer from './slices/pettyCashSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    attendance: attendanceReducer,
    leave: leaveReducer,
    worklog: worklogReducer,
    task: taskReducer,
    businessCard: businessCardReducer,
    lead: leadReducer,
    prospect: prospectReducer,
    location: locationReducer,
    leadGen: leadGenReducer,
    subscription: subscriptionReducer,
    pettyCash: pettyCashReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

