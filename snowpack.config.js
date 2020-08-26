module.exports = {
  "extends": "@snowpack/app-scripts-react",
  "plugins": [],
  buildOptions: {baseUrl: '/kanda/'},
  installOptions: {
    rollup: {
      plugins: [require('rollup-plugin-node-polyfills')()], // needed for PouchDB which imports "events"?
    },
  },
};