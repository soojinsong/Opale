import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activeTab: 'reservation',
  selectedCategory: 'all',
  showOngoingOnly: false,
  searchQuery: '',
};

const performanceSlice = createSlice({
  name: "performance",
  initialState,
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setSelectedCategory: (state, action) => {
      state.selectedCategory = action.payload;
    },
    setShowOngoingOnly: (state, action) => {
      state.showOngoingOnly = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
  },
});

export const { setActiveTab, setSelectedCategory, setShowOngoingOnly, setSearchQuery } = performanceSlice.actions;
export default performanceSlice.reducer;
