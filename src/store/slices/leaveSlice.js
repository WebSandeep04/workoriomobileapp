import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';

const initialState = {
    leaveTypes: [],
    history: [],
    loadingTypes: false,
    loadingHistory: false,
    submitting: false,
    error: null,
    validationErrors: null,
    successMessage: null,
};

export const fetchLeaveTypes = createAsyncThunk(
    'leave/fetchTypes',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/leave/types');
            if (response.data?.success) {
                return response.data.data;
            }
            return rejectWithValue('Failed to fetch leave types');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch leave types');
        }
    }
);

export const fetchLeaveHistory = createAsyncThunk(
    'leave/fetchHistory',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/leave');
            if (response.data?.success) {
                return response.data.data;
            }
            return rejectWithValue('Failed to fetch leave history');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch leave history');
        }
    }
);

export const applyLeave = createAsyncThunk(
    'leave/apply',
    async (payload, { rejectWithValue, dispatch }) => {
        try {
            const response = await api.post('/leave', payload);
            if (response.data?.success) {
                dispatch(fetchLeaveHistory()); // Refresh history on success
                return response.data.message || 'Leave applied successfully.';
            }
            return rejectWithValue('Unknown error occurred');
        } catch (error) {
            if (error.response?.status === 422) {
                return rejectWithValue({
                    status: 422,
                    errors: error.response.data?.errors || {},
                    message: error.response.data?.message || 'Validation Failed'
                });
            }
            return rejectWithValue({
                status: error.response?.status,
                message: error.response?.data?.message || 'Failed to apply leave'
            });
        }
    }
);

const leaveSlice = createSlice({
    name: 'leave',
    initialState,
    reducers: {
        clearLeaveMessages: (state) => {
            state.error = null;
            state.successMessage = null;
            state.validationErrors = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Types
            .addCase(fetchLeaveTypes.pending, (state) => {
                state.loadingTypes = true;
                state.error = null;
            })
            .addCase(fetchLeaveTypes.fulfilled, (state, action) => {
                state.loadingTypes = false;
                state.leaveTypes = action.payload;
            })
            .addCase(fetchLeaveTypes.rejected, (state, action) => {
                state.loadingTypes = false;
                state.error = action.payload;
            })

            // Fetch History
            .addCase(fetchLeaveHistory.pending, (state) => {
                state.loadingHistory = true;
                state.error = null;
            })
            .addCase(fetchLeaveHistory.fulfilled, (state, action) => {
                state.loadingHistory = false;
                state.history = action.payload;
            })
            .addCase(fetchLeaveHistory.rejected, (state, action) => {
                state.loadingHistory = false;
                state.error = action.payload;
            })

            // Apply Leave
            .addCase(applyLeave.pending, (state) => {
                state.submitting = true;
                state.error = null;
                state.validationErrors = null;
                state.successMessage = null;
            })
            .addCase(applyLeave.fulfilled, (state, action) => {
                state.submitting = false;
                state.successMessage = action.payload;
            })
            .addCase(applyLeave.rejected, (state, action) => {
                state.submitting = false;
                if (action.payload?.status === 422) {
                    state.validationErrors = action.payload.errors;
                    state.error = action.payload.message;
                } else {
                    state.error = action.payload?.message || "Failed to apply leave";
                }
            });
    }
});

export const { clearLeaveMessages } = leaveSlice.actions;
export default leaveSlice.reducer;
