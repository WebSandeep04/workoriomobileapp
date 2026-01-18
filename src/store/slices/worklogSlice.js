import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';
import Toast from 'react-native-toast-message';

// Thunks
export const fetchFormData = createAsyncThunk(
    'worklog/fetchFormData',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/worklog/form-data');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchProjects = createAsyncThunk(
    'worklog/fetchProjects',
    async (customerId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/worklog/projects/${customerId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchServices = createAsyncThunk(
    'worklog/fetchServices',
    async ({ customerId, projectName }, { rejectWithValue }) => {
        try {
            const url = `/worklog/services/${customerId}${projectName ? `?project_name=${projectName}` : ''}`;
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchModules = createAsyncThunk(
    'worklog/fetchModules',
    async (serviceId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/worklog/modules/${serviceId}`);
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const validateDate = createAsyncThunk(
    'worklog/validateDate',
    async (date, { rejectWithValue }) => {
        try {
            const response = await api.post('/worklog/validate-date', { date });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const submitWorklog = createAsyncThunk(
    'worklog/submitWorklog',
    async (data, { rejectWithValue }) => {
        try {
            const response = await api.post('/worklog/submit', data);
            Toast.show({
                type: 'success',
                text1: 'Success',
                text2: response.data.message || 'Worklog submitted successfully',
            });
            return response.data;
        } catch (error) {
            const msg = error.response?.data?.message || 'Failed to submit worklog';
            Toast.show({
                type: 'error',
                text1: 'Error',
                text2: msg,
            });
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const fetchHistory = createAsyncThunk(
    'worklog/fetchHistory',
    async (params, { rejectWithValue }) => {
        try {
            const response = await api.get('/worklog/history', { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const deleteEntry = createAsyncThunk(
    'worklog/deleteEntry',
    async (id, { rejectWithValue }) => {
        try {
            const response = await api.delete(`/worklog/${id}`);
            Toast.show({
                type: 'success',
                text1: 'Deleted',
                text2: 'Entry deleted successfully',
            });
            return id; // Return id to remove from state
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const initialState = {
    loading: false,
    entryTypes: [],
    customers: [],
    projects: [],
    services: [],
    modules: [],
    history: {
        data: [],
        current_page: 1,
        total: 0
    },
    dateValidation: {
        isValid: true,
        message: ''
    },
    error: null,
};

const worklogSlice = createSlice({
    name: 'worklog',
    initialState,
    reducers: {
        clearProjects: (state) => {
            state.projects = [];
        },
        clearServices: (state) => {
            state.services = [];
        },
        clearModules: (state) => {
            state.modules = [];
        },
        resetDateValidation: (state) => {
            state.dateValidation = { isValid: true, message: '' };
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Form Data
            .addCase(fetchFormData.pending, (state) => { state.loading = true; })
            .addCase(fetchFormData.fulfilled, (state, action) => {
                state.loading = false;
                state.entryTypes = action.payload.entry_types || [];
                state.customers = action.payload.customers || [];
            })
            .addCase(fetchFormData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Fetch Projects
            .addCase(fetchProjects.fulfilled, (state, action) => {
                state.projects = action.payload.projects || [];
            })
            // Fetch Services
            .addCase(fetchServices.fulfilled, (state, action) => {
                state.services = action.payload.services || [];
            })
            // Fetch Modules
            .addCase(fetchModules.fulfilled, (state, action) => {
                state.modules = action.payload.modules || [];
            })
            // Validate Date
            .addCase(validateDate.fulfilled, (state, action) => {
                state.dateValidation = {
                    isValid: action.payload.success,
                    message: action.payload.message
                };
            })
            .addCase(validateDate.rejected, (state, action) => {
                state.dateValidation = {
                    isValid: false,
                    message: action.payload?.message || 'Date validation failed'
                };
            })
            // Submit Worklog
            .addCase(submitWorklog.pending, (state) => { state.loading = true; })
            .addCase(submitWorklog.fulfilled, (state) => {
                state.loading = false;
                // Maybe clear form or history refresh needed?
            })
            .addCase(submitWorklog.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Fetch History
            .addCase(fetchHistory.pending, (state) => { state.loading = true; })
            .addCase(fetchHistory.fulfilled, (state, action) => {
                state.loading = false;
                state.history = action.payload;
            })
            .addCase(fetchHistory.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Delete Entry
            .addCase(deleteEntry.fulfilled, (state, action) => {
                state.history.data = state.history.data.filter(item => item.id !== action.payload);
            });
    }
});

export const { clearProjects, clearServices, clearModules, resetDateValidation } = worklogSlice.actions;

export default worklogSlice.reducer;
