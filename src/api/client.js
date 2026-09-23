import axios from 'axios';
import Toast from 'react-native-toast-message';
import { logoutUser } from '../store/slices/authSlice';

// Create axios instance
const api = axios.create({
    baseURL: 'http://192.168.1.24:8000/api',
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    },
    timeout: 10000,
});

// Helper to set bearer token
export const setApiToken = (token) => {
    if (token) {
        api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common.Authorization;
    }
};

// Helper to set Tenant ID
export const setTenantId = (tenantId) => {
    if (tenantId) {
        api.defaults.headers.common['X-Tenant-ID'] = tenantId;
    } else {
        delete api.defaults.headers.common['X-Tenant-ID'];
    }
};

// Request Interceptor
// Request Interceptor
api.interceptors.request.use(request => {
    return request;
}, error => {
    return Promise.reject(error);
});

// Response Interceptor
// Response Interceptor is configured via setupInterceptors
export const setupInterceptors = (store) => {
    api.interceptors.response.use(
        response => response,
        error => {
            if (error.response && error.response.status === 401) {
                // If token is invalid/expired, automatically logout
                Toast.show({
                    type: 'error',
                    text1: 'Session Expired',
                    text2: 'Please log in again to continue.',
                });
                store.dispatch(logoutUser());
            }
            return Promise.reject(error);
        }
    );
};

export default api;
