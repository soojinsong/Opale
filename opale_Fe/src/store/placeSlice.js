import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activeTab: 'map',
  gpsLocation: null,
  searchCenter: null,
  searchRadius: 5000,
  maxSearchRadius: null,
  nearbyPlaces: [],
};

const placeSlice = createSlice({
  name: "place",
  initialState,
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setGpsLocation: (state, action) => {
      state.gpsLocation = action.payload;
    },
    setSearchCenter: (state, action) => {
      state.searchCenter = action.payload;
    },
    setSearchRadius: (state, action) => {
      state.searchRadius = action.payload;
    },
    setMaxSearchRadius: (state, action) => {
      state.maxSearchRadius = action.payload;
    },
    setNearbyPlaces: (state, action) => {
      state.nearbyPlaces = action.payload;
    },
    clearNearbyPlaces: (state) => {
      state.nearbyPlaces = [];
    },
    clearSearchCenter: (state) => {
      state.searchCenter = null;
      state.maxSearchRadius = null;
      state.nearbyPlaces = [];
    },
    resetPlaceMapState: (state) => {
      state.searchCenter = null;
      state.searchRadius = 5000;
      state.maxSearchRadius = null;
      state.nearbyPlaces = [];
    },
  },
});

export const { 
  setActiveTab, 
  setGpsLocation, 
  setSearchCenter, 
  setSearchRadius,
  setMaxSearchRadius,
  setNearbyPlaces,
  clearNearbyPlaces,
  clearSearchCenter,
  resetPlaceMapState
} = placeSlice.actions;
export default placeSlice.reducer;
