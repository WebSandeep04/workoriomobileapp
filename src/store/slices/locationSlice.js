import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';

const initialState = {
    isTracking: false,
    lastKnownLocation: null,
    lastSyncTime: null,
    error: null,
};

export const syncLocation = createAsyncThunk(
    'location/sync',
    async ({ latitude, longitude, employee_id }, { rejectWithValue }) => {
        try {
            console.log(`[LocationSlice] Syncing: ${latitude}, ${longitude}`);
            const response = await api.post('/employee/location', {
                employee_id,
                latitude,
                longitude
            });
            return {
                data: response.data,
                coords: { latitude, longitude },
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('[LocationSlice] Sync Error:', error.response?.data);
            return rejectWithValue(error.response?.data?.message || 'Location sync failed');
        }
    }
);

const locationSlice = createSlice({
    name: 'location',
    initialState,
    reducers: {
        setTrackingState: (state, action) => {
            state.isTracking = action.payload;
        },
        clearLocationError: (state) => {
            state.error = null;
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(syncLocation.pending, (state) => {
                state.error = null;
            })
            .addCase(syncLocation.fulfilled, (state, action) => {
                state.lastKnownLocation = action.payload.coords;
                state.lastSyncTime = action.payload.timestamp;
            })
            .addCase(syncLocation.rejected, (state, action) => {
                state.error = action.payload;
            });
    }
});

export const { setTrackingState, clearLocationError } = locationSlice.actions;
export default locationSlice.reducer;
