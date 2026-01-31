import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';

const initialState = {
    leads: [],
    pagination: {
        current_page: 1,
        last_page: 1,
        total: 0,
        per_page: 10
    },
    filterOptions: {
        statuses: [],
        states: [],
        cities: [], // This might be dynamic based on state selection
        business_types: [],
        lead_sources: [],
        products: [] // Added based on API docs (products_id)
    },
    teamMembers: [],
    cityOptions: [], // Separate list for cities fetched by state
    loading: false,
    actionLoading: false, // For create/assign actions
    error: null,
    successMessage: null,
};

// 1. Fetch My Leads
export const fetchMyLeads = createAsyncThunk(
    'lead/fetchMyLeads',
    async (params = {}, { rejectWithValue }) => {
        try {
            // Params can include page, per_page, search, status_id, etc.
            const response = await api.get('/leads/my-leads', { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch leads');
        }
    }
);

// 2. Add New Lead
export const addLead = createAsyncThunk(
    'lead/addLead',
    async (leadData, { rejectWithValue, dispatch }) => {
        try {
            const response = await api.post('/leads/add', leadData);
            if (response.data?.success) {
                dispatch(fetchMyLeads()); // Refresh list
                return response.data.message || 'Lead created successfully';
            }
            return rejectWithValue('Failed to create lead');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create lead');
        }
    }
);

// 3. Assign Lead
export const assignLead = createAsyncThunk(
    'lead/assignLead',
    async ({ lead_id, new_user_id }, { rejectWithValue, dispatch }) => {
        try {
            const response = await api.post('/leads/assign', { lead_id, new_user_id });
            if (response.data?.success) {
                dispatch(fetchMyLeads()); // Refresh list
                return response.data.message || 'Lead assigned successfully';
            }
            return rejectWithValue(response.data?.message || 'Failed to assign lead');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to assign lead');
        }
    }
);

// 4. Fetch Filter Options
export const fetchFilterOptions = createAsyncThunk(
    'lead/fetchFilterOptions',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/leads/filter-options');
            // Handle both direct object and nested 'data' wrapper
            return response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch filter options');
        }
    }
);

// 5. Fetch Cities by State
export const fetchCities = createAsyncThunk(
    'lead/fetchCities',
    async (stateId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/leads/cities/${stateId}`);
            // Assuming the API returns a list of cities or { cities: [...] }
            // Adjust based on actual response if needed. Docs say "Get Cities by State".
            return response.data.cities || response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch cities');
        }
    }
);

// 6. Fetch Team Members
export const fetchTeamMembers = createAsyncThunk(
    'lead/fetchTeamMembers',
    async (search = '', { rejectWithValue }) => {
        try {
            const params = search ? { search } : {};
            const response = await api.get('/users', { params });
            // Handle both direct and nested data, and potential key names like 'users' or 'data'
            return response.data.users || response.data.data || response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch team members');
        }
    }
);

const leadSlice = createSlice({
    name: 'lead',
    initialState,
    reducers: {
        clearLeadMessages: (state) => {
            state.error = null;
            state.successMessage = null;
        },
        resetCityOptions: (state) => {
            state.cityOptions = [];
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch My Leads
            .addCase(fetchMyLeads.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchMyLeads.fulfilled, (state, action) => {
                state.loading = false;
                state.leads = action.payload.data;
                state.pagination = {
                    current_page: action.payload.current_page,
                    last_page: action.payload.last_page,
                    total: action.payload.total,
                    per_page: action.payload.per_page || 10
                };
            })
            .addCase(fetchMyLeads.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Add Lead
            .addCase(addLead.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(addLead.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload;
            })
            .addCase(addLead.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            })

            // Assign Lead
            .addCase(assignLead.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(assignLead.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload;
            })
            .addCase(assignLead.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            })

            // Filter Options
            .addCase(fetchFilterOptions.fulfilled, (state, action) => {
                state.filterOptions = {
                    statuses: action.payload.statuses || [],
                    states: action.payload.states || [],
                    cities: action.payload.cities || [],
                    business_types: action.payload.business_types || [],
                    lead_sources: action.payload.lead_sources || [],
                    products: action.payload.products || [], // Handle potential missing key gracefully
                };
            })

            // Cities
            .addCase(fetchCities.fulfilled, (state, action) => {
                state.cityOptions = action.payload;
            })

            // Team Members
            .addCase(fetchTeamMembers.fulfilled, (state, action) => {
                state.teamMembers = action.payload;
            });
    }
});

export const { clearLeadMessages, resetCityOptions } = leadSlice.actions;
export default leadSlice.reducer;
