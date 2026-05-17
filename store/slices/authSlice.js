import { createSlice } from '@reduxjs/toolkit';

const parseStoredToken = (key) => {
  const storedValue = localStorage.getItem(key);

  if (!storedValue || storedValue === '[object Object]') {
    localStorage.removeItem(key);
    return null;
  }

  return storedValue;
};

const parseStoredUser = () => {
  const storedUser = localStorage.getItem('user');

  if (!storedUser) {
    return null;
  }

  try {
    return JSON.parse(storedUser);
  } catch {
    localStorage.removeItem('user');
    return null;
  }
};

const initialState = {
  user: parseStoredUser(),
  token: parseStoredToken('token'),
  refreshToken: parseStoredToken('refreshToken'),
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload?.user || null;
      state.token = action.payload?.token || null;
      state.refreshToken = action.payload?.refreshToken || null;
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload || null;
    },
    setAuthError: (state, action) => {
      state.error = action.payload || null;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.error = null;
    },
  },
});

export const { setCredentials, setUser, setAuthError, logout } = authSlice.actions;

export default authSlice.reducer;
