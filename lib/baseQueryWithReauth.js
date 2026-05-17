import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { logout, setCredentials } from '../store/slices/authSlice';

const baseURL = 'http://localhost:3000/api/v1';

const getTokenString = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value === '[object Object]' ? null : value;
  }

  if (typeof value === 'object') {
    return getTokenString(value.token || value.accessToken || value.refreshToken);
  }

  return null;
};

const extractRefreshPayload = (response) => {
  const payload = response?.data || response || {};
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
  };
};

const rawBaseQuery = fetchBaseQuery({
  baseUrl: baseURL,
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = getTokenString(localStorage.getItem('token'));

    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    } else {
      localStorage.removeItem('token');
    }

    return headers;
  },
});

const normalizeArgs = (args) => {
  if (typeof args === 'string') {
    return args;
  }

  const normalized = {
    ...args,
  };

  if ('data' in normalized) {
    normalized.body = normalized.data;
    delete normalized.data;
  }

  return normalized;
};

const clearStoredAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const baseQueryWithReauth = async (args, api, extraOptions) => {
  const normalizedArgs = normalizeArgs(args);
  let result = await rawBaseQuery(normalizedArgs, api, extraOptions);

  if (result.error?.status !== 401) {
    return result;
  }

  const storedRefreshToken = localStorage.getItem('refreshToken');
  if (!storedRefreshToken) {
    clearStoredAuth();
    api.dispatch(logout());
    return result;
  }

  const refreshResult = await rawBaseQuery(
    {
      url: '/auth/refresh',
      method: 'POST',
      body: { refreshToken: storedRefreshToken },
    },
    api,
    extraOptions
  );

  if (refreshResult.data) {
    const refreshPayload = extractRefreshPayload(refreshResult.data);
    const refreshedToken = refreshPayload.token;
    const refreshedRefreshToken = refreshPayload.refreshToken || storedRefreshToken;
    const currentUser =
      api.getState()?.auth?.user ||
      (() => {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
      })();

    if (refreshedToken) {
      localStorage.setItem('token', refreshedToken);

      if (refreshedRefreshToken) {
        localStorage.setItem('refreshToken', refreshedRefreshToken);
      }

      api.dispatch(
        setCredentials({
          token: refreshedToken,
          refreshToken: refreshedRefreshToken,
          user: currentUser,
        })
      );

      result = await rawBaseQuery(normalizedArgs, api, extraOptions);
      return result;
    }
  }

  clearStoredAuth();
  api.dispatch(logout());

  return result;
};
