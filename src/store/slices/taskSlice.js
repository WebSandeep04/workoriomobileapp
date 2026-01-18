import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/client';

const initialState = {
    createdTasks: [],
    assignedTasks: [],
    formData: {
        customers: [],
        users: [],
        statuses: [],
        priorities: []
    },
    currentTask: null,
    loading: false,
    loadingDetails: false, // For viewing/updating details
    actionLoading: false, // For create/update/delete actions
    error: null,
    successMessage: null,
};

// 1. Get Form Data
export const fetchFormData = createAsyncThunk(
    'task/fetchFormData',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/tasks/form-data');
            return response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch form data');
        }
    }
);

// 2. Get Created Tasks
export const fetchCreatedTasks = createAsyncThunk(
    'task/fetchCreatedTasks',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/tasks/created');
            return response.data.tasks;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch created tasks');
        }
    }
);

// 3. Get Assigned Tasks
export const fetchAssignedTasks = createAsyncThunk(
    'task/fetchAssignedTasks',
    async (_, { rejectWithValue }) => {
        try {
            const response = await api.get('/tasks/assigned');
            return response.data.tasks;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch assigned tasks');
        }
    }
);

// 4. Create Task
export const createTask = createAsyncThunk(
    'task/createTask',
    async (taskData, { rejectWithValue, dispatch }) => {
        try {
            // taskData should be FormData object
            const response = await api.post('/tasks', taskData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data?.success) {
                dispatch(fetchCreatedTasks()); // Refresh list
                return response.data.message || 'Task created successfully';
            }
            return rejectWithValue('Failed to create task');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to create task');
        }
    }
);

// 5. View Task Details
export const fetchTaskDetails = createAsyncThunk(
    'task/fetchTaskDetails',
    async (id, { rejectWithValue }) => {
        try {
            const response = await api.get(`/tasks/${id}`);
            return response.data.task || response.data;
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch task details');
        }
    }
);

