import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';
import Toast from 'react-native-toast-message';

const initialState = {
    leaveTypes: [],
    history: [],
    pendingApprovals: [], // For manager view
    employeeTrail: { leaves: [], balances: [] }, // Specific employee audit trail
    loadingTypes: false,
    loadingHistory: false,
    loadingApprovals: false,
    loadingTrail: false, // Trail fetch loading
    submitting: false,
    actionLoading: false,
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
                dispatch(fetchLeaveTypes()); // Refresh dynamic balances
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

export const cancelLeave = createAsyncThunk(
    'leave/cancel',
    async (leaveId, { rejectWithValue, dispatch }) => {
        try {
            const response = await api.delete(`/leave/${leaveId}`);
            if (response.data?.success) {
                dispatch(fetchLeaveHistory());
                dispatch(fetchLeaveTypes()); // Refunds balance
                return response.data.message || 'Leave cancelled successfully.';
            }
            return rejectWithValue('Failed to cancel leave.');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to cancel leave');
        }
    }
);

// ====================================================
// Manager Auditing Actions
// ====================================================
export const fetchLeaveApprovals = createAsyncThunk(
    'leave/fetchApprovals',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/leave/approvals');
            if (response.data?.success) {
                return response.data.data || [];
            }
            return rejectWithValue('Failed to fetch approvals list');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch pending leave approvals');
        }
    }
);

export const fetchEmployeeLeaveHistory = createAsyncThunk(
    'leave/fetchEmployeeTrail',
    async (userId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/leave/user-history/${userId}`);
            if (response.data?.success) {
                return {
                    leaves: response.data.data || [],
                    balances: response.data.balances || []
                };
            }
            return rejectWithValue('Failed to fetch employee audit trail.');
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to fetch annual history trail.';
            Toast.show({
                type: 'error',
                text1: 'Trail Fetch Error',
                text2: msg
            });
            return rejectWithValue(msg);
        }
    }
);

export const approveLeave = createAsyncThunk(
    'leave/approve',
    async (id, { rejectWithValue }) => {
        try {
            const response = await api.post(`/leave/${id}/approve`);
            if (response.data?.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Approved',
                    text2: response.data.message || 'Leave request approved successfully.',
                });
                return { id, message: response.data.message };
            }
            return rejectWithValue(response.data?.message || 'Failed to approve leave');
        } catch (error) {
            const msg = error.response?.data?.message || 'Approval submission failed';
            Toast.show({ type: 'error', text1: 'Error', text2: msg });
            return rejectWithValue(msg);
        }
    }
);

export const rejectLeave = createAsyncThunk(
    'leave/reject',
    async ({ id, reason }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/leave/${id}/reject`, { reason });
            if (response.data?.success) {
                Toast.show({
                    type: 'success',
                    text1: 'Rejected',
                    text2: response.data.message || 'Leave request rejected.',
                });
                return { id, message: response.data.message };
            }
            return rejectWithValue(response.data?.message || 'Failed to reject leave');
        } catch (error) {
            const msg = error.response?.data?.message || 'Rejection submission failed';
            Toast.show({ type: 'error', text1: 'Error', text2: msg });
            return rejectWithValue(msg);
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
        },
        clearEmployeeTrail: (state) => {
            state.employeeTrail = { leaves: [], balances: [] };
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
            })
            
            // Cancel Leave
            .addCase(cancelLeave.pending, (state) => {
                state.submitting = true;
                state.error = null;
            })
            .addCase(cancelLeave.fulfilled, (state, action) => {
                state.submitting = false;
                state.successMessage = action.payload;
            })
            .addCase(cancelLeave.rejected, (state, action) => {
                state.submitting = false;
                state.error = action.payload;
            })

            // Manager approvals tracking
            .addCase(fetchLeaveApprovals.pending, (state) => {
                state.loadingApprovals = true;
                state.error = null;
            })
            .addCase(fetchLeaveApprovals.fulfilled, (state, action) => {
                state.loadingApprovals = false;
                state.pendingApprovals = action.payload;
            })
            .addCase(fetchLeaveApprovals.rejected, (state, action) => {
                state.loadingApprovals = false;
                state.error = action.payload;
            })

            // Employee Trail Auditing
            .addCase(fetchEmployeeLeaveHistory.pending, (state) => {
                state.loadingTrail = true;
                state.error = null;
            })
            .addCase(fetchEmployeeLeaveHistory.fulfilled, (state, action) => {
                state.loadingTrail = false;
                state.employeeTrail = action.payload;
            })
            .addCase(fetchEmployeeLeaveHistory.rejected, (state, action) => {
                state.loadingTrail = false;
                state.error = action.payload;
            })

            // Actions matchers tracking
            .addMatcher(
                (action) => [approveLeave.pending.type, rejectLeave.pending.type].includes(action.type),
                (state) => { state.actionLoading = true; }
            )
            .addMatcher(
                (action) => [
                    approveLeave.fulfilled.type, approveLeave.rejected.type,
                    rejectLeave.fulfilled.type, rejectLeave.rejected.type
                ].includes(action.type),
                (state) => { state.actionLoading = false; }
            );
    }
});

export const { clearLeaveMessages, clearEmployeeTrail } = leaveSlice.actions;
export default leaveSlice.reducer;
