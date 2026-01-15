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

export default api;
