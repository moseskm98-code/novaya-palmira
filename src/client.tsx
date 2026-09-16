import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { App } from './App';
import { routePath } from './sitePath';
import './app.css';
const root = document.getElementById('root');
if (root) hydrateRoot(root, <App path={routePath(window.location.pathname)} />);
