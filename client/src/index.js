import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom'
import App from './App';
import store from './store/index';
import './global.css'
import './index.css';

import { GoogleOAuthProvider } from '@react-oauth/google';
const root = ReactDOM.createRoot(document.getElementById('root'));  
root.render(
    // <React.StrictMode>
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GID}>
        <Provider store={store}>
            <BrowserRouter>
                <App />
            </BrowserRouter>
        </Provider>
    </GoogleOAuthProvider>
    // </React.StrictMode>
);