import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/baseQueryWithReauth';

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

export const projectApi = createApi({
  reducerPath: 'projectApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Projects', 'ProjectDetails'],
  endpoints: (builder) => ({
    createProject: builder.mutation({
      query: (projectData) => ({
        url: '/project/create',
        method: 'POST',
        data: projectData,
      }),
      transformResponse: (response) => asEntity(response, ['project']),
      invalidatesTags: ['Projects'],
    }),

    getProjectList: builder.query({
      query: () => ({
        url: '/project/list',
        method: 'GET',
      }),
      transformResponse: (response) => asArray(response, ['projects']),
      providesTags: ['Projects'],
    }),

    getProjectDetails: builder.query({
      query: (projectId) => ({
        url: `/project/details/${projectId}`,
        method: 'GET',
      }),
      transformResponse: (response) => asEntity(response, ['project']),
      providesTags: (result, error, projectId) => [{ type: 'ProjectDetails', id: projectId }],
    }),

    deleteProject: builder.mutation({
      query: (projectId) => ({
        url: `/project/delete/${projectId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Projects'],
    }),
  }),
});

export const {
  useCreateProjectMutation,
  useGetProjectListQuery,
  useGetProjectDetailsQuery,
  useDeleteProjectMutation,
} = projectApi;
