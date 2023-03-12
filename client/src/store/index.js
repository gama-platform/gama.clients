import { configureStore } from '@reduxjs/toolkit';

import authSlice from './Auth/auth-slice';
import messageSlice from './Message/message-slice'; 

const store = configureStore({
    reducer: {
        auth: authSlice.reducer,
        message: messageSlice.reducer, 
    }
});

export default store;
