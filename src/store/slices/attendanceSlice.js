import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';

const initialState = {
    status: {
        office: {
            status: "Loading...",
            badge_class: "badge-secondary",
            can_start: false,
            can_end: false,
            last_action_time: null
        },
        field: {
            status: "Loading...",
            badge_class: "badge-secondary",
            can_start: false,
            can_end: false,
            last_action_time: null
        },
        break: {
            status: "Loading...",
            badge_class: "badge-secondary",
            can_start: false,
            can_end: false
        }
    },
    worklogValidation: {
        can_perform_attendance: true,
        message: ""
    },
    loading: true,
    actionLoading: false,
    error: null,
    validationError: null, // For 422 / Late reason triggers
    successMessage: null,
};

export const fetchAttendanceStatus = createAsyncThunk(
    'attendance/fetchStatus',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/attendance/today-status');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch status');
        }
    }
);

export const punchIn = createAsyncThunk(
    'attendance/punchIn',
    async ({ type, reason }, { rejectWithValue, dispatch }) => {
        try {
            const payload = { movement_type: type };
            if (reason) payload.late_reason = reason;

            const response = await api.post('/attendance/punch-in', payload);
            if (response.data?.success) {
                dispatch(fetchAttendanceStatus()); // Refresh status immediately
                return response.data.message || `Punched In (${type}) successfully!`;
            }
            return rejectWithValue("Unknown error occurred");
        } catch (error) {
            if (error.response?.status === 422) {
                // Pass the full data object for the UI to check 'require_late_reason'
                return rejectWithValue({
                    status: 422,
                    data: error.response.data
                });
            }
            return rejectWithValue({
                status: error.response?.status,
                message: error.response?.data?.message || 'Punch In Failed'
            });
        }
    }
);

export const punchOut = createAsyncThunk(
    'attendance/punchOut',
    async ({ type }, { rejectWithValue, dispatch }) => {
        try {
            const response = await api.post('/attendance/punch-out', { movement_type: type });
            if (response.data?.success) {
                dispatch(fetchAttendanceStatus());
                return response.data.message || `Punched Out (${type}) successfully!`;
            }
            return rejectWithValue("Unknown error occurred");
        } catch (error) {
            return rejectWithValue({
                status: error.response?.status,
                message: error.response?.data?.message || 'Punch Out Failed'
            });
        }
    }
);

export const toggleBreak = createAsyncThunk(
    'attendance/toggleBreak',
    async ({ action }, { rejectWithValue, dispatch }) => {
        const endpoint = action === 'start' ? '/attendance/break/start' : '/attendance/break/end';
        try {
            const response = await api.post(endpoint);
            if (response.data?.success) {
                dispatch(fetchAttendanceStatus());
                return response.data.message || (action === 'start' ? "Break Started" : "Break Ended");
            }
            return rejectWithValue("Unknown error occurred");
        } catch (error) {
            return rejectWithValue({
                status: error.response?.status,
                message: error.response?.data?.message || 'Break action failed'
            });
        }
    }
);

const attendanceSlice = createSlice({
    name: 'attendance',
    initialState,
    reducers: {
        clearMessages: (state) => {
            state.error = null;
            state.validationError = null;
            state.successMessage = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Status
            .addCase(fetchAttendanceStatus.pending, (state) => {
                // Only set loading true if it's the first load or a hard refresh? 
                // We'll keep it simple for now and set it true to show spinner/refresher
                if (state.status.office.status === 'Loading...') {
                    state.loading = true;
                }
            })
            .addCase(fetchAttendanceStatus.fulfilled, (state, action) => {
                state.loading = false;
                const { status, worklog_validation } = action.payload;
                if (status) state.status = status;
                if (worklog_validation) state.worklogValidation = worklog_validation;
            })
            .addCase(fetchAttendanceStatus.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Punch In
            .addCase(punchIn.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
                state.validationError = null;
            })
            .addCase(punchIn.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload;
            })
            .addCase(punchIn.rejected, (state, action) => {
                state.actionLoading = false;
                if (action.payload?.status === 422) {
                    state.validationError = action.payload.data;
                } else {
                    state.error = action.payload?.message || "Punch In Failed";
                }
            })

            // Punch Out
            .addCase(punchOut.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
            })
            .addCase(punchOut.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload;
            })
            .addCase(punchOut.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload?.message || "Punch Out Failed";
            })

            // Break
            .addCase(toggleBreak.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
            })
            .addCase(toggleBreak.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload;
            })
            .addCase(toggleBreak.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload?.message || "Break action failed";
            });
    }
});

export const { clearMessages } = attendanceSlice.actions;
export default attendanceSlice.reducer;
