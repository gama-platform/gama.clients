import { createSlice } from '@reduxjs/toolkit';

const messageSlice = createSlice({
    name: 'message',
    initialState: {
        type: undefined, // success, error, warning, info
        message: undefined,
        description: undefined,
        autoclose:1500,
        change: true
    },
    reducers: {
        set(state, action) {
            state.type = action.payload.type || 'info';
            state.message = action.payload.message; 
            action.payload.autoclose ?
                state.autoclose = action.payload.autoclose :
                state.autoclose = 1500;
            action.payload.description ?
                state.description = action.payload.description :
                state.description = undefined;
            state.change = !state.change;
        }
    }
});

export const messageActions = messageSlice.actions;

export default messageSlice;
