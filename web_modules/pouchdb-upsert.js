import{a as l,c as G}from"./common/_commonjsHelpers-738d5c9d.js";var y=l.MutationObserver||l.WebKitMutationObserver,p;if(y){var z=0,H=new y(t),A=l.document.createTextNode("");H.observe(A,{characterData:!0}),p=function(){A.data=z=++z%2}}else if(!l.setImmediate&&typeof l.MessageChannel!=="undefined"){var B=new l.MessageChannel();B.port1.onmessage=t,p=function(){B.port2.postMessage(0)}}else"document"in l&&"onreadystatechange"in l.document.createElement("script")?p=function(){var a=l.document.createElement("script");a.onreadystatechange=function(){t(),a.onreadystatechange=null,a.parentNode.removeChild(a),a=null},l.document.documentElement.appendChild(a)}:p=function(){setTimeout(t,0)};var u,q=[];function t(){u=!0;for(var a,c,b=q.length;b;){for(c=q,q=[],a=-1;++a<b;)c[a]();b=q.length}u=!1}var I=J;function J(a){q.push(a)===1&&!u&&p()}function n(){}var i={},C=["REJECTED"],v=["FULFILLED"],D=["PENDING"],K=m;function m(a){if(typeof a!=="function")throw new TypeError("resolver must be a function");this.state=D,this.queue=[],this.outcome=void 0,a!==n&&E(this,a)}m.prototype.catch=function(a){return this.then(null,a)},m.prototype.then=function(a,c){if(typeof a!=="function"&&this.state===v||typeof c!=="function"&&this.state===C)return this;var b=new this.constructor(n);if(this.state!==D){var e=this.state===v?a:c;w(b,e,this.outcome)}else this.queue.push(new r(b,a,c));return b};function r(a,c,b){this.promise=a,typeof c==="function"&&(this.onFulfilled=c,this.callFulfilled=this.otherCallFulfilled),typeof b==="function"&&(this.onRejected=b,this.callRejected=this.otherCallRejected)}r.prototype.callFulfilled=function(a){i.resolve(this.promise,a)},r.prototype.otherCallFulfilled=function(a){w(this.promise,this.onFulfilled,a)},r.prototype.callRejected=function(a){i.reject(this.promise,a)},r.prototype.otherCallRejected=function(a){w(this.promise,this.onRejected,a)};function w(a,c,b){I(function(){var e;try{e=c(b)}catch(h){return i.reject(a,h)}e===a?i.reject(a,new TypeError("Cannot resolve promise with itself")):i.resolve(a,e)})}i.resolve=function(a,c){var b=F(L,c);if(b.status==="error")return i.reject(a,b.value);var e=b.value;if(e)E(a,e);else{a.state=v,a.outcome=c;for(var h=-1,f=a.queue.length;++h<f;)a.queue[h].callFulfilled(c)}return a},i.reject=function(a,c){a.state=C,a.outcome=c;for(var b=-1,e=a.queue.length;++b<e;)a.queue[b].callRejected(c);return a};function L(a){var c=a&&a.then;if(a&&(typeof a==="object"||typeof a==="function")&&typeof c==="function")return function b(){c.apply(a,arguments)}}function E(a,c){var b=!1;function e(d){if(b)return;b=!0,i.reject(a,d)}function h(d){if(b)return;b=!0,i.resolve(a,d)}function f(){c(h,e)}var g=F(f);g.status==="error"&&e(g.value)}function F(a,c){var b={};try{b.value=a(c),b.status="success"}catch(e){b.status="error",b.value=e}return b}m.resolve=M;function M(a){return a instanceof this?a:i.resolve(new this(n),a)}m.reject=N;function N(a){var c=new this(n);return i.reject(c,a)}m.all=O;function O(a){var c=this;if(Object.prototype.toString.call(a)!=="[object Array]")return this.reject(new TypeError("must be an array"));var b=a.length,e=!1;if(!b)return this.resolve([]);for(var h=new Array(b),f=0,g=-1,d=new this(n);++g<b;)j(a[g],g);return d;function j(k,o){c.resolve(k).then(s,function(x){e||(e=!0,i.reject(d,x))});function s(x){h[o]=x,++f===b&&!e&&(e=!0,i.resolve(d,h))}}}m.race=P;function P(a){var c=this;if(Object.prototype.toString.call(a)!=="[object Array]")return this.reject(new TypeError("must be an array"));var b=a.length,e=!1;if(!b)return this.resolve([]);for(var h=-1,f=new this(n);++h<b;)g(a[h]);return f;function g(d){c.resolve(d).then(function(j){e||(e=!0,i.resolve(f,j))},function(j){e||(e=!0,i.reject(f,j))})}}var Q=typeof Promise==="function"?Promise:K,R=G(function(a,c){function b(h,f,g){return typeof f!=="string"?Q.reject(new Error("doc id is required")):h.get(f).catch(function(d){if(d.status!==404)throw d;return{}}).then(function(d){var j=d._rev,k=g(d);return k?(k._id=f,k._rev=j,e(h,k,g)):{updated:!1,rev:j,id:f}})}function e(h,f,g){return h.put(f).then(function(d){return{updated:!0,rev:d.rev,id:f._id}},function(d){if(d.status!==409)throw d;return b(h,f._id,g)})}c.upsert=function h(f,g,d){var j=this,k=b(j,f,g);if(typeof d!=="function")return k;k.then(function(o){d(null,o)},d)},c.putIfNotExists=function h(f,g,d){var j=this;typeof f!=="string"&&(d=g,g=f,f=g._id);var k=function(s){return s._rev?!1:g},o=b(j,f,k);if(typeof d!=="function")return o;o.then(function(s){d(null,s)},d)},typeof window!=="undefined"&&window.PouchDB&&window.PouchDB.plugin(c)});export default R;
