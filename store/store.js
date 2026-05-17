import { configureStore } from '@reduxjs/toolkit';
import { authApi } from './slices/authApi';
import { projectApi } from './slices/projectApi';
import { memberApi } from './slices/memberApi';
import { taskApi } from './slices/taskApi';
import authReducer from './slices/authSlice';
import projectViewReducer from './slices/projectViewSlice';

export const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    [projectApi.reducerPath]: projectApi.reducer,
    [memberApi.reducerPath]: memberApi.reducer,
    [taskApi.reducerPath]: taskApi.reducer,

    auth: authReducer,
    projectView: projectViewReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat([
      authApi.middleware,
      projectApi.middleware,
      memberApi.middleware,
      taskApi.middleware,
    ]),
});
