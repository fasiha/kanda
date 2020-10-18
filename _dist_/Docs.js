import"./Docs.css.proxy.js";const te="https://curtiz-japanese-nlp.glitch.me/api/v1/sentences";import K from"../web_modules/pouchdb-browser.js";import ne from"../web_modules/pouchdb-upsert.js";K.plugin(ne);const g=new K("sidecar-docs");g.changes({since:"now",live:!0,include_docs:!0}).on("change",T(async t=>{if(se(t.id)){const e=t.doc;if(t.deleted){const n=Object.values(D).find(o=>$(o.unique)===t.id);n&&delete D[n.unique]}else{const n=D[e.unique];n&&e.sha1s.every(o=>o in n.raws)?(n.sha1s=e.sha1s,n.contents=e.contents,n.overrides=e.overrides,n.name=e.name):D[e.unique]=(await V(e.unique))[e.unique]}}else if(oe(t.id)){const e=t.doc,n=Object.values(D).find(o=>t.id===X(o.unique,e.sha1));n&&(n.raws[e.sha1]=e)}else if(re(t.id)){const e=t.doc,n=Object.values(D).find(o=>t.id===z(o.unique,e.sha1));n&&(n.annotated[e.sha1]=e)}})),async function(){const e="kanda-mobx2",n="https://gotanda-1.glitch.me";T(async()=>{const r=await fetch(`${n}/loginstatus`,{credentials:"include"});Q.loggedIn=r.ok,Q.serverMessage=await r.text()})();var o=new K(`${n}/db/${e}`,{fetch:(r,u)=>(u||(u={}),u.credentials="include",K.fetch(r,u))});await g.replicate.from(o),g.sync(o,{live:!0,retry:!0})}();function $(t){return`doc-${t}`}function X(t,e){return`docRaw-${t}-${typeof e=="string"?e:e.sha1}`}function z(t,e){return`docAnnotated-${t}-${typeof e=="string"?e:e.sha1}`}function se(t){return t.startsWith("doc-")}function oe(t){return t.startsWith("docRaw-")}function re(t){return t.startsWith("docAnnotated-")}async function V(t=""){const e=$(t),n=await g.allDocs({startkey:e,endkey:e+"️",include_docs:!0}),o=await Promise.all(n.rows.flatMap(i=>{if(!i.doc)return[];const c=i.doc.unique,d=i.doc.sha1s;return g.allDocs({keys:d.map(l=>X(c,l)),include_docs:!0}).then(l=>{const h={};for(const f of l.rows)f.doc&&(h[f.doc.sha1]=f.doc);return h})})),r=await Promise.all(n.rows.flatMap(i=>{if(!i.doc)return[];const c=i.doc.unique,d=i.doc.sha1s;return g.allDocs({keys:d.map(l=>z(c,l)),include_docs:!0}).then(l=>{const h={};for(const f of l.rows)f.doc&&(h[f.doc.sha1]=f.doc);return h})})),u={};for(const[i,{doc:c}]of n.rows.entries())if(c){const d={name:c.name,unique:c.unique,overrides:c.overrides,contents:c.contents,sha1s:c.sha1s,raws:o[i],annotated:r[i]};u[c.unique]=d}return u}async function ae(t){return g.upsert($(t),()=>({_deleted:!0}))}async function ie(){const t=[];return new Promise((e,n)=>{g.changes({filter:o=>o._deleted}).on("change",o=>t.push(o.id)).on("complete",()=>{e(t)}).on("error",o=>n(o))})}async function ce(){const t=await ie(),e="No longer able to get deleted document. It may have been compacted during export?";let n=await Promise.all(t.map(r=>g.get(r,{revs:!0,open_revs:"all"}).then(u=>{const i=u[0].ok._revisions,c=i.start-1+"-"+i.ids[1],d=g.get(r,{rev:c});return d})).map(r=>r.catch(u=>(console.error(e,u),u))));n.some(r=>r instanceof Error)&&(alert(e+" See JavaScript Console for details."),n=n.filter(r=>!(r instanceof Error)));const o=n.map(({name:r,unique:u,contents:i,sha1s:c,overrides:d})=>({name:r,unique:u,contents:i,sha1s:c,overrides:d}));return o}import{observable as W,action as T}from"../web_modules/mobx.js";const D=W({}),Q=W({loggedIn:void 0,serverMessage:void 0,debug:""}),H=W({click:void 0});(async function(){const e=await V();T(()=>{for(const[n,o]of Object.entries(e))D[n]=W(o,{raws:!1})})()})();import{observer as M}from"../web_modules/mobx-react-lite.js";import{createElement as s,Fragment as J,Suspense as ue,useState as N}from"../web_modules/react.js";export const DocsComponent=M(function({}){return s("div",{},s(le),s("div",{id:"all-docs",className:"main"},s("ul",{},...Object.values(D).map(e=>s("li",null,s("a",{href:"#"+e.unique},e.name||e.unique)))),...Object.values(D).map(e=>s(de,{doc:e})),s(Y),s(ge),s(we)),s("div",{className:"not-main"},s(ue,{fallback:s("p",null,"Loading…")},s(fe))))});const le=M(function({}){const e=Q;return s("div",{className:"login-header"},typeof e.loggedIn=="boolean"?e.loggedIn?"Logged in!":s("a",{href:"https://gotanda-1.glitch.me/"},"Log in to Gotanda"):"(waiting)")}),de=M(function({doc:e}){const[n,o]=N(!1);if(!e)return s(J);const r=s("button",{onClick:()=>ae(e.unique)},"Delete"),u=s("button",{onClick:()=>o(!n)},n?"Cancel":"Edit"),i=n?s(Y,{old:e,done:()=>o(!n)}):s("section",null,...e.sha1s.map((c,d)=>s(he,{lineNumber:d,doc:e})));return s("div",{className:"doc"},s("h2",{id:e.unique},e.name||e.unique,r,u),i,s(me,{doc:e}),s(_e,{doc:e}))});function Y({old:t,done:e}){const[n,o]=N(t?t.name:""),[r,u]=N(t?t.contents.join(`
`):""),i=s("input",{type:"text",value:n,onChange:l=>o(l.target.value)}),c=s("textarea",{value:r,onChange:l=>u(l.currentTarget.value)}),d=s("button",{onClick:async()=>{const l=r.split(`
`),h=new Map(t?t.contents.map((x,v)=>[x,v]):[]),f=t?l.filter(x=>!h.has(x)):l,C=await fetch(te,{body:JSON.stringify({sentences:f}),headers:{"Content-Type":"application/json"},method:"POST"});if(C.ok){const x=await C.json(),v={},I={},E=[],A=new Map();let L=0;for(const[p,U]of l.entries()){const R=h.get(U);if(R!==void 0){const j=t?.sha1s[R]||"";E.push(j),v[j]=t?.raws[R],I[j]=t?.annotated[R];continue}const y=x[L++],w=await Pe(U,"sha-1");E.push(w),A.set(w,p),typeof y!="string"&&(v[w]={sha1:w,text:U,hits:y.hits,furigana:y.furigana,kanjidic:y.kanjidic},I[w]={sha1:w,text:U,hits:[],furigana:Array.from(Array(y.furigana.length))})}if(E.length!==l.length&&console.error("Mismatch between lines and sha1s",{sha1s:E,newContents:l}),t){const p=new Set(E),U=new Set(t.sha1s.flatMap((P,k)=>p.has(P)?[]:k)),R=new Set(l.flatMap((P,k)=>h.has(P)?[]:k)),y=new Map(),w=new Map(),j=[];for(const P of U){const k=t.sha1s[P],q=t.annotated[k];for(const[S,b]of(q?q.furigana:[]).entries())b&&(y.set(O(b),b),w.set(Z(t.raws[k]?.furigana[S]||[]),b));for(const S of q?q.hits:[]){const b=(t.raws[k]?.furigana.slice(S.startIdx,S.endIdx)||[]).map(O);j.push({...S,furiganaBase:b,used:!1})}}for(const P of R){const k=I[E[P]],q=v[E[P]];if(k&&q){k.furigana=q.furigana.map(b=>y.get(O(b))&&w.get(Z(b))||void 0);const S=q.furigana.map(O);for(const b of j)if(!b.used&&l[P].includes(ke(b.run))){const G=b.furiganaBase,B=Ue(S,G);if(B>=0){const ee=ve(Re(S.slice(0,B).join(""),G.join(""),S.slice(B+G.length).join("")));k.hits.push({summary:b.summary,wordId:b.wordId,run:ee,startIdx:B,endIdx:B+G.length}),b.used=!0}}}}}const m=t?t.unique:new Date().toISOString(),a={name:n,unique:m,contents:l,sha1s:E,overrides:t?t.overrides:{}};let _=[g.upsert($(m),()=>a)];for(const p of A.keys())_.push(g.upsert(X(m,p),()=>v[p])),_.push(g.upsert(z(m,p),()=>I[p]));Promise.all(_).then(()=>{e&&e()})}else console.error("error parsing sentences: "+C.statusText)}},"Submit");return s("div",null,t?"":s("h2",null,"Create a new document"),i,s("br"),c,s("br"),d)}const _e=M(function({doc:e}){return s("details",{className:"regular-sized limited-height"},s("summary",null,"All dictionary annotations"),s("ol",null,...e.sha1s.flatMap(n=>e.annotated[n]?.hits.map(o=>s("li",null,o.summary))||[])))}),he=M(function({lineNumber:e,doc:n}){const o=n.raws[n.sha1s[e]],r=n.annotated[n.sha1s[e]];if(!o||!r)return s("p",null,n.contents[e]);const{furigana:u}=o,i=new Set();if(r)for(const{startIdx:d,endIdx:l}of r.hits)for(let h=d;h<l;h++)i.add(h);const c=i.size>0?d=>i.has(d)?"annotated-text":void 0:()=>{};return s("p",{id:`${n.unique}-${e}`},...u.map((d,l)=>r?.furigana[l]||n.overrides[O(d)]||d).flatMap((d,l)=>d.map(h=>{const f={doc:n,lineNumber:e,morphemeNumber:l};return typeof h=="string"?s("span",{className:c(l),onClick:T("clicked string",()=>H.click=f)},h):s("ruby",{className:c(l),onClick:T("clicked parsed",()=>H.click=f)},h.ruby,s("rt",null,h.rt))})))}),fe=M(function({}){const e=H.click;if(!e)return s("div",null);const{doc:n,lineNumber:o,morphemeNumber:r}=e,u=n.raws[n.sha1s[o]],i=n.annotated[n.sha1s[o]];if(!u||!i)return s("div",null);const c=n.unique,d=n.sha1s[o],l=u.hits[r],h=new Set(i?.hits?.map(a=>a.wordId+F(a.run))),f=new Map();{const a=new Set(i?.hits?.map(_=>_.wordId));for(const[_,p]of n.sha1s.entries()){const U=n.annotated[p];if(U){const R=n.contents[_],y=U.hits.filter(w=>a.has(w.wordId));for(const{wordId:w}of y)f.set(w,(f.get(w)||[]).concat({sentence:R,lino:_}))}}}function C(a,_,p,U){g.upsert(z(c,d),R=>{const y=R?.hits;if(!R||!y)return!1;const w=F(_),j=y.findIndex(P=>P.wordId===a.wordId&&F(P.run)===w);if(j>=0){const P=y.splice(j,1)}else{const P={run:_,startIdx:p,endIdx:U,wordId:a.wordId,summary:a.summary};y.push(P)}return R})}const x=u.furigana[r],v=u.kanjidic||{},I=O(x).split("").filter(a=>a in v).map(a=>v[a]),E=I.length?s("div",null,s("h3",null,"Kanjidic"),s("ol",null,...I.map(a=>s("li",null,summarizeCharacter(a),a.dependencies?.length?s("ul",null,...a.dependencies.map(_=>s("li",null,_.nodeMapped?summarizeCharacter(_.nodeMapped):_.node))):void 0)))):"",A=new Set(l.results.flatMap(a=>a.results.map(_=>_.wordId))),L=i?.hits?.filter(a=>A.has(a.wordId))||[],m=L.length?s("div",null,s("h3",null,"All uses"),s("ul",null,...L.map(a=>s("li",null,a.summary,s("ol",null,...(f.get(a.wordId)||[]).map(({sentence:_,lino:p})=>s("li",null,s("a",{href:`#${c}-${p}`},be(a.run,_))))))))):"";return s("div",null,s("button",{onClick:T(()=>H.click=void 0)},"close"),...l.results.map(a=>s("ol",null,...a.results.map(_=>{const p=h.has(_.wordId+F(a.run));return s("li",{className:p?"annotated-entry":void 0},...ye(a.run,_.summary),s("button",{onClick:()=>C(_,a.run,l.startIdx,a.endIdx)},p?"Entry highlighted! Remove?":"Create highlight?"))}))),E,m,s(pe,{key:`${n.unique}${o}${r}`}))});function pe({}){const t=H.click;if(!t)return s(J);const{doc:e,lineNumber:n,morphemeNumber:o}=t,r=e.raws[e.sha1s[n]]?.furigana[o]||[],u=e.annotated[e.sha1s[n]]?.furigana[o]||r,i=u.filter(m=>typeof m!="string"),c=O(u),d=i.map(m=>m.rt),l=c in e.overrides,[h,f]=N(d),[C,x]=N(l);if(i.length===0)return s(J);const v=h.map((m,a)=>s("input",{type:"text",value:m,onChange:_=>f(h.map((p,U)=>U===a?_.target.value:p))})),I=s("input",{type:"checkbox",name:"globalCheckbox",checked:C,onChange:()=>x(!C)}),E=s("label",{htmlFor:"globalCheckbox"},"Global override?"),A=s("button",{onClick:()=>{const m=[];{let a=0;for(const _ of r)m.push(typeof _=="string"?_:{ruby:_.ruby,rt:h[a++]})}C?g.upsert($(e.unique),a=>(a.overrides={...a.overrides,[c]:m},a)):g.upsert(z(e.unique,e.sha1s[n]),a=>(a.furigana&&(a.furigana[o]=m),a))}},"Submit override"),L=s("button",{onClick:()=>{f(d),x(l)}},"Cancel");return s("div",null,s("h3",null,"Override for: "+c),s("ol",null,...i.map((m,a)=>s("li",null,m.ruby+" ",v[a]))),E,I,A)}function me({doc:t}){const e=t.overrides,n=Object.keys(e);return n.length===0?s(J):s("div",null,s("h3",null,"Overrides"),s("ol",null,...n.map(o=>{const r=()=>{g.upsert($(t.unique),c=>{const d=c.overrides||{};return delete d[o],c.overrides=d,c})},u=e[o].map(c=>typeof c=="string"?c:s("ruby",null,c.ruby,s("rt",null,c.rt))),i=s("button",{onClick:r},"Delete");return s("li",null,`${o} → `,...u," ",i)})))}function ge(){const[t,e]=N([]),n=s("button",{onClick:()=>ce().then(r=>e(r))},"Refresh deleted docs"),o=r=>g.upsert($(r.unique),()=>r);return s("div",null,s("h2",null,"Deleted"),n,s("ol",null,...t.map(r=>s("li",null,`${r.name} (${r.unique}): ${r.contents.join(" ").slice(0,15)}…`,s("button",{onClick:()=>o(r)},"Undelete")))))}function we(){return s("button",{onClick:async()=>{const t=await V(),e=new Blob([JSON.stringify(t)],{type:"application/json"}),n=document.createElement("a");n.href=URL.createObjectURL(e),n.download=`kanda-${new Date().toISOString().replace(/:/g,".")}.json`,document.body.appendChild(n),n.click()}},"Export")}function be(t,e){const n=F(t),o=e.indexOf(n);return o<0?e:"…"+e.slice(Math.max(0,o-5),o+n.length+5)+"…"}function ye(t,e){const n=new Set((typeof t=="string"?t:t.cloze).split(""));return e.split("").map(o=>n.has(o)?s("span",{className:"highlighted"},o):o)}export function summarizeCharacter(t){const{literal:e,readings:n,meanings:o,nanori:r}=t;return`${e}： ${n.join(", ")} ${o.join("; ")}`+(r.length?` (names: ${r.join(", ")})`:"")}async function Pe(t,e){const n=new TextEncoder().encode(t),o=await crypto.subtle.digest(e,n);return Array.from(new Uint8Array(o),r=>r.toString(16).padStart(2,"0")).join("")}function F(t){return typeof t=="string"?t:`${t.left}${t.cloze}${t.right}`}function O(t){return t.map(e=>typeof e=="string"?e:e.ruby).join("")}function Z(t){return t.map(e=>typeof e=="string"?e:e.rt).join("")}function Ue(t,e,n=0){if(e.length>t.length)return-1;e:for(let o=n;o<t.length-e.length+1;o++){for(let r=0;r<e.length;r++)if(t[o+r]!==e[r])continue e;return o}return-1}function Ee(t,e){const n=t.indexOf(e);return n>=0&&t.indexOf(e,n+1)<0}function Re(t,e,n){const o=t+e+n;let r="",u="",i=0;for(;!Ee(o,r+e+u);){if(i++,i>t.length&&i>n.length)throw console.error({sentence:o,left:t,cloze:e,right:n,leftContext:r,rightContext:u,contextLength:i}),new Error("Ran out of context to build unique cloze");r=t.slice(-i),u=n.slice(0,i)}return{left:r,cloze:e,right:u}}function ve(t){return!t.right&&!t.left?t.cloze:t}function ke(t){return typeof t=="string"?t:t.cloze}
