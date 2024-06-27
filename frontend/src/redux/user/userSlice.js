import { createEntityAdapter } from "@reduxjs/toolkit";
import { apiSlice } from "../api/apiSlice";

export const userAdapter = createEntityAdapter();
const initialState = userAdapter.getInitialState();

export const userSlice = apiSlice.injectEndpoints({
    endpoints: builder => ({
        getAuth: builder.mutation({
            query: ({ email, password }) => ({
                url: '/users/login',
                method: 'POST',
                body: { email, password }
            }),
            transformResponse: responseData => (
                userAdapter.setOne(initialState, responseData)
            ),
            providesTags: ['User'],
            invalidatesTags: (result, error, arg) => [{ type: 'User', id: result?.id }]
        }),
        setAuth: builder.mutation({
            query: (userData) => ({
                url: '/users/register',
                method: 'POST',
                body: userData
            }),
            invalidatesTags: ['User']
        })
    })
})

export const  {
    useGetAuthMutation,
    useSetAuthMutation
} = userSlice;