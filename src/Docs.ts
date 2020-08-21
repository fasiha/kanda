import './Docs.css';

import {createElement as ce, useEffect, useState} from 'react';
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
}

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

type Furigana = string|{ruby: string, rt: string};
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
  rawHits: ScoreHits;                       // for this morpheme
  lineNumber: number;                       // for this line
  annotations: AnnotatedAnalysis|undefined; // for this line
  docUnique: string;                        // for this document
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
      const obj:
          Doc = {name: doc.name, unique: doc.unique, contents: doc.contents, raws: doc.raws, annotated: doc.annotated};
      ret[doc.unique] = obj;
    }
  }
  return ret
}

async function deleteDoc(unique: string) { return db.upsert(uniqueToKey(unique), () => ({_deleted: true})); }

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
  );
  const right = ce(
      'div',
      {className: 'right-containee'},
      ce(HitsContainer),
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

  if (!doc) { return ce('span'); }
  const deleteButton = ce('button', {
    onClick: () => deleteDoc(unique).then(() => setDocs(docs => {
                                            const ret = {...docs};
                                            delete ret[unique];
                                            return ret;
                                          }))
  },
                          'Delete');
  const editButton = ce('button', {onClick: () => setEditingMode(!editingMode)}, editingMode ? 'Cancel' : 'Edit');

  const displayComponent = ce('section', null, ...doc.raws.map((raw, i) => {
    if (!raw) { return ce('p', {onClick: () => setClickedHits(undefined)}, doc.contents[i]); }
    return ce(SentenceComponent, {rawAnalysis: raw, annotated: doc.annotated[i], docUnique: unique, lineNumber: i});
  }));
  const editingComponent = ce(AddDocComponent, {existing: doc, done: () => setEditingMode(!editingMode)});

  return ce(
      'div',
      {className: 'doc'},
      ce('h2', null, doc.name || unique, deleteButton, editButton),
      editingMode ? editingComponent : displayComponent,
  )
}

//
interface SentenceProps {
  rawAnalysis: RawAnalysis;
  annotated: AnnotatedAnalysis|undefined;
  docUnique: string;
  lineNumber: number;
}
function SentenceComponent({rawAnalysis, docUnique, lineNumber, annotated}: SentenceProps) {
  const setClickedHits = Recoil.useSetRecoilState(clickedMorphemeAtom);
  const {furigana, hits} = rawAnalysis;
  const click = {docUnique, lineNumber, annotations: annotated};

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
      ...furigana.flatMap(
          (v, i) => v.map(
              o => typeof o === 'string'
                       ? ce('span', {className: c(i), onClick: () => setClickedHits({...click, rawHits: hits[i]})}, o)
                       : ce('ruby', {className: c(i), onClick: () => setClickedHits({...click, rawHits: hits[i]})},
                            o.ruby, ce('rt', null, o.rt)))));
}

//
interface AddDocProps {
  existing?: Doc;
  done?: () => void;
}
function AddDocComponent({existing: old, done}: AddDocProps) {
  const [name, setName] = useState(old ? old.name : '');
  const [fullText, setContents] = useState(old ? old.contents.join('') : '');
  const setDocs = Recoil.useSetRecoilState(docsAtom);

  const nameInput = ce('input', {type: 'text', value: name, onChange: e => setName(e.target.value)});
  const contentsInput =
      ce('textarea', {value: fullText, onChange: e => setContents((e.currentTarget as HTMLInputElement).value)});
  const submit = ce('button', {
    onClick: async () => {
      const contents = fullText.split('\n');
      const raws: Doc['raws'] = [];
      const res = await fetch(NLP_SERVER, {
        body: JSON.stringify({sentences: contents}),
        headers: {'Content-Type': 'application/json'},
        method: 'POST',
      });
      if (res.ok) {
        const resData: v1ResSentence[] = await res.json();
        for (const [i, response] of resData.entries()) {
          const text = contents[i];
          const sha1 = await digestMessage(text, 'sha-1');
          raws.push(typeof response === 'string' ? undefined
                                                 : {sha1, text, hits: response.hits, furigana: response.furigana})
        }
        const unique = old ? old.unique : (new Date()).toISOString();

        const newDoc: Doc = {name, unique, contents, raws, annotated: Array.from(Array(contents.length))};

        if (old) {
          for (const [lino, oldAnnotated] of old.annotated.entries()) {
            const newRaw = raws[lino];
            const oldRaw = old.raws[lino];
            if (!oldAnnotated || !newRaw || !oldRaw) {
              continue;
            } // for now, can't merge if you CHANGE THE NUMBER OF LINES

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
  return ce('div', null, ce('h2', null, 'Create a new document'), nameInput, ce('br'), contentsInput, ce('br'), submit);
}

type v1ResSentence = string|v1ResSentenceAnalyzed;
interface v1ResSentenceAnalyzed {
  furigana: Furigana[][];
  hits: ScoreHits[];
}

//
interface HitsProps {}
function HitsContainer({}: HitsProps) {
  const click = Recoil.useRecoilValue(clickedMorphemeAtom);
  const setDocs = Recoil.useSetRecoilState(docsAtom);
  const setClick = Recoil.useSetRecoilState(clickedMorphemeAtom);
  if (!click) { return ce('div', null); }
  const {rawHits, annotations, lineNumber, docUnique} = click;

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
      'div', null,
      ...rawHits.results.map(
          v => ce('ol', null,
                  ...v.results.map(
                      result => ce('li', null, ...highlight(v.run, result.summary),
                                   ce('button', {onClick: () => onClick(result, v.run, rawHits.startIdx, v.endIdx)},
                                      wordIds.has(result.wordId + runToString(v.run)) ? 'Entry highlighted! Remove?'
                                                                                      : 'Create highlight?'))))));
}
function highlight(needle: string|ContextCloze, haystack: string) {
  const needleChars = new Set((typeof needle === 'string' ? needle : needle.cloze).split(''));
  return haystack.split('').map(c => needleChars.has(c) ? ce('span', {className: 'highlighted'}, c) : c);
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