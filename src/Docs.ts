import './Docs.css';

import {createElement as ce, Fragment, Suspense, useEffect, useState} from 'react';
import Recoil from 'recoil';

const NLP_SERVER = 'https://curtiz-japanese-nlp.glitch.me/api/v1/sentences';

/************
Data model
************/
type Docs = Partial<{[unique: string]: Doc}>;
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

// var remotedb = new PouchDB(`https://gotanda-1.glitch.me/db/kandaSeparate`, {
//   fetch: (url, opts) => {
//     opts = opts || {};
//     opts.credentials = 'include';
//     return PouchDB.fetch(url, opts);
//   }
// });
// var syncfeed = db.sync(remotedb, {live: true, retry: true});

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
Recoil: atoms & selectors
************/
const docUniquesAtom = Recoil.atom({key: 'docs', default: getDocUniques()});
const docAtomFamily = Recoil.atomFamily({
  key: 'docUniqueToShas',
  default: (docUnique: string) => db.get<DbDoc>(docUniqueToKey(docUnique)) as Promise<DbDoc>
});
const sha1AtomFamily = Recoil.atomFamily({
  key: 'sha1RawAnnotated',
  default: async ([docUnique, sha1]: [string, string]) => {
    let raw: RawAnalysis;
    let annotated: AnnotatedAnalysis;
    try {
      raw = await db.get<RawAnalysis>(docLineRawToKey(docUnique, sha1));
      annotated = await db.get<AnnotatedAnalysis>(docLineAnnotatedToKey(docUnique, sha1));
    } catch { return {raw: undefined, annotated: undefined}; }
    return {raw, annotated} as {raw: RawAnalysis | undefined, annotated: AnnotatedAnalysis | undefined};
  }
});
const wordIdToSentenceAtomFamily = Recoil.atomFamily({
  key: 'wordIdToSentence',
  default: async (unique: string) => {
    const wordIdToSentence: Map<string, {sentence: string, lino: number}[]> = new Map();
    if (!unique) { return wordIdToSentence };
    const doc = await db.get<DbDoc>(docUniqueToKey(unique));

    const startkey = docLineAnnotatedToKey(doc.unique, '');
    const lines = await db.allDocs<AnnotatedAnalysis>({startkey, endkey: startkey + '\ufe0f', include_docs: true});
    const annotated: (AnnotatedAnalysis|undefined)[] = reorder(doc.sha1s, lines.rows.flatMap(line => line.doc || []));
    for (const [lino, a] of annotated.entries()) {
      if (!a) { continue; }
      const sentence = doc.contents[lino];
      for (const {wordId} of a.hits) {
        wordIdToSentence.set(wordId, (wordIdToSentence.get(wordId) || []).concat({sentence, lino}))
      }
    }
    return wordIdToSentence;
  }
});

interface ClickedMorpheme {
  morpheme: {rawFurigana: Furigana[], annotatedFurigana?: Furigana[]};
  morphemeIdx: number;                      // for this morpheme
  rawHits: ScoreHits;                       // for this morpheme
  lineNumber: number;                       // for this line
  sha1: string;                             // for this line
  content: string;                          // for this line
  annotations: AnnotatedAnalysis|undefined; // for this line
  kanjidic: Record<string, Kanjidic>;       // for this line
  docUnique: string;                        // for this document
  overrides: Doc['overrides'];              // for this document
}
const clickedMorphemeAtom = Recoil.atom({key: 'clickedMorpheme', default: undefined as undefined | ClickedMorpheme});

/************
React components
************/
interface DocsProps {}
export function DocsComponent({}: DocsProps) {
  const docUniques = Recoil.useRecoilValue(docUniquesAtom);
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    if (!initialized) {
      (async () => {
        // const fromdb = await getDocs();
        // if (Object.keys(fromdb).length > 0) { setDocs(fromdb); }
        setInitialized(true);
      })();
    }
  }, [initialized]);

  const left = ce(
      'div',
      {id: 'all-docs', className: 'left-containee'},
      ...docUniques.map(unique => ce(DocComponent, {unique})),
      ce(AddDocComponent),
      ce(UndeleteComponent),
      ce(ExportComponent),
  );
  const right = ce(
      'div',
      {className: 'right-containee'},
      ce(Suspense, {fallback: ce('p', null, 'Loading…')}, ce(HitsComponent)),
  );
  return ce('div', {className: 'container'}, left, right);
}

//
interface DocProps {
  unique: string;
}
function DocComponent({unique}: DocProps) {
  const doc: DbDoc = Recoil.useRecoilValue(docAtomFamily(unique));
  const setDocUniques = Recoil.useSetRecoilState(docUniquesAtom);
  const [editingMode, setEditingMode] = useState(false);

  if (!doc) { return ce(Fragment); }
  const deleteButton =
      ce('button',
         {onClick: () => deleteDoc(unique).then(() => setDocUniques(docs => docs.filter(doc => doc !== unique)))},
         'Delete');
  const editButton = ce('button', {onClick: () => setEditingMode(!editingMode)}, editingMode ? 'Cancel' : 'Edit');

  const overrides = doc.overrides;
  const editOrRender = editingMode ? ce(AddDocComponent, {existing: doc, done: () => setEditingMode(!editingMode)})
                                   : ce('section', null, ...doc.sha1s.map((sha1, i) => {
                                       return ce(SentenceComponent, {
                                         docUnique: unique,
                                         sha1,
                                         content: doc.contents[i],
                                         lineNumber: i,
                                         overrides,
                                       });
                                     }));

  return ce(
      'div',
      {className: 'doc'},
      ce('h2', null, doc.name || unique, deleteButton, editButton),
      editOrRender,
      ce(OverridesComponent, {overrides: doc.overrides, docUnique: unique}),
      // ce(AllAnnotationsComponent, {doc}),
  )
}

//
interface AllAnnotationsProps {
  doc: Doc;
}
function AllAnnotationsComponent({doc}: AllAnnotationsProps) {
  return ce('details', {className: 'regular-sized limited-height'}, ce('summary', null, 'All dictionary annotations'),
            ce('ol', null, ...doc.annotated.flatMap(v => v?.hits.map(o => ce('li', null, o.summary))).filter(x => !!x)))
}

//
interface SentenceProps {
  docUnique: string;
  lineNumber: number;
  sha1: string;
  content: string;
  overrides: Doc['overrides'];
}
function SentenceComponent({docUnique, lineNumber, overrides, sha1, content}: SentenceProps) {
  const setClickedHits = Recoil.useSetRecoilState(clickedMorphemeAtom);
  const {raw, annotated} = Recoil.useRecoilValue(sha1AtomFamily([docUnique, sha1]));
  if (!raw || !annotated) { return ce('p', {onClick: () => setClickedHits(undefined)}, content); }
  const {furigana, hits} = raw;
  const click = {
    docUnique,
    lineNumber,
    annotations: annotated,
    overrides,
    sha1,
    content,
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
      'p', {id: `${docUnique}-${lineNumber}`},
      ...furigana.map((morpheme, midx) => annotated?.furigana[midx] || overrides[furiganaToBase(morpheme)] || morpheme)
          .flatMap((v, i) => v.map(o => {
            const fullClick = {
              ...click,
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
}

//
interface AddDocProps {
  existing?: DbDoc;
  done?: () => void;
}
function AddDocComponent({existing: old, done}: AddDocProps) {
  const unique = old ? old.unique : ((new Date()).toISOString() + Math.random().toString(36).slice(2));

  const [name, setName] = useState(old ? old.name : '');
  const [fullText, setContents] = useState(old ? old.contents.join('\n') : '');
  const setDocs = Recoil.useSetRecoilState(docUniquesAtom);
  const setDoc = Recoil.useSetRecoilState(docAtomFamily(unique));

  const nameInput = ce('input', {type: 'text', value: name, onChange: e => setName(e.target.value)});
  const contentsInput =
      ce('textarea', {value: fullText, onChange: e => setContents((e.currentTarget as HTMLInputElement).value)});
  const submit = ce('button', {
    onClick: async () => {
      const newContents = fullText.split('\n');

      // Don't resubmit old sentences to server
      const oldLinesToSha1 = new Map(old ? old.contents.map((line, i) => [line, old.sha1s[i]]) : []);
      const linesAdded = old ? newContents.filter(line => !oldLinesToSha1.has(line)) : newContents;
      const res = await fetch(NLP_SERVER, {
        body: JSON.stringify({sentences: linesAdded}),
        headers: {'Content-Type': 'application/json'},
        method: 'POST',
      });
      if (res.ok) {
        const raws: Doc['raws'] = [];
        const annotated: Doc['annotated'] = [];
        const allSha1s: string[] = [];
        const newSha1s: string[] = [];
        const resData: v1ResSentence[] = await res.json();

        let resIdx = 0;
        for (const text of newContents) {
          const sha1hit = oldLinesToSha1.get(text);
          if (sha1hit) {
            allSha1s.push(sha1hit);
            continue;
          }

          const response = resData[resIdx++];
          const sha1 = await digestMessage(text, 'sha-1');
          allSha1s.push(sha1);
          newSha1s.push(sha1);
          if (typeof response === 'string') {
            raws.push(undefined);
            annotated.push(undefined);
          } else {
            raws.push({
              sha1,
              text,
              hits: response.hits,
              furigana: response.furigana,
              kanjidic: response.kanjidic,
            });
            annotated.push({sha1, text, hits: [], furigana: Array.from(Array(response.furigana.length))});
          }
        }

        if (!(raws.length === annotated.length && newContents.length === allSha1s.length)) {
          console.error('Warning: unexpected length of new lines vs raw analysis vs annotated analysis',
                        {newContents, sha1s: allSha1s, linesAdded, raws, annotated});
        }

        if (old) {
          // check if there were any dictionary/furigana annotations in the lines that were *deleted* that we can apply
          // to the lines that were *added*

          // Setup
          const annotatedRemoved: AnnotatedAnalysis[] = [];
          const rawRemoved: RawAnalysis[] = [];
          const furiganaRemoved: Map<string, Furigana[]> = new Map();

          {
            const sha1sRemoved: string[] = [];
            const newSet = new Set(newContents);
            for (const [i, oldLine] of old.contents.entries()) {
              if (!newSet.has(oldLine)) { sha1sRemoved.push(old.sha1s[i]); }
            }
            for (const pdoc of (await db.allDocs<AnnotatedAnalysis>({
                   keys: sha1sRemoved.map(s => docLineAnnotatedToKey(old.unique, s)),
                   include_docs: true
                 })).rows) {
              if (pdoc.doc) { annotatedRemoved.push(pdoc.doc); }
            }
            // same as above but for raws instead of annotated
            for (const pdoc of (await db.allDocs<RawAnalysis>(
                                    {keys: sha1sRemoved.map(s => docLineRawToKey(old.unique, s)), include_docs: true}))
                     .rows) {
              if (pdoc.doc) { rawRemoved.push(pdoc.doc); }
            }
          }

          // Add furigana
          for (const a of annotatedRemoved) {
            for (const f of a.furigana) {
              if (f) { furiganaRemoved.set(furiganaToBase(f), f); }
            }
          }

          // Add hits
          const hitsRemoved = annotatedRemoved.flatMap(
              (o, i) => o.hits.map(
                  h => ({...h, furigana: rawRemoved[i].furigana.slice(h.startIdx, h.endIdx).map(furiganaToBase)})));
          for (const [rawidx, newRaw] of raws.entries()) {
            const newAnnotated = annotated[rawidx];
            if (!newRaw || !newAnnotated) { continue; }
            const newHaystack = newRaw.furigana.map(furiganaToBase);
            for (const oldHit of hitsRemoved) {
              const oldNeedle = oldHit.furigana;
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
          }
        }

        const newDoc:
            DbDoc = {name, unique, contents: newContents, sha1s: allSha1s, overrides: old ? old.overrides : {}};

        // Update the doc and all new raw/annotated (i.e., analyses for new lines)
        // TODO delete no-longer-used raw/annotated analyses. Not urgent: it doesn't really save data until compaction
        let promises: Promise<any>[] = [db.upsert(docUniqueToKey(unique), () => newDoc)];
        for (const [idx, sha1] of newSha1s.entries()) {
          promises.push(db.upsert(docLineRawToKey(unique, sha1), () => raws[idx]));
          promises.push(db.upsert(docLineAnnotatedToKey(unique, sha1), () => annotated[idx]));
        }
        // Write to local PouchDB, then run extra Recoil/app stuff. Not necessary wait for PouchDB but I prefer to
        // finish persisting to db before updating UI.
        Promise.all(promises).then(() => {
          setDoc(newDoc);
          if (!old) { setDocs(docUniques => docUniques.concat(unique)); }
          if (done) { done(); }
        });
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
  kanjidic: Record<string, Kanjidic>;
}

//
interface HitsProps {}
function HitsComponent({}: HitsProps) {
  const [click, setClick] = Recoil.useRecoilState(clickedMorphemeAtom);
  const setRawAnnot = Recoil.useSetRecoilState(sha1AtomFamily([click?.docUnique || '', click?.sha1 || '']));
  const [wordIdToSentence, setWordIdToSentence] =
      Recoil.useRecoilState(wordIdToSentenceAtomFamily(click?.docUnique || ''));

  if (!click) { return ce('div', null); }
  const {rawHits, annotations, lineNumber, sha1, docUnique, morphemeIdx, morpheme: {rawFurigana}, kanjidic, content} =
      click;

  const wordIds: Set<string> = new Set(annotations?.hits?.map(o => o.wordId + runToString(o.run)));

  function onClick(hit: ScoreHit, run: string|ContextCloze, startIdx: number, endIdx: number) {
    db.upsert<AnnotatedAnalysis>(docLineAnnotatedToKey(docUnique, sha1), pdoc => {
      if ('furigana' in pdoc) {
        // this line has analysis data
        const annotated: AnnotatedAnalysis = pdoc as AnnotatedAnalysis;
        const runStr = runToString(run);
        const hitIdx = annotated.hits.findIndex(o => o.wordId === hit.wordId && runToString(o.run) === runStr);
        if (hitIdx >= 0) {
          // annotation exists, remove it
          const deleted = annotated.hits.splice(hitIdx, 1);
          setWordIdToSentence(map => {
            const maphit = map.get(deleted[0].wordId);
            if (!maphit) { return map; }
            // We just want to remove ONE entry (since we might have multiple usage of a word in a sentencea and we're
            // just removing one), so we don't want to use `filter`
            const idxToRemove = maphit.findIndex(o => o.lino === lineNumber);
            map.set(deleted[0].wordId, maphit.filter((_, i) => i !== idxToRemove));
            return map;
          });
        } else {
          const newAnnotatedHit: AnnotatedHit = {run, startIdx, endIdx, wordId: hit.wordId, summary: hit.summary};
          annotated.hits.push(newAnnotatedHit);
          setWordIdToSentence(map => {
            const maphit = map.get(hit.wordId);
            return map.set(hit.wordId, (maphit || []).concat({sentence: content, lino: lineNumber}));
          });
        }

        setClick(click => click ? {...click, annotations: annotated} : click);
        setRawAnnot(({raw}) => ({raw, annotated}));
        // return a copy from upsert function because PouchDB will modify it and Recoil gets mad
        return {...annotated};
      }
      return false;
    });
  }

  const kanjihits = furiganaToBase(rawFurigana).split('').filter(c => c in kanjidic).map(c => kanjidic[c]);
  const kanjiComponent =
      kanjihits.length
          ? ce('div', null, ce('h3', null, 'Kanjidic'),
               ce('ol', null,
                  ...kanjihits.map(
                      o => ce('li', null, summarizeCharacter(o),
                              o.dependencies?.length
                                  ? ce('ul', null,
                                       ...o.dependencies.map(
                                           dep => ce('li', null,
                                                     dep.nodeMapped ? summarizeCharacter(dep.nodeMapped) : dep.node)))
                                  : undefined))))
          : '';

  const wordIdsShown = new Set(rawHits.results.flatMap(o => o.results.map(o => o.wordId)));
  const wordIdsChosen = annotations?.hits?.filter(o => wordIdsShown.has(o.wordId)) || [];
  const usagesComponent =
      wordIdsChosen.length
          ? ce(
                'div',
                null,
                ce('h3', null, 'All uses'),
                ce('ul', null,
                   ...wordIdsChosen.map(
                       a => ce(
                           'li',
                           null,
                           a.summary,
                           ce('ol', null,
                              ...(wordIdToSentence.get(a.wordId) || [])
                                  .map(({sentence, lino}) =>
                                           ce('li', null,
                                              ce('a', {href: `#${docUnique}-${lino}`}, abbreviate(a.run, sentence))))),
                           ))),
                )
          : '';

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
        sha1,
        key: `${docUnique}${lineNumber}${morphemeIdx}`,
        // without `key`, we run into this problem
        // https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
      }),
      kanjiComponent,
      usagesComponent,
  );
}
function abbreviate(needle: string|ContextCloze, full: string): string {
  const run = runToString(needle);
  const idx = full.indexOf(run);
  if (idx < 0) { return full; }
  return '…' + full.slice(Math.max(0, idx - 5), idx + run.length + 5) + '…';
}
function highlight(needle: string|ContextCloze, haystack: string) {
  const needleChars = new Set((typeof needle === 'string' ? needle : needle.cloze).split(''));
  return haystack.split('').map(c => needleChars.has(c) ? ce('span', {className: 'highlighted'}, c) : c);
}
export function summarizeCharacter(c: SimpleCharacter) {
  const {literal, readings, meanings, nanori} = c;
  return `${literal}： ${readings.join(', ')} ${meanings.join('; ')}` +
         (nanori.length ? ` (names: ${nanori.join(', ')})` : '');
}

//
interface OverrideProps {
  morpheme: ClickedMorpheme['morpheme'];
  overrides: Doc['overrides'];
  docUnique: string;
  lineNumber: number;
  morphemeIdx: number;
  sha1: string;
}
function OverrideComponent({sha1, morpheme, overrides, docUnique, lineNumber, morphemeIdx}: OverrideProps) {
  const rubys: Ruby[] =
      (morpheme?.annotatedFurigana || morpheme?.rawFurigana || []).filter(s => typeof s !== 'string') as Ruby[];
  const baseText = furiganaToBase(morpheme?.annotatedFurigana || morpheme?.rawFurigana || []);

  const setDoc = Recoil.useSetRecoilState(docAtomFamily(docUnique));
  const setRawAnn = Recoil.useSetRecoilState(sha1AtomFamily([docUnique, sha1]));
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
      const override: Furigana[] = [];
      {
        let textsIdx = 0;
        for (const raw of morpheme.rawFurigana) {
          override.push(typeof raw === 'string' ? raw : {ruby: raw.ruby, rt: texts[textsIdx++]});
        }
      }
      if (global) {
        setDoc(doc => ({...doc, overrides: {...doc.overrides, [baseText]: override}}))
        db.upsert<DbDoc>(docUniqueToKey(docUnique), pdoc => {
          pdoc.overrides = {...pdoc.overrides, [baseText]: override};
          return pdoc as DbDoc;
        });
      } else {
        setRawAnn(({raw, annotated}) => {
          if (!annotated) { return {raw, annotated}; }
          const newAnnotated: AnnotatedAnalysis = {
            ...annotated,
            furigana: annotated.furigana.map((f, i) => i === morphemeIdx ? override : f)
          };
          db.upsert<AnnotatedAnalysis>(docLineAnnotatedToKey(docUnique, sha1), () => ({...newAnnotated}));
          return {raw, annotated: newAnnotated};
        })
      }
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
  const setDocs = Recoil.useSetRecoilState(docUniquesAtom);
  const [deleted, setDeleted] = useState([] as DbDoc[]);
  const refreshButton =
      ce('button', {onClick: () => deletedDocs().then(docs => setDeleted(docs))}, 'Refresh deleted docs');
  const undelete = (doc: DbDoc) =>
      db.upsert(docUniqueToKey(doc.unique), () => doc).then(() => getDocUniques()).then(allDocs => setDocs(allDocs));
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
  const setter = Recoil.useSetRecoilState(docAtomFamily(docUnique));
  const keys = Object.keys(overrides);
  if (keys.length === 0) { return ce(Fragment); }
  return ce('div', null, ce('h3', null, 'Overrides'), ce('ol', null, ...keys.map(morpheme => {
              const onClick = () => db.upsert<DbDoc>(docUniqueToKey(docUnique), pdoc => {
                const overrides = pdoc.overrides || {};
                delete overrides[morpheme];
                pdoc.overrides = overrides;
                setter(doc => ({...doc, overrides}));
                return pdoc as DbDoc;
              });
              const fs = overrides[morpheme].map(
                  f => typeof f === 'string' ? f : ce('ruby', null, f.ruby, ce('rt', null, f.rt)));
              const deleter = ce('button', {onClick}, 'Delete');
              return ce('li', null, `${morpheme} → `, ...fs, ' ', deleter);
            })));
}

function ExportComponent() {
  return ce('button', {
    onClick: async () => {
      await db.compact();
      const all = await getDocs();
      const file = new Blob([JSON.stringify(all)], {type: 'application/json'});
      const element = document.createElement("a");
      element.href = URL.createObjectURL(file);
      element.download = `kanda-${(new Date()).toISOString().replace(/:/g, '.')}.json`;
      document.body.appendChild(element);
      element.click();
    }
  },
            'Export');
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