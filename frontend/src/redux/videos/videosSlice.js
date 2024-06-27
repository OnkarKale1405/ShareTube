import { createEntityAdapter } from "@reduxjs/toolkit";
import { apiSlice } from "../api/apiSlice";

export const videosAdapter = createEntityAdapter();
const initialState = videosAdapter.getInitialState();

export const videosSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({

    })
})