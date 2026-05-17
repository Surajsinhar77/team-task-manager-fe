import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/baseQueryWithReauth';
import { projectApi } from './projectApi';

const STATUS_VALUES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  IN_REVIEW: 'in_review',
  DONE: 'done',
};

const asArray = (response, keys = []) => {
  if (Array.isArray(response)) {
    return response;
  }

  for (const key of keys) {
    if (Array.isArray(response?.[key])) {
      return response[key];
    }

    if (Array.isArray(response?.data?.[key])) {
      return response.data[key];
    }
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
};

const asEntity = (response, keys = []) => {
  if (!response || Array.isArray(response)) {
    return response;
  }

  for (const key of keys) {
    if (response[key]) {
      return response[key];
    }
  }

  return response.data || response;
};

const normalizePriority = (priority) => {
  if (!priority) {
    return 'medium';
  }

  return String(priority).toLowerCase();
};

const normalizeStatus = (status) => {
  const value = String(status || STATUS_VALUES.TODO).toLowerCase().replace(/\s+/g, '_');

  if (value === 'in_review' || value === 'review') {
    return STATUS_VALUES.IN_REVIEW;
  }

  if (value === 'inprogress') {
    return STATUS_VALUES.IN_PROGRESS;
  }

  if (value === 'done') {
    return STATUS_VALUES.DONE;
  }

  return value === STATUS_VALUES.IN_PROGRESS ? STATUS_VALUES.IN_PROGRESS : STATUS_VALUES.TODO;
};

const normalizeTask = (task, projectId) => {
  if (!task) {
    return task;
  }

  return {
    ...task,
    id: task._id || task.id || '',
    projectId: task.projectId || task.project?._id || projectId || '',
    status: normalizeStatus(task.status),
    priority: normalizePriority(task.priority),
  };
};

const normalizeTaskCollection = (response, projectId) => {
  const tasks = asArray(response, ['tasks']).map((task) => normalizeTask(task, projectId));

  return {
    tasks,
    count: response?.count || tasks.length,
  };
};

export const taskApi = createApi({
  reducerPath: 'taskApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['ProjectTasks', 'DashboardTasks'],
  endpoints: (builder) => ({
    createTask: builder.mutation({
      query: ({ projectId, ...taskData }) => ({
        url: `/project-task/${projectId}/tasks`,
        method: 'POST',
        data: { ...taskData, projectId },
      }),
      transformResponse: (response) => normalizeTask(asEntity(response, ['task'])),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'ProjectTasks', id: projectId },
        { type: 'DashboardTasks', id: projectId },
      ],
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(projectApi.util.invalidateTags(['Projects', { type: 'ProjectDetails', id: projectId }]));
        } catch (_) {}
      },
    }),

    getProjectTasks: builder.query({
      query: (projectId) => ({
        url: `/project-task/${projectId}/tasks`,
        method: 'GET',
      }),
      transformResponse: (response, meta, projectId) => normalizeTaskCollection(response, projectId),
      providesTags: (result, error, projectId) => [{ type: 'ProjectTasks', id: projectId }],
    }),

    updateTaskStatus: builder.mutation({
      query: ({ taskId, projectId, status }) => ({
        url: `/project-task/${taskId}/tasks/status`,
        method: 'PUT',
        data: { status: normalizeStatus(status), projectId },
      }),
      transformResponse: (response) => normalizeTask(asEntity(response, ['task'])),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'ProjectTasks', id: projectId },
        { type: 'DashboardTasks', id: projectId },
      ],
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(projectApi.util.invalidateTags(['Projects', { type: 'ProjectDetails', id: projectId }]));
        } catch (_) {}
      },
    }),

    deleteTask: builder.mutation({
      query: ({ taskId, projectId }) => ({
        url: `/project-task/${taskId}/tasks`,
        method: 'DELETE',
        data: { projectId },
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'ProjectTasks', id: projectId },
        { type: 'DashboardTasks', id: projectId },
      ],
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(projectApi.util.invalidateTags(['Projects', { type: 'ProjectDetails', id: projectId }]));
        } catch (_) {}
      },
    }),

    getDashboardTasks: builder.query({
      async queryFn(projectIds, api, extraOptions, baseQuery) {
        const uniqueProjectIds = [...new Set((projectIds || []).filter(Boolean))];

        if (!uniqueProjectIds.length) {
          return { data: { tasks: [], count: 0 } };
        }

        const responses = await Promise.all(
          uniqueProjectIds.map((projectId) =>
            baseQuery(
              {
                url: `/project-task/${projectId}/tasks`,
                method: 'GET',
              },
              api,
              extraOptions
            )
          )
        );

        const firstError = responses.find((result) => result.error);

        if (firstError) {
          return { error: firstError.error };
        }

        const tasks = responses.flatMap((result, index) =>
          normalizeTaskCollection(result.data, uniqueProjectIds[index]).tasks
        );

        return {
          data: {
            tasks,
            count: tasks.length,
          },
        };
      },
      providesTags: (result, error, projectIds = []) => [
        ...projectIds.filter(Boolean).map((projectId) => ({
          type: 'DashboardTasks',
          id: projectId,
        })),
      ],
    }),
  }),
});

export const {
  useCreateTaskMutation,
  useGetProjectTasksQuery,
  useUpdateTaskStatusMutation,
  useDeleteTaskMutation,
  useGetDashboardTasksQuery,
} = taskApi;
