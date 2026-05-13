import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';

const initialState = {
    subscriptions: [],
    pagination: {
        current_page: 1,
        last_page: 1,
        total: 0
    },
    history: [],
    historyPagination: {
        current_page: 1,
        last_page: 1,
        total: 0
    },
    formOptions: {
        customers: [],
        products: [],
        statuses: []
    },
    stats: {
        total_customers: 0,
        total_subscriptions: 0,
        coming_due: 0,
        overdue: 0
    },
    loading: false,
    statsLoading: false,
    actionLoading: false,
    historyLoading: false,
    error: null,
    successMessage: null,
};

export const fetchSubscriptions = createAsyncThunk(
    'subscription/fetchSubscriptions',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await api.get('/subscriptions', { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscriptions');
        }
    }
);

export const fetchSubscriptionStats = createAsyncThunk(
    'subscription/fetchSubscriptionStats',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/subscriptions/stats');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats');
        }
    }
);

export const createSubscription = createAsyncThunk(
    'subscription/createSubscription',
    async (formData, { rejectWithValue }) => {
        try {
            const response = await api.post('/subscriptions', formData);
            if (response.data?.success) {
                return response.data;
            }
            return rejectWithValue(response.data?.message || 'Failed to create subscription');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create subscription');
        }
    }
);

export const updateSubscriptionStatus = createAsyncThunk(
    'subscription/updateSubscriptionStatus',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/subscriptions/${id}/status`, data);
            if (response.data?.success) {
                return response.data;
            }
            return rejectWithValue(response.data?.message || 'Failed to update subscription status');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update subscription status');
        }
    }
);

export const fetchSubscriptionHistory = createAsyncThunk(
    'subscription/fetchSubscriptionHistory',
    async ({ id, page = 1 }, { rejectWithValue }) => {
        try {
            const response = await api.get(`/subscriptions/${id}/history`, { params: { page } });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch subscription history');
        }
    }
);

export const fetchSubscriptionFormOptions = createAsyncThunk(
    'subscription/fetchSubscriptionFormOptions',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/subscriptions/form-options');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch form options');
        }
    }
);

const subscriptionSlice = createSlice({
    name: 'subscription',
    initialState,
    reducers: {
        clearSubscriptionMessages: (state) => {
            state.error = null;
            state.successMessage = null;
        },
        resetHistory: (state) => {
            state.history = [];
            state.historyPagination = {
                current_page: 1,
                last_page: 1,
                total: 0
            };
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Subscriptions
            .addCase(fetchSubscriptions.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchSubscriptions.fulfilled, (state, action) => {
                state.loading = false;
                state.subscriptions = action.payload.data || [];
                state.pagination = {
                    current_page: action.payload.current_page || 1,
                    last_page: action.payload.last_page || 1,
                    total: action.payload.total || 0
                };
            })
            .addCase(fetchSubscriptions.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Create Subscription
            .addCase(createSubscription.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(createSubscription.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload.message || 'Subscription created successfully';
            })
            .addCase(createSubscription.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            })
            // Update Status
            .addCase(updateSubscriptionStatus.pending, (state) => {
                state.actionLoading = true;
                state.error = null;
                state.successMessage = null;
            })
            .addCase(updateSubscriptionStatus.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload.message || 'Status updated successfully';
            })
            .addCase(updateSubscriptionStatus.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            })
            // Fetch History
            .addCase(fetchSubscriptionHistory.pending, (state) => {
                state.historyLoading = true;
            })
            .addCase(fetchSubscriptionHistory.fulfilled, (state, action) => {
                state.historyLoading = false;
                state.history = action.payload.data || [];
                state.historyPagination = {
                    current_page: action.payload.current_page || 1,
                    last_page: action.payload.last_page || 1,
                    total: action.payload.total || 0
                };
            })
            .addCase(fetchSubscriptionHistory.rejected, (state, action) => {
                state.historyLoading = false;
                state.error = action.payload;
            })
            // Fetch Form Options
            .addCase(fetchSubscriptionFormOptions.fulfilled, (state, action) => {
                state.formOptions = action.payload || state.formOptions;
            })
            // Fetch Stats
            .addCase(fetchSubscriptionStats.pending, (state) => {
                state.statsLoading = true;
            })
            .addCase(fetchSubscriptionStats.fulfilled, (state, action) => {
                state.statsLoading = false;
                state.stats = action.payload.stats || state.stats;
            })
            .addCase(fetchSubscriptionStats.rejected, (state, action) => {
                state.statsLoading = false;
            });
    }
});

export const { clearSubscriptionMessages, resetHistory } = subscriptionSlice.actions;
export default subscriptionSlice.reducer;