// 6. Update Task
export const updateTask = createAsyncThunk(
    'task/updateTask',
    async ({ id, data }, { rejectWithValue, dispatch }) => {
        try {
            const response = await api.post(`/tasks/${id}`, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (response.data?.success) {
                dispatch(fetchTaskDetails(id)); // Refresh details
                dispatch(fetchCreatedTasks());
                dispatch(fetchAssignedTasks());
                return response.data.message || 'Task updated successfully';
            }
            return rejectWithValue('Failed to update task');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update task');
        }
    }
);

// 7. Update Task Status
export const updateTaskStatus = createAsyncThunk(
    'task/updateTaskStatus',
    async ({ id, statusId, statusName }, { rejectWithValue, dispatch }) => {
        try {
            const payload = statusId ? { task_status_id: statusId } : { status: statusName };
            const response = await api.post(`/tasks/${id}/status`, payload);
            if (response.data?.success) {
                dispatch(fetchTaskDetails(id)); // Refresh details if open
                dispatch(fetchCreatedTasks());
                dispatch(fetchAssignedTasks());
                return response.data.message || 'Status updated successfully';
            }
            return rejectWithValue('Failed to update status');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to update status');
        }
    }
);

// 8. Toggle Done
export const toggleTaskDone = createAsyncThunk(
    'task/toggleTaskDone',
    async (id, { rejectWithValue, dispatch }) => {
        try {
            const response = await api.post(`/tasks/${id}/toggle-done`);
            if (response.data?.success) {
                dispatch(fetchTaskDetails(id));
                dispatch(fetchCreatedTasks());
                dispatch(fetchAssignedTasks());
                return response.data.message || 'Task toggled successfully';
            }
            return rejectWithValue('Failed to toggle task');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to toggle task');
        }
    }
);

// 9. Add Remark (Comment)
export const addTaskRemark = createAsyncThunk(
    'task/addTaskRemark',
    async ({ id, remark }, { rejectWithValue, dispatch }) => {
        try {
            const response = await api.post(`/tasks/${id}/remarks`, { remark });
            if (response.data) {
                dispatch(fetchTaskDetails(id));
                return "Remark added successfully";
            }
            return rejectWithValue('Failed to add remark');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to add remark');
        }
    }
);

// 10. Delete Image
export const deleteTaskImage = createAsyncThunk(
    'task/deleteTaskImage',
    async ({ taskId, imageId }, { rejectWithValue, dispatch }) => {
        try {
            const response = await api.delete(`/tasks/${taskId}/images/${imageId}`);
            if (response.data?.success) {
                dispatch(fetchTaskDetails(taskId));
                return response.data.message || 'Image deleted successfully';
            }
            return rejectWithValue('Failed to delete image');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete image');
        }
    }
);

// 11. Delete Task
export const deleteTask = createAsyncThunk(
    'task/deleteTask',
    async (id, { rejectWithValue, dispatch }) => {
        try {
            const response = await api.delete(`/tasks/${id}`);
            if (response.data?.success) {
                dispatch(fetchCreatedTasks());
                return response.data.message || 'Task deleted successfully';
            }
            return rejectWithValue('Failed to delete task');
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to delete task');
        }
    }
);


const taskSlice = createSlice({
    name: 'task',
    initialState,
    reducers: {
        clearTaskMessages: (state) => {
            state.error = null;
            state.successMessage = null;
        },
        clearCurrentTask: (state) => {
            state.currentTask = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Form Data
            .addCase(fetchFormData.fulfilled, (state, action) => {
                state.formData = {
                    customers: action.payload.customers || [],
                    users: action.payload.users || [],
                    statuses: action.payload.statuses || [],
                    priorities: action.payload.priorities || []
                };
            })
            // Created Tasks
            .addCase(fetchCreatedTasks.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchCreatedTasks.fulfilled, (state, action) => {
                state.loading = false;
                state.createdTasks = action.payload || [];
            })
            .addCase(fetchCreatedTasks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Assigned Tasks
            .addCase(fetchAssignedTasks.pending, (state) => {
                state.loading = true;
            })
            .addCase(fetchAssignedTasks.fulfilled, (state, action) => {
                state.loading = false;
                state.assignedTasks = action.payload || [];
            })
            .addCase(fetchAssignedTasks.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })
            // Task Details
            .addCase(fetchTaskDetails.pending, (state) => {
                state.loadingDetails = true;
            })
            .addCase(fetchTaskDetails.fulfilled, (state, action) => {
                state.loadingDetails = false;
                state.currentTask = action.payload;
            })
            .addCase(fetchTaskDetails.rejected, (state, action) => {
                state.loadingDetails = false;
                state.error = action.payload;
            })
            // General Actions (Create, Update, Delete)
            .addMatcher(
                (action) => action.type.endsWith('/pending') &&
                    (action.type.includes('createTask') ||
                        action.type.includes('updateTask') ||
                        action.type.includes('deleteTask') ||
                        action.type.includes('toggleTaskDone') ||
                        action.type.includes('addTaskRemark')),
                (state) => {
                    state.actionLoading = true;
                    state.error = null;
                    state.successMessage = null;
                }
            )
            .addMatcher(
                (action) => action.type.endsWith('/fulfilled') &&
                    (action.type.includes('createTask') ||
                        action.type.includes('updateTask') ||
                        action.type.includes('deleteTask') ||
                        action.type.includes('toggleTaskDone') ||
                        action.type.includes('addTaskRemark')),
                (state, action) => {
                    state.actionLoading = false;
                    state.successMessage = action.payload;
                }
            )
            .addMatcher(
                (action) => action.type.endsWith('/rejected') &&
                    (action.type.includes('createTask') ||
                        action.type.includes('updateTask') ||
                        action.type.includes('deleteTask') ||
                        action.type.includes('toggleTaskDone') ||
                        action.type.includes('addTaskRemark')),
                (state, action) => {
                    state.actionLoading = false;
                    state.error = action.payload;
                }
            );
    }
});

export const { clearTaskMessages, clearCurrentTask } = taskSlice.actions;
export default taskSlice.reducer;
