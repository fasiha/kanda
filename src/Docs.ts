import './Docs.css';

import {createElement as ce, Fragment, useEffect, useState} from 'react';
import Recoil from 'recoil';

const NLP_SERVER = 'http://localhost:8133/api/v1/sentences';

/************
Data model
************/
type Docs = Partial<{[unique: string]: Doc}>;
interface Doc {
  name: string;
  unique: string;
  contents: string[];                         // each element is a line
  raws: (undefined|RawAnalysis)[];            // each element is a line (a light might be English, so undefined)
  annotated: (AnnotatedAnalysis|undefined)[]; // each element is a line
  // contents.length === raws.length === annotated.length!
  overrides: Record<string, Furigana[]>;
}

interface Ruby {
  ruby: string;
  rt: string;
}
type Furigana = string|Ruby;
interface AnnotatedAnalysis {
  sha1: string;
  text: string;
  furigana: (Furigana[]|undefined)[]; // overrides for each morpheme
  hits: AnnotatedHit[];               // hits can span morphemes, so no constraints on this length
}
interface RawAnalysis {
  sha1: string;
  text: string;
  furigana: Furigana[][]; // Furigana[] is a single morpheme, Furigana[][] is an array of morphemes
  hits: ScoreHits[];      // ScoreHits element is result of dictionary analysis starting at a given morpheme
  // furigana.length === hits.length!
}

interface AnnotatedHit {
  run: string|ContextCloze;
  startIdx: number;
  endIdx: number;
  wordId: string;
  summary: string;
}

interface ScoreHits {
  startIdx: number;
  results: {
    endIdx: number,
    run: string|ContextCloze,
    results: ScoreHit[],
  }[];
}
interface ScoreHit {
  wordId: string;
  score: number;
  search: string;
  summary: string;
}
interface ContextCloze {
  left: string;
  cloze: string;
  right: string;
}

/************
Recoil: atoms & selectors
************/
const docsAtom = Recoil.atom({key: 'docs', default: {} as Docs});
const docSelector = Recoil.selectorFamily({key: 'doc', get: (unique: string) => ({get}) => get(docsAtom)[unique]});

interface ClickedMorpheme {
  morpheme?: {rawFurigana: Furigana[], annotatedFurigana?: Furigana[]};
  morphemeIdx: number                       // for this morpheme
  rawHits: ScoreHits;                       // for this morpheme
  lineNumber: number;                       // for this line
  annotations: AnnotatedAnalysis|undefined; // for this line
  docUnique: string;                        // for this document
  overrides: Doc['overrides'];              // for this document
}
const clickedMorphemeAtom = Recoil.atom({key: 'clickedMorpheme', default: undefined as undefined | ClickedMorpheme});

/************
Pouchdb: what lives in the database
************/
import PouchDB from 'pouchdb-browser';
import PouchUpsert from 'pouchdb-upsert';
PouchDB.plugin(PouchUpsert);
const db = new PouchDB('sidecar-docs');

function uniqueToKey(unique: string) { return `doc-${unique}`; }

async function getDocs(): Promise<Docs> {
  const startkey = uniqueToKey('');
  const res = await db.allDocs<Doc>({startkey, endkey: startkey + '\ufe0f', include_docs: true});
  const ret: Docs = {};
  for (const {doc} of res.rows) {
    if (doc) {
      // `doc` will contain lots of PouchDb keys so lets just rebuild our clean Doc
      const obj: Doc = {
        name: doc.name,
        unique: doc.unique,
        contents: doc.contents,
        raws: doc.raws,
        annotated: doc.annotated,
        overrides: doc.overrides,
      };
      ret[doc.unique] = obj;
    }
  }
  return ret
}

async function deleteDoc(unique: string) { return db.upsert(uniqueToKey(unique), () => ({_deleted: true})); }

async function deletedDocIds(): Promise<string[]> {
  const ret: string[] = [];
  return new Promise((resolve, reject) => {
    db.changes({filter: d => d._deleted})
        .on('change', c => ret.push(c.id))
        .on('complete', () => {resolve(ret)})
        .on('error', e => reject(e));
  });
}

async function deletedDocs() {
  const ids = await deletedDocIds();
  const pouchDocs = await Promise.all(ids.map(id => db.get(id, {revs: true, open_revs: 'all'}).then(x => {
    const revs = (x[0].ok as any)._revisions;
    const lastRev = (revs.start - 1) + '-' + revs.ids[1];
    const ret = db.get(id, {rev: lastRev}); // with Pouchdb keys too
    return ret;
  })));
  const docs: Doc[] = (pouchDocs as (typeof pouchDocs[0]&Doc)[])
                          .map(({name, unique, contents, raws, annotated, overrides}: Doc) =>
                                   ({name, unique, contents, raws, annotated, overrides}));
  return docs;
}

/************
React components
************/
interface DocsProps {}
export function DocsComponent({}: DocsProps) {
  const [docs, setDocs] = Recoil.useRecoilState(docsAtom);
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      (async () => {
        const fromdb = await getDocs();
        if (Object.keys(fromdb).length > 0) { setDocs(fromdb); }
        setInitialized(true);
      })();
    }
  }, [initialized]);

  const left = ce(
      'div',
      {id: 'all-docs', className: 'left-containee'},
      ...Object.keys(docs).map(unique => ce(DocComponent, {unique})),
      ce(AddDocComponent),
      ce(UndeleteComponent),
  );
  const right = ce(
      'div',
      {className: 'right-containee'},
      ce(HitsComponent),
  );
  return ce('div', {className: 'container'}, left, right);
}

//
interface DocProps {
  unique: string;
}
function DocComponent({unique}: DocProps) {
  const doc = Recoil.useRecoilValue(docSelector(unique));
  const setDocs = Recoil.useSetRecoilState(docsAtom);
  const setClickedHits = Recoil.useSetRecoilState(clickedMorphemeAtom);
  const [editingMode, setEditingMode] = useState(false);

  if (!doc) { return ce(Fragment); }
  const deleteButton = ce('button', {
    onClick: () => deleteDoc(unique).then(() => setDocs(docs => {
                                            const ret = {...docs};
                                            delete ret[unique];
                                            return ret;
                                          }))
  },
                          'Delete');
  const editButton = ce('button', {onClick: () => setEditingMode(!editingMode)}, editingMode ? 'Cancel' : 'Edit');

  const overrides = doc.overrides;
  const editOrRender =
      editingMode
          ? ce(AddDocComponent, {existing: doc, done: () => setEditingMode(!editingMode)})
          : ce('section', null, ...doc.raws.map((raw, i) => {
              if (!raw) { return ce('p', {onClick: () => setClickedHits(undefined)}, doc.contents[i]); }
              return ce(SentenceComponent,
                        {rawAnalysis: raw, annotated: doc.annotated[i], docUnique: unique, lineNumber: i, overrides});
            }));

  return ce(
      'div',
      {className: 'doc'},
      ce('h2', null, doc.name || unique, deleteButton, editButton),
      editOrRender,
      ce(OverridesComponent, {overrides: doc.overrides, docUnique: unique}),
  )
}

//
interface SentenceProps {
  rawAnalysis: RawAnalysis;
  annotated: AnnotatedAnalysis|undefined;
  docUnique: string;
  lineNumber: number;
  overrides: Doc['overrides'];
}
function SentenceComponent({rawAnalysis, docUnique, lineNumber, annotated, overrides}: SentenceProps) {
  const setClickedHits = Recoil.useSetRecoilState(clickedMorphemeAtom);
  const {furigana, hits} = rawAnalysis;
  const click = {
    docUnique,
    lineNumber,
    annotations: annotated,
    overrides,
  };

  // a morpheme will be in a run or not. It might be in multiple runs. A run is at least one morpheme wide but can span
  // multiple whole morphemes. But here we don't need to worry about runs: just use start/endIdx.
  const idxsAnnotated: Set<number> = new Set();
  if (annotated) {
    for (const {startIdx, endIdx} of annotated.hits) {
      for (let i = startIdx; i < endIdx; i++) { idxsAnnotated.add(i); }
    }
  }
  const c =
      idxsAnnotated.size > 0 ? ((i: number) => idxsAnnotated.has(i) ? 'annotated-text' : undefined) : () => undefined;
  return ce(
      'p', null,
      ...furigana.map((morpheme, midx) => annotated?.furigana[midx] || overrides[furiganaToBase(morpheme)] || morpheme)
          .flatMap((v, i) => v.map(o => {
            const fullClick = {
              ...click,
              rawHits: hits[i],
              morpheme: {rawFurigana: rawAnalysis.furigana[i], annotatedFurigana: annotated?.furigana[i]},
              morphemeIdx: i,
            };
            if (typeof o === 'string') {
              return ce('span', {className: c(i), onClick: () => setClickedHits(fullClick)}, o)
            }
            return ce('ruby', {className: c(i), onClick: () => setClickedHits(fullClick)}, o.ruby, ce('rt', null, o.rt))
          })));
}

//
interface AddDocProps {
  existing?: Doc;
  done?: () => void;
}
function AddDocComponent({existing: old, done}: AddDocProps) {
  const [name, setName] = useState(old ? old.name : '');
  const [fullText, setContents] = useState(old ? old.contents.join('\n') : '');
  const setDocs = Recoil.useSetRecoilState(docsAtom);

  const nameInput = ce('input', {type: 'text', value: name, onChange: e => setName(e.target.value)});
  const contentsInput =
      ce('textarea', {value: fullText, onChange: e => setContents((e.currentTarget as HTMLInputElement).value)});
  const submit = ce('button', {
    onClick: async () => {
      const contents = fullText.split('\n');

      // Don't resubmit old sentences to server
      let oldLinesToIdx = new Map(old ? old.contents.map((line, i) => [line, i]) : []);
      let contentsForServer: string[] = old ? contents.filter(line => !oldLinesToIdx.has(line)) : contents;
      const res = await fetch(NLP_SERVER, {
        body: JSON.stringify({sentences: contentsForServer}),
        headers: {'Content-Type': 'application/json'},
        method: 'POST',
      });
      if (res.ok) {
        const raws: Doc['raws'] = [];
        const annotated: Doc['annotated'] = [];
        const resData: v1ResSentence[] = await res.json();
        {
          let resIdx = 0;
          for (const text of contents) {
            const hit = oldLinesToIdx.get(text);
            if (old && hit !== undefined) { // `old` check here is TS pacification: oldLinesToIdx empty if no `old`
              raws.push(old.raws[hit]);
              annotated.push(old.annotated[hit]);
            } else {
              const response = resData[resIdx];
              raws.push(typeof response === 'string' ? undefined : {
                sha1: await digestMessage(text, 'sha-1'),
                text,
                hits: response.hits,
                furigana: response.furigana
              });
              annotated.push(undefined);

              resIdx++;
            }
          }
        }
        const unique = old ? old.unique : (new Date()).toISOString();

        if (!(raws.length === annotated.length && annotated.length === contents.length)) {
          console.error('Warning: unexpected length of lines vs raw analysis vs annotated analysis',
                        {raws, annotated, contents});
        }
        const newDoc: Doc = {name, unique, contents, raws, annotated, overrides: old ? old.overrides : {}};
        if (old) {
          for (const [lino, oldAnnotated] of old.annotated.entries()) {
            const newRaw = newDoc.raws[lino];
            const oldRaw = old.raws[lino];
            if (!oldAnnotated || !newRaw || !oldRaw || newDoc.annotated[lino]) { continue; }
            // for now, you can only merge LINE TO LINE, so if you add or delete a line with Japanese in the middle of
            // the text, annotations after it won't line up. Skip if we got annotations from old (i.e., line with no
            // change and wasn't reparsed by the server)

            const newAnnotated: AnnotatedAnalysis = {sha1: newRaw.sha1, text: newRaw.text, furigana: [], hits: []};
            // furigana IS INVALID, has to be the same length as # of morphemes!

            const oldFurigana: Map<string, Furigana[]> = new Map();
            for (const f of oldAnnotated.furigana) {
              if (f) { oldFurigana.set(furiganaToBase(f), f); }
            }
            newAnnotated.furigana = newRaw.furigana.map(f => oldFurigana.get(furiganaToBase(f)) || f);
            // now newAnnotated.furigana is valid: we've replaced any base text that we'd overridden before. This could
            // be incorrect: we might have only overridden one instance of a kanji and not another before whereas now
            // we'll have overridden all instances of it.

            // now let's see if the old dictionary hits still apply: they SHOULD right?
            const newHaystack = newRaw.furigana.map(furiganaToBase);
            for (const oldHit of oldAnnotated.hits) {
              const oldNeedle = oldRaw.furigana.slice(oldHit.startIdx, oldHit.endIdx).map(furiganaToBase);
              const hit = arraySearch(newHaystack, oldNeedle);
              if (hit >= 0) {
                const run = simplifyCloze(generateContextClozed(newHaystack.slice(0, hit).join(''), oldNeedle.join(''),
                                                                newHaystack.slice(hit + oldNeedle.length).join('')));
                newAnnotated.hits.push({
                  summary: oldHit.summary,
                  wordId: oldHit.wordId,
                  run,
                  startIdx: hit,
                  endIdx: hit + oldNeedle.length
                });
              }
            }
            newDoc.annotated[lino] = newAnnotated;
          }
        }
        db.upsert(uniqueToKey(unique), () => newDoc)
            .then(() => setDocs(docs => ({...docs, [unique]: newDoc})))
            .then(() => done ? done() : '');
      } else {
        console.error('error parsing sentences: ' + res.statusText);
      }
    }
  },
                    'Submit');
  return ce('div', null, old ? '' : ce('h2', null, 'Create a new document'), nameInput, ce('br'), contentsInput,
            ce('br'), submit);
}

type v1ResSentence = string|v1ResSentenceAnalyzed;
interface v1ResSentenceAnalyzed {
  furigana: Furigana[][];
  hits: ScoreHits[];
}

//
interface HitsProps {}
function HitsComponent({}: HitsProps) {
  const click = Recoil.useRecoilValue(clickedMorphemeAtom);
  const setDocs = Recoil.useSetRecoilState(docsAtom);
  const setClick = Recoil.useSetRecoilState(clickedMorphemeAtom);
  if (!click) { return ce('div', null); }
  const {rawHits, annotations, lineNumber, docUnique, morphemeIdx} = click;

  const wordIds: Set<string> = new Set();
  if (annotations) {
    for (const {wordId, run} of annotations.hits) { wordIds.add(wordId + runToString(run)); }
  }

  function onClick(hit: ScoreHit, run: string|ContextCloze, startIdx: number, endIdx: number) {
    setDocs(docs => {
      // docs is frozen so we have to make copies of everything we want to manipuulate
      const ret = {...docs}; // shallow-copy object
      const thisDocOrig = docs[docUnique];
      if (thisDocOrig) {
        const thisDoc = {...thisDocOrig};              // shallow-copy object
        thisDoc.annotated = thisDoc.annotated.slice(); // shallow-copy array, we'll be writing to this
        const analysis = thisDoc.annotated[lineNumber];
        if (analysis) {
          // this line has analysis data
          const runStr = runToString(run);
          const hitIdx = analysis.hits.findIndex(o => o.wordId === hit.wordId && runToString(o.run) === runStr);
          if (hitIdx >= 0) {
            // annotation exists, remove it
            const newHits = analysis.hits.slice();                        // shallow-copy array
            newHits.splice(hitIdx, 1);                                    // delete element in-place
            thisDoc.annotated[lineNumber] = {...analysis, hits: newHits}; // shallow-copy object
          } else {
            const newAnnotatedHit: AnnotatedHit = {run, startIdx, endIdx, wordId: hit.wordId, summary: hit.summary};
            thisDoc.annotated[lineNumber] = {...analysis, hits: analysis.hits.concat(newAnnotatedHit)};
          }
        } else {
          // no analysis data for this line, so set it up and add this hit
          const newAnnotatedHit: AnnotatedHit = {run, startIdx, endIdx, wordId: hit.wordId, summary: hit.summary};
          thisDoc.annotated[lineNumber] = {
            furigana: Array.from(Array(thisDoc.raws[lineNumber]?.furigana.length)),
            hits: [newAnnotatedHit],
            sha1: thisDoc.raws[lineNumber]?.sha1 || '',
            text: thisDoc.raws[lineNumber]?.text || ''
          };
        }
        ret[docUnique] = thisDoc;

        // Don't forget to tell our clicked-hits about this
        setClick(click => click ? {...click, annotations: thisDoc.annotated[lineNumber]} : click);

        // Finally, write to Pouchdb
        db.upsert(uniqueToKey(docUnique), () => ({...thisDoc}));
        // Pouchdb will try to mutate is object so shallow-copy
      }
      return ret;
    })
  }
  return ce(
      'div',
      null,
      ...rawHits.results.map(
          v => ce('ol', null, ...v.results.map(result => {
            const highlit = wordIds.has(result.wordId + runToString(v.run));
            return ce('li', {className: highlit ? 'annotated-entry' : undefined}, ...highlight(v.run, result.summary),
                      ce('button', {onClick: () => onClick(result, v.run, rawHits.startIdx, v.endIdx)},
                         highlit ? 'Entry highlighted! Remove?' : 'Create highlight?'));
          }))),
      ce(OverrideComponent, {
        morpheme: click.morpheme,
        overrides: click.overrides,
        docUnique,
        lineNumber,
        morphemeIdx,
        key: `${docUnique}${lineNumber}${morphemeIdx}`,
        // without `key`, we run into this problem
        // https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
      }),

  );
}
function highlight(needle: string|ContextCloze, haystack: string) {
  const needleChars = new Set((typeof needle === 'string' ? needle : needle.cloze).split(''));
  return haystack.split('').map(c => needleChars.has(c) ? ce('span', {className: 'highlighted'}, c) : c);
}

//
interface OverrideProps {
  morpheme: ClickedMorpheme['morpheme'];
  overrides: Doc['overrides'];
  docUnique: string;
  lineNumber: number;
  morphemeIdx: number;
}
function OverrideComponent({morpheme, overrides, docUnique, lineNumber, morphemeIdx}: OverrideProps) {
  const rubys: Ruby[] =
      (morpheme?.annotatedFurigana || morpheme?.rawFurigana || []).filter(s => typeof s !== 'string') as Ruby[];
  const baseText = furiganaToBase(morpheme?.annotatedFurigana || morpheme?.rawFurigana || []);

  const setDocs = Recoil.useSetRecoilState(docsAtom);
  const defaultTexts = rubys.map(o => o.rt);
  const defaultGlobal = baseText in overrides;
  const [texts, setTexts] = useState(defaultTexts);
  const [global, setGlobal] = useState(defaultGlobal);

  if (rubys.length === 0 || !morpheme) { return ce(Fragment); } // `!morpheme` so TS knows it's not undefined

  const inputs = texts.map((text, ridx) => ce('input', {
                             type: 'text',
                             value: text,
                             onChange: e => setTexts(texts.map((text, i) => i === ridx ? e.target.value : text))
                           }));
  const checkbox =
      ce('input', {type: 'checkbox', name: 'globalCheckbox', checked: global, onChange: () => setGlobal(!global)});
  const label = ce('label', {htmlFor: 'globalCheckbox'}, 'Global override?'); // Just `for` breaks clang-format :-/
  const submit = ce('button', {
    onClick: () => {
      setDocs(docs => {
        const override: Furigana[] = [];
        {
          let textsIdx = 0;
          for (const raw of morpheme.rawFurigana) {
            override.push(typeof raw === 'string' ? raw : {ruby: raw.ruby, rt: texts[textsIdx++]});
          }
        }
        const oldDoc = docs[docUnique];
        const raw = oldDoc?.raws[lineNumber];
        if (oldDoc && raw) {
          const doc = {...oldDoc};
          if (global) {
            doc.overrides = {...doc.overrides, [baseText]: override};
          } else {
            doc.annotated = doc.annotated.slice();
            const annotated: AnnotatedAnalysis =
                doc.annotated[lineNumber]
                    ? {...(doc.annotated[lineNumber] as NonNullable<typeof doc.annotated[0]>)}
                    : {text: raw.text, sha1: raw.sha1, furigana: Array.from(Array(raw.furigana.length)), hits: []};
            annotated.furigana = annotated.furigana.slice();
            annotated.furigana[morphemeIdx] = override;
            doc.annotated[lineNumber] = annotated;
          }
          db.upsert(uniqueToKey(docUnique), () => ({...doc}));
          return {...docs, [docUnique]: doc};
        }
        return docs;
      })
    }
  },
                    'Submit override');
  const cancel = ce('button', {
    onClick: () => {
      setTexts(defaultTexts);
      setGlobal(defaultGlobal);
    }
  },
                    'Cancel');

  return ce('div', null, ce('h3', null, 'Override for: ' + baseText),
            ce('ol', null, ...rubys.map((r, i) => ce('li', null, r.ruby + ' ', inputs[i]))), label, checkbox, submit);
}

//
function UndeleteComponent() {
  const setDocs = Recoil.useSetRecoilState(docsAtom);
  const [deleted, setDeleted] = useState([] as Doc[]);
  const refreshButton =
      ce('button', {onClick: () => deletedDocs().then(docs => setDeleted(docs))}, 'Refresh deleted docs');
  const undelete = (doc: Doc) =>
      db.upsert(doc.unique, () => doc).then(() => setDocs(docs => ({...docs, [doc.unique]: doc})));
  return ce(
      'div', null, ce('h2', null, 'Deleted'), refreshButton,
      ce('ol', null,
         ...deleted.map(doc => ce('li', null, `${doc.name} (${doc.unique}): ${doc.contents.join(' ').slice(0, 15)}…`,
                                  ce('button', {onClick: () => undelete(doc)}, 'Undelete')))));
}

//
interface OverridesProps {
  overrides: Doc['overrides'];
  docUnique: string;
}
function OverridesComponent({overrides, docUnique}: OverridesProps) {
  const setter = Recoil.useSetRecoilState(docsAtom);
  const keys = Object.keys(overrides);
  if (keys.length === 0) { return ce(Fragment); }
  return ce('div', null, ce('h3', null, 'Overrides'), ce('ol', null, ...keys.map(morpheme => {
              const onClick = () => setter(docs => {
                const doc = {...(docs[docUnique] as NonNullable<typeof docs['']>)};
                doc.overrides = {...doc.overrides};
                delete doc.overrides[morpheme];
                db.upsert(uniqueToKey(docUnique), () => ({...doc}));
                return {...docs, [docUnique]: doc};
              });
              const fs = overrides[morpheme].map(
                  f => typeof f === 'string' ? f : ce('ruby', null, f.ruby, ce('rt', null, f.rt)));
              const deleter = ce('button', {onClick}, 'Delete');
              return ce('li', null, `${morpheme} → `, ...fs, ' ', deleter);
            })));
}

/************
Helper functions
************/
// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
async function digestMessage(message: string, algorithm: string) {
  const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest(algorithm, msgUint8);           // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
}

function runToString(run: string|ContextCloze): string {
  return typeof run === 'string' ? run : `${run.left}${run.cloze}${run.right}`;
}

function furiganaToBase(v: Furigana[]): string { return v.map(o => typeof o === 'string' ? o : o.ruby).join(''); }

/**
 * Like indexOf, but with arrays: all of needle has to match a sub-array of haystack
 *
 * N.B., this does not use Boyer-Moore preprocessing and is not optimized.
 * @param haystack big array
 * @param needle little array
 * @param start where to start in haystack (just like indexOf)
 */
function arraySearch<T>(haystack: T[], needle: T[], start = 0): number {
  if (needle.length > haystack.length) { return -1; }
  outer: for (let hi = start; hi < (haystack.length - needle.length + 1); hi++) {
    for (let ni = 0; ni < needle.length; ni++) {
      if (haystack[hi + ni] !== needle[ni]) { continue outer; }
    }
    return hi;
  }
  return -1;
}

/**
 * Ensure needle is found in haystack only once
 * @param haystack big string
 * @param needle little string
 */
function appearsExactlyOnce(haystack: string, needle: string): boolean {
  const hit = haystack.indexOf(needle);
  return hit >= 0 && haystack.indexOf(needle, hit + 1) < 0;
}

/**
 * Given three consecutive substrings (the arguments), return `{left: left2, cloze, right: right2}` where
 * `left2` and `right2` are as short as possible and `${left2}${cloze}${right2}` is unique in the full string.
 * @param left left string, possibly empty
 * @param cloze middle string
 * @param right right string, possible empty
 * @throws in the unlikely event that such a return string cannot be build (I cannot think of an example though)
 */
function generateContextClozed(left: string, cloze: string, right: string): ContextCloze {
  const sentence = left + cloze + right;
  let leftContext = '';
  let rightContext = '';
  let contextLength = 0;
  while (!appearsExactlyOnce(sentence, leftContext + cloze + rightContext)) {
    contextLength++;
    if (contextLength > left.length && contextLength > right.length) {
      console.error({sentence, left, cloze, right, leftContext, rightContext, contextLength});
      throw new Error('Ran out of context to build unique cloze');
    }
    leftContext = left.slice(-contextLength);
    rightContext = right.slice(0, contextLength);
  }
  return {left: leftContext, cloze, right: rightContext};
}

function simplifyCloze(c: ContextCloze): ContextCloze|string { return (!c.right && !c.left) ? c.cloze : c; }