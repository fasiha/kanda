import './index.css';

/*
import App from './App';
import React, {createElement as ce} from 'react';
import ReactDOM from 'react-dom';
ReactDOM.render(
    ce(React.StrictMode, null, ce(App)),
    document.getElementById('root'),
);
*/

{
  const lines: Element[] = Array.from(document.querySelectorAll('line'));
  console.log(lines);
}

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/#hot-module-replacement
if (import.meta.hot) { import.meta.hot.accept(); }
