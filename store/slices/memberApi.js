import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/baseQueryWithReauth';
import { projectApi } from './projectApi';
import { taskApi } from './taskApi';

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

const normalizeUser = (response) => {
  const entity = asEntity(response, ['user']);

  if (!entity) {
    return null;
  }

  return {
    ...entity,
    id: entity?._id || entity?.id || '',
  };
};

const normalizeProjectMember = (memberRecord) => {
  if (!memberRecord) {
    return null;
  }

  const sourceMember = memberRecord.member || memberRecord.user || memberRecord;
  const memberId = sourceMember?._id || sourceMember?.id || sourceMember || memberRecord?._id;

  if (!memberId) {
    return null;
  }

  return {
    ...memberRecord,
    id: memberId,
    relationId: memberRecord?.member || memberRecord?.user ? memberRecord?._id : null,
    memberId,
    name: sourceMember?.name || memberRecord?.name || '',
    email: sourceMember?.email || memberRecord?.email || '',
    role: memberRecord?.role || sourceMember?.role || '',
  };
};

export const memberApi = createApi({
  reducerPath: 'memberApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Projects', 'ProjectDetails', 'ProjectMembers'],
  endpoints: (builder) => ({
    getUserByEmail: builder.query({
      query: (email) => ({
        url: '/user/email',
        method: 'GET',
        params: { email },
      }),
      transformResponse: (response) => normalizeUser(response),
    }),

    getUserById: builder.query({
      query: (userId) => ({
        url: `/user/${userId}`,
        method: 'GET',
      }),
      transformResponse: (response) => normalizeUser(response),
    }),

    addMemberToProject: builder.mutation({
      query: ({ projectId, email }) => ({
        url: `/project-member/${projectId}/members`,
        method: 'POST',
        data: { email },
      }),
      transformResponse: (response) => asEntity(response, ['project']),
      invalidatesTags: (result, error, { projectId }) => [
        'Projects',
        { type: 'ProjectDetails', id: projectId },
        { type: 'ProjectMembers', id: projectId },
      ],
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(projectApi.util.invalidateTags(['Projects', { type: 'ProjectDetails', id: projectId }]));
          dispatch(taskApi.util.invalidateTags([{ type: 'DashboardTasks', id: projectId }]));
        } catch (_) {}
      },
    }),

    removeMemberFromProject: builder.mutation({
      query: ({ projectId, memberId }) => ({
        url: `/project-member/${projectId}/members`,
        method: 'DELETE',
        data: { memberId, projectId },
      }),
      transformResponse: (response) => asEntity(response, ['project']),
      invalidatesTags: (result, error, { projectId }) => [
        'Projects',
        { type: 'ProjectDetails', id: projectId },
        { type: 'ProjectMembers', id: projectId },
      ],
      async onQueryStarted({ projectId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(projectApi.util.invalidateTags(['Projects', { type: 'ProjectDetails', id: projectId }]));
          dispatch(taskApi.util.invalidateTags([{ type: 'DashboardTasks', id: projectId }]));
        } catch (_) {}
      },
    }),

    getProjectMembers: builder.query({
      query: (projectId) => ({
        url: `/project-member/${projectId}/members`,
        method: 'GET',
      }),
      transformResponse: (response) =>
        asArray(response, ['members', 'users'])
          .map((memberRecord) => normalizeProjectMember(memberRecord))
          .filter(Boolean),
      providesTags: (result, error, projectId) => [{ type: 'ProjectMembers', id: projectId }],
    }),
  }),
});

export const {
  useLazyGetUserByEmailQuery,
  useLazyGetUserByIdQuery,
  useAddMemberToProjectMutation,
  useRemoveMemberFromProjectMutation,
  useGetProjectMembersQuery,
} = memberApi;
