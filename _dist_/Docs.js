import"./Docs.css.proxy.js";import{createElement as n,Fragment as W,Suspense as ee,useEffect as te,useState as O}from"../web_modules/react.js";import R from"../web_modules/recoil.js";const ne="https://curtiz-japanese-nlp.glitch.me/api/v1/sentences";import J from"../web_modules/pouchdb-browser.js";import oe from"../web_modules/pouchdb-upsert.js";J.plugin(oe);const h=new J("sidecar-docs");function j(e){return`doc-${e}`}function L(e,t){return`docRaw-${e}-${typeof t=="string"?t:t.sha1}`}function N(e,t){return`docAnnotated-${e}-${typeof t=="string"?t:t.sha1}`}function se(e){return e.slice(4)}function G(e,t){const s=new Map(t.map(o=>[o.sha1,o]));return e.map(o=>s.get(o)||void 0)}async function Q(){const e=j(""),t=await h.allDocs({startkey:e,endkey:e+"️",include_docs:!0});return t.rows.map(s=>s.doc?.unique||se(s.id))}async function ae(){const e=j(""),t=await h.allDocs({startkey:e,endkey:e+"️",include_docs:!0}),s=await Promise.all(t.rows.flatMap(a=>{if(!a.doc)return[];const r=a.doc.sha1s,l=L(a.doc.unique,"");return h.allDocs({startkey:l,endkey:l+"️",include_docs:!0}).then(d=>G(r,d.rows.flatMap(_=>_.doc||[])))})),o=await Promise.all(t.rows.flatMap(a=>{if(!a.doc)return[];const r=a.doc.sha1s,l=N(a.doc.unique,"");return h.allDocs({startkey:l,endkey:l+"️",include_docs:!0}).then(d=>G(r,d.rows.flatMap(_=>_.doc||[])))})),c={};for(const[a,{doc:r}]of t.rows.entries())if(r){const l={name:r.name,unique:r.unique,overrides:r.overrides,contents:r.contents,sha1s:r.sha1s,raws:s[a],annotated:o[a]};c[r.unique]=l}return c}async function re(e){return h.upsert(j(e),()=>({_deleted:!0}))}async function ie(){const e=[];return new Promise((t,s)=>{h.changes({filter:o=>o._deleted}).on("change",o=>e.push(o.id)).on("complete",()=>{t(e)}).on("error",o=>s(o))})}async function ce(){const e=await ie(),t=await Promise.all(e.map(o=>h.get(o,{revs:!0,open_revs:"all"}).then(c=>{const a=c[0].ok._revisions,r=a.start-1+"-"+a.ids[1],l=h.get(o,{rev:r});return l}))),s=t.map(({name:o,unique:c,contents:a,sha1s:r,overrides:l})=>({name:o,unique:c,contents:a,sha1s:r,overrides:l}));return s}const H=R.atom({key:"docs",default:Q()}),K=R.atomFamily({key:"docUniqueToShas",default:e=>h.get(j(e))}),V=R.atomFamily({key:"sha1RawAnnotated",default:async([e,t])=>{let s,o;try{s=await h.get(L(e,t)),o=await h.get(N(e,t))}catch{return{raw:void 0,annotated:void 0}}return{raw:s,annotated:o}}}),le=R.atomFamily({key:"wordIdToSentence",default:async e=>{const t=new Map();if(!e)return t;const s=await h.get(j(e)),o=N(s.unique,""),c=await h.allDocs({startkey:o,endkey:o+"️",include_docs:!0}),a=G(s.sha1s,c.rows.flatMap(r=>r.doc||[]));for(const[r,l]of a.entries()){if(!l)continue;const d=s.contents[r];for(const{wordId:_}of l.hits)t.set(_,(t.get(_)||[]).concat({sentence:d,lino:r}))}return t}}),X=R.atom({key:"clickedMorpheme",default:void 0});export function DocsComponent({}){const e=R.useRecoilValue(H),[t,s]=O(!1);te(()=>{t||(async()=>{s(!0)})()},[t]);const o=n("div",{id:"all-docs",className:"left-containee"},...e.map(a=>n(ue,{unique:a})),n(Y),n(me),n(we)),c=n("div",{className:"right-containee"},n(ee,{fallback:n("p",null,"Loading…")},n(_e)));return n("div",{className:"container"},o,c)}function ue({unique:e}){const t=R.useRecoilValue(K(e)),s=R.useSetRecoilState(H),[o,c]=O(!1);if(!t)return n(W);const a=n("button",{onClick:()=>re(e).then(()=>s(_=>_.filter(U=>U!==e)))},"Delete"),r=n("button",{onClick:()=>c(!o)},o?"Cancel":"Edit"),l=t.overrides,d=o?n(Y,{existing:t,done:()=>c(!o)}):n("section",null,...t.sha1s.map((_,U)=>n(de,{docUnique:e,sha1:_,content:t.contents[U],lineNumber:U,overrides:l})));return n("div",{className:"doc"},n("h2",null,t.name||e,a,r),d,n(ge,{overrides:t.overrides,docUnique:e}))}function Ie({doc:e}){return n("details",{className:"regular-sized limited-height"},n("summary",null,"All dictionary annotations"),n("ol",null,...e.annotated.flatMap(t=>t?.hits.map(s=>n("li",null,s.summary))).filter(t=>!!t)))}function de({docUnique:e,lineNumber:t,overrides:s,sha1:o,content:c}){const a=R.useSetRecoilState(X),{raw:r,annotated:l}=R.useRecoilValue(V([e,o]));if(!r||!l)return n("p",{onClick:()=>a(void 0)},c);const{furigana:d,hits:_}=r,U={docUnique:e,lineNumber:t,annotations:l,overrides:s,sha1:o,content:c},I=new Set();if(l)for(const{startIdx:E,endIdx:y}of l.hits)for(let P=E;P<y;P++)I.add(P);const m=I.size>0?E=>I.has(E)?"annotated-text":void 0:()=>{};return n("p",{id:`${e}-${t}`},...d.map((E,y)=>l?.furigana[y]||s[F(E)]||E).flatMap((E,y)=>E.map(P=>{const b={...U,rawHits:_[y],morpheme:{rawFurigana:r.furigana[y],annotatedFurigana:l?.furigana[y]},morphemeIdx:y,kanjidic:r.kanjidic||{}};return typeof P=="string"?n("span",{className:m(y),onClick:()=>a(b)},P):n("ruby",{className:m(y),onClick:()=>a(b)},P.ruby,n("rt",null,P.rt))})))}function Y({existing:e,done:t}){const s=e?e.unique:new Date().toISOString(),[o,c]=O(e?e.name:""),[a,r]=O(e?e.contents.join(`
`):""),l=R.useSetRecoilState(H),d=R.useSetRecoilState(K(s)),_=n("input",{type:"text",value:o,onChange:m=>c(m.target.value)}),U=n("textarea",{value:a,onChange:m=>r(m.currentTarget.value)}),I=n("button",{onClick:async()=>{const m=a.split(`
`),E=new Map(e?e.contents.map((b,S)=>[b,e.sha1s[S]]):[]),y=e?m.filter(b=>!E.has(b)):m,P=await fetch(ne,{body:JSON.stringify({sentences:y}),headers:{"Content-Type":"application/json"},method:"POST"});if(P.ok){const b=[],S=[],D=[],$=[],z=await P.json();let i=0;for(const w of m){const v=E.get(w);if(v){D.push(v);continue}const k=z[i++],A=await ye(w,"sha-1");D.push(A),$.push(A),typeof k=="string"?(b.push(void 0),S.push(void 0)):(b.push({sha1:A,text:w,hits:k.hits,furigana:k.furigana,kanjidic:k.kanjidic}),S.push({sha1:A,text:w,hits:[],furigana:Array.from(Array(k.furigana.length))}))}if(b.length===S.length&&m.length===D.length||console.error("Warning: unexpected length of new lines vs raw analysis vs annotated analysis",{newContents:m,sha1s:D,linesAdded:y,raws:b,annotated:S}),e){const w=[],v=[],k=new Map();{const C=[],f=new Set(m);for(const[p,x]of e.contents.entries())f.has(x)||C.push(e.sha1s[p]);for(const p of(await h.allDocs({keys:C.map(x=>N(e.unique,x)),include_docs:!0})).rows)p.doc&&w.push(p.doc);for(const p of(await h.allDocs({keys:C.map(x=>L(e.unique,x)),include_docs:!0})).rows)p.doc&&v.push(p.doc)}for(const C of w)for(const f of C.furigana)f&&k.set(F(f),f);const A=w.flatMap((C,f)=>C.hits.map(p=>({...p,furigana:v[f].furigana.slice(p.startIdx,p.endIdx).map(F)})));for(const[C,f]of b.entries()){const p=S[C];if(!f||!p)continue;const x=f.furigana.map(F);for(const B of A){const T=B.furigana,M=Re(x,T);if(M>=0){const Z=Ue(Pe(x.slice(0,M).join(""),T.join(""),x.slice(M+T.length).join("")));p.hits.push({summary:B.summary,wordId:B.wordId,run:Z,startIdx:M,endIdx:M+T.length})}}}}const u={name:o,unique:s,contents:m,sha1s:D,overrides:e?e.overrides:{}};let g=[h.upsert(j(s),()=>u)];for(const[w,v]of $.entries())g.push(h.upsert(L(s,v),()=>b[w])),g.push(h.upsert(N(s,v),()=>S[w]));Promise.all(g).then(()=>{d(u),e||l(w=>w.concat(s)),t&&t()})}else console.error("error parsing sentences: "+P.statusText)}},"Submit");return n("div",null,e?"":n("h2",null,"Create a new document"),_,n("br"),U,n("br"),I)}function _e({}){const[e,t]=R.useRecoilState(X),s=R.useSetRecoilState(V([e?.docUnique||"",e?.sha1||""])),[o,c]=R.useRecoilState(le(e?.docUnique||""));if(!e)return n("div",null);const{rawHits:a,annotations:r,lineNumber:l,sha1:d,docUnique:_,morphemeIdx:U,morpheme:{rawFurigana:I},kanjidic:m,content:E}=e,y=new Set(r?.hits?.map(i=>i.wordId+q(i.run)));function P(i,u,g,w){h.upsert(N(_,d),v=>{if("furigana"in v){const k=v,A=q(u),C=k.hits.findIndex(f=>f.wordId===i.wordId&&q(f.run)===A);if(C>=0){const f=k.hits.splice(C,1);c(p=>{const x=p.get(f[0].wordId);if(!x)return p;const B=x.findIndex(T=>T.lino===l);return p.set(f[0].wordId,x.filter((T,M)=>M!==B)),p})}else{const f={run:u,startIdx:g,endIdx:w,wordId:i.wordId,summary:i.summary};k.hits.push(f),c(p=>{const x=p.get(i.wordId);return p.set(i.wordId,(x||[]).concat({sentence:E,lino:l}))})}return t(f=>f&&{...f,annotations:k}),s(({raw:f})=>({raw:f,annotated:k})),{...k}}return!1})}const b=F(I).split("").filter(i=>i in m).map(i=>m[i]),S=b.length?n("div",null,n("h3",null,"Kanjidic"),n("ol",null,...b.map(i=>n("li",null,summarizeCharacter(i),i.dependencies?.length?n("ul",null,...i.dependencies.map(u=>n("li",null,u.nodeMapped?summarizeCharacter(u.nodeMapped):u.node))):void 0)))):"",D=new Set(a.results.flatMap(i=>i.results.map(u=>u.wordId))),$=r?.hits?.filter(i=>D.has(i.wordId))||[],z=$.length?n("div",null,n("h3",null,"All uses"),n("ul",null,...$.map(i=>n("li",null,i.summary,n("ol",null,...(o.get(i.wordId)||[]).map(({sentence:u,lino:g})=>n("li",null,n("a",{href:`#${_}-${g}`},fe(i.run,u))))))))):"";return n("div",null,...a.results.map(i=>n("ol",null,...i.results.map(u=>{const g=y.has(u.wordId+q(i.run));return n("li",{className:g?"annotated-entry":void 0},...he(i.run,u.summary),n("button",{onClick:()=>P(u,i.run,a.startIdx,i.endIdx)},g?"Entry highlighted! Remove?":"Create highlight?"))}))),n(pe,{morpheme:e.morpheme,overrides:e.overrides,docUnique:_,lineNumber:l,morphemeIdx:U,sha1:d,key:`${_}${l}${U}`}),S,z)}function fe(e,t){const s=q(e),o=t.indexOf(s);return o<0?t:"…"+t.slice(Math.max(0,o-5),o+s.length+5)+"…"}function he(e,t){const s=new Set((typeof e=="string"?e:e.cloze).split(""));return t.split("").map(o=>s.has(o)?n("span",{className:"highlighted"},o):o)}export function summarizeCharacter(e){const{literal:t,readings:s,meanings:o,nanori:c}=e;return`${t}： ${s.join(", ")} ${o.join("; ")}`+(c.length?` (names: ${c.join(", ")})`:"")}function pe({sha1:e,morpheme:t,overrides:s,docUnique:o,lineNumber:c,morphemeIdx:a}){const r=(t?.annotatedFurigana||t?.rawFurigana||[]).filter(i=>typeof i!="string"),l=F(t?.annotatedFurigana||t?.rawFurigana||[]),d=R.useSetRecoilState(K(o)),_=R.useSetRecoilState(V([o,e])),U=r.map(i=>i.rt),I=l in s,[m,E]=O(U),[y,P]=O(I);if(r.length===0||!t)return n(W);const b=m.map((i,u)=>n("input",{type:"text",value:i,onChange:g=>E(m.map((w,v)=>v===u?g.target.value:w))})),S=n("input",{type:"checkbox",name:"globalCheckbox",checked:y,onChange:()=>P(!y)}),D=n("label",{htmlFor:"globalCheckbox"},"Global override?"),$=n("button",{onClick:()=>{const i=[];{let u=0;for(const g of t.rawFurigana)i.push(typeof g=="string"?g:{ruby:g.ruby,rt:m[u++]})}y?(d(u=>({...u,overrides:{...u.overrides,[l]:i}})),h.upsert(j(o),u=>(u.overrides={...u.overrides,[l]:i},u))):_(({raw:u,annotated:g})=>{if(!g)return{raw:u,annotated:g};const w={...g,furigana:g.furigana.map((v,k)=>k===a?i:v)};return h.upsert(N(o,e),()=>({...w})),{raw:u,annotated:w}})}},"Submit override"),z=n("button",{onClick:()=>{E(U),P(I)}},"Cancel");return n("div",null,n("h3",null,"Override for: "+l),n("ol",null,...r.map((i,u)=>n("li",null,i.ruby+" ",b[u]))),D,S,$)}function me(){const e=R.useSetRecoilState(H),[t,s]=O([]),o=n("button",{onClick:()=>ce().then(a=>s(a))},"Refresh deleted docs"),c=a=>h.upsert(j(a.unique),()=>a).then(()=>Q()).then(r=>e(r));return n("div",null,n("h2",null,"Deleted"),o,n("ol",null,...t.map(a=>n("li",null,`${a.name} (${a.unique}): ${a.contents.join(" ").slice(0,15)}…`,n("button",{onClick:()=>c(a)},"Undelete")))))}function ge({overrides:e,docUnique:t}){const s=R.useSetRecoilState(K(t)),o=Object.keys(e);return o.length===0?n(W):n("div",null,n("h3",null,"Overrides"),n("ol",null,...o.map(c=>{const a=()=>h.upsert(j(t),d=>{const _=d.overrides||{};return delete _[c],d.overrides=_,s(U=>({...U,overrides:_})),d}),r=e[c].map(d=>typeof d=="string"?d:n("ruby",null,d.ruby,n("rt",null,d.rt))),l=n("button",{onClick:a},"Delete");return n("li",null,`${c} → `,...r," ",l)})))}function we(){return n("button",{onClick:async()=>{await h.compact();const e=await ae(),t=new Blob([JSON.stringify(e)],{type:"application/json"}),s=document.createElement("a");s.href=URL.createObjectURL(t),s.download=`kanda-${new Date().toISOString().replace(/:/g,".")}.json`,document.body.appendChild(s),s.click()}},"Export")}async function ye(e,t){const s=new TextEncoder().encode(e),o=await crypto.subtle.digest(t,s);return Array.from(new Uint8Array(o),c=>c.toString(16).padStart(2,"0")).join("")}function q(e){return typeof e=="string"?e:`${e.left}${e.cloze}${e.right}`}function F(e){return e.map(t=>typeof t=="string"?t:t.ruby).join("")}function Re(e,t,s=0){if(t.length>e.length)return-1;e:for(let o=s;o<e.length-t.length+1;o++){for(let c=0;c<t.length;c++)if(e[o+c]!==t[c])continue e;return o}return-1}function be(e,t){const s=e.indexOf(t);return s>=0&&e.indexOf(t,s+1)<0}function Pe(e,t,s){const o=e+t+s;let c="",a="",r=0;for(;!be(o,c+t+a);){if(r++,r>e.length&&r>s.length)throw console.error({sentence:o,left:e,cloze:t,right:s,leftContext:c,rightContext:a,contextLength:r}),new Error("Ran out of context to build unique cloze");c=e.slice(-r),a=s.slice(0,r)}return{left:c,cloze:t,right:a}}function Ue(e){return!e.right&&!e.left?e.cloze:e}
