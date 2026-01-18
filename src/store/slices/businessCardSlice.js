import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';
import { Alert } from 'react-native';

// Async thunks
export const fetchBusinessCards = createAsyncThunk(
    'businessCards/fetchBusinessCards',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/business-cards');
            return response.data.data; // Assuming response structure { data: { data: [...] } } based on typical Laravel pagination or { data: [...] }
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const saveBusinessCard = createAsyncThunk(
    'businessCards/saveBusinessCard',
    async (cardData, { rejectWithValue }) => {
        try {
            const response = await api.post('/business-cards', cardData);
            return response.data.data;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const updateBusinessCard = createAsyncThunk(
    'businessCards/updateBusinessCard',
    async ({ id, data }, { rejectWithValue }) => {
        try {
            const response = await api.put(`/business-cards/${id}`, data);
            return response.data.data; // Return updated card
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

export const deleteBusinessCard = createAsyncThunk(
    'businessCards/deleteBusinessCard',
    async (id, { rejectWithValue }) => {
        try {
            await api.delete(`/business-cards/${id}`);
            return id;
        } catch (error) {
            return rejectWithValue(error.response?.data || error.message);
        }
    }
);

const businessCardSlice = createSlice({
    name: 'businessCards',
    initialState: {
        cards: [],
        loading: false,
        error: null,
    },
    reducers: {},
    extraReducers: (builder) => {
        // Fetch
        builder
            .addCase(fetchBusinessCards.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchBusinessCards.fulfilled, (state, action) => {
                state.loading = false;
                // Handle pagination structure if needed, currently assuming action.payload is the array or { data: [] }
                // Based on API doc: { success: true, data: { data: [...] } } -> so payload should be the inner data
                // Adjusting payload extraction in thunk might be safer, but let's assume thunk returns the array or paginated object
                if (Array.isArray(action.payload)) {
                    state.cards = action.payload;
                } else if (action.payload?.data && Array.isArray(action.payload.data)) {
                    state.cards = action.payload.data;
                } else {
                    state.cards = [];
                }
            })
            .addCase(fetchBusinessCards.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });

        // Save
        builder
            .addCase(saveBusinessCard.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(saveBusinessCard.fulfilled, (state, action) => {
                state.loading = false;
                state.cards.unshift(action.payload); // Add new card to top
            })
            .addCase(saveBusinessCard.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                Alert.alert('Error', 'Failed to save business card.');
            });

        // Update
        builder
            .addCase(updateBusinessCard.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(updateBusinessCard.fulfilled, (state, action) => {
                state.loading = false;
                const index = state.cards.findIndex(card => card.id === action.payload.id);
                if (index !== -1) {
                    state.cards[index] = action.payload;
                }
            })
            .addCase(updateBusinessCard.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                Alert.alert('Error', 'Failed to update business card.');
            });

        // Delete
        builder
            .addCase(deleteBusinessCard.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(deleteBusinessCard.fulfilled, (state, action) => {
                state.loading = false;
                state.cards = state.cards.filter(card => card.id !== action.payload);
            })
            .addCase(deleteBusinessCard.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
                Alert.alert('Error', 'Failed to delete business card.');
            });
    },
});

export default businessCardSlice.reducer;
