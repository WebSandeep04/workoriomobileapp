import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';

const initialState = {
    entries: [],
    pagination: {
        current_page: 1,
        last_page: 1,
        total: 0
    },
    formOptions: {
        departments: [],
        expenses: []
    },
    stats: {
        total_opening_balance: 0,
        total_expense: 0,
        remaining_balance: 0,
        total_pending_count: 0,
        total_pending_amount: 0
    },
    loading: false,
    statsLoading: false,
    actionLoading: false,
    error: null,
    successMessage: null,
};

export const fetchPettyCashEntries = createAsyncThunk(
    'pettyCash/fetchEntries',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await api.get('/petty-cash', { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch petty cash entries');
        }
    }
);

export const fetchPettyCashStats = createAsyncThunk(
    'pettyCash/fetchStats',
    async (params = {}, { rejectWithValue }) => {
        try {
            const response = await api.get('/petty-cash/stats', { params });
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch metrics');
        }
    }
);

export const fetchPettyCashFormOptions = createAsyncThunk(
    'pettyCash/fetchFormOptions',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/petty-cash/form-options');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch wallets and expenses');
        }
    }
);

export const createPettyCashEntry = createAsyncThunk(
    'pettyCash/createEntry',
    async (formData, { rejectWithValue }) => {
        try {
            // Note: Form data is sent as multipart/form-data for images
            const response = await api.post('/petty-cash', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data?.success) {
                return response.data;
            }
            return rejectWithValue(response.data?.message || 'Failed to create entry');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to record petty cash expense');
        }
    }
);

export const updatePettyCashEntry = createAsyncThunk(
    'pettyCash/updateEntry',
    async ({ id, formData }, { rejectWithValue }) => {
        try {
            const response = await api.post(`/petty-cash/${id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (response.data?.success) {
                return response.data;
            }
            return rejectWithValue(response.data?.message || 'Failed to update entry');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update expense');
        }
    }
);

export const togglePettyCashApproval = createAsyncThunk(
    'pettyCash/toggleApproval',
    async (id, { rejectWithValue }) => {
        try {
            const response = await api.post(`/petty-cash/${id}/toggle-approval`);
            if (response.data?.success) {
                return { id, data: response.data };
            }
            return rejectWithValue(response.data?.message || 'Failed to toggle approval');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to toggle approval status');
        }
    }
);

export const approvePettyCashBulk = createAsyncThunk(
    'pettyCash/approveBulk',
    async (ids, { rejectWithValue }) => {
        try {
            const response = await api.post('/petty-cash/approve-bulk', { ids });
            if (response.data?.success) {
                return { ids, data: response.data };
            }
            return rejectWithValue(response.data?.message || 'Failed to approve entries');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to approve selected entries');
        }
    }
);

export const deletePettyCashEntry = createAsyncThunk(
    'pettyCash/deleteEntry',
    async (id, { rejectWithValue }) => {
        try {
            const response = await api.delete(`/petty-cash/${id}`);
            if (response.data?.success) {
                return { id, data: response.data };
            }
            return rejectWithValue(response.data?.message || 'Failed to delete record');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete record');
        }
    }
);

const pettyCashSlice = createSlice({
    name: 'pettyCash',
    initialState,
    reducers: {
        clearPettyCashMessages: (state) => {
            state.error = null;
            state.successMessage = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Entries
            .addCase(fetchPettyCashEntries.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchPettyCashEntries.fulfilled, (state, action) => {
                state.loading = false;
                state.entries = action.payload.data || [];
                state.pagination = {
                    current_page: action.payload.current_page || 1,
                    last_page: action.payload.last_page || 1,
                    total: action.payload.total || 0
                };
            })
            .addCase(fetchPettyCashEntries.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            
            // Fetch Stats
            .addCase(fetchPettyCashStats.pending, (state) => {
                state.statsLoading = true;
            })
            .addCase(fetchPettyCashStats.fulfilled, (state, action) => {
                state.statsLoading = false;
                if (action.payload?.success) {
                    state.stats = action.payload.data;
                }
            })
            .addCase(fetchPettyCashStats.rejected, (state) => {
                state.statsLoading = false;
            })

            // Fetch Form Options
            .addCase(fetchPettyCashFormOptions.fulfilled, (state, action) => {
                if (action.payload?.success) {
                    state.formOptions = action.payload.data;
                }
            })

            // Actions Block (Create, Update, Delete, Approve)
            .addCase(createPettyCashEntry.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload.message || 'Entry created successfully';
            })
            .addCase(updatePettyCashEntry.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload.message || 'Entry updated successfully';
            })
            .addCase(togglePettyCashApproval.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload.data.message;
                const entry = state.entries.find(e => e.id === action.payload.id);
                if (entry) {
                    entry.is_approved = action.payload.data.data.is_approved;
                }
            })
            .addCase(deletePettyCashEntry.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload.data.message || 'Record deleted successfully';
                state.entries = state.entries.filter(e => e.id !== action.payload.id);
            })
            .addCase(approvePettyCashBulk.fulfilled, (state, action) => {
                state.actionLoading = false;
                state.successMessage = action.payload.data.message || 'Entries approved successfully';
                // Remove or update entries in the local state if they are pending screen
                // Or refresh logic can handle it. Let's mark them as approved in place.
                action.payload.ids.forEach(id => {
                    const entry = state.entries.find(e => e.id === id);
                    if (entry) entry.is_approved = true;
                });
            })

            // Global Action State Matchers (Pending & Rejected)
            .addMatcher(
                (action) => [
                    createPettyCashEntry.pending.type,
                    updatePettyCashEntry.pending.type,
                    togglePettyCashApproval.pending.type,
                    approvePettyCashBulk.pending.type,
                    deletePettyCashEntry.pending.type
                ].includes(action.type),
                (state) => {
                    state.actionLoading = true;
                    state.error = null;
                    state.successMessage = null;
                }
            )
            .addMatcher(
                (action) => [
                    createPettyCashEntry.rejected.type,
                    updatePettyCashEntry.rejected.type,
                    togglePettyCashApproval.rejected.type,
                    approvePettyCashBulk.rejected.type,
                    deletePettyCashEntry.rejected.type
                ].includes(action.type),
                (state, action) => {
                    state.actionLoading = false;
                    state.error = action.payload;
                }
            );
    }
});

export const { clearPettyCashMessages } = pettyCashSlice.actions;
export default pettyCashSlice.reducer;
