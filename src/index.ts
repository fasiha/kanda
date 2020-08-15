import './index.css';

import React, {createElement as ce} from 'react';
import ReactDOM from 'react-dom';
import Recoil from 'recoil';

import {Doc, setupLightweightJson} from './Doc';

const documentName = 'jb.json';
const docPromise = setupLightweightJson(documentName);
docPromise.then(
    data => ReactDOM.render(ce(React.StrictMode, null, ce(Recoil.RecoilRoot, null, ce(Doc, {data, documentName}))),
                            document.getElementById('root')));

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/#hot-module-replacement
if (import.meta.hot) { import.meta.hot.accept(); }
