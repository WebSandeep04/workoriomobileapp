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
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

