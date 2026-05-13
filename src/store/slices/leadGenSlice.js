import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';

const initialState = {
    leads: [],
    pagination: {
        current_page: 1,
        last_page: 1,
        total: 0
    },
    stats: {
        summary: { today_followups: 0, under_process: 0, today_completed: 0, today_pending: 0, today_new: 0 },
        status_counts: []
    },
    filterOptions: {
        statuses: [], states: [], cities: [], business_types: [], lead_sources: [], products: [], sales_team: []
    },
    loading: false,
    actionLoading: false,
    error: null,
    successMessage: null,
};

export const fetchLeadGenLeads = createAsyncThunk(
    'leadGen/fetchLeadGenLeads',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await api.get('/leadgen/my-leads', { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch generated leads');
        }
    }
);

export const fetchLeadGenStats = createAsyncThunk(
    'leadGen/fetchLeadGenStats',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/leadgen/my-stats');
            return response.data?.data || response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats');
        }
    }
);

export const fetchLeadGenFilters = createAsyncThunk(
    'leadGen/fetchLeadGenFilters',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/leadgen/my-filters');
            let data = response.data?.data || response.data || {};
            
            // Fallback for sales team if empty
            if (!data.sales_team || data.sales_team.length === 0) {
                try {
                    const usersRes = await api.get('/users');
                    if (usersRes.data && usersRes.data.success && Array.isArray(usersRes.data.data)) {
                        data.sales_team = usersRes.data.data;
                    }
                } catch (e) {
                    console.log('Failed to fetch fallback users', e);
                }
            }
            return data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch filter options');
        }
    }
);

export const addLeadGen = createAsyncThunk(
    'leadGen/addLeadGen',
    async (leadForm, { rejectWithValue, dispatch }) => {
        try {
            const response = await api.post('/leadgen/my/store', leadForm);
            if (response.data?.success) {
                // Return success
                return response.data.message || 'Lead created successfully';
            }
            return rejectWithValue(response.data?.message || 'Failed to create lead');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create lead');
        }
    }
);

export const reassignLeadGen = createAsyncThunk(
    'leadGen/reassignLeadGen',
    async (payload, { rejectWithValue }) => {
        try {
            const response = await api.post('/leadgen/my/reassign', payload);
            if (response.data?.success) {
                return response.data.message || 'Lead reassigned successfully';
            }
            return rejectWithValue(response.data?.message || 'Failed to reassign lead');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to reassign lead');
        }
    }
);

const leadGenSlice = createSlice({
    name: 'leadGen',
    initialState,
    reducers: {
        clearLeadGenMessages: (state) => {
            state.error = null;
            state.successMessage = null;
        },
        updateLeadGenCities: (state, action) => {
            state.filterOptions.cities = action.payload || [];
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Leads
            .addCase(fetchLeadGenLeads.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchLeadGenLeads.fulfilled, (state, action) => {
                state.loading = false;
                state.leads = action.payload.data || [];
                state.pagination = {
                    current_page: action.payload.current_page || 1,
                    last_page: action.payload.last_page || 1,
                    total: action.payload.total || 0
                };
            })
            .addCase(fetchLeadGenLeads.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Fetch Stats
            .addCase(fetchLeadGenStats.fulfilled, (state, action) => {
                state.stats = action.payload || state.stats;
            })
            // Fetch Filters
            .addCase(fetchLeadGenFilters.fulfilled, (state, action) => {
                state.filterOptions = {
                    ...state.filterOptions,
                    ...action.payload
                };
            })
            // Add Lead
            .addCase(addLeadGen.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(addLeadGen.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload;
            })
            .addCase(addLeadGen.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            })
            // Reassign
            .addCase(reassignLeadGen.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(reassignLeadGen.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload;
            })
            .addCase(reassignLeadGen.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            });
    }
});

export const { clearLeadGenMessages, updateLeadGenCities } = leadGenSlice.actions;
export default leadGenSlice.reducer;
