import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: 'http://192.168.1.6:8000/api',
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
        console.log('[API] Tenant ID set to:', tenantId);
    } else {
        delete api.defaults.headers.common['X-Tenant-ID'];
        console.log('[API] Tenant ID cleared');
    }
};

// Request Interceptor
api.interceptors.request.use(request => {
    console.log('[API Request]', request.method?.toUpperCase(), request.url);
    // console.log('Headers:', request.headers);
    return request;
}, error => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
});

// Response Interceptor
api.interceptors.response.use(response => {
    console.log('[API Response]', response.status, response.config.url);
    return response;
}, error => {
    if (error.response) {
        console.error('[API Response Error]', error.response.status, error.response.data);
    } else {
        console.error('[API Unknown Error]', error.message);
    }
    return Promise.reject(error);
});

export default api;
