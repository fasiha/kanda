import './Doc.css';

import * as t from 'io-ts';
import PR from 'io-ts/lib/PathReporter';
import PouchDB from 'pouchdb-browser';
import PouchUpsert from 'pouchdb-upsert';
import React, {createElement as ce, useEffect, useState} from 'react';
import Recoil from 'recoil';

PouchDB.plugin(PouchUpsert);
const db = new PouchDB('sidecar');

const Morpheme = t.type({
  literal: t.string,
  pronunciation: t.string,
  lemmaReading: t.string,
  lemma: t.string,
  partOfSpeech: t.array(t.string),
  inflectionType: t.union([t.array(t.string), t.null]),
  inflection: t.union([t.array(t.string), t.null]),
});
const Cloze = t.type({left: t.string, cloze: t.string, right: t.string});
const ScoreHit = t.type({
  wordId: t.string,
  score: t.union([t.number, t.null]), // I hate it but JavaScript codec sends Infinity->null
  search: t.string,
  run: t.union([t.string, Cloze]),
  summary: t.string,
});
const Furigana = t.union([t.string, t.type({ruby: t.string, rt: t.string})]);
const Dict = t.type({
  line: t.string,
  furigana: t.array(t.array(Furigana)),
  bunsetsus: t.array(t.array(Morpheme)),
  dictHits: t.array(t.array(t.array(ScoreHit))),
});
const LightweightLine = t.type({line: t.string, hash: t.string, furigana: t.array(t.array(Furigana))});
const Lightweight = t.array(t.union([t.string, LightweightLine]));

const DICT_PATH = '/dict-hits-per-line';

type IScoreHit = t.TypeOf<typeof ScoreHit>;
type IDict = t.TypeOf<typeof Dict>;
type DictData = (IDict|string)[];
type LightData = t.TypeOf<typeof Lightweight>;
type LightLine = t.TypeOf<typeof LightweightLine>;

export async function setupLightweightJson(docFilename: string): Promise<LightData|undefined> {
  const response = await fetch(DICT_PATH + '/' + docFilename);
  if (!response.ok) {
    console.error(`Failed to fetch ${docFilename}: ${response.statusText}`);
    return undefined;
  }
  const decoded = Lightweight.decode(await response.json());
  if (decoded._tag === 'Right') { return decoded.right; }
  console.error(PR.PathReporter.report(decoded))
  console.error(`Failed to decode ${docFilename}`);
  return undefined;
}

export async function setupMarkdown(docFilename: string): Promise<DictData|undefined> {
  const response = await fetch(DICT_PATH + '/' + docFilename);
  if (!response.ok) {
    console.error(`Failed to fetch ${docFilename}: ${response.statusText}`);
    return undefined;
  }
  const markdown = await response.text();
  const promises = markdown.split('\n').map(async s => {
    if (!s.includes('<line id="hash-')) { return s; }
    const hash = s.replace(/.*?<line id="hash-([^"]+)">.*/, '$1');
    const response = await fetch(`${DICT_PATH}/line-${hash}.json`);
    if (!response.ok) {
      console.error(`Failed to find sidecar for ${hash}`);
      return s;
    }
    const decoded = Dict.decode(await response.json());
    if (decoded._tag === 'Right') { return decoded.right; }
    console.error(PR.PathReporter.report(decoded))
    console.error(`Error decoding sidecar for ${hash}`);
    return s;
  });
  const parsed = Promise.all(promises);
  return parsed;
}
/*
Render text
Show dictionary hits upon click
Accept dictionary hits
Accept changes in reading & mass-apply them & apply them for future occurrences in this doc
*/

const HASH_TO_DICT: Map<string, IDict> = new Map();
async function getHash(hash: string): Promise<IDict|undefined> {
  const hit = HASH_TO_DICT.get(hash);
  if (hit) { return hit; }
  const response = await fetch(`/dict-hits-per-line/line-${hash}.json`);
  if (response.ok) {
    const decoded = Dict.decode(await response.json());
    if (decoded._tag === 'Right') {
      const dict = decoded.right;
      HASH_TO_DICT.set(hash, dict);
      return dict;
    } else {
      console.error(PR.PathReporter.report(decoded))
      console.error(`Error decoding dictionary results sidecar file`);
    }
  } else {
    console.error('Error requesting dictionary results sidecar file', response.statusText);
  }
  return undefined;
}

