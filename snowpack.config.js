module.exports = {
  "extends": "@snowpack/app-scripts-react",
  "plugins": [],
  "mount": {"/dict-hits-per-line": "/dict-hits-per-line"},
  installOptions: {
    rollup: {
      plugins: [require('rollup-plugin-node-polyfills')()], // needed for PouchDB which imports "events"?
    },
  },
};