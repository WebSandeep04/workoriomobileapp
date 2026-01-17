import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: 'http://192.168.1.10:8000/api',
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
// Response Interceptor
api.interceptors.response.use(response => {
    return response;
}, error => {
    return Promise.reject(error);
});

export default api;
