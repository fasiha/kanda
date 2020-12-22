import"./Docs.css.proxy.js";const _e="https://curtiz-japanese-nlp.glitch.me/api/v1/sentences";import te from"../web_modules/ebisu-js.js";var Y;(function(t){t.kana2meaning="kana2meaning",t.kanji2kana="kanji2kana",t.any2kanji="any2kanji"})(Y||(Y={}));import O from"../web_modules/pouchdb-browser.js";import fe from"../web_modules/pouchdb-upsert.js";O.plugin(fe);const p=new O("sidecar-docs"),$=new O("sidecar-memories"),G="https://gotanda-1.glitch.me";$.changes({since:"now",live:!0,include_docs:!0}).on("change",z(t=>{if(ge(t.id)&&!t.deleted){const e=t.doc;oe.set(e.wordId,Object.keys(e.ebisus))}})),p.changes({since:"now",live:!0,include_docs:!0}).on("change",z(async t=>{if(he(t.id))if(t.deleted){const e=Object.values(q).find(o=>A(o.unique)===t.id);e&&delete q[e.unique]}else{const e=t.doc,o=q[e.unique];if(o&&e.sha1s.every(s=>s in o.annotated))o.sha1s=e.sha1s,o.contents=e.contents,o.overrides=e.overrides,o.name=e.name;else{const s=(await ne(e.unique))[e.unique];V(()=>q[e.unique]=s)}}else if(!me(t.id)){if(pe(t.id)){const e=t.doc,o=Object.values(q).find(s=>t.id===L(s.unique,e.sha1));o&&(o.annotated[e.sha1]=e)}}})),async function(){{const o=await fetch(`${G}/loginstatus`,{credentials:"include"});let s=o.ok?await o.text():void 0;if(V(()=>{se.loggedIn=o.ok,s&&(se.serverMessage=s)}),!o.ok)return}const e="kanda-mobx2";for(const[o,s]of[[p,e],[$,"kanda-memories"]]){const a=new O(`${G}/db/${s}`,{fetch:(i,r)=>(r||(r={}),r.credentials="include",O.fetch(i,r))});await o.replicate.from(a),o.sync(a,{live:!0,retry:!0})}{const o=await fetch(`${G}/me/onlookers`,{credentials:"include"});if(o.ok){const s=await o.json();for(const a of s.creators.filter(i=>i.app===e)){const i=new O(`${G}/creator/${a.creator}/app/${a.app}`,{fetch:(r,u)=>(u||(u={}),u.credentials="include",O.fetch(r,u))});await p.replicate.from(i),p.replicate.from(i,{live:!0,retry:!0})}}}}();function A(t){return`doc-${t}`}function X(t,e){return`docRaw-${t}-${typeof e=="string"?e:e.sha1}`}function L(t,e){return`docAnnotated-${t}-${typeof e=="string"?e:e.sha1}`}function Q(t){return"memory-"+(typeof t=="string"?t:t.wordId)}function he(t){return t.startsWith("doc-")}function me(t){return t.startsWith("docRaw-")}function pe(t){return t.startsWith("docAnnotated-")}function ge(t){return t.startsWith("memory-")}async function ne(t=""){const e=A(t),o=await p.allDocs({startkey:e,endkey:e+"️",include_docs:!0}),s=await Promise.all(o.rows.flatMap(i=>{if(!i.doc)return[];const r=i.doc.unique,u=i.doc.sha1s;return p.allDocs({keys:u.map(_=>L(r,_)),include_docs:!0}).then(async _=>{const l={};for(const g of _.rows){const f=g.doc;if(f){if(f.furigana.length===0){p.upsert(g.id,()=>({_deleted:!0}));continue}if(f.furigana.some(R=>!R)){const R=await p.get(X(r,f.sha1));f.furigana=f.furigana.map((w,E)=>w||R.furigana[E]),p.upsert(L(r,f.sha1),w=>({...w,furigana:f.furigana}))}l[f.sha1]=f}}return l})})),a={};for(const[i,{doc:r}]of o.rows.entries())if(r){const u={name:r.name,unique:r.unique,overrides:r.overrides,contents:r.contents,sha1s:r.sha1s,annotated:s[i]};a[r.unique]=u}return a}async function ae(t){const e=Q(""),o=await t.allDocs({startkey:e,endkey:e+"️",include_docs:!0}),s=[];for(const a of o.rows){const i=a.doc;i&&s.push(i)}return s}async function we(t,e=Date.now()){const o=Q(""),s=await t.allDocs({startkey:o,endkey:o+"️",include_docs:!0});let a=0,i=Infinity,r;for(const u of s.rows){const _=u.doc;if(_){++a;for(const[l,g]of Object.entries(_.ebisus)){if(!g)continue;const f=te.predictRecall(g.memory,(e-g.epoch)*ue);f<i&&(r={..._,ebisus:{[l]:g}},i=f)}}}return{memory:r,total:a}}async function ye(t){return p.upsert(A(t),()=>({_deleted:!0}))}async function be(){const t=[];return new Promise((e,o)=>{p.changes({filter:s=>s._deleted}).on("change",s=>t.push(s.id)).on("complete",()=>{e(t)}).on("error",s=>o(s))})}async function Pe(){const t=await be(),e="No longer able to get deleted document. It may have been compacted during export?";let o=await Promise.all(t.map(a=>p.get(a,{revs:!0,open_revs:"all"}).then(i=>{const r=i[0].ok._revisions,u=r.start-1+"-"+r.ids[1],_=p.get(a,{rev:u});return _})).map(a=>a.catch(i=>(console.error(e,i),i))));o.some(a=>a instanceof Error)&&(alert(e+" See JavaScript Console for details."),o=o.filter(a=>!(a instanceof Error)));const s=o.map(({name:a,unique:i,contents:r,sha1s:u,overrides:_})=>({name:a,unique:i,contents:r,sha1s:u,overrides:_}));return s}import{observable as B,action as z,runInAction as V}from"../web_modules/mobx.js";const q=B({}),J=B({state:"left"}),oe=B.map(new Map()),se=B({loggedIn:void 0,serverMessage:void 0,debug:""}),Z=B({click:void 0});(async function(){const[e,o]=await Promise.all([ne(),ae($)]);z(()=>{oe.replace(o.map(s=>[s.wordId,Object.keys(s.ebisus)]));for(const[s,a]of Object.entries(e))q[s]=B(a)})()})();import{observer as M}from"../web_modules/mobx-react-lite.js";import{createElement as n,Fragment as ee,Suspense as Re,useState as F}from"../web_modules/react.js";export const DocsComponent=M(function({}){return n("div",{},n(Ee),n(Ue),n("div",{id:"all-docs",className:"main"},n("ul",{},...Object.values(q).map(e=>n("li",null,n("a",{href:"#"+e.unique},e.name||e.unique)))),...Object.values(q).map(e=>n(ke,{doc:e})),n(re),n(Se),n(De)),n("div",{className:"not-main"},n(Re,{fallback:n("p",null,"Loading…")},n(xe))))});const Ee=M(function({}){const e=se;return n("div",{className:"login-header"},typeof e.loggedIn=="boolean"?e.loggedIn?"Logged in!":n("a",{href:G},"Log in to Gotanda"):"(waiting)")}),Ue=M(function(){if(!J.payload){const o=n("button",{onClick:async()=>{const s=Date.now(),a=await we($,s);V(()=>{J.payload={memory:a.memory,history:[]}})}},"Get quiz");return o}const e=J.payload.memory;if(e&&e.ebisus.kana2meaning){const[o,s]=e.summary.split("|"),a=i=>{$.upsert(Q(e.wordId),z(r=>{if(!r)return!1;const u=r.ebisus;if(!u)return!1;const _=u.kana2meaning;if(!_)return!1;const l=Date.now();return u.kana2meaning={epoch:l,memory:te.updateRecall(_.memory,+i,1,(l-_.epoch)*ue)},J.payload=void 0,r}))};return n("div",null,`Do you know what this means: ${o}`,n("button",{onClick:()=>a(!0)},"Yes!"),n("button",{onClick:()=>a(!1)},"No…"),n("button",{onClick:z(()=>J.payload=void 0)},"Cancel"),n("details",null,n("span",{className:"hidden-till-highlight"},s)))}return n("div",null,"Nothing to quiz!")}),ke=M(function({doc:e}){const[o,s]=F(!1);if(!e)return n(ee);const a=n("button",{onClick:()=>ye(e.unique)},"Delete"),i=n("button",{onClick:()=>s(!o)},o?"Cancel":"Edit"),r=o?n(re,{old:e,done:()=>s(!o)}):n("section",null,...e.sha1s.map((u,_)=>n(Ie,{lineNumber:_,doc:e})));return n("div",{className:"doc"},n("h2",{id:e.unique},e.name||e.unique,a,i),r,n(je,{doc:e}),n(ve,{doc:e}))});function re({old:t,done:e}){const[o,s]=F(t?t.name:""),[a,i]=F(t?t.contents.join(`
`):""),r=n("input",{type:"text",value:o,onChange:l=>s(l.target.value)}),u=n("textarea",{value:a,onChange:l=>i(l.currentTarget.value)}),_=n("button",{onClick:async()=>{const l=a.split(`
`),g=new Map(t?t.contents.map((w,E)=>[w,E]):[]),f=t?l.filter(w=>!g.has(w)):l,R=await le(f);if(R){const w={},E={},y=[],N=new Map();let H=0;for(const[c,h]of l.entries()){const b=g.get(h);if(b!==void 0){const U=t?.sha1s[b]||"";y.push(U),E[U]=t?.annotated[b];continue}const P=R[H++],m=await $e(h,"sha-1");y.push(m),N.set(m,c),typeof P!="string"&&(w[m]={sha1:m,text:h,hits:P.hits,furigana:P.furigana,kanjidic:P.kanjidic},E[m]={sha1:m,text:h,hits:[],furigana:P.furigana.slice()})}if(y.length!==l.length&&console.error("Mismatch between lines and sha1s",{sha1s:y,newContents:l}),t){const c=new Set(y),h=new Set(t.sha1s.flatMap((x,k)=>c.has(x)?[]:k)),b=new Set(l.flatMap((x,k)=>g.has(x)?[]:k)),P=new Map(),m=new Map(),U=[];for(const x of h){const k=t.sha1s[x],j=t.annotated[k];let S;try{S=await p.get(X(t.unique,k))}catch{S=void 0}for(const[v,I]of(j?j.furigana:[]).entries())I&&(P.set(T(I),I),m.set(ie(S?.furigana[v]||["<none>"]),I));for(const v of j?j.hits:[]){const I=(S?.furigana.slice(v.startIdx,v.endIdx)||[]).map(T);U.push({...v,furiganaBase:I,used:!1})}}for(const x of b){const k=E[y[x]],j=w[y[x]];if(k&&j){for(const[v,I]of j.furigana.entries()){const D=P.has(T(I))?m.get(ie(I)):void 0;D&&(k.furigana[v]=D)}const S=j.furigana.map(T);for(const v of U)if(!v.used&&l[x].includes(Le(v.run))){const I=v.furiganaBase,D=Ae(S,I);if(D>=0){const de=Ne(Te(S.slice(0,D).join(""),I.join(""),S.slice(D+I.length).join("")));k.hits.push({summary:v.summary,wordId:v.wordId,run:de,startIdx:D,endIdx:D+I.length}),v.used=!0}}}}}const C=t?t.unique:new Date().toISOString(),W={name:o,unique:C,contents:l,sha1s:y,overrides:t?t.overrides:{}};let d=[p.upsert(A(C),()=>W)];for(const c of N.keys())d.push(p.upsert(X(C,c),()=>w[c])),d.push(p.upsert(L(C,c),()=>E[c]));Promise.all(d).then(()=>{e&&e()})}else console.error("error parsing sentences")}},"Submit");return n("div",null,t?"":n("h2",null,"Create a new document"),r,n("br"),u,n("br"),_)}const ve=M(function({doc:e}){return n("details",{className:"regular-sized limited-height"},n("summary",null,"All dictionary annotations"),n("ol",null,...e.sha1s.flatMap(o=>e.annotated[o]?.hits.map(s=>n("li",null,s.summary))||[])))}),Ie=M(function({lineNumber:e,doc:o}){const s=o.annotated[o.sha1s[e]];if(!s)return n("p",null,o.contents[e]);const{furigana:a,text:i}=s,r=new Set();if(s)for(const{startIdx:l,endIdx:g}of s.hits)for(let f=l;f<g;f++)r.add(f);const u=r.size>0?l=>r.has(l)?"annotated-text":void 0:()=>{},_=o.sha1s[e];return n("p",{id:`${o.unique}-${e}`},...a.map(l=>l?o.overrides[T(l)]||l:["missing"]).flatMap((l,g)=>l.map(f=>{let R;const w=async()=>{try{R=await p.get(X(o.unique,_))}catch{const y=await le([i]);y&&y[0]&&typeof y[0]!="string"?R={sha1:_,text:i,...y[0]}:R={sha1:_,text:i,hits:[],furigana:[]}}const E={doc:o,lineNumber:e,morphemeNumber:g,raw:R};V(()=>Z.click=E)};return typeof f=="string"?n("span",{className:u(g),onClick:w},f):n("ruby",{className:u(g),onClick:w},f.ruby,n("rt",null,f.rt))})))}),xe=M(function({}){const e=Z.click;if(!e)return n("div",null);const{doc:o,lineNumber:s,morphemeNumber:a,raw:i}=e,r=o.sha1s[s],u=o.annotated[r];if(!i||!u)return n("div",null);const _=o.unique,l=i.hits[a],g=new Set(u?.hits?.map(d=>d.wordId+K(d.run))),f=new Map();{const d=new Set(u?.hits?.map(c=>c.wordId));for(const[c,h]of o.sha1s.entries()){const b=o.annotated[h];if(b){const P=o.contents[c],m=b.hits.filter(U=>d.has(U.wordId));for(const{wordId:U}of m)f.set(U,(f.get(U)||[]).concat({sentence:P,lino:c}))}}}function R(d,c,h,b){p.upsert(L(_,r),P=>{const m=P?.hits;if(!P||!m)return!1;const U=K(c),x=m.findIndex(k=>k.wordId===d.wordId&&K(k.run)===U);if(x>=0){const k=m.splice(x,1)}else{const k={run:c,startIdx:h,endIdx:b,wordId:d.wordId,summary:d.summary};m.push(k)}return P})}const w=i.furigana[a],E=i.kanjidic||{},y=T(w).split("").filter(d=>d in E).map(d=>E[d]),N=y.length?n("div",null,n("h3",null,"Kanjidic"),n("ol",null,...y.map(d=>n("li",null,summarizeCharacter(d),d.dependencies?.length?n("ul",null,...d.dependencies.map(c=>n("li",null,c.nodeMapped?summarizeCharacter(c.nodeMapped):c.node))):void 0)))):"",H=new Set(l.results.flatMap(d=>d.results.map(c=>c.wordId))),C=u?.hits?.filter(d=>H.has(d.wordId))||[],W=C.length?n("div",null,n("h3",null,"All uses"),n("ul",null,...C.map(d=>n("li",null,d.summary,n("ol",null,...(f.get(d.wordId)||[]).map(({sentence:c,lino:h})=>n("li",null,n("a",{href:`#${_}-${h}`},qe(d.run,c))))))))):"";return n("div",null,n("button",{onClick:z(()=>Z.click=void 0)},"close"),...l.results.map(d=>n("ol",null,...d.results.map(c=>{const h=g.has(c.wordId+K(d.run)),b=oe.get(c.wordId)||[],P=h?[n("button",{onClick:()=>{$.upsert(Q(c.wordId),m=>{if(!m.wordId)return{wordId:c.wordId,memoryType:"jmdictWordId",summary:c.summary,ebisus:{[Y.kana2meaning]:ce()}};const U=m.ebisus||{};return U.kana2meaning?delete U.kana2meaning:U.kana2meaning=ce(),m.ebisus=U,m})}},b.includes(Y.kana2meaning)?"Unlearn kana?":"Mark kana as learned!")]:[];return n("li",{className:h?"annotated-entry":void 0},...Oe(d.run,c.summary),n("button",{onClick:()=>R(c,d.run,l.startIdx,d.endIdx)},h?"Entry highlighted! Remove?":"Create highlight?"),...P)}))),N,W,n(Ce,{key:`${o.unique}${s}${a}`}))});function Ce({}){const t=Z.click;if(!t)return n(ee);const{doc:e,lineNumber:o,morphemeNumber:s,raw:a}=t,i=a?.furigana[s]||[],r=e.annotated[e.sha1s[o]]?.furigana[s]||i,u=T(r),_=e.overrides[u]||r,l=_.filter(c=>typeof c!="string"),g=l.map(c=>c.rt),f=u in e.overrides,[R,w]=F(g),[E,y]=F(f);if(l.length===0)return n(ee);const N=R.map((c,h)=>n("input",{type:"text",value:c,onChange:b=>w(R.map((P,m)=>m===h?b.target.value:P))})),H=n("input",{type:"checkbox",name:"globalCheckbox",checked:E,onChange:()=>y(!E)}),C=n("label",{htmlFor:"globalCheckbox"},"Global override?"),W=n("button",{onClick:()=>{const c=[];{let h=0;for(const b of i)c.push(typeof b=="string"?b:{ruby:b.ruby,rt:R[h++]})}E?p.upsert(A(e.unique),h=>(h.overrides={...h.overrides,[u]:c},h)):p.upsert(L(e.unique,e.sha1s[o]),h=>(h.furigana&&(h.furigana[s]=c),h))}},"Submit override"),d=n("button",{onClick:()=>{w(g),y(f)}},"Cancel");return n("div",null,n("h3",null,"Override for: "+u),n("ol",null,...l.map((c,h)=>n("li",null,c.ruby+" ",N[h]))),C,H,W)}function je({doc:t}){const e=t.overrides,o=Object.keys(e);return o.length===0?n(ee):n("div",null,n("h3",null,"Overrides"),n("ol",null,...o.map(s=>{const a=()=>{p.upsert(A(t.unique),u=>{const _=u.overrides||{};return delete _[s],u.overrides=_,u})},i=e[s].map(u=>typeof u=="string"?u:n("ruby",null,u.ruby,n("rt",null,u.rt))),r=n("button",{onClick:a},"Delete");return n("li",null,`${s} → `,...i," ",r)})))}function Se(){const[t,e]=F([]),o=n("button",{onClick:()=>Pe().then(a=>e(a))},"Refresh deleted docs"),s=a=>p.upsert(A(a.unique),()=>a);return n("div",null,n("h2",null,"Deleted"),o,n("ol",null,...t.map(a=>n("li",null,`${a.name} (${a.unique}): ${a.contents.join(" ").slice(0,15)}…`,n("button",{onClick:()=>s(a)},"Undelete")))))}function De(){return n("button",{onClick:async()=>{const t=await ne(),e=await ae($),o=new Blob([JSON.stringify({docs:t,memories:e})],{type:"application/json"}),s=document.createElement("a");s.href=URL.createObjectURL(o),s.download=`kanda-${new Date().toISOString().replace(/:/g,".")}.json`,document.body.appendChild(s),s.click()}},"Export")}function qe(t,e){const o=K(t),s=e.indexOf(o);return s<0?e:"…"+e.slice(Math.max(0,s-5),s+o.length+5)+"…"}function Oe(t,e){const o=new Set((typeof t=="string"?t:t.cloze).split(""));return e.split("").map(s=>o.has(s)?n("span",{className:"highlighted"},s):s)}export function summarizeCharacter(t){const{literal:e,readings:o,meanings:s,nanori:a}=t;return`${e}： ${o.join(", ")} ${s.join("; ")}`+(a.length?` (names: ${a.join(", ")})`:"")}async function $e(t,e){const o=new TextEncoder().encode(t),s=await crypto.subtle.digest(e,o);return Array.from(new Uint8Array(s),a=>a.toString(16).padStart(2,"0")).join("")}function K(t){return typeof t=="string"?t:`${t.left}${t.cloze}${t.right}`}function T(t){return t.map(e=>typeof e=="string"?e:e.ruby).join("")}function ie(t){return t.map(e=>typeof e=="string"?e:e.rt).join("")}function Ae(t,e,o=0){if(e.length>t.length)return-1;e:for(let s=o;s<t.length-e.length+1;s++){for(let a=0;a<e.length;a++)if(t[s+a]!==e[a])continue e;return s}return-1}function Me(t,e){const o=t.indexOf(e);return o>=0&&t.indexOf(e,o+1)<0}function Te(t,e,o){const s=t+e+o;let a="",i="",r=0;for(;!Me(s,a+e+i);){if(r++,r>t.length&&r>o.length)throw console.error({sentence:s,left:t,cloze:e,right:o,leftContext:a,rightContext:i,contextLength:r}),new Error("Ran out of context to build unique cloze");a=t.slice(-r),i=o.slice(0,r)}return{left:a,cloze:e,right:i}}function Ne(t){return!t.right&&!t.left?t.cloze:t}function Le(t){return typeof t=="string"?t:t.cloze}function ce(t=Date.now()){return{epoch:t,memory:te.defaultModel(1,2.5)}}const ue=1/36e5;async function le(t){const e=await fetch(_e,{body:JSON.stringify({sentences:t}),headers:{"Content-Type":"application/json"},method:"POST"});return e.ok?await e.json():void 0}
