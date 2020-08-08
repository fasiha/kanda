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

(async function main() {
  const HASH_PREFIX = 'hash-';
  const lines: Element[] = Array.from(document.querySelectorAll('line'));
  for (const node of lines) {
    node.addEventListener('click', async (e) => {
      const target: Element|null = e.target as any;
      const parent: Element|null|undefined = target?.parentElement;
      const lineId = parent?.id;
      if (lineId && lineId.startsWith(HASH_PREFIX)) {
        const hash = lineId.slice(HASH_PREFIX.length);
        const response = await fetch(`/dict-hits-per-line/line-${hash}.json`);
        if (response.ok) {
          const payload = await response.json();
          console.log(payload);
        }
      }
      console.log({e})
    });
  }
  console.log(lines);
})();

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/#hot-module-replacement
if (import.meta.hot) { import.meta.hot.accept(); }