async function clickMorpheme(lineHash: string, lineNumber: number, morphemeIndex: number, documentName: string,
                             furigana: LightLine['furigana'][0], setHits: SetState<PopupProps['hits']>,
                             setLocation: SetState<Location|undefined>): Promise<void> {
  const dict = await getHash(lineHash);
  setHits(dict?.dictHits[morphemeIndex] || []);
  setLocation({docName: documentName, morphemeIdx: morphemeIndex, lineHash, lineNumber, furigana});
}

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

interface LineProps {
  line: LightData[0];
  lineNumber: number;
  documentName: string;
  setHits: SetState<PopupProps['hits']>;
  setLocation: SetState<Location|undefined>;
}
function LightLine({line, lineNumber, documentName, setHits, setLocation}: LineProps) {
  const overrides = Recoil.useRecoilValue(overridesSelector(typeof line === 'string' ? '' : line.hash)) || {};
  if (Object.keys(overrides).length) { console.log({overrides}) }
  if (typeof line === 'string') { return ce('span', null, line); }
  const furigana = line.furigana.map((f, i) => (i in overrides ? overrides[i] : f) as typeof line.furigana[0]);
  return ce(
      'line', {is: 'span', id: 'hash-' + line.hash},
      ...furigana.map(
          (f, fidx) =>
              typeof f === 'string'
                  ? ce('span', {
                      onClick: e => clickMorpheme(line.hash, lineNumber, fidx, documentName, f, setHits, setLocation)
                    },
                       f)
                  : ce('span', {
                      onClick: e => clickMorpheme(line.hash, lineNumber, fidx, documentName, f, setHits, setLocation),
                      className: fidx in overrides ? 'furigana-override' : undefined
                    },
                       ...f.map(r => typeof r === 'string' ? r : ce('ruby', null, r.ruby, ce('rt', null, r.rt))))));
}

interface PopupProps {
  hits: IScoreHit[][];
  hidden: boolean;
  setHidden: SetState<boolean>;
}
function Popup({
  hits,
  hidden,
  setHidden,
}: PopupProps) {
  const docName = Recoil.useRecoilValue(docNameSelector);
  const setAtom = Recoil.useSetRecoilState(docAtom);
  const location = Recoil.useRecoilValue(locationAtom);

  // set that we populate from Pouchdb when
  // (1) *hits* changes (we clicked a morpheme) or
  // (2) we clicked a dictionary hit to indicate it's marked as an annotation
  const [subdb, setSubdb] = useState(new Set([]) as Set<string>);
  // this is a hack: whenever we toggle a dictionary entry's annotation status, we'll write to Pouchdb in the onClick
  // and then we want to refresh the above set. This counter will serve as a click-tracker... this might be ok but meh
  const [counter, setCounter] = useState(0);
  // this effect will build `subdb` by looping over Pouchdb `bulkGet`
  useEffect(() => {
    (async function() {
      if (!location) { return; }
      const results: PouchDB.Core.BulkGetResponse<AnnotatedWordIdDoc> =
          await db.bulkGet({docs: hits.flatMap(v => v.flatMap(h => ({id: wordIdToKey(docName, h.wordId)})))});
      const newSubdb: typeof subdb = new Set();
      results.results.forEach(({docs, id}) => docs.forEach(doc => {
        if ('ok' in doc &&
            doc.ok.locations?.[location.docName]?.[location.lineHash]?.morphemeIdxs[location.morphemeIdx]) {
          newSubdb.add(id);
        }
      }));
      setSubdb(newSubdb);
    })();
  }, [hits, counter, location]);
  // the final array ensures we only run this when an element changes, otherwise, infinite loop

  // The popup itself.
  if (hidden || !location) { return ce('div', null); }

  const closeButton = ce('button', {onClick: e => setHidden(true)}, 'X');
  return ce(
      'div',
      {id: "dict-popup"},
      closeButton,
      ce(
          'ul',
          null,
          ...hits.map(
              stops => ce(
                  'li',
                  null,
                  ce(
                      'ol',
                      null,
                      ...stops.map(
                          hit => ce(
                              'li',
                              null,
                              ...highlight(hit.run, hit.summary),
                              ce(
                                  'button',
                                  {
                                    onClick: () => toggleWordIdAnnotation(hit, location).then(({updated}) => {
                                      if (updated) { setCounter(counter + 1); }
                                      getFlashcards(docName).then(flashcards => setAtom(old => ({...old, flashcards})));
                                    })
                                  },
                                  subdb.has(wordIdToKey(docName, hit.wordId)) ? 'Flashcard!' : 'Not a flashcard',
                                  ),
                              ),
                          ),
                      ),
                  ),
              ),
          ),
  );
}
function highlight(needle: IScoreHit['run'], haystack: string) {
  const needleChars = new Set((typeof needle === 'string' ? needle : needle.cloze).split(''));
  return haystack.split('').map(c => needleChars.has(c) ? ce('span', {className: 'highlight-popup'}, c)
                                                        : ce('span', null, c));
}
function wordIdToKey(documentName: string, wordId: string) { return `doc-${documentName}/annotated-wordId-${wordId}`; }
interface AnnotatedWordIdDoc {
  wordId: string;
  summary: string;
  locations:
      {[docName: string]: {[lineHash: string]: {lineNumber: number, morphemeIdxs: {[morphemeIdx: number]: number}}}},
}
async function toggleWordIdAnnotation({wordId, summary}: IScoreHit,
                                      {docName: documentName, lineHash, lineNumber, morphemeIdx}: Location) {
  const timestamp = Date.now();
  const x = await db.upsert(wordIdToKey(documentName, wordId), (doc: Partial<AnnotatedWordIdDoc>) => {
    doc.summary = summary;
    const top = {[documentName]: {[lineHash]: {lineNumber: lineNumber, morphemeIdxs: {[morphemeIdx]: timestamp}}}};
    if (!doc.locations) {
      doc.locations = top;
    } else if (!doc.locations[documentName]) {
      doc.locations[documentName] = top[documentName];
    } else if (!doc.locations[documentName][lineHash]) {
      doc.locations[documentName][lineHash] = top[documentName][lineHash];
    } else if (!doc.locations[documentName][lineHash].morphemeIdxs[morphemeIdx]) {
      doc.locations[documentName][lineHash].morphemeIdxs[morphemeIdx] =
          top[documentName][lineHash].morphemeIdxs[morphemeIdx];
    } else {
      delete doc.locations[documentName][lineHash].morphemeIdxs[morphemeIdx];
    }
    return {...doc, summary, wordId, locations: doc.locations};
  });
  return x;
}

interface ListFlashcardsProps {}
function ListFlashcards({}: ListFlashcardsProps) {
  const flashcards = Recoil.useRecoilValue(flashcardsSelector);
  return ce('div', null, ce('ol', null, ...(flashcards || []).map(dict => ce('li', null, dict.summary))));
}

async function getFlashcards(docName: string) {
  const startkey = wordIdToKey(docName, '');
  const res = await db.allDocs<AnnotatedWordIdDoc>({startkey, endkey: startkey + '\ufe0f', include_docs: true});
  const docs = res.rows.map(row => row.doc);
  const okDocs: AnnotatedWordIdDoc[] = docs.filter(x => !!x && x.locations[docName]) as NonNullable<typeof docs[0]>[];
  // this will become slow if a wordId is tagged a lot in a document, needlessly linear
  const earliestLine = (d: AnnotatedWordIdDoc) =>
      Math.min(...Object.values(d.locations[docName]).map(o => o.lineNumber));
  const earliestMorpheme = (d: AnnotatedWordIdDoc) => Math.min(
      ...Object.values(d.locations[docName]).map(o => Math.min(...Object.keys(o.morphemeIdxs).map(o => parseInt(o)))));
  okDocs.sort((a, b) => {
    const ea = earliestLine(a);
    const eb = earliestLine(b);
    return ea === eb ? earliestMorpheme(a) - earliestMorpheme(b) : ea - eb
  });
  return okDocs;
}

function lineHashToFuriganaOverridesKey(documentName: string, lineHash: string) {
  return `doc-${documentName}/furigana-override-${lineHash}`;
}
async function getFuriganaOverrides(docName: string) {
  const startkey = lineHashToFuriganaOverridesKey(docName, '');
  const res = await db.allDocs<FuriganaOverridesDoc>({startkey, endkey: startkey + '\ufe0f', include_docs: true});
  const docs = res.rows.map(row => row.doc);
  const ret: FuriganaOverrides = {};
  for (const doc of docs) {
    if (doc) { ret[doc.lineHash] = doc.overrides; }
  }
  return ret;
}

function EditFurigana() {
  const location = Recoil.useRecoilValue(locationAtom);
  const setAtom = Recoil.useSetRecoilState(docAtom);
  const [choices, setChoices] = useState([] as {ruby: string, rt: string}[]);
  useEffect(() => {
    if (location) { setChoices(location.furigana.filter(s => typeof s !== 'string') as {ruby: string, rt: string}[]); }
  }, [location?.furigana]);

  if (!location) { return ce('p', null); }
  if (!choices.length) { return ce('p', null); }

  const inputs = choices.map(
      (o, i) => ce('input', {
        type: 'text',
        value: o.rt,
        onChange:
            e => { setChoices(choices.map((old, oldidx) => oldidx === i ? {ruby: o.ruby, rt: e.target.value} : old)); }
      }));

  const upsert = (deleteFlag: boolean) => {
    db.upsert(
        lineHashToFuriganaOverridesKey(location.docName, location.lineHash), (doc: Partial<FuriganaOverridesDoc>) => {
          const overrides = doc.overrides || {};
          if (deleteFlag) {
            delete overrides[location.morphemeIdx];
          } else {
            const rebuiltFurigana = location.furigana.slice();
            for (let i = 0, j = 0; i < rebuiltFurigana.length; i++) {
              if (typeof rebuiltFurigana[i] !== 'string') { rebuiltFurigana[i] = choices[j++]; }
            }
            overrides[location.morphemeIdx] = rebuiltFurigana;
          }
          // write to Recoil also
          setAtom(doc => ({...doc, furiganaOverrides: {...doc.furiganaOverrides, [location.lineHash]: overrides}}));
          return {...doc, lineHash: location.lineHash, overrides};
        });
  };

  const commit = ce('button', {onClick: () => upsert(false)}, 'Save');
  const remove = ce('button', {onClick: () => upsert(true)}, 'Remove');

  return ce(
      'div',
      null,
      'edit furigana: ',
      ce('ul', null, ...choices.map((o, i) => ce('li', null, o.ruby, inputs[i]))),
      commit,
      remove,
  );
}

type FuriganaOverridesDoc = {
  lineHash: string,
  overrides: {[morphemeIdx: number]: LightLine['furigana'][0]}
};

// Without the Partials below, indexing into this array is typed as safe when it's not
// semi-related https://github.com/Microsoft/TypeScript/issues/11122
type FuriganaOverrides = Partial<{[hash: string]: Partial<{[morphemeIdx: number]: LightLine['furigana'][0]}>;}>;

const docAtom = Recoil.atom({
  key: 'docData',
  default: {
    documentName: '',
    flashcards: undefined as undefined | AnnotatedWordIdDoc[],
    furiganaOverrides: {} as FuriganaOverrides,
  }
});
const docNameSelector = Recoil.selector({key: 'docName', get: ({get}) => get(docAtom).documentName});
const flashcardsSelector = Recoil.selector({key: 'flashcards', get: ({get}) => get(docAtom).flashcards});
interface Location {
  docName: string;
  lineHash: string;
  lineNumber: number;
  morphemeIdx: number;
  furigana: LightLine['furigana'][0]; // contents of the morpheme
}
const locationAtom = Recoil.atom({key: 'location', default: undefined as undefined | Location})
const furiganaSelector = Recoil.selector({key: 'locationTofurigana', get: ({get}) => get(locationAtom)?.furigana});
const overridesSelector = Recoil.selectorFamily(
    {key: 'docToFuriganaOverrides', get: (lineHash: string) => ({get}) => get(docAtom).furiganaOverrides[lineHash]});

export interface DocProps {
  data: LightData|undefined;
  documentName: string;
}
export function Doc({data, documentName}: DocProps) {
  const setDoc = Recoil.useSetRecoilState(docAtom);
  const setLocation = Recoil.useSetRecoilState(locationAtom);

  const [hits, setHits] = useState([] as PopupProps['hits']);
  const [hiddenPopup, setHiddenPopup] = useState(true);
  useEffect(() => {
    Promise.all([getFlashcards(documentName), getFuriganaOverrides(documentName)])
        .then(([flashcards, furiganaOverrides]) => setDoc({documentName, flashcards, furiganaOverrides}));
  }, [documentName]);

  if (!data) { return ce('p', null, ''); }

  const setHitsOpenPopup: typeof setHits = (x) => {
    setHiddenPopup(false);
    setHits(x);
  };
  return ce(
      'div',
      null,
      ce(ListFlashcards),
      ce(EditFurigana),
      ce(Popup, {hits, hidden: hiddenPopup, setHidden: setHiddenPopup}),
      ...data.map((line, lineNumber) =>
                      ce('p', {className: 'large-content'},
                         ce(LightLine, ({line, lineNumber, documentName, setHits: setHitsOpenPopup, setLocation})))),
  );
}
