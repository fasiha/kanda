var d=typeof globalThis!=="undefined"?globalThis:typeof window!=="undefined"?window:typeof global!=="undefined"?global:typeof self!=="undefined"?self:{};function e(a,h,b){return b={path:h,exports:{},require:function(i,c){return g(i,c===void 0||c===null?b.path:c)}},a(b,b.exports),b.exports}function f(a){return a&&a.default||a}function g(){throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs")}export{d as a,e as c,f as g};
