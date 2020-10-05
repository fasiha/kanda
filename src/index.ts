import './index.css';

import React, {createElement as ce} from 'react';
import ReactDOM from 'react-dom';
import Recoil from 'recoil';

import {DocsComponent} from './Docs';

ReactDOM.render(
    ce(React.StrictMode, null,
       ce(Recoil.RecoilRoot, null, ce(React.Suspense, {fallback: ce('p', null, 'Loading…')}, ce(DocsComponent)))),
    document.getElementById('root'))

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/#hot-module-replacement
if (import.meta.hot) { import.meta.hot.accept(); }
