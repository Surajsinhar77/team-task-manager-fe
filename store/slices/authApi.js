import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/baseQueryWithReauth';
import { setAuthError, setCredentials, setUser } from './authSlice';

const getResponsePayload = (response) => response?.data || response || {};

const getTokenString = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    return getTokenString(value.token || value.accessToken || value.refreshToken);
  }

  return null;
};

const extractAuthPayload = (response) => {
  const payload = getResponsePayload(response);
  const nestedPayload = payload?.data || {};
  const tokenContainer = nestedPayload?.token || payload?.token || {};
  const accessTokenContainer = tokenContainer?.accessToken || {};
  const refreshTokenContainer = tokenContainer?.refreshToken || {};

  return {
    token: getTokenString(
      accessTokenContainer?.token ||
        accessTokenContainer ||
        payload?.accessToken ||
        nestedPayload?.accessToken ||
        payload?.token ||
        nestedPayload?.token
    ),
    refreshToken: getTokenString(
      refreshTokenContainer?.token ||
        refreshTokenContainer ||
        payload?.refreshToken ||
        nestedPayload?.refreshToken
    ),
    user:
      payload?.user ||
      nestedPayload?.user ||
      null,
  };
};

const persistAuth = ({ token, refreshToken, user }) => {
  if (token) {
    localStorage.setItem('token', token);
  } else {
    localStorage.removeItem('token');
  }

  if (refreshToken) {
    localStorage.setItem('refreshToken', refreshToken);
  } else {
    localStorage.removeItem('refreshToken');
  }

  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
};

const clearAuthError = (dispatch) => {
  dispatch(setAuthError(null));
};

export const applyAuthSession = (dispatch, authPayload) => {
  persistAuth(authPayload);
  dispatch(setCredentials(authPayload));
};

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        data: credentials,
      }),
      transformResponse: (response) => extractAuthPayload(response),
      invalidatesTags: ['Auth'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        clearAuthError(dispatch);

        try {
          const { data } = await queryFulfilled;
          applyAuthSession(dispatch, data);
        } catch (error) {
          dispatch(
            setAuthError(
              error?.error?.data?.message || error?.error?.data || 'Login failed'
            )
          );
        }
      },
    }),

    register: builder.mutation({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        data: userData,
      }),
      transformResponse: (response) => getResponsePayload(response),
      invalidatesTags: ['Auth'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        clearAuthError(dispatch);

        try {
          await queryFulfilled;
        } catch (error) {
          dispatch(
            setAuthError(
              error?.error?.data?.message || error?.error?.data || 'Registration failed'
            )
          );
        }
      },
    }),

    getUserInfo: builder.query({
      query: () => ({
        url: '/user/me',
        method: 'GET',
      }),
      providesTags: ['Auth'],
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          const token = getState()?.auth?.token || localStorage.getItem('token');
          const refreshToken =
            getState()?.auth?.refreshToken || localStorage.getItem('refreshToken');
          const payload = getResponsePayload(data);
          const user = payload?.user || payload;

          if (user) {
            localStorage.setItem('user', JSON.stringify(user));
            dispatch(setCredentials({ token, refreshToken, user }));
            dispatch(setUser(user));
          }
        } catch (error) {
          dispatch(
            setAuthError(
              error?.error?.data?.message || error?.error?.data || 'Failed to load user'
            )
          );
        }
      },
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useGetUserInfoQuery } = authApi;
