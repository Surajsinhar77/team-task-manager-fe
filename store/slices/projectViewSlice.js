import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  membersByProjectId: {},
};

const projectViewSlice = createSlice({
  name: 'projectView',
  initialState,
  reducers: {
    setProjectMembersSnapshot: (state, action) => {
      const { projectId, members } = action.payload || {};
      if (!projectId) {
        return;
      }

      state.membersByProjectId[projectId] = Array.isArray(members) ? members : [];
    },
  },
});

export const { setProjectMembersSnapshot } = projectViewSlice.actions;
export default projectViewSlice.reducer;
