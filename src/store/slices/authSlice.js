import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setApiToken, setTenantId } from '../../api/client';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/login', { email, password });
      const { data } = response.data; // Structure: { success: true, data: { token, ...user } }

      if (!data?.token) {
        return rejectWithValue('Authentication failed: Token not found');
      }

      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(data));
      setApiToken(data.token);
      setTenantId(data.tenant_id);

      return { user: data, token: data.token };
    } catch (error) {
      console.error('Login Error:', error);
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      setApiToken(null);
      setTenantId(null);
      return true;
    } catch (error) {
      return rejectWithValue('Logout failed');
    }
  }
);

export const initAuth = createAsyncThunk('auth/initAuth', async () => {
  try {
    const token = await AsyncStorage.getItem('auth_token');
    const userData = await AsyncStorage.getItem('user_data');

    if (token && userData) {
      const parsedUser = JSON.parse(userData);
      setApiToken(token);
      if (parsedUser.tenant_id) {
        setTenantId(parsedUser.tenant_id);
      }
      return { token, user: parsedUser };
    }
  } catch (e) {
    console.error(e);
  }
  return { token: null, user: null };
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      })
      // Init
      .addCase(initAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        const { token, user } = action.payload;
        if (token) {
          state.token = token;
          state.user = user;
          state.isAuthenticated = true;
        }
      })
      .addCase(initAuth.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
