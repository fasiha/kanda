import"./Docs.css.proxy.js";const _e="https://curtiz-japanese-nlp.glitch.me/api/v1/sentences";import ee from"../web_modules/ebisu-js.js";var Q;(function(n){n.kana2meaning="kana2meaning",n.kanji2kana="kanji2kana",n.any2kanji="any2kanji"})(Q||(Q={}));import T from"../web_modules/pouchdb-browser.js";import fe from"../web_modules/pouchdb-upsert.js";T.plugin(fe);const b=new T("sidecar-docs"),M=new T("sidecar-memories"),W="https://gotanda-1.glitch.me";M.changes({since:"now",live:!0,include_docs:!0}).on("change",A(n=>{if(ge(n.id)&&!n.deleted){const e=n.doc;oe.set(e.wordId,Object.keys(e.ebisus))}})),b.changes({since:"now",live:!0,include_docs:!0}).on("change",A(async n=>{if(he(n.id))if(n.deleted){const e=Object.values(D).find(t=>O(t.unique)===n.id);e&&delete D[e.unique]}else{const e=n.doc,t=D[e.unique];t&&e.sha1s.every(s=>s in t.raws)?(t.sha1s=e.sha1s,t.contents=e.contents,t.overrides=e.overrides,t.name=e.name):D[e.unique]=(await te(e.unique))[e.unique]}else if(me(n.id)){const e=n.doc,t=Object.values(D).find(s=>n.id===ne(s.unique,e.sha1));t&&(t.raws[e.sha1]=e)}else if(pe(n.id)){const e=n.doc,t=Object.values(D).find(s=>n.id===G(s.unique,e.sha1));t&&(t.annotated[e.sha1]=e)}})),async function(){{const t=await fetch(`${W}/loginstatus`,{credentials:"include"});let s=t.ok?await t.text():void 0;re(()=>{se.loggedIn=t.ok,s&&(se.serverMessage=s)})}const e="kanda-mobx2";for(const[t,s]of[[b,e],[M,"kanda-memories"]]){const a=new T(`${W}/db/${s}`,{fetch:(u,r)=>(r||(r={}),r.credentials="include",T.fetch(u,r))});await t.replicate.from(a),t.sync(a,{live:!0,retry:!0})}{const t=await fetch(`${W}/me/onlookers`,{credentials:"include"});if(t.ok){const s=await t.json();for(const a of s.creators.filter(u=>u.app===e)){const u=new T(`${W}/creator/${a.creator}/app/${a.app}`,{fetch:(r,i)=>(i||(i={}),i.credentials="include",T.fetch(r,i))});await b.replicate.from(u,{live:!0,retry:!0})}}}}();function O(n){return`doc-${n}`}function ne(n,e){return`docRaw-${n}-${typeof e=="string"?e:e.sha1}`}function G(n,e){return`docAnnotated-${n}-${typeof e=="string"?e:e.sha1}`}function V(n){return"memory-"+(typeof n=="string"?n:n.wordId)}function he(n){return n.startsWith("doc-")}function me(n){return n.startsWith("docRaw-")}function pe(n){return n.startsWith("docAnnotated-")}function ge(n){return n.startsWith("memory-")}async function te(n=""){const e=O(n),t=await b.allDocs({startkey:e,endkey:e+"️",include_docs:!0}),s=await Promise.all(t.rows.flatMap(r=>{if(!r.doc)return[];const i=r.doc.unique,d=r.doc.sha1s;return b.allDocs({keys:d.map(l=>ne(i,l)),include_docs:!0}).then(l=>{const f={};for(const h of l.rows)h.doc&&(f[h.doc.sha1]=h.doc);return f})})),a=await Promise.all(t.rows.flatMap(r=>{if(!r.doc)return[];const i=r.doc.unique,d=r.doc.sha1s;return b.allDocs({keys:d.map(l=>G(i,l)),include_docs:!0}).then(l=>{const f={};for(const h of l.rows)h.doc&&(f[h.doc.sha1]=h.doc);return f})})),u={};for(const[r,{doc:i}]of t.rows.entries())if(i){const d={name:i.name,unique:i.unique,overrides:i.overrides,contents:i.contents,sha1s:i.sha1s,raws:s[r],annotated:a[r]};u[i.unique]=d}return u}async function ae(n){const e=V(""),t=await n.allDocs({startkey:e,endkey:e+"️",include_docs:!0}),s=[];for(const a of t.rows){const u=a.doc;u&&s.push(u)}return s}async function we(n,e=Date.now()){const t=V(""),s=await n.allDocs({startkey:t,endkey:t+"️",include_docs:!0});let a=0,u=Infinity,r;for(const i of s.rows){const d=i.doc;if(d){++a;for(const[l,f]of Object.entries(d.ebisus)){if(!f)continue;const h=ee.predictRecall(f.memory,(e-f.epoch)*le);h<u&&(r={...d,ebisus:{[l]:f}},u=h)}}}return{memory:r,total:a}}async function be(n){return b.upsert(O(n),()=>({_deleted:!0}))}async function ye(){const n=[];return new Promise((e,t)=>{b.changes({filter:s=>s._deleted}).on("change",s=>n.push(s.id)).on("complete",()=>{e(n)}).on("error",s=>t(s))})}async function Pe(){const n=await ye(),e="No longer able to get deleted document. It may have been compacted during export?";let t=await Promise.all(n.map(a=>b.get(a,{revs:!0,open_revs:"all"}).then(u=>{const r=u[0].ok._revisions,i=r.start-1+"-"+r.ids[1],d=b.get(a,{rev:i});return d})).map(a=>a.catch(u=>(console.error(e,u),u))));t.some(a=>a instanceof Error)&&(alert(e+" See JavaScript Console for details."),t=t.filter(a=>!(a instanceof Error)));const s=t.map(({name:a,unique:u,contents:r,sha1s:i,overrides:d})=>({name:a,unique:u,contents:r,sha1s:i,overrides:d}));return s}import{observable as z,action as A,runInAction as re}from"../web_modules/mobx.js";const D=z({}),K=z({state:"left"}),oe=z.map(new Map()),se=z({loggedIn:void 0,serverMessage:void 0,debug:""}),J=z({click:void 0});(async function(){const[e,t]=await Promise.all([te(),ae(M)]);A(()=>{oe.replace(t.map(s=>[s.wordId,Object.keys(s.ebisus)]));for(const[s,a]of Object.entries(e))D[s]=z(a,{raws:!1})})()})();import{observer as $}from"../web_modules/mobx-react-lite.js";import{createElement as o,Fragment as Z,Suspense as Re,useState as B}from"../web_modules/react.js";export const DocsComponent=$(function({}){return o("div",{},o(Ee),o(ke),o("div",{id:"all-docs",className:"main"},o("ul",{},...Object.values(D).map(e=>o("li",null,o("a",{href:"#"+e.unique},e.name||e.unique)))),...Object.values(D).map(e=>o(Ue,{doc:e})),o(ie),o(Se),o(De)),o("div",{className:"not-main"},o(Re,{fallback:o("p",null,"Loading…")},o(Ce))))});const Ee=$(function({}){const e=se;return o("div",{className:"login-header"},typeof e.loggedIn=="boolean"?e.loggedIn?"Logged in!":o("a",{href:W},"Log in to Gotanda"):"(waiting)")}),ke=$(function(){if(!K.payload){const t=o("button",{onClick:async()=>{const s=Date.now(),a=await we(M,s);re(()=>{K.payload={memory:a.memory,history:[]}})}},"Get quiz");return t}const e=K.payload.memory;if(e&&e.ebisus.kana2meaning){const[t,s]=e.summary.split("|"),a=u=>{M.upsert(V(e.wordId),A(r=>{if(!r)return!1;const i=r.ebisus;if(!i)return!1;const d=i.kana2meaning;if(!d)return!1;const l=Date.now();return i.kana2meaning={epoch:l,memory:ee.updateRecall(d.memory,+u,1,(l-d.epoch)*le)},K.payload=void 0,r}))};return o("div",null,`Do you know what this means: ${t}`,o("button",{onClick:()=>a(!0)},"Yes!"),o("button",{onClick:()=>a(!1)},"No…"),o("button",{onClick:A(()=>K.payload=void 0)},"Cancel"),o("details",null,o("span",{className:"hidden-till-highlight"},s)))}return o("div",null,"Nothing to quiz!")}),Ue=$(function({doc:e}){const[t,s]=B(!1);if(!e)return o(Z);const a=o("button",{onClick:()=>be(e.unique)},"Delete"),u=o("button",{onClick:()=>s(!t)},t?"Cancel":"Edit"),r=t?o(ie,{old:e,done:()=>s(!t)}):o("section",null,...e.sha1s.map((i,d)=>o(Ie,{lineNumber:d,doc:e})));return o("div",{className:"doc"},o("h2",{id:e.unique},e.name||e.unique,a,u),r,o(je,{doc:e}),o(ve,{doc:e}))});function ie({old:n,done:e}){const[t,s]=B(n?n.name:""),[a,u]=B(n?n.contents.join(`
`):""),r=o("input",{type:"text",value:t,onChange:l=>s(l.target.value)}),i=o("textarea",{value:a,onChange:l=>u(l.currentTarget.value)}),d=o("button",{onClick:async()=>{const l=a.split(`
`),f=new Map(n?n.contents.map((I,U)=>[I,U]):[]),h=n?l.filter(I=>!f.has(I)):l,C=await fetch(_e,{body:JSON.stringify({sentences:h}),headers:{"Content-Type":"application/json"},method:"POST"});if(C.ok){const I=await C.json(),U={},x={},k=[],L=new Map();let H=0;for(const[p,P]of l.entries()){const E=f.get(P);if(E!==void 0){const j=n?.sha1s[E]||"";k.push(j),U[j]=n?.raws[E],x[j]=n?.annotated[E];continue}const g=I[H++],m=await Te(P,"sha-1");k.push(m),L.set(m,p),typeof g!="string"&&(U[m]={sha1:m,text:P,hits:g.hits,furigana:g.furigana,kanjidic:g.kanjidic},x[m]={sha1:m,text:P,hits:[],furigana:Array.from(Array(g.furigana.length))})}if(k.length!==l.length&&console.error("Mismatch between lines and sha1s",{sha1s:k,newContents:l}),n){const p=new Set(k),P=new Set(n.sha1s.flatMap((R,v)=>p.has(R)?[]:v)),E=new Set(l.flatMap((R,v)=>f.has(R)?[]:v)),g=new Map(),m=new Map(),j=[];for(const R of P){const v=n.sha1s[R],q=n.annotated[v];for(const[S,y]of(q?q.furigana:[]).entries())y&&(g.set(N(y),y),m.set(ce(n.raws[v]?.furigana[S]||[]),y));for(const S of q?q.hits:[]){const y=(n.raws[v]?.furigana.slice(S.startIdx,S.endIdx)||[]).map(N);j.push({...S,furiganaBase:y,used:!1})}}for(const R of E){const v=x[k[R]],q=U[k[R]];if(v&&q){v.furigana=q.furigana.map(y=>g.get(N(y))&&m.get(ce(y))||void 0);const S=q.furigana.map(N);for(const y of j)if(!y.used&&l[R].includes(Le(y.run))){const X=y.furiganaBase,F=Me(S,X);if(F>=0){const de=Ne($e(S.slice(0,F).join(""),X.join(""),S.slice(F+X.length).join("")));v.hits.push({summary:y.summary,wordId:y.wordId,run:de,startIdx:F,endIdx:F+X.length}),y.used=!0}}}}}const w=n?n.unique:new Date().toISOString(),c={name:t,unique:w,contents:l,sha1s:k,overrides:n?n.overrides:{}};let _=[b.upsert(O(w),()=>c)];for(const p of L.keys())_.push(b.upsert(ne(w,p),()=>U[p])),_.push(b.upsert(G(w,p),()=>x[p]));Promise.all(_).then(()=>{e&&e()})}else console.error("error parsing sentences: "+C.statusText)}},"Submit");return o("div",null,n?"":o("h2",null,"Create a new document"),r,o("br"),i,o("br"),d)}const ve=$(function({doc:e}){return o("details",{className:"regular-sized limited-height"},o("summary",null,"All dictionary annotations"),o("ol",null,...e.sha1s.flatMap(t=>e.annotated[t]?.hits.map(s=>o("li",null,s.summary))||[])))}),Ie=$(function({lineNumber:e,doc:t}){const s=t.raws[t.sha1s[e]],a=t.annotated[t.sha1s[e]];if(!s||!a)return o("p",null,t.contents[e]);const{furigana:u}=s,r=new Set();if(a)for(const{startIdx:d,endIdx:l}of a.hits)for(let f=d;f<l;f++)r.add(f);const i=r.size>0?d=>r.has(d)?"annotated-text":void 0:()=>{};return o("p",{id:`${t.unique}-${e}`},...u.map((d,l)=>a?.furigana[l]||t.overrides[N(d)]||d).flatMap((d,l)=>d.map(f=>{const h={doc:t,lineNumber:e,morphemeNumber:l};return typeof f=="string"?o("span",{className:i(l),onClick:A("clicked string",()=>J.click=h)},f):o("ruby",{className:i(l),onClick:A("clicked parsed",()=>J.click=h)},f.ruby,o("rt",null,f.rt))})))}),Ce=$(function({}){const e=J.click;if(!e)return o("div",null);const{doc:t,lineNumber:s,morphemeNumber:a}=e,u=t.raws[t.sha1s[s]],r=t.annotated[t.sha1s[s]];if(!u||!r)return o("div",null);const i=t.unique,d=t.sha1s[s],l=u.hits[a],f=new Set(r?.hits?.map(c=>c.wordId+Y(c.run))),h=new Map();{const c=new Set(r?.hits?.map(_=>_.wordId));for(const[_,p]of t.sha1s.entries()){const P=t.annotated[p];if(P){const E=t.contents[_],g=P.hits.filter(m=>c.has(m.wordId));for(const{wordId:m}of g)h.set(m,(h.get(m)||[]).concat({sentence:E,lino:_}))}}}function C(c,_,p,P){b.upsert(G(i,d),E=>{const g=E?.hits;if(!E||!g)return!1;const m=Y(_),j=g.findIndex(R=>R.wordId===c.wordId&&Y(R.run)===m);if(j>=0){const R=g.splice(j,1)}else{const R={run:_,startIdx:p,endIdx:P,wordId:c.wordId,summary:c.summary};g.push(R)}return E})}const I=u.furigana[a],U=u.kanjidic||{},x=N(I).split("").filter(c=>c in U).map(c=>U[c]),k=x.length?o("div",null,o("h3",null,"Kanjidic"),o("ol",null,...x.map(c=>o("li",null,summarizeCharacter(c),c.dependencies?.length?o("ul",null,...c.dependencies.map(_=>o("li",null,_.nodeMapped?summarizeCharacter(_.nodeMapped):_.node))):void 0)))):"",L=new Set(l.results.flatMap(c=>c.results.map(_=>_.wordId))),H=r?.hits?.filter(c=>L.has(c.wordId))||[],w=H.length?o("div",null,o("h3",null,"All uses"),o("ul",null,...H.map(c=>o("li",null,c.summary,o("ol",null,...(h.get(c.wordId)||[]).map(({sentence:_,lino:p})=>o("li",null,o("a",{href:`#${i}-${p}`},qe(c.run,_))))))))):"";return o("div",null,o("button",{onClick:A(()=>J.click=void 0)},"close"),...l.results.map(c=>o("ol",null,...c.results.map(_=>{const p=f.has(_.wordId+Y(c.run)),P=oe.get(_.wordId)||[],E=p?[o("button",{onClick:()=>{M.upsert(V(_.wordId),g=>{if(!g.wordId)return{wordId:_.wordId,memoryType:"jmdictWordId",summary:_.summary,ebisus:{[Q.kana2meaning]:ue()}};const m=g.ebisus||{};return m.kana2meaning?delete m.kana2meaning:m.kana2meaning=ue(),g.ebisus=m,g})}},P.includes(Q.kana2meaning)?"Unlearn kana?":"Mark kana as learned!")]:[];return o("li",{className:p?"annotated-entry":void 0},...Ae(c.run,_.summary),o("button",{onClick:()=>C(_,c.run,l.startIdx,c.endIdx)},p?"Entry highlighted! Remove?":"Create highlight?"),...E)}))),k,w,o(xe,{key:`${t.unique}${s}${a}`}))});function xe({}){const n=J.click;if(!n)return o(Z);const{doc:e,lineNumber:t,morphemeNumber:s}=n,a=e.raws[e.sha1s[t]]?.furigana[s]||[],u=e.annotated[e.sha1s[t]]?.furigana[s]||a,r=u.filter(w=>typeof w!="string"),i=N(u),d=r.map(w=>w.rt),l=i in e.overrides,[f,h]=B(d),[C,I]=B(l);if(r.length===0)return o(Z);const U=f.map((w,c)=>o("input",{type:"text",value:w,onChange:_=>h(f.map((p,P)=>P===c?_.target.value:p))})),x=o("input",{type:"checkbox",name:"globalCheckbox",checked:C,onChange:()=>I(!C)}),k=o("label",{htmlFor:"globalCheckbox"},"Global override?"),L=o("button",{onClick:()=>{const w=[];{let c=0;for(const _ of a)w.push(typeof _=="string"?_:{ruby:_.ruby,rt:f[c++]})}C?b.upsert(O(e.unique),c=>(c.overrides={...c.overrides,[i]:w},c)):b.upsert(G(e.unique,e.sha1s[t]),c=>(c.furigana&&(c.furigana[s]=w),c))}},"Submit override"),H=o("button",{onClick:()=>{h(d),I(l)}},"Cancel");return o("div",null,o("h3",null,"Override for: "+i),o("ol",null,...r.map((w,c)=>o("li",null,w.ruby+" ",U[c]))),k,x,L)}function je({doc:n}){const e=n.overrides,t=Object.keys(e);return t.length===0?o(Z):o("div",null,o("h3",null,"Overrides"),o("ol",null,...t.map(s=>{const a=()=>{b.upsert(O(n.unique),i=>{const d=i.overrides||{};return delete d[s],i.overrides=d,i})},u=e[s].map(i=>typeof i=="string"?i:o("ruby",null,i.ruby,o("rt",null,i.rt))),r=o("button",{onClick:a},"Delete");return o("li",null,`${s} → `,...u," ",r)})))}function Se(){const[n,e]=B([]),t=o("button",{onClick:()=>Pe().then(a=>e(a))},"Refresh deleted docs"),s=a=>b.upsert(O(a.unique),()=>a);return o("div",null,o("h2",null,"Deleted"),t,o("ol",null,...n.map(a=>o("li",null,`${a.name} (${a.unique}): ${a.contents.join(" ").slice(0,15)}…`,o("button",{onClick:()=>s(a)},"Undelete")))))}function De(){return o("button",{onClick:async()=>{const n=await te(),e=await ae(M),t=new Blob([JSON.stringify({docs:n,memories:e})],{type:"application/json"}),s=document.createElement("a");s.href=URL.createObjectURL(t),s.download=`kanda-${new Date().toISOString().replace(/:/g,".")}.json`,document.body.appendChild(s),s.click()}},"Export")}function qe(n,e){const t=Y(n),s=e.indexOf(t);return s<0?e:"…"+e.slice(Math.max(0,s-5),s+t.length+5)+"…"}function Ae(n,e){const t=new Set((typeof n=="string"?n:n.cloze).split(""));return e.split("").map(s=>t.has(s)?o("span",{className:"highlighted"},s):s)}export function summarizeCharacter(n){const{literal:e,readings:t,meanings:s,nanori:a}=n;return`${e}： ${t.join(", ")} ${s.join("; ")}`+(a.length?` (names: ${a.join(", ")})`:"")}async function Te(n,e){const t=new TextEncoder().encode(n),s=await crypto.subtle.digest(e,t);return Array.from(new Uint8Array(s),a=>a.toString(16).padStart(2,"0")).join("")}function Y(n){return typeof n=="string"?n:`${n.left}${n.cloze}${n.right}`}function N(n){return n.map(e=>typeof e=="string"?e:e.ruby).join("")}function ce(n){return n.map(e=>typeof e=="string"?e:e.rt).join("")}function Me(n,e,t=0){if(e.length>n.length)return-1;e:for(let s=t;s<n.length-e.length+1;s++){for(let a=0;a<e.length;a++)if(n[s+a]!==e[a])continue e;return s}return-1}function Oe(n,e){const t=n.indexOf(e);return t>=0&&n.indexOf(e,t+1)<0}function $e(n,e,t){const s=n+e+t;let a="",u="",r=0;for(;!Oe(s,a+e+u);){if(r++,r>n.length&&r>t.length)throw console.error({sentence:s,left:n,cloze:e,right:t,leftContext:a,rightContext:u,contextLength:r}),new Error("Ran out of context to build unique cloze");a=n.slice(-r),u=t.slice(0,r)}return{left:a,cloze:e,right:u}}function Ne(n){return!n.right&&!n.left?n.cloze:n}function Le(n){return typeof n=="string"?n:n.cloze}function ue(n=Date.now()){return{epoch:n,memory:ee.defaultModel(1,2.5)}}const le=1/36e5;
