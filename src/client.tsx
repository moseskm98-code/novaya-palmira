import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';
import './app.css';
const root = document.getElementById('root');
if (root) hydrateRoot(root, <App path={window.location.pathname} />);
