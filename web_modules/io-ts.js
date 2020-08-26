var t=function(a){return a._tag==="Left"},Ma=function(a){return{_tag:"Left",left:a}},U=function(a){return{_tag:"Right",right:a}},o=function(){var a=function(b,d){return a=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(c,e){c.__proto__=e}||function(c,e){for(var g in e)e.hasOwnProperty(g)&&(c[g]=e[g])},a(b,d)};return function(b,d){a(b,d);function c(){this.constructor=b}b.prototype=d===null?Object.create(d):(c.prototype=d.prototype,new c())}}(),D=function(){return D=Object.assign||function(a){for(var b,d=1,c=arguments.length;d<c;d++){b=arguments[d];for(var e in b)Object.prototype.hasOwnProperty.call(b,e)&&(a[e]=b[e])}return a},D.apply(this,arguments)},Na=function(){for(var a=0,b=0,d=arguments.length;b<d;b++)a+=arguments[b].length;for(var c=Array(a),e=0,b=0;b<d;b++)for(var g=arguments[b],h=0,f=g.length;h<f;h++,e++)c[e]=g[h];return c},p=function(){function a(b,d,c,e){this.name=b,this.is=d,this.validate=c,this.encode=e,this.decode=this.decode.bind(this)}return a.prototype.pipe=function(b,d){var c=this;return d===void 0&&(d="pipe("+this.name+", "+b.name+")"),new a(d,b.is,function(e,g){var h=c.validate(e,g);return t(h)?h:b.validate(h.right,g)},this.encode===n&&b.encode===n?n:function(e){return c.encode(b.encode(e))})},a.prototype.asDecoder=function(){return this},a.prototype.asEncoder=function(){return this},a.prototype.decode=function(b){return this.validate(b,[{key:"",type:this,actual:b}])},a}(),n=function(a){return a},V=function(a){return a.displayName||a.name||"<function"+a.length+">"},Oa=function(a,b){return{key:a,type:b}},z=function(a,b,d,c){for(var e=a.length,g=Array(e+1),h=0;h<e;h++)g[h]=a[h];return g[e]={key:b,type:d,actual:c},g},A=Ma,u=function(a,b,d){return A([{value:a,context:b,message:d}])},q=U,B=function(a,b){for(var d=b.length,c=0;c<d;c++)a.push(b[c])},W=function(a){o(b,a);function b(){var d=a.call(this,"null",function(c){return c===null},function(c,e){return d.is(c)?q(c):u(c,e)},n)||this;return d._tag="NullType",d}return b}(p),X=new W(),Y=function(a){o(b,a);function b(){var d=a.call(this,"undefined",function(c){return c===void 0},function(c,e){return d.is(c)?q(c):u(c,e)},n)||this;return d._tag="UndefinedType",d}return b}(p),G=new Y(),Z=function(a){o(b,a);function b(){var d=a.call(this,"void",G.is,G.validate,n)||this;return d._tag="VoidType",d}return b}(p),_=new Z(),$=function(a){o(b,a);function b(){var d=a.call(this,"unknown",function(c){return!0},q,n)||this;return d._tag="UnknownType",d}return b}(p),Pa=new $(),aa=function(a){o(b,a);function b(){var d=a.call(this,"string",function(c){return typeof c==="string"},function(c,e){return d.is(c)?q(c):u(c,e)},n)||this;return d._tag="StringType",d}return b}(p),J=new aa(),ba=function(a){o(b,a);function b(){var d=a.call(this,"number",function(c){return typeof c==="number"},function(c,e){return d.is(c)?q(c):u(c,e)},n)||this;return d._tag="NumberType",d}return b}(p),K=new ba(),ca=function(a){o(b,a);function b(){var d=a.call(this,"bigint",function(c){return typeof c==="bigint"},function(c,e){return d.is(c)?q(c):u(c,e)},n)||this;return d._tag="BigIntType",d}return b}(p),Qa=new ca(),da=function(a){o(b,a);function b(){var d=a.call(this,"boolean",function(c){return typeof c==="boolean"},function(c,e){return d.is(c)?q(c):u(c,e)},n)||this;return d._tag="BooleanType",d}return b}(p),Ra=new da(),ea=function(a){o(b,a);function b(){var d=a.call(this,"UnknownArray",Array.isArray,function(c,e){return d.is(c)?q(c):u(c,e)},n)||this;return d._tag="AnyArrayType",d}return b}(p),E=new ea(),fa=function(a){o(b,a);function b(){var d=a.call(this,"UnknownRecord",function(c){var e=Object.prototype.toString.call(c);return e==="[object Object]"||e==="[object Window]"},function(c,e){return d.is(c)?q(c):u(c,e)},n)||this;return d._tag="AnyDictionaryType",d}return b}(p),v=new fa(),ga=function(a){o(b,a);function b(){var d=a.call(this,"Function",function(c){return typeof c==="function"},function(c,e){return d.is(c)?q(c):u(c,e)},n)||this;return d._tag="FunctionType",d}return b}(p),Sa=new ga(),ha=function(a){o(b,a);function b(d,c,e,g,h,f){var i=a.call(this,d,c,e,g)||this;return i.type=h,i.predicate=f,i._tag="RefinementType",i}return b}(p),ia=function(a,b,d){return S(a,b,d)},Ta=ia(K,function(a){return Number.isInteger(a)},"Int"),ja=function(a){o(b,a);function b(d,c,e,g,h){var f=a.call(this,d,c,e,g)||this;return f.value=h,f._tag="LiteralType",f}return b}(p),Ua=function(a,b){b===void 0&&(b=JSON.stringify(a));var d=function(c){return c===a};return new ja(b,d,function(c,e){return d(c)?q(a):u(c,e)},n,a)},ka=function(a){o(b,a);function b(d,c,e,g,h){var f=a.call(this,d,c,e,g)||this;return f.keys=h,f._tag="KeyofType",f}return b}(p),H=Object.prototype.hasOwnProperty,Va=function(a,b){b===void 0&&(b=Object.keys(a).map(function(c){return JSON.stringify(c)}).join(" | "));var d=function(c){return J.is(c)&&H.call(a,c)};return new ka(b,d,function(c,e){return d(c)?q(c):u(c,e)},n,a)},L=function(a){o(b,a);function b(d,c,e,g,h){var f=a.call(this,d,c,e,g)||this;return f.runDefinition=h,f._tag="RecursiveType",f}return b}(p);Object.defineProperty(L.prototype,"type",{get:function(){return this.runDefinition()},enumerable:!0,configurable:!0});var Wa=function(a,b){var d,c=function(){return d||(d=b(e),d.name=a),d},e=new L(a,function(g){return c().is(g)},function(g,h){return c().validate(g,h)},function(g){return c().encode(g)},c);return e},la=function(a){o(b,a);function b(d,c,e,g,h){var f=a.call(this,d,c,e,g)||this;return f.type=h,f._tag="ArrayType",f}return b}(p),ma=function(a,b){return b===void 0&&(b="Array<"+a.name+">"),new la(b,function(d){return E.is(d)&&d.every(a.is)},function(d,c){var e=E.validate(d,c);if(t(e))return e;for(var g=e.right,h=g.length,f=g,i=[],j=0;j<h;j++){var k=g[j],l=a.validate(k,z(c,String(j),a,k));if(t(l))B(i,l.left);else{var m=l.right;m!==k&&(f===g&&(f=g.slice()),f[j]=m)}}return i.length>0?A(i):q(f)},a.encode===n?n:function(d){return d.map(a.encode)},a)},na=function(a){o(b,a);function b(d,c,e,g,h){var f=a.call(this,d,c,e,g)||this;return f.props=h,f._tag="InterfaceType",f}return b}(p),M=function(a){return Object.keys(a).map(function(b){return b+": "+a[b].name}).join(", ")},F=function(a){for(var b=0;b<a.length;b++)if(a[b].encode!==n)return!1;return!0},oa=function(a){return"{ "+M(a)+" }"},N=function(a,b){b===void 0&&(b=oa(a));var d=Object.keys(a),c=d.map(function(g){return a[g]}),e=d.length;return new na(b,function(g){if(v.is(g)){for(var h=0;h<e;h++){var f=d[h],i=g[f];if(i===void 0&&!H.call(g,f)||!c[h].is(i))return!1}return!0}return!1},function(g,h){var f=v.validate(g,h);if(t(f))return f;for(var i=f.right,j=i,k=[],l=0;l<e;l++){var m=d[l],r=j[m],x=c[l],s=x.validate(r,z(h,m,x,r));if(t(s))B(k,s.left);else{var y=s.right;(y!==r||y===void 0&&!H.call(j,m))&&(j===i&&(j=D({},i)),j[m]=y)}}return k.length>0?A(k):q(j)},F(c)?n:function(g){for(var h=D({},g),f=0;f<e;f++){var i=d[f],j=c[f].encode;j!==n&&(h[i]=j(g[i]))}return h},a)},pa=function(a){o(b,a);function b(d,c,e,g,h){var f=a.call(this,d,c,e,g)||this;return f.props=h,f._tag="PartialType",f}return b}(p),qa=function(a){return"Partial<"+a+">"},Xa=function(a,b){b===void 0&&(b=qa(oa(a)));var d=Object.keys(a),c=d.map(function(g){return a[g]}),e=d.length;return new pa(b,function(g){if(v.is(g)){for(var h=0;h<e;h++){var f=d[h],i=g[f];if(i!==void 0&&!a[f].is(i))return!1}return!0}return!1},function(g,h){var f=v.validate(g,h);if(t(f))return f;for(var i=f.right,j=i,k=[],l=0;l<e;l++){var m=d[l],r=j[m],x=a[m],s=x.validate(r,z(h,m,x,r));if(t(s))r!==void 0&&B(k,s.left);else{var y=s.right;y!==r&&(j===i&&(j=D({},i)),j[m]=y)}}return k.length>0?A(k):q(j)},F(c)?n:function(g){for(var h=D({},g),f=0;f<e;f++){var i=d[f],j=g[i];j!==void 0&&(h[i]=c[f].encode(j))}return h},a)},O=function(a){o(b,a);function b(d,c,e,g,h,f){var i=a.call(this,d,c,e,g)||this;return i.domain=h,i.codomain=f,i._tag="DictionaryType",i}return b}(p);function Ya(a,b,d,c){c===void 0&&(c="{ [K in "+b.name+"]: "+d.name+" }");var e=a.length;return new O(c,function(g){return v.is(g)&&a.every(function(h){return d.is(g[h])})},function(g,h){var f=v.validate(g,h);if(t(f))return f;for(var i=f.right,j={},k=[],l=!1,m=0;m<e;m++){var r=a[m],x=i[r],s=d.validate(x,z(h,r,d,x));if(t(s))B(k,s.left);else{var y=s.right;l=l||y!==x,j[r]=y}}return k.length>0?A(k):q(l||Object.keys(i).length!==e?j:i)},d.encode===n?n:function(g){for(var h={},f=0;f<e;f++){var i=a[f];h[i]=d.encode(g[i])}return h},b,d)}function P(a){var b;if(Ha(a)){var d=a.value;if(J.is(d))return b={},b[d]=null,b}else{if(tb(a))return a.keys;if(Ja(a)){var c=a.types.map(function(e){return P(e)});return c.some(G.is)?void 0:Object.assign.apply(Object,Na([{}],c))}}return}function Za(a,b,d){return d===void 0&&(d="{ [K in "+a.name+"]: "+b.name+" }"),new O(d,function(c){return v.is(c)?Object.keys(c).every(function(e){return a.is(e)&&b.is(c[e])}):Ga(b)&&Array.isArray(c)},function(c,e){if(v.is(c)){for(var g={},h=[],f=Object.keys(c),i=f.length,j=!1,k=0;k<i;k++){var l=f[k],m=c[l],r=a.validate(l,z(e,l,a,l));if(t(r))B(h,r.left);else{var x=r.right;j=j||x!==l,l=x;var s=b.validate(m,z(e,l,b,m));if(t(s))B(h,s.left);else{var y=s.right;j=j||y!==m,g[l]=y}}}return h.length>0?A(h):q(j?g:c)}return Ga(b)&&Array.isArray(c)?q(c):u(c,e)},a.encode===n&&b.encode===n?n:function(c){for(var e={},g=Object.keys(c),h=g.length,f=0;f<h;f++){var i=g[f];e[String(a.encode(i))]=b.encode(c[i])}return e},a,b)}function ra(a,b,d){var c=P(a);return c?Ya(Object.keys(c),a,b,d):Za(a,b,d)}var Q=function(a){o(b,a);function b(d,c,e,g,h){var f=a.call(this,d,c,e,g)||this;return f.types=h,f._tag="UnionType",f}return b}(p),sa=function(a){return"("+a.map(function(b){return b.name}).join(" | ")+")"},ta=function(a,b){b===void 0&&(b=sa(a));var d=Ka(a);if(d!==void 0&&a.length>0){var c=d[0],e=d[1],g=e.length,h=function(f){for(var i=0;i<g;i++)if(e[i].indexOf(f)!==-1)return i;return};return new I(b,function(f){if(v.is(f)){var i=h(f[c]);return i!==void 0?a[i].is(f):!1}return!1},function(f,i){var j=v.validate(f,i);if(t(j))return j;var k=j.right,l=h(k[c]);if(l===void 0)return u(f,i);var m=a[l];return m.validate(k,z(i,String(l),m,k))},F(a)?n:function(f){var i=h(f[c]);if(i===void 0)throw new Error("no codec found to encode value in union codec "+b);return a[i].encode(f)},a,c)}else return new Q(b,function(f){return a.some(function(i){return i.is(f)})},function(f,i){for(var j=[],k=0;k<a.length;k++){var l=a[k],m=l.validate(f,z(i,String(k),l,f));if(t(m))B(j,m.left);else return q(m.right)}return A(j)},F(a)?n:function(f){for(var i=0,j=a;i<j.length;i++){var k=j[i];if(k.is(f))return k.encode(f)}throw new Error("no codec found to encode value in union type "+b)},a)},ua=function(a){o(b,a);function b(d,c,e,g,h){var f=a.call(this,d,c,e,g)||this;return f.types=h,f._tag="IntersectionType",f}return b}(p),va=function(a,b){for(var d=!0,c=!0,e=0,g=b;e<g.length;e++){var h=g[e];h!==a&&(d=!1),v.is(h)&&(c=!1)}if(d)return a;if(c)return b[b.length-1];for(var f={},i=0,j=b;i<j.length;i++){var h=j[i];for(var k in h)(h[k]!==a[k]||!f.hasOwnProperty(k))&&(f[k]=h[k])}return f};function _a(a,b){b===void 0&&(b="("+a.map(function(c){return c.name}).join(" & ")+")");var d=a.length;return new ua(b,function(c){return a.every(function(e){return e.is(c)})},a.length===0?q:function(c,e){for(var g=[],h=[],f=0;f<d;f++){var i=a[f],j=i.validate(c,z(e,String(f),i,c));t(j)?B(h,j.left):g.push(j.right)}return h.length>0?A(h):q(va(c,g))},a.length===0?n:function(c){return va(c,a.map(function(e){return e.encode(c)}))},a)}var wa=function(a){o(b,a);function b(d,c,e,g,h){var f=a.call(this,d,c,e,g)||this;return f.types=h,f._tag="TupleType",f}return b}(p);function $a(a,b){b===void 0&&(b="["+a.map(function(c){return c.name}).join(", ")+"]");var d=a.length;return new wa(b,function(c){return E.is(c)&&c.length===d&&a.every(function(e,g){return e.is(c[g])})},function(c,e){var g=E.validate(c,e);if(t(g))return g;for(var h=g.right,f=h.length>d?h.slice(0,d):h,i=[],j=0;j<d;j++){var k=h[j],l=a[j],m=l.validate(k,z(e,String(j),l,k));if(t(m))B(i,m.left);else{var r=m.right;r!==k&&(f===h&&(f=h.slice()),f[j]=r)}}return i.length>0?A(i):q(f)},F(a)?n:function(c){return a.map(function(e,g){return e.encode(c[g])})},a)}var xa=function(a){o(b,a);function b(d,c,e,g,h){var f=a.call(this,d,c,e,g)||this;return f.type=h,f._tag="ReadonlyType",f}return b}(p),ab=function(a,b){return b===void 0&&(b="Readonly<"+a.name+">"),new xa(b,a.is,a.validate,a.encode,a)},ya=function(a){o(b,a);function b(d,c,e,g,h){var f=a.call(this,d,c,e,g)||this;return f.type=h,f._tag="ReadonlyArrayType",f}return b}(p),bb=function(a,b){b===void 0&&(b="ReadonlyArray<"+a.name+">");var d=ma(a);return new ya(b,d.is,d.validate,d.encode,a)},cb=function(a,b){return Ba(N(a),b)},I=function(a){o(b,a);function b(d,c,e,g,h,f){var i=a.call(this,d,c,e,g,h)||this;return i.tag=f,i}return b}(Q),db=function(a,b,d){d===void 0&&(d=sa(b));var c=ta(b,d);return c instanceof I?c:(console.warn("[io-ts] Cannot build a tagged union for "+d+", returning a de-optimized union"),new I(d,c.is,c.validate,c.encode,b,a))},za=function(a){o(b,a);function b(d,c,e,g,h){var f=a.call(this,d,c,e,g)||this;return f.type=h,f._tag="ExactType",f}return b}(p),R=function(a){switch(a._tag){case"RefinementType":case"ReadonlyType":return R(a.type);case"InterfaceType":case"StrictType":case"PartialType":return a.props;case"IntersectionType":return a.types.reduce(function(b,d){return Object.assign(b,R(d))},{})}},Aa=function(a,b){for(var d=Object.getOwnPropertyNames(a),c=!1,e={},g=0;g<d.length;g++){var h=d[g];H.call(b,h)?e[h]=a[h]:c=!0}return c?e:a},eb=function(a){return Ia(a)?"{| "+M(a.props)+" |}":ub(a)?qa("{| "+M(a.props)+" |}"):"Exact<"+a.name+">"},Ba=function(a,b){b===void 0&&(b=eb(a));var d=R(a);return new za(b,a.is,function(c,e){var g=v.validate(c,e);if(t(g))return g;var h=a.validate(c,e);return t(h)?h:U(Aa(h.right,d))},function(c){return a.encode(Aa(c,d))},a)},fb=function(a,b){return{value:a,context:b}},gb=function(a){return[{key:"",type:a}]},Ca=function(a){o(b,a);function b(){var d=a.call(this,"never",function(c){return!1},function(c,e){return u(c,e)},function(){throw new Error("cannot encode never")})||this;return d._tag="NeverType",d}return b}(p),hb=new Ca(),Da=function(a){o(b,a);function b(){var d=a.call(this,"any",function(c){return!0},q,n)||this;return d._tag="AnyType",d}return b}(p),ib=new Da(),jb=v,Ea=function(a){o(b,a);function b(){var d=a.call(this,"object",function(c){return c!==null&&typeof c==="object"},function(c,e){return d.is(c)?q(c):u(c,e)},n)||this;return d._tag="ObjectType",d}return b}(p),kb=new Ea();function S(a,b,d){return d===void 0&&(d="("+a.name+" | "+V(b)+")"),new ha(d,function(c){return a.is(c)&&b(c)},function(c,e){var g=a.validate(c,e);if(t(g))return g;var h=g.right;return b(h)?q(h):u(h,e)},a.encode,a,b)}var lb=S(K,Number.isInteger,"Integer"),mb=ra,nb=function(a){o(b,a);function b(d,c,e,g,h){var f=a.call(this,d,c,e,g)||this;return f.props=h,f._tag="StrictType",f}return b}(p);function ob(a){return a}function pb(a){return function(){return a}}var qb=function(a){return a.length>0},w={};function Fa(a,b){for(var d=[],c=0,e=a;c<e.length;c++){var g=e[c];b.indexOf(g)!==-1&&d.push(g)}return d}function rb(a,b){if(a===w)return b;if(b===w)return a;var d=Object.assign({},a);for(var c in b)if(a.hasOwnProperty(c)){var e=Fa(a[c],b[c]);if(qb(e))d[c]=e;else{d=w;break}}else d[c]=b[c];return d}function sb(a,b){if(a===w||b===w)return w;var d=w;for(var c in a)if(b.hasOwnProperty(c)){var e=Fa(a[c],b[c]);e.length===0&&(d===w&&(d={}),d[c]=a[c].concat(b[c]))}return d}function Ga(a){return a._tag==="AnyType"}function Ha(a){return a._tag==="LiteralType"}function tb(a){return a._tag==="KeyofType"}function Ia(a){return a._tag==="InterfaceType"}function ub(a){return a._tag==="PartialType"}function vb(a){return a._tag==="StrictType"}function wb(a){return a._tag==="ExactType"}function xb(a){return a._tag==="RefinementType"}function yb(a){return a._tag==="IntersectionType"}function Ja(a){return a._tag==="UnionType"}function zb(a){return a._tag==="RecursiveType"}var T=[];function C(a){if(T.indexOf(a)!==-1)return w;if(Ia(a)||vb(a)){var b=w;for(var d in a.props){var c=a.props[d];Ha(c)&&(b===w&&(b={}),b[d]=[c.value])}return b}else{if(wb(a)||xb(a))return C(a.type);{if(yb(a))return a.types.reduce(function(g,h){return rb(g,C(h))},w);{if(Ja(a))return a.types.slice(1).reduce(function(g,h){return sb(g,C(h))},C(a.types[0]));if(zb(a)){T.push(a);var e=C(a.type);return T.pop(),e}}}}return w}function Ka(a){var b=C(a[0]),d=Object.keys(b),c=a.length,e=function(j){for(var k=b[j].slice(),l=[b[j]],m=1;m<c;m++){var r=a[m],x=C(r),s=x[j];if(s===void 0)return"continue-keys";{if(s.some(function(y){return k.indexOf(y)!==-1}))return"continue-keys";k.push.apply(k,s),l.push(s)}}return{value:[j,l]}};La:for(var g=0,h=d;g<h.length;g++){var f=h[g],i=e(f);if(typeof i==="object")return i.value;switch(i){case"continue-keys":continue La}}return}export{ea as AnyArrayType,fa as AnyDictionaryType,Da as AnyType,E as Array,la as ArrayType,ca as BigIntType,da as BooleanType,jb as Dictionary,O as DictionaryType,za as ExactType,Sa as Function,ga as FunctionType,Ta as Int,lb as Integer,na as InterfaceType,ua as IntersectionType,ka as KeyofType,ja as LiteralType,Ca as NeverType,W as NullType,ba as NumberType,Ea as ObjectType,pa as PartialType,ya as ReadonlyArrayType,xa as ReadonlyType,L as RecursiveType,ha as RefinementType,nb as StrictType,aa as StringType,I as TaggedUnionType,wa as TupleType,p as Type,Y as UndefinedType,Q as UnionType,E as UnknownArray,v as UnknownRecord,$ as UnknownType,Z as VoidType,pb as alias,ib as any,z as appendContext,ma as array,Qa as bigint,Ra as boolean,ia as brand,ob as clean,mb as dictionary,w as emptyTags,Ba as exact,u as failure,A as failures,Oa as getContextEntry,gb as getDefaultContext,P as getDomainKeys,V as getFunctionName,Ka as getIndex,C as getTags,fb as getValidationError,n as identity,N as interface,_a as intersection,Va as keyof,Ua as literal,hb as never,X as null,X as nullType,K as number,kb as object,Xa as partial,ab as readonly,bb as readonlyArray,ra as record,Wa as recursion,S as refinement,cb as strict,J as string,q as success,db as taggedUnion,$a as tuple,N as type,G as undefined,ta as union,Pa as unknown,_ as void,_ as voidType};