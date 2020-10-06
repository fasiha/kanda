import './Docs.css';
const NLP_SERVER = 'https://curtiz-japanese-nlp.glitch.me/api/v1/sentences';

/************
Data model
************/
type Docs = {
  [unique: string]: Doc
};
interface Doc {
  name: string;
  unique: string;
  contents: string[];                         // each element is a line
  sha1s: string[];                            // each element is a line
  raws: (undefined|RawAnalysis)[];            // each element is a line (a light might be English, so undefined)
  annotated: (AnnotatedAnalysis|undefined)[]; // each element is a line (undefined only if raws is undefined)
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
  kanjidic?: Record<string, Kanjidic>;
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

type Kanjidic = SimpleCharacter&{dependencies?: SearchMapped<SimpleCharacter|null>[]};
interface SimpleCharacter { // from Kanjidic
  nanori: string[];
  readings: string[];
  meanings: string[];
  literal: string;
}
type SearchMapped<T> = {
  node: string,
  nodeMapped: T,
  children: SearchMapped<T>[],
};

/************
Pouchdb: what lives in the database
************/
import PouchDB from 'pouchdb-browser';
import PouchUpsert from 'pouchdb-upsert';
PouchDB.plugin(PouchUpsert);
const db = new PouchDB('sidecar-docs');

function docUniqueToKey(unique: string) { return `doc-${unique}`; }
function docLineRawToKey(docUnique: string, lineRaw: RawAnalysis|string) {
  return `docRaw-${docUnique}-${typeof lineRaw === 'string' ? lineRaw : lineRaw.sha1}`;
}
function docLineAnnotatedToKey(docUnique: string, lineAnnotated: AnnotatedAnalysis|string) {
  return `docAnnotated-${docUnique}-${typeof lineAnnotated === 'string' ? lineAnnotated : lineAnnotated.sha1}`;
}

function keyToDocUnique(key: string) { return key.slice(4); }

interface DbDoc {
  name: Doc['name'];
  unique: Doc['unique'];
  overrides: Doc['overrides'];
  contents: Doc['contents'];
  sha1s: string[];
}

function reorder<T extends {sha1: string}>(sortArr: string[], raw: T[]): (T|undefined)[] {
  const map = new Map(raw.map(x => [x.sha1, x]));
  return sortArr.map(s => map.get(s) as T || undefined);
}

async function getDocUniques(): Promise<string[]> {
  const startkey = docUniqueToKey('');
  const res = await db.allDocs<DbDoc>({startkey, endkey: startkey + '\ufe0f', include_docs: true});
  return res.rows.map(o => o.doc?.unique || keyToDocUnique(o.id));
}

async function getDocs(): Promise<Docs> {
  const startkey = docUniqueToKey('');
  const docsFound = await db.allDocs<DbDoc>({startkey, endkey: startkey + '\ufe0f', include_docs: true});

  const rawsFound = await Promise.all(docsFound.rows.flatMap(doc => {
    if (!doc.doc) { return []; }
    const sha1s = doc.doc.sha1s;
    const startkey = docLineRawToKey(doc.doc.unique, '');
    return db.allDocs<RawAnalysis>({startkey, endkey: startkey + '\ufe0f', include_docs: true})
        .then(lines => reorder(sha1s, lines.rows.flatMap(line => line.doc || [])));
  }));
  // exact same logic as above except find all docLineAnnotatedToKey/AnnotatedAnalysis docs
  const annotatedFound = await Promise.all(docsFound.rows.flatMap(doc => {
    if (!doc.doc) { return []; }
    const sha1s = doc.doc.sha1s;
    const startkey = docLineAnnotatedToKey(doc.doc.unique, '');
    return db.allDocs<AnnotatedAnalysis>({startkey, endkey: startkey + '\ufe0f', include_docs: true})
        .then(lines => reorder(sha1s, lines.rows.flatMap(line => line.doc || [])));
  }));

  const ret: Docs = {};
  for (const [idx, {doc}] of docsFound.rows.entries()) {
    if (doc) {
      // `doc` will contain lots of PouchDb keys so lets just rebuild our clean Doc
      const obj: Doc = {
        name: doc.name,
        unique: doc.unique,
        overrides: doc.overrides,
        contents: doc.contents,
        sha1s: doc.sha1s,
        raws: rawsFound[idx],
        annotated: annotatedFound[idx],
      };
      ret[doc.unique] = obj;
    }
  }
  return ret
}

async function deleteDoc(unique: string) { return db.upsert(docUniqueToKey(unique), () => ({_deleted: true})); }

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
  const docs: DbDoc[] =
      (pouchDocs as (typeof pouchDocs[0]&DbDoc)[])
          .map(({name, unique, contents, sha1s, overrides}: DbDoc) => ({name, unique, contents, sha1s, overrides}));
  return docs;
}

