import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import attendanceReducer from './slices/attendanceSlice';
import leaveReducer from './slices/leaveSlice';
import worklogReducer from './slices/worklogSlice';
import taskReducer from './slices/taskSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    attendance: attendanceReducer,
    leave: leaveReducer,
    worklog: worklogReducer,
    task: taskReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

