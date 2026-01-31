import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';

const initialState = {
    prospects: [],
    currentProspect: null,
    pagination: {
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 15
    },
    loading: false,
    actionLoading: false,
    error: null,
    successMessage: null,
};

// 1. Fetch Prospects
export const fetchProspects = createAsyncThunk(
    'prospect/fetchProspects',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await api.get('/prospects', { params });
            // Handle { data: [...], ...pagination } or { data: { data: [...] } }
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch prospects');
        }
    }
);

// 2. Create Prospect
export const createProspect = createAsyncThunk(
    'prospect/createProspect',
    async (prospectData, { rejectWithValue }) => {
        try {
            const response = await api.post('/prospects', prospectData);
            if (response.data?.success || response.status === 201 || response.status === 200) {
                // Return the data object directly if possible, or the whole response
                // The 'data' field is crucial for auto-filling the lead form immediately after
                return response.data.data || response.data;
            }
            return rejectWithValue('Failed to create prospect');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create prospect');
        }
    }
);

const prospectSlice = createSlice({
    name: 'prospect',
    initialState,
    reducers: {
        clearProspectMessages: (state) => {
            state.error = null;
            state.successMessage = null;
        },
        resetCurrentProspect: (state) => {
            state.currentProspect = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Prospects
            .addCase(fetchProspects.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProspects.fulfilled, (state, action) => {
                state.loading = false;
                state.prospects = action.payload.data || [];
                state.pagination = {
                    current_page: action.payload.current_page || 1,
                    last_page: action.payload.last_page || 1,
                    total: action.payload.total || 0,
                    per_page: action.payload.per_page || 15
                };
            })
            .addCase(fetchProspects.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Create Prospect
            .addCase(createProspect.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(createProspect.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = "Prospect created successfully";
                state.currentProspect = action.payload; // Store detailed response
            })
            .addCase(createProspect.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            });
    }
});

export const { clearProspectMessages, resetCurrentProspect } = prospectSlice.actions;
export default prospectSlice.reducer;
