import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';

// 1. Fetch projects list
export const fetchProjects = createAsyncThunk(
    'projects/fetchProjects',
    async ({ page = 1, search = '', customerId = '', serviceId = '', isStarred = false }, { rejectWithValue }) => {
        try {
            const params = {
                page,
                search,
                customer_id: customerId,
                service_id: serviceId,
                is_starred: isStarred ? 1 : 0,
            };
            const response = await api.get('/projects/fetch', { params });
            return response.data; // This would contain data (array of projects) and pagination details
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch projects');
        }
    }
);

// 2. Fetch filter options
export const fetchProjectOptions = createAsyncThunk(
    'projects/fetchProjectOptions',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/projects/options');
            return response.data; // contains { customers, services }
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch filters');
        }
    }
);

// 3. Fetch dynamic project details
export const fetchProjectDetails = createAsyncThunk(
    'projects/fetchProjectDetails',
    async (projectId, { rejectWithValue }) => {
        try {
            // The web route returns view. But API endpoints would return direct JSON. 
            // We can make separate calls or expect a single unified API project-tracking/{id} returning JSON.
            // For mobile adaptability, we load individual modules or hit a JSON detail endpoint.
            // Usually we create a direct api version or adapt response. Assuming the API matches model structure:
            const response = await api.get(`/project-tracking/${projectId}`, {
                headers: { Accept: 'application/json' }
            });
            return response.data; 
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to load details');
        }
    }
);

// 4. Fetch tasks for specific project
export const fetchProjectTasks = createAsyncThunk(
    'projects/fetchProjectTasks',
    async (projectId, { rejectWithValue }) => {
        try {
            const response = await api.get(`/task/project/${projectId}`);
            return response.data; // array of tasks
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to load project tasks');
        }
    }
);

// 5. Fetch worklogs for specific project
export const fetchProjectWorklogs = createAsyncThunk(
    'projects/fetchProjectWorklogs',
    async ({ projectId, userId = '', moduleId = '', startDate = '', endDate = '' }, { rejectWithValue }) => {
        try {
            const params = { user_id: userId, module_id: moduleId, start_date: startDate, end_date: endDate };
            const response = await api.get(`/projects/${projectId}/worklogs`, { params });
            return response.data.worklogs;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to load project worklogs');
        }
    }
);

// 6. Toggle project favourite
export const toggleProjectFavourite = createAsyncThunk(
    'projects/toggleProjectFavourite',
    async (projectId, { rejectWithValue }) => {
        try {
            const response = await api.post(`/projects/${projectId}/toggle-favourite`);
            return { id: projectId, isFavourite: response.data.is_favourite };
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to toggle favourite');
        }
    }
);

// 7. Update project progress
export const updateProjectProgress = createAsyncThunk(
    'projects/updateProjectProgress',
    async ({ projectId, percentage }, { rejectWithValue }) => {
        try {
            const response = await api.patch(`/projects/${projectId}/progress`, { completed_percentage: percentage });
            return { id: projectId, completedPercentage: percentage };
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update progress');
        }
    }
);

// 8. Update status
export const updateProjectStatus = createAsyncThunk(
    'projects/updateProjectStatus',
    async ({ projectId, status }, { rejectWithValue }) => {
        try {
            await api.put(`/projects/${projectId}/update-status`, { status });
            return { id: projectId, status };
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update status');
        }
    }
);

// 9. Add project remark
export const addProjectRemark = createAsyncThunk(
    'projects/addProjectRemark',
    async ({ projectId, remark }, { rejectWithValue }) => {
        try {
            const response = await api.post('/projects/remarks', { customer_project_id: projectId, remark });
            return { id: projectId, remark: response.data.data };
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to add remark');
        }
    }
);

const projectsSlice = createSlice({
    name: 'projects',
    initialState: {
        projects: [],
        pagination: {},
        options: { customers: [], services: [] },
        currentProject: null,
        currentTasks: [],
        currentWorklogs: [],
        loading: false,
        actionLoading: false,
        error: null,
        successMessage: null,
    },
    reducers: {
        clearProjectMessages: (state) => {
            state.successMessage = null;
            state.error = null;
        },
        resetCurrentProject: (state) => {
            state.currentProject = null;
            state.currentTasks = [];
            state.currentWorklogs = [];
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch Projects
            .addCase(fetchProjects.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchProjects.fulfilled, (state, action) => {
                state.loading = false;
                // Adjusting for standard Laravel API resource vs paginated JSON
                const resData = action.payload;
                if (resData.data && Array.isArray(resData.data)) {
                    state.projects = resData.data;
                    // Strip the large 'data' object to create generic pagination state
                    const { data, ...pagInfo } = resData;
                    state.pagination = pagInfo;
                } else {
                    state.projects = Array.isArray(resData) ? resData : [];
                }
            })
            .addCase(fetchProjects.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Fetch Options
            .addCase(fetchProjectOptions.fulfilled, (state, action) => {
                state.options = action.payload;
            })

            // Project Details
            .addCase(fetchProjectDetails.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchProjectDetails.fulfilled, (state, action) => {
                state.loading = false;
                // Maps to standard object
                state.currentProject = action.payload.project || action.payload;
                if (action.payload.worklogs) state.currentWorklogs = action.payload.worklogs;
            })
            .addCase(fetchProjectDetails.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // Project Tasks
            .addCase(fetchProjectTasks.fulfilled, (state, action) => {
                state.currentTasks = Array.isArray(action.payload) ? action.payload : [];
            })

            // Project Worklogs
            .addCase(fetchProjectWorklogs.fulfilled, (state, action) => {
                state.currentWorklogs = action.payload;
            })

            // Toggle Favourite
            .addCase(toggleProjectFavourite.fulfilled, (state, action) => {
                const { id, isFavourite } = action.payload;
                // Update in projects list
                const proj = state.projects.find(p => p.id === id);
                if (proj) proj.is_favourite = isFavourite;
                // Update in current selected project
                if (state.currentProject && state.currentProject.id === id) {
                    state.currentProject.is_favourite = isFavourite;
                }
            })

            // Update Progress
            .addCase(updateProjectProgress.pending, (state) => {
                state.actionLoading = true;
            })
            .addCase(updateProjectProgress.fulfilled, (state, action) => {
                state.actionLoading = false;
                const { id, completedPercentage } = action.payload;
                const proj = state.projects.find(p => p.id === id);
                if (proj) proj.completed_percentage = completedPercentage;
                if (state.currentProject && state.currentProject.id === id) {
                    state.currentProject.completed_percentage = completedPercentage;
                }
                state.successMessage = 'Progress updated successfully';
            })
            .addCase(updateProjectProgress.rejected, (state, action) => {
                state.actionLoading = false;
                state.error = action.payload;
            })

            // Update Status
            .addCase(updateProjectStatus.fulfilled, (state, action) => {
                const { id, status } = action.payload;
                const proj = state.projects.find(p => p.id === id);
                if (proj) proj.status = status;
                if (state.currentProject && state.currentProject.id === id) {
                    state.currentProject.status = status;
                }
            })

            // Add Remark
            .addCase(addProjectRemark.fulfilled, (state, action) => {
                const { id, remark } = action.payload;
                if (state.currentProject && state.currentProject.id === id) {
                    if (!state.currentProject.remarks) state.currentProject.remarks = [];
                    state.currentProject.remarks.unshift(remark);
                    state.currentProject.latest_remark = remark; // Optimistic bind
                }
                state.successMessage = 'Remark saved!';
            });
    }
});

export const { clearProjectMessages, resetCurrentProject } = projectsSlice.actions;
export default projectsSlice.reducer;