/************
MobX
************/
import {observable} from "mobx"
const docs = observable({} as Docs);
(async function init() {
  const loaded = await getDocs();
  // TODO should this be in `action`? https://mobx.js.org/actions.html
  for (const [k, v] of Object.entries(loaded)) {
    docs[k] = v;
    console.log('loading key: ', k);
  }
})();

/************
React components
************/
import {observer} from "mobx-react-lite";
import {createElement as ce, Fragment, Suspense, useEffect, useState} from 'react';

interface DocsProps {}
export const DocsComponent = observer(function DocsComponent({}: DocsProps) {
  const left = ce(
      'div',
      {id: 'all-docs', className: 'left-containee'},
      ...Object.values(docs).map(doc => ce(DocComponent, {doc})),
      // ce(AddDocComponent),
      // ce(UndeleteComponent),
      // ce(ExportComponent),
  );
  const right = ce(
      'div',
      {className: 'right-containee'},
      // ce(Suspense, {fallback: ce('p', null, 'Loading…')}, ce(HitsComponent)),
  );
  return ce('div', {className: 'container'}, left, right);
});

//
interface DocProps {
  doc: Doc;
}
const DocComponent = observer(function DocComponent({doc}: DocProps) {
  const [editingMode, setEditingMode] = useState(false);

  if (!doc) { return ce(Fragment); }
  const deleteButton =
      ce('button', {onClick: () => deleteDoc(doc.unique).then(() => {delete docs[doc.unique]})}, 'Delete');
  const editButton = ce('button', {onClick: () => setEditingMode(!editingMode)}, editingMode ? 'Cancel' : 'Edit');

  const overrides = doc.overrides;
  const editOrRender =
      editingMode ? 'unimplemented' // ce(AddDocComponent, {existing: doc, done: () => setEditingMode(!editingMode)})
                  : ce('section', null,
                       ...doc.sha1s.map((_, lineNumber) => { return ce(SentenceComponent, {lineNumber, doc}); }));

  return ce(
      'div',
      {className: 'doc'},
      ce('h2', null, doc.name || doc.unique, deleteButton, editButton),
      editOrRender,
      // ce(OverridesComponent, {overrides: doc.overrides, docUnique: unique}),
      // ce(AllAnnotationsComponent, {doc}),
  )
});

//
interface SentenceProps {
  doc: Doc;
  lineNumber: number;
}
const SentenceComponent = observer(function SentenceComponent({lineNumber, doc}: SentenceProps) {
  // const {raw, annotated} = Recoil.useRecoilValue(sha1AtomFamily([docUnique, sha1]));
  const raw = doc.raws[lineNumber];
  const annotated = doc.annotated[lineNumber];
  if (!raw || !annotated) {
    return ce('p',
              null, //{onClick: () => setClickedHits(undefined)},
              doc.contents[lineNumber]);
  }
  const {furigana, hits} = raw;

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
  const setClickedHits = (x: any) => {};
  return ce(
      'p', {id: `${doc.unique}-${lineNumber}`},
      ...furigana
          .map((morpheme, midx) => annotated?.furigana[midx] || doc.overrides[furiganaToBase(morpheme)] || morpheme)
          .flatMap((v, i) => v.map(o => {
            const fullClick = {
              // ...click,
              rawHits: hits[i],
              morpheme: {rawFurigana: raw.furigana[i], annotatedFurigana: annotated?.furigana[i]},
              morphemeIdx: i,
              kanjidic: raw.kanjidic || {},
            };
            if (typeof o === 'string') {
              return ce('span', {className: c(i), onClick: () => setClickedHits(fullClick)}, o)
            }
            return ce('ruby', {className: c(i), onClick: () => setClickedHits(fullClick)}, o.ruby, ce('rt', null, o.rt))
          })));
});

/************
Helper functions
************/
// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
async function digestMessage(message: string, algorithm: string) {
  const msgUint8 = new TextEncoder().encode(message);                 // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest(algorithm, msgUint8); // hash the message
  return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
}

function runToString(run: string|ContextCloze): string {
  return typeof run === 'string' ? run : `${run.left}${run.cloze}${run.right}`;
}

function furiganaToBase(v: Furigana[]): string { return v.map(o => typeof o === 'string' ? o : o.ruby).join(''); }

/**
 * Like `indexOf`, but with arrays: all of `needle` has to match a sub-array of `haystack`
 *
 * Returns index of first hit or -1.
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