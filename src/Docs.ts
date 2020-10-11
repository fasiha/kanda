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
  contents: string[]; // each element is a line
  sha1s: string[];
  // each entry (keyed by sha1) is a line (might be English, so undefined)
  raws: Record<string, (undefined | RawAnalysis)>;
  annotated: Record<string, (undefined | AnnotatedAnalysis)>;
  // Furigana overrides
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

db.changes({since: 'now', live: true, include_docs: true})
    .on('change', action(async change => {
          console.log({change});
          if (keyIsDocUnique(change.id)) {
            const dbdoc = change.doc as unknown as DbDoc;
            if (change.deleted) {
              const hit = Object.values(docsStore).find(doc => docUniqueToKey(doc.unique) === change.id);
              if (hit) { delete docsStore[hit.unique]; }
            } else {
              const target: Doc|undefined = docsStore[dbdoc.unique];
              if (target) {
                target.sha1s = dbdoc.sha1s;
                target.contents = dbdoc.contents;
                target.overrides = dbdoc.overrides;
              } else {
                docsStore[dbdoc.unique] = (await getDocs(dbdoc.unique))[dbdoc.unique];
              }
            }
          } else if (keyIsDocLineRaw(change.id)) {
            const raw = change.doc as unknown as RawAnalysis;
            // find the doc that THIS raw corresponds to. Multiple docs might have the same sha1 but I'd like to keep
            // them separate
            const doc = Object.values(docsStore).find(doc => change.id === docLineRawToKey(doc.unique, raw.sha1));
            if (doc) { doc.raws[raw.sha1] = raw; }
          } else if (keyIsDocLineAnnotated(change.id)) {
            const annotated = change.doc as unknown as AnnotatedAnalysis;
            const doc =
                Object.values(docsStore).find(doc => change.id === docLineAnnotatedToKey(doc.unique, annotated.sha1));
            if (doc) { doc.annotated[annotated.sha1] = annotated; }
          }
        }));

(async function dbInit() {
  const appName = `kanda-mobx`;
  const server = `https://gotanda-1.glitch.me`;
  var remotedb = new PouchDB(`${server}/db/${appName}`, {
    fetch: (url, opts) => {
      if (!opts) { opts = {}; }
      opts.credentials = 'include';
      return PouchDB.fetch(url, opts);
    }
  });
  // One-time sync
  await db.replicate.from(remotedb);

  // Live-sync
  db.sync(remotedb, {live: true, retry: true});
})();

function docUniqueToKey(unique: string) { return `doc-${unique}`; }
function docLineRawToKey(docUnique: string, lineRaw: RawAnalysis|string) {
  return `docRaw-${docUnique}-${typeof lineRaw === 'string' ? lineRaw : lineRaw.sha1}`;
}
function docLineAnnotatedToKey(docUnique: string, lineAnnotated: AnnotatedAnalysis|string) {
  return `docAnnotated-${docUnique}-${typeof lineAnnotated === 'string' ? lineAnnotated : lineAnnotated.sha1}`;
}

function keyIsDocUnique(key: string) { return key.startsWith('doc-'); }
function keyIsDocLineRaw(key: string) { return key.startsWith('docRaw-'); }
function keyIsDocLineAnnotated(key: string) { return key.startsWith('docAnnotated-'); }

interface DbDoc {
  name: Doc['name'];
  unique: Doc['unique'];
  overrides: Doc['overrides'];
  contents: Doc['contents'];
  sha1s: string[];
}

/**
 * Find all or one document
 * @param singleDocUnique if omitted, get *all* documents
 */
async function getDocs(singleDocUnique = ''): Promise<Docs> {
  const startkey = docUniqueToKey(singleDocUnique);
  const docsFound = await db.allDocs<DbDoc>({startkey, endkey: startkey + '\ufe0f', include_docs: true});

  const rawsFound = await Promise.all(docsFound.rows.flatMap(doc => {
    if (!doc.doc) { return []; }
    const u = doc.doc.unique;
    const sha1s = doc.doc.sha1s;
    return db.allDocs<RawAnalysis>({keys: sha1s.map(sha1 => docLineRawToKey(u, sha1)), include_docs: true})
        .then(lines => {
          const ret: Record<string, RawAnalysis> = {};
          for (const line of lines.rows) {
            if (line.doc) { ret[line.doc.sha1] = line.doc; }
          }
          return ret;
        });
  }));
  // exact same logic as above except find all docLineAnnotatedToKey/AnnotatedAnalysis docs
  const annotatedFound = await Promise.all(docsFound.rows.flatMap(doc => {
    if (!doc.doc) { return []; }
    const u = doc.doc.unique;
    const sha1s = doc.doc.sha1s;
    return db.allDocs<AnnotatedAnalysis>({keys: sha1s.map(sha1 => docLineAnnotatedToKey(u, sha1)), include_docs: true})
        .then(lines => {
          const ret: Record<string, AnnotatedAnalysis> = {};
          for (const line of lines.rows) {
            if (line.doc) { ret[line.doc.sha1] = line.doc; }
          }
          return ret;
        });
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
  const note = 'No longer able to get deleted document. It may have been compacted during export?';
  let pouchDocs = await Promise.all(ids.map(id => db.get(id, {revs: true, open_revs: 'all'}).then(x => {
                                         const revs = (x[0].ok as any)._revisions;
                                         const lastRev = (revs.start - 1) + '-' + revs.ids[1];
                                         const ret = db.get(id, {rev: lastRev}); // with Pouchdb keys too
                                         return ret;
                                       }))
                                        .map(promise => promise.catch(e => {
                                          console.error(note, e);
                                          return e;
                                        })));
  if (pouchDocs.some(x => x instanceof Error)) {
    alert(note + ' See JavaScript Console for details.');
    pouchDocs = pouchDocs.filter(o => !(o instanceof Error));
  }
  // Above inspired by https://stackoverflow.com/a/46024590/500207
  const docs: DbDoc[] =
      (pouchDocs as (typeof pouchDocs[0]&DbDoc)[])
          .map(({name, unique, contents, sha1s, overrides}: DbDoc) => ({name, unique, contents, sha1s, overrides}));
  return docs;
}

/************
MobX
************/
import {observable, action} from "mobx";
const docsStore = observable({} as Docs);

interface ClickedMorpheme {
  doc: Doc;
  lineNumber: number;
  morphemeNumber: number;
}
const clickStore = observable({click: undefined} as {click?: ClickedMorpheme});

action(async function init() {
  const loaded = await getDocs();
  for (const [k, v] of Object.entries(loaded)) {
    docsStore[k] = v;
    console.log('loading key: ', k);
  }
})();

/************
React components
************/
import {observer} from "mobx-react-lite";
import {createElement as ce, Fragment, Suspense, useState} from 'react';

interface DocsProps {}
export const DocsComponent = observer(function DocsComponent({}: DocsProps) {
  const left = ce(
      'div',
      {id: 'all-docs', className: 'left-containee'},
      ...Object.values(docsStore).map(doc => ce(DocComponent, {doc})),
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
});

//
interface DocProps {
  doc: Doc;
}
const DocComponent = observer(function DocComponent({doc}: DocProps) {
  const [editingMode, setEditingMode] = useState(false);

  if (!doc) { return ce(Fragment); }
  const deleteButton = ce('button', {onClick: () => deleteDoc(doc.unique)}, 'Delete');
  const editButton = ce('button', {onClick: () => setEditingMode(!editingMode)}, editingMode ? 'Cancel' : 'Edit');

  const editOrRender =
      editingMode ? ce(AddDocComponent, {old: doc, done: () => setEditingMode(!editingMode)})
                  : ce('section', null,
                       ...doc.sha1s.map((_, lineNumber) => { return ce(SentenceComponent, {lineNumber, doc}); }));

  return ce(
      'div',
      {className: 'doc'},
      ce('h2', null, doc.name || doc.unique, deleteButton, editButton),
      editOrRender,
      ce(OverridesComponent, {doc}),
      ce(AllAnnotationsComponent, {doc}),
  )
});

//
type v1ResSentence = string|v1ResSentenceAnalyzed;
interface v1ResSentenceAnalyzed {
  furigana: Furigana[][];
  hits: ScoreHits[];
  kanjidic: Record<string, Kanjidic>;
}
interface AddDocProps {
  old?: Doc;
  done?: () => void;
}
function AddDocComponent({old, done}: AddDocProps) {
  const [name, setName] = useState(old ? old.name : '');
  const [fullText, setContents] = useState(old ? old.contents.join('\n') : '');

  const nameInput = ce('input', {type: 'text', value: name, onChange: e => setName(e.target.value)});
  const contentsInput =
      ce('textarea', {value: fullText, onChange: e => setContents((e.currentTarget as HTMLInputElement).value)});
  const submit = ce('button', {
    onClick: (async () => {
      const newContents = fullText.split('\n');

      // Don't resubmit old sentences to server
      const oldLinesToLino = new Map(old ? old.contents.map((line, i) => [line, i]) : []);
      const linesAdded = old ? newContents.filter(line => !oldLinesToLino.has(line)) : newContents;
      const res = await fetch(NLP_SERVER, {
        body: JSON.stringify({sentences: linesAdded}),
        headers: {'Content-Type': 'application/json'},
        method: 'POST',
      });
      if (res.ok) {
        const resData: v1ResSentence[] = await res.json();
        const raws: Doc['raws'] = {};
        const annotated: Doc['annotated'] = {};
        const sha1s: string[] = [];                             // should be same length as newContents
        const addedSha1sToIdx: Map<string, number> = new Map(); // only ones that weren't in old

        let resIdx = 0;
        for (const [idx, text] of newContents.entries()) {
          // some of these might be in `old`
          const oldhit = oldLinesToLino.get(text);
          if (oldhit !== undefined) {
            const sha1 = old?.sha1s[oldhit] || '';
            sha1s.push(sha1);
            raws[sha1] = old?.raws[oldhit];
            annotated[sha1] = old?.annotated[oldhit];
            continue;
          }

          const response = resData[resIdx++];
          const sha1 = await digestMessage(text, 'sha-1');
          sha1s.push(sha1);
          addedSha1sToIdx.set(sha1, idx);
          if (typeof response !== 'string') {
            raws[sha1] = {
              sha1,
              text,
              hits: response.hits,
              furigana: response.furigana,
              kanjidic: response.kanjidic,
            };
            annotated[sha1] = {sha1, text, hits: [], furigana: Array.from(Array(response.furigana.length))};
          }
        }

        if (sha1s.length !== newContents.length) {
          console.error('Mismatch between lines and sha1s', {sha1s, newContents});
        }

        if (old) {
          // check if there were any dictionary/furigana annotations in the lines that were *deleted* that we can apply
          // to the lines that were *added*
          const newSha1s = new Set(sha1s);
          const indexRemoved = new Set(old.sha1s.flatMap((sha1, lino) => newSha1s.has(sha1) ? [] : lino))
          const indexAdded = new Set(newContents.flatMap((line, lino) => oldLinesToLino.has(line) ? [] : lino))
          // Above: indexes correspond to `sha1s` and `newContents`, i.e., line number in new text

          const baseToFuri: Map<string, Furigana[]> = new Map(); // raw base string->outgoing annotated furigana
          const topToFuri: Map<string, Furigana[]> = new Map();  // raw rt string->outgoing annotated furigana
          const removedHits: (AnnotatedHit&{furiganaBase: string[], used: boolean})[] = [];
          // two extra fields above: `furiganaBase` to search new strings for morphemes' bases; and `used` so we track
          // which hits are reused
          for (const remidx of indexRemoved) {
            for (const [fidx, f] of (old.annotated[remidx]?.furigana || []).entries()) {
              if (f) {
                baseToFuri.set(furiganaToBase(f), f);
                topToFuri.set(furiganaToTop(old.raws[remidx]?.furigana[fidx] || []), f);
              }
            }
            for (const h of (old.annotated[remidx]?.hits || [])) {
              const furiganaBase = (old.raws[remidx]?.furigana.slice(h.startIdx, h.endIdx) || []).map(furiganaToBase);
              removedHits.push({...h, furiganaBase, used: false});
            }
          }

          for (const addidx of indexAdded) {
            const newAnnotated = annotated[sha1s[addidx]];
            const newRaw = raws[sha1s[addidx]];
            if (newAnnotated && newRaw) {
              // reintroduce furigana if both base and top raws match
              newAnnotated.furigana =
                  newRaw.furigana.map(f => (baseToFuri.get(furiganaToBase(f)) && topToFuri.get(furiganaToTop(f))) || f);

              // reintroduce hits if run present
              const newHaystack = newRaw.furigana.map(furiganaToBase);
              for (const oldHit of removedHits) {
                if (!oldHit.used && newContents[addidx].includes(runToBase(oldHit.run))) {
                  const oldNeedle = oldHit.furiganaBase;
                  const hit = arraySearch(newHaystack, oldNeedle);
                  if (hit >= 0) {
                    const run =
                        simplifyCloze(generateContextClozed(newHaystack.slice(0, hit).join(''), oldNeedle.join(''),
                                                            newHaystack.slice(hit + oldNeedle.length).join('')));
                    newAnnotated.hits.push({
                      summary: oldHit.summary,
                      wordId: oldHit.wordId,
                      run,
                      startIdx: hit,
                      endIdx: hit + oldNeedle.length
                    });
                    oldHit.used = true;
                  }
                }
              }
            }
          }
        }

        const unique = old ? old.unique : ((new Date()).toISOString());
        const newDbDoc:
            DbDoc = {name, unique, contents: newContents, sha1s: sha1s, overrides: old ? old.overrides : {}};

        // Update the doc and all new raw/annotated (i.e., analyses for new lines)
        // TODO delete no-longer-used raw/annotated analyses. Not urgent: it doesn't really save data until compaction
        let promises: Promise<any>[] = [db.upsert(docUniqueToKey(unique), () => newDbDoc)];
        for (const sha1 of addedSha1sToIdx.keys()) {
          promises.push(db.upsert(docLineRawToKey(unique, sha1), () => raws[sha1]));
          promises.push(db.upsert(docLineAnnotatedToKey(unique, sha1), () => annotated[sha1]));
        }
        // Write to local PouchDB, then run extra app stuff. Not necessary wait for PouchDB but I prefer to
        // finish persisting to db before updating UI.
        Promise.all(promises).then(() => {
          if (done) { done(); }
        });
      } else {
        console.error('error parsing sentences: ' + res.statusText);
      }
    })
  },
                    'Submit');
  return ce('div', null, old ? '' : ce('h2', null, 'Create a new document'), nameInput, ce('br'), contentsInput,
            ce('br'), submit);
}

//
interface AllAnnotationsProps {
  doc: Doc;
}
function AllAnnotationsComponent({doc}: AllAnnotationsProps) {
  return ce(
      'details', {className: 'regular-sized limited-height'}, ce('summary', null, 'All dictionary annotations'),
      ce('ol', null, ...doc.sha1s.flatMap(sha1 => doc.annotated[sha1]?.hits.map(o => ce('li', null, o.summary)) || [])))
}

//
interface SentenceProps {
  doc: Doc;
  lineNumber: number;
}
const SentenceComponent = observer(function SentenceComponent({lineNumber, doc}: SentenceProps) {
  const raw = doc.raws[doc.sha1s[lineNumber]];
  const annotated = doc.annotated[doc.sha1s[lineNumber]];
  if (!raw || !annotated) {
    return ce('p',
              null, //{onClick: () => setClickedHits(undefined)},
              doc.contents[lineNumber]);
  }
  const {furigana} = raw;

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
      'p', {id: `${doc.unique}-${lineNumber}`},
      ...furigana
          .map((morpheme, midx) => annotated?.furigana[midx] || doc.overrides[furiganaToBase(morpheme)] || morpheme)
          .flatMap((v, i) => v.map(o => {
            const click: ClickedMorpheme = {doc, lineNumber, morphemeNumber: i};
            if (typeof o === 'string') {
              return ce('span', {className: c(i), onClick: action('clicked string', () => clickStore.click = click)},
                        o);
            }
            return ce('ruby', {className: c(i), onClick: action('clicked parsed', () => clickStore.click = click)},
                      o.ruby, ce('rt', null, o.rt))
          })));
});

//
interface HitsProps {}
const HitsComponent = observer(function HitsComponent({}: HitsProps) {
  const click = clickStore.click;
  if (!click) { return ce('div', null); }

  const {doc, lineNumber, morphemeNumber} = click;
  const raw = doc.raws[doc.sha1s[lineNumber]];
  const annotations = doc.annotated[doc.sha1s[lineNumber]];
  if (!raw || !annotations) { return ce('div', null); }
  const docUnique = doc.unique;
  const sha1 = doc.sha1s[lineNumber];
  const rawHits = raw.hits[morphemeNumber];

  const wordIds: Set<string> = new Set(annotations?.hits?.map(o => o.wordId + runToString(o.run)));
  const wordIdToSentence: Map<string, {sentence: string, lino: number}[]> = new Map();
  {
    const wordIds: Set<string> = new Set(annotations?.hits?.map(o => o.wordId));
    for (const [lino, sha1] of doc.sha1s.entries()) {
      const a = doc.annotated[sha1];
      if (a) {
        const sentence = doc.contents[lino];
        const hits = a.hits.filter(h => wordIds.has(h.wordId));
        for (const {wordId} of hits) {
          wordIdToSentence.set(wordId, (wordIdToSentence.get(wordId) || []).concat({sentence, lino}))
        }
      }
    }
  }

  function onClick(hit: ScoreHit, run: string|ContextCloze, startIdx: number, endIdx: number) {
    db.upsert<AnnotatedAnalysis>(docLineAnnotatedToKey(docUnique, sha1), annotated => {
      const hits = annotated?.hits;
      if (!annotated || !hits) {
        // this SHOULD never happen so let's not deal with it
        return false;
      }
      const runStr = runToString(run);
      const hitIdx = hits.findIndex(o => o.wordId === hit.wordId && runToString(o.run) === runStr);
      if (hitIdx >= 0) {
        const deleted = hits.splice(hitIdx, 1);
      } else {
        const newAnnotatedHit: AnnotatedHit = {run, startIdx, endIdx, wordId: hit.wordId, summary: hit.summary};
        hits.push(newAnnotatedHit);
      }
      return annotated as AnnotatedAnalysis;
    });
  }

  const rawFurigana = raw.furigana[morphemeNumber];
  const kanjidic = raw.kanjidic || {};
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
      // Need `key` to prevent https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html
      ce(OverrideComponent, {key: `${doc.unique}${lineNumber}${morphemeNumber}`}),
      kanjiComponent,
      usagesComponent,
  );
});

//
interface OverrideProps {}
function OverrideComponent({}: OverrideProps) {
  const click = clickStore.click;
  if (!click) { return ce(Fragment); }
  const {doc, lineNumber, morphemeNumber} = click;
  const rawFurigana = doc.raws[doc.sha1s[lineNumber]]?.furigana[morphemeNumber] || [];
  const furigana = doc.annotated[doc.sha1s[lineNumber]]?.furigana[morphemeNumber] || rawFurigana;
  const rubys: Ruby[] = furigana.filter(s => typeof s !== 'string') as Ruby[];
  const baseText = furiganaToBase(furigana);

  const defaultTexts = rubys.map(o => o.rt);
  const defaultGlobal = baseText in doc.overrides;
  const [texts, setTexts] = useState(defaultTexts);
  const [global, setGlobal] = useState(defaultGlobal);

  if (rubys.length === 0) { return ce(Fragment); } // `!morpheme` so TS knows it's not undefined

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
        for (const raw of rawFurigana) {
          override.push(typeof raw === 'string' ? raw : {ruby: raw.ruby, rt: texts[textsIdx++]});
        }
      }
      if (global) {
        db.upsert<DbDoc>(docUniqueToKey(doc.unique), pdoc => {
          pdoc.overrides = {...pdoc.overrides, [baseText]: override};
          return pdoc as DbDoc;
        });
      } else {
        db.upsert<AnnotatedAnalysis>(docLineAnnotatedToKey(doc.unique, doc.sha1s[lineNumber]), ann => {
          if (ann.furigana) { ann.furigana[morphemeNumber] = override; }
          return ann as AnnotatedAnalysis;
        });
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
interface OverridesProps {
  doc: Doc;
}
function OverridesComponent({doc}: OverridesProps) {
  const overrides = doc.overrides;
  const keys = Object.keys(overrides);
  if (keys.length === 0) { return ce(Fragment); }
  return ce('div', null, ce('h3', null, 'Overrides'), ce('ol', null, ...keys.map(morpheme => {
              const onClick = () => {
                db.upsert<DbDoc>(docUniqueToKey(doc.unique), pdoc => {
                  const overrides = pdoc.overrides || {};
                  delete overrides[morpheme];
                  pdoc.overrides = overrides;
                  return pdoc as DbDoc;
                })
              };
              const fs = overrides[morpheme].map(
                  f => typeof f === 'string' ? f : ce('ruby', null, f.ruby, ce('rt', null, f.rt)));
              const deleter = ce('button', {onClick}, 'Delete');
              return ce('li', null, `${morpheme} → `, ...fs, ' ', deleter);
            })));
}

//
function UndeleteComponent() {
  const [deleted, setDeleted] = useState([] as DbDoc[]);
  const refreshButton =
      ce('button', {onClick: () => deletedDocs().then(docs => setDeleted(docs))}, 'Refresh deleted docs');
  const undelete = (doc: DbDoc) => db.upsert<DbDoc>(docUniqueToKey(doc.unique), () => doc);
  return ce(
      'div', null, ce('h2', null, 'Deleted'), refreshButton,
      ce('ol', null,
         ...deleted.map(doc => ce('li', null, `${doc.name} (${doc.unique}): ${doc.contents.join(' ').slice(0, 15)}…`,
                                  ce('button', {onClick: () => undelete(doc)}, 'Undelete')))));
}

//
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
function furiganaToTop(v: Furigana[]): string { return v.map(o => typeof o === 'string' ? o : o.rt).join(''); }

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
function runToBase(run: string|ContextCloze) { return typeof run === 'string' ? run : run.cloze; }
