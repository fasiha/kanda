import"./Docs.css.proxy.js";const ee="https://curtiz-japanese-nlp.glitch.me/api/v1/sentences";import H from"../web_modules/pouchdb-browser.js";import te from"../web_modules/pouchdb-upsert.js";H.plugin(te);const g=new H("sidecar-docs");g.changes({since:"now",live:!0,include_docs:!0}).on("change",F(async e=>{if(ne(e.id)){const t=e.doc;if(e.deleted){const n=Object.values(q).find(o=>$(o.unique)===e.id);n&&delete q[n.unique]}else{const n=q[t.unique];n?(n.sha1s=t.sha1s,n.contents=t.contents,n.overrides=t.overrides):q[t.unique]=(await X(t.unique))[t.unique]}}else if(se(e.id)){const t=e.doc,n=Object.values(q).find(o=>e.id===J(o.unique,t.sha1));n&&(n.raws[t.sha1]=t)}else if(oe(e.id)){const t=e.doc,n=Object.values(q).find(o=>e.id===B(o.unique,t.sha1));n&&(n.annotated[t.sha1]=t)}})),async function(){const t="kanda-mobx2",n="https://gotanda-1.glitch.me";var o=new H(`${n}/db/${t}`,{fetch:(r,u)=>(u||(u={}),u.credentials="include",H.fetch(r,u))});await g.replicate.from(o),g.sync(o,{live:!0,retry:!0})}();function $(e){return`doc-${e}`}function J(e,t){return`docRaw-${e}-${typeof t=="string"?t:t.sha1}`}function B(e,t){return`docAnnotated-${e}-${typeof t=="string"?t:t.sha1}`}function ne(e){return e.startsWith("doc-")}function se(e){return e.startsWith("docRaw-")}function oe(e){return e.startsWith("docAnnotated-")}async function X(e=""){const t=$(e),n=await g.allDocs({startkey:t,endkey:t+"️",include_docs:!0}),o=await Promise.all(n.rows.flatMap(i=>{if(!i.doc)return[];const c=i.doc.unique,d=i.doc.sha1s;return g.allDocs({keys:d.map(l=>J(c,l)),include_docs:!0}).then(l=>{const h={};for(const f of l.rows)f.doc&&(h[f.doc.sha1]=f.doc);return h})})),r=await Promise.all(n.rows.flatMap(i=>{if(!i.doc)return[];const c=i.doc.unique,d=i.doc.sha1s;return g.allDocs({keys:d.map(l=>B(c,l)),include_docs:!0}).then(l=>{const h={};for(const f of l.rows)f.doc&&(h[f.doc.sha1]=f.doc);return h})})),u={};for(const[i,{doc:c}]of n.rows.entries())if(c){const d={name:c.name,unique:c.unique,overrides:c.overrides,contents:c.contents,sha1s:c.sha1s,raws:o[i],annotated:r[i]};u[c.unique]=d}return u}async function re(e){return g.upsert($(e),()=>({_deleted:!0}))}async function ae(){const e=[];return new Promise((t,n)=>{g.changes({filter:o=>o._deleted}).on("change",o=>e.push(o.id)).on("complete",()=>{t(e)}).on("error",o=>n(o))})}async function ie(){const e=await ae(),t="No longer able to get deleted document. It may have been compacted during export?";let n=await Promise.all(e.map(r=>g.get(r,{revs:!0,open_revs:"all"}).then(u=>{const i=u[0].ok._revisions,c=i.start-1+"-"+i.ids[1],d=g.get(r,{rev:c});return d})).map(r=>r.catch(u=>(console.error(t,u),u))));n.some(r=>r instanceof Error)&&(alert(t+" See JavaScript Console for details."),n=n.filter(r=>!(r instanceof Error)));const o=n.map(({name:r,unique:u,contents:i,sha1s:c,overrides:d})=>({name:r,unique:u,contents:i,sha1s:c,overrides:d}));return o}import{observable as V,action as F}from"../web_modules/mobx.js";const q=V({}),K=V({click:void 0});(async function(){const t=await X();F(()=>{for(const[n,o]of Object.entries(t))q[n]=V(o,{raws:!1})})()})();import{observer as W}from"../web_modules/mobx-react-lite.js";import{createElement as s,Fragment as G,Suspense as ce,useState as A}from"../web_modules/react.js";export const DocsComponent=W(function({}){const t=s("div",{id:"all-docs",className:"left-containee"},...Object.values(q).map(o=>s(ue,{doc:o})),s(Q),s(pe),s(me)),n=s("div",{className:"right-containee"},s(ce,{fallback:s("p",null,"Loading…")},s(_e)));return s("div",{className:"container"},t,n)});const ue=W(function({doc:t}){const[n,o]=A(!1);if(!t)return s(G);const r=s("button",{onClick:()=>re(t.unique)},"Delete"),u=s("button",{onClick:()=>o(!n)},n?"Cancel":"Edit"),i=n?s(Q,{old:t,done:()=>o(!n)}):s("section",null,...t.sha1s.map((c,d)=>s(de,{lineNumber:d,doc:t})));return s("div",{className:"doc"},s("h2",null,t.name||t.unique,r,u),i,s(fe,{doc:t}),s(le,{doc:t}))});function Q({old:e,done:t}){const[n,o]=A(e?e.name:""),[r,u]=A(e?e.contents.join(`
`):""),i=s("input",{type:"text",value:n,onChange:l=>o(l.target.value)}),c=s("textarea",{value:r,onChange:l=>u(l.currentTarget.value)}),d=s("button",{onClick:async()=>{const l=r.split(`
`),h=new Map(e?e.contents.map((x,v)=>[x,v]):[]),f=e?l.filter(x=>!h.has(x)):l,C=await fetch(ee,{body:JSON.stringify({sentences:f}),headers:{"Content-Type":"application/json"},method:"POST"});if(C.ok){const x=await C.json(),v={},I={},E=[],T=new Map();let M=0;for(const[p,U]of l.entries()){const R=h.get(U);if(R!==void 0){const j=e?.sha1s[R]||"";E.push(j),v[j]=e?.raws[R],I[j]=e?.annotated[R];continue}const y=x[M++],w=await be(U,"sha-1");E.push(w),T.set(w,p),typeof y!="string"&&(v[w]={sha1:w,text:U,hits:y.hits,furigana:y.furigana,kanjidic:y.kanjidic},I[w]={sha1:w,text:U,hits:[],furigana:Array.from(Array(y.furigana.length))})}if(E.length!==l.length&&console.error("Mismatch between lines and sha1s",{sha1s:E,newContents:l}),e){const p=new Set(E),U=new Set(e.sha1s.flatMap((P,k)=>p.has(P)?[]:k)),R=new Set(l.flatMap((P,k)=>h.has(P)?[]:k)),y=new Map(),w=new Map(),j=[];for(const P of U){const k=e.sha1s[P],D=e.annotated[k];for(const[S,b]of(D?D.furigana:[]).entries())b&&(y.set(O(b),b),w.set(Y(e.raws[k]?.furigana[S]||[]),b));for(const S of D?D.hits:[]){const b=(e.raws[k]?.furigana.slice(S.startIdx,S.endIdx)||[]).map(O);j.push({...S,furiganaBase:b,used:!1})}}for(const P of R){const k=I[E[P]],D=v[E[P]];if(k&&D){k.furigana=D.furigana.map(b=>y.get(O(b))&&w.get(Y(b))||void 0);const S=D.furigana.map(O);for(const b of j)if(!b.used&&l[P].includes(Re(b.run))){const z=b.furiganaBase,N=ye(S,z);if(N>=0){const Z=Ee(Ue(S.slice(0,N).join(""),z.join(""),S.slice(N+z.length).join("")));k.hits.push({summary:b.summary,wordId:b.wordId,run:Z,startIdx:N,endIdx:N+z.length}),b.used=!0}}}}}const m=e?e.unique:new Date().toISOString(),a={name:n,unique:m,contents:l,sha1s:E,overrides:e?e.overrides:{}};let _=[g.upsert($(m),()=>a)];for(const p of T.keys())_.push(g.upsert(J(m,p),()=>v[p])),_.push(g.upsert(B(m,p),()=>I[p]));Promise.all(_).then(()=>{t&&t()})}else console.error("error parsing sentences: "+C.statusText)}},"Submit");return s("div",null,e?"":s("h2",null,"Create a new document"),i,s("br"),c,s("br"),d)}function le({doc:e}){return s("details",{className:"regular-sized limited-height"},s("summary",null,"All dictionary annotations"),s("ol",null,...e.sha1s.flatMap(t=>e.annotated[t]?.hits.map(n=>s("li",null,n.summary))||[])))}const de=W(function({lineNumber:t,doc:n}){const o=n.raws[n.sha1s[t]],r=n.annotated[n.sha1s[t]];if(!o||!r)return s("p",null,n.contents[t]);const{furigana:u}=o,i=new Set();if(r)for(const{startIdx:d,endIdx:l}of r.hits)for(let h=d;h<l;h++)i.add(h);const c=i.size>0?d=>i.has(d)?"annotated-text":void 0:()=>{};return s("p",{id:`${n.unique}-${t}`},...u.map((d,l)=>r?.furigana[l]||n.overrides[O(d)]||d).flatMap((d,l)=>d.map(h=>{const f={doc:n,lineNumber:t,morphemeNumber:l};return typeof h=="string"?s("span",{className:c(l),onClick:F("clicked string",()=>K.click=f)},h):s("ruby",{className:c(l),onClick:F("clicked parsed",()=>K.click=f)},h.ruby,s("rt",null,h.rt))})))}),_e=W(function({}){const t=K.click;if(!t)return s("div",null);const{doc:n,lineNumber:o,morphemeNumber:r}=t,u=n.raws[n.sha1s[o]],i=n.annotated[n.sha1s[o]];if(!u||!i)return s("div",null);const c=n.unique,d=n.sha1s[o],l=u.hits[r],h=new Set(i?.hits?.map(a=>a.wordId+L(a.run))),f=new Map();{const a=new Set(i?.hits?.map(_=>_.wordId));for(const[_,p]of n.sha1s.entries()){const U=n.annotated[p];if(U){const R=n.contents[_],y=U.hits.filter(w=>a.has(w.wordId));for(const{wordId:w}of y)f.set(w,(f.get(w)||[]).concat({sentence:R,lino:_}))}}}function C(a,_,p,U){g.upsert(B(c,d),R=>{const y=R?.hits;if(!R||!y)return!1;const w=L(_),j=y.findIndex(P=>P.wordId===a.wordId&&L(P.run)===w);if(j>=0){const P=y.splice(j,1)}else{const P={run:_,startIdx:p,endIdx:U,wordId:a.wordId,summary:a.summary};y.push(P)}return R})}const x=u.furigana[r],v=u.kanjidic||{},I=O(x).split("").filter(a=>a in v).map(a=>v[a]),E=I.length?s("div",null,s("h3",null,"Kanjidic"),s("ol",null,...I.map(a=>s("li",null,summarizeCharacter(a),a.dependencies?.length?s("ul",null,...a.dependencies.map(_=>s("li",null,_.nodeMapped?summarizeCharacter(_.nodeMapped):_.node))):void 0)))):"",T=new Set(l.results.flatMap(a=>a.results.map(_=>_.wordId))),M=i?.hits?.filter(a=>T.has(a.wordId))||[],m=M.length?s("div",null,s("h3",null,"All uses"),s("ul",null,...M.map(a=>s("li",null,a.summary,s("ol",null,...(f.get(a.wordId)||[]).map(({sentence:_,lino:p})=>s("li",null,s("a",{href:`#${c}-${p}`},ge(a.run,_))))))))):"";return s("div",null,...l.results.map(a=>s("ol",null,...a.results.map(_=>{const p=h.has(_.wordId+L(a.run));return s("li",{className:p?"annotated-entry":void 0},...we(a.run,_.summary),s("button",{onClick:()=>C(_,a.run,l.startIdx,a.endIdx)},p?"Entry highlighted! Remove?":"Create highlight?"))}))),s(he,{key:`${n.unique}${o}${r}`}),E,m)});function he({}){const e=K.click;if(!e)return s(G);const{doc:t,lineNumber:n,morphemeNumber:o}=e,r=t.raws[t.sha1s[n]]?.furigana[o]||[],u=t.annotated[t.sha1s[n]]?.furigana[o]||r,i=u.filter(m=>typeof m!="string"),c=O(u),d=i.map(m=>m.rt),l=c in t.overrides,[h,f]=A(d),[C,x]=A(l);if(i.length===0)return s(G);const v=h.map((m,a)=>s("input",{type:"text",value:m,onChange:_=>f(h.map((p,U)=>U===a?_.target.value:p))})),I=s("input",{type:"checkbox",name:"globalCheckbox",checked:C,onChange:()=>x(!C)}),E=s("label",{htmlFor:"globalCheckbox"},"Global override?"),T=s("button",{onClick:()=>{const m=[];{let a=0;for(const _ of r)m.push(typeof _=="string"?_:{ruby:_.ruby,rt:h[a++]})}C?g.upsert($(t.unique),a=>(a.overrides={...a.overrides,[c]:m},a)):g.upsert(B(t.unique,t.sha1s[n]),a=>(a.furigana&&(a.furigana[o]=m),a))}},"Submit override"),M=s("button",{onClick:()=>{f(d),x(l)}},"Cancel");return s("div",null,s("h3",null,"Override for: "+c),s("ol",null,...i.map((m,a)=>s("li",null,m.ruby+" ",v[a]))),E,I,T)}function fe({doc:e}){const t=e.overrides,n=Object.keys(t);return n.length===0?s(G):s("div",null,s("h3",null,"Overrides"),s("ol",null,...n.map(o=>{const r=()=>{g.upsert($(e.unique),c=>{const d=c.overrides||{};return delete d[o],c.overrides=d,c})},u=t[o].map(c=>typeof c=="string"?c:s("ruby",null,c.ruby,s("rt",null,c.rt))),i=s("button",{onClick:r},"Delete");return s("li",null,`${o} → `,...u," ",i)})))}function pe(){const[e,t]=A([]),n=s("button",{onClick:()=>ie().then(r=>t(r))},"Refresh deleted docs"),o=r=>g.upsert($(r.unique),()=>r);return s("div",null,s("h2",null,"Deleted"),n,s("ol",null,...e.map(r=>s("li",null,`${r.name} (${r.unique}): ${r.contents.join(" ").slice(0,15)}…`,s("button",{onClick:()=>o(r)},"Undelete")))))}function me(){return s("button",{onClick:async()=>{const e=await X(),t=new Blob([JSON.stringify(e)],{type:"application/json"}),n=document.createElement("a");n.href=URL.createObjectURL(t),n.download=`kanda-${new Date().toISOString().replace(/:/g,".")}.json`,document.body.appendChild(n),n.click()}},"Export")}function ge(e,t){const n=L(e),o=t.indexOf(n);return o<0?t:"…"+t.slice(Math.max(0,o-5),o+n.length+5)+"…"}function we(e,t){const n=new Set((typeof e=="string"?e:e.cloze).split(""));return t.split("").map(o=>n.has(o)?s("span",{className:"highlighted"},o):o)}export function summarizeCharacter(e){const{literal:t,readings:n,meanings:o,nanori:r}=e;return`${t}： ${n.join(", ")} ${o.join("; ")}`+(r.length?` (names: ${r.join(", ")})`:"")}async function be(e,t){const n=new TextEncoder().encode(e),o=await crypto.subtle.digest(t,n);return Array.from(new Uint8Array(o),r=>r.toString(16).padStart(2,"0")).join("")}function L(e){return typeof e=="string"?e:`${e.left}${e.cloze}${e.right}`}function O(e){return e.map(t=>typeof t=="string"?t:t.ruby).join("")}function Y(e){return e.map(t=>typeof t=="string"?t:t.rt).join("")}function ye(e,t,n=0){if(t.length>e.length)return-1;e:for(let o=n;o<e.length-t.length+1;o++){for(let r=0;r<t.length;r++)if(e[o+r]!==t[r])continue e;return o}return-1}function Pe(e,t){const n=e.indexOf(t);return n>=0&&e.indexOf(t,n+1)<0}function Ue(e,t,n){const o=e+t+n;let r="",u="",i=0;for(;!Pe(o,r+t+u);){if(i++,i>e.length&&i>n.length)throw console.error({sentence:o,left:e,cloze:t,right:n,leftContext:r,rightContext:u,contextLength:i}),new Error("Ran out of context to build unique cloze");r=e.slice(-i),u=n.slice(0,i)}return{left:r,cloze:t,right:u}}function Ee(e){return!e.right&&!e.left?e.cloze:e}function Re(e){return typeof e=="string"?e:e.cloze}
