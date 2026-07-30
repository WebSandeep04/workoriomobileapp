import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setApiToken, setTenantId } from '../../api/client';

const REQUIRED_VERSION = '1.4';

// testing for version

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  versionMismatch: false,
};

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post('/login', { email, password });
      const { data } = response.data; // Structure: { success: true, data: { token, ...user } }
      console.log('Login API Response Data:', JSON.stringify(response.data, null, 2));

      if (!data?.token) {
        return rejectWithValue('Authentication failed: Token not found');
      }

      if (data.version && data.version !== REQUIRED_VERSION) {
        console.log(`Login Version mismatch: Received ${data.version} vs Required ${REQUIRED_VERSION}`);
        return rejectWithValue({ isVersionMismatch: true, message: 'Please update your app to continue.' });
      }

      await AsyncStorage.setItem('auth_token', data.token);
      await AsyncStorage.setItem('user_data', JSON.stringify(data));
      if (data.version) {
        await AsyncStorage.setItem('app_version', data.version);
      }

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
      await AsyncStorage.removeItem('app_version');
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
    // Fetch the latest required version from backend
    let latestRequiredVersion = REQUIRED_VERSION;
    try {
      const versionResponse = await api.get('/app-version');
      if (versionResponse.data && versionResponse.data.required_version) {
        latestRequiredVersion = versionResponse.data.required_version;
      }
    } catch (err) {
      console.log('Failed to fetch app-version, falling back to local check', err);
    }

    if (REQUIRED_VERSION !== latestRequiredVersion) {
      console.log(`Version mismatch: Local ${REQUIRED_VERSION} vs Required ${latestRequiredVersion}`);
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      await AsyncStorage.removeItem('app_version');
      setApiToken(null);
      setTenantId(null);
      return { token: null, user: null, versionMismatch: true };
    }

    const token = await AsyncStorage.getItem('auth_token');
    const userData = await AsyncStorage.getItem('user_data');

    if (token && userData) {
      const parsedUser = JSON.parse(userData);
      setApiToken(token);
      if (parsedUser.tenant_id) {
        setTenantId(parsedUser.tenant_id);
      }
      return {
        token,
        user: parsedUser,
        versionMismatch: false
      };
    }
  } catch (e) {
    console.error(e);
  }
  return { token: null, user: null, versionMismatch: false };
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetVersionMismatch: (state) => {
      state.versionMismatch = false;
    }
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
        if (action.payload && action.payload.isVersionMismatch) {
          state.versionMismatch = true;
          state.error = action.payload.message;
        } else {
          state.error = action.payload;
        }
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
        const { token, user, versionMismatch } = action.payload;

        if (versionMismatch) {
          state.versionMismatch = true;
          state.isAuthenticated = false;
          state.token = null;
          state.user = null;
        } else if (token) {
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

export const { clearError, resetVersionMismatch } = authSlice.actions;
export default authSlice.reducer;
