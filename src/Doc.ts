import './Doc.css';

import * as t from 'io-ts';
import PR from 'io-ts/lib/PathReporter';
import PouchDB from 'pouchdb-browser';
import PouchUpsert from 'pouchdb-upsert';
import React, {createElement as ce, useEffect, useState} from 'react';
import Recoil from 'recoil';

/*

Setup

*/
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
type ILightData = t.TypeOf<typeof Lightweight>;
type ILightLine = t.TypeOf<typeof LightweightLine>;

export async function setupLightweightJson(docFilename: string): Promise<ILightData|undefined> {
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

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

/*

Types PouchDB and in app

*/
type FuriganaOverridesDoc = {
  lineHash: string,
  overrides: {[morphemeIdx: number]: ILightLine['furigana'][0]}
};

// Without the Partials below, indexing into this array is typed as safe when it's not
// semi-related https://github.com/Microsoft/TypeScript/issues/11122
type FuriganaOverrides = Partial<{[hash: string]: Partial<{[morphemeIdx: number]: ILightLine['furigana'][0]}>;}>;

/*

Recoil

*/
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
  furigana: ILightLine['furigana'][0]; // contents of the morpheme
}
const locationAtom = Recoil.atom({key: 'location', default: undefined as undefined | Location})
const furiganaSelector = Recoil.selector({key: 'locationTofurigana', get: ({get}) => get(locationAtom)?.furigana});
const overridesSelector = Recoil.selectorFamily(
    {key: 'docToFuriganaOverrides', get: (lineHash: string) => ({get}) => get(docAtom).furiganaOverrides[lineHash]});

const hitsAtom = Recoil.atom({key: 'hits', default: [] as IScoreHit[][]});
const popupHiddenAtom = Recoil.atom({key: 'popupHidden', default: true});

/*

Main app

*/
export interface DocProps {
  data: ILightData|undefined;
  documentName: string;
}
export function Doc({data, documentName}: DocProps) {
  const setDoc = Recoil.useSetRecoilState(docAtom);
  useEffect(() => {
    Promise.all([getFlashcards(documentName), getFuriganaOverrides(documentName)])
        .then(([flashcards, furiganaOverrides]) => setDoc({documentName, flashcards, furiganaOverrides}));
  }, [documentName]);

  if (!data) { return ce('p', null, ''); }

  return ce(
      'div',
      null,
      ce(ListFlashcards),
      ce(PopupContents),
      ...data.map((line, lineNumber) =>
                      ce('p', {className: 'large-content'}, ce(LightLine, ({line, lineNumber, documentName})))),
  );
}

function PopupContents() {
  const [hiddenPopup, setHiddenPopup] = Recoil.useRecoilState(popupHiddenAtom);
  if (hiddenPopup) { return ce('p', null); }
  return ce(
      'div',
      {className: 'popup'},
      ce('button', {onClick: () => setHiddenPopup(!hiddenPopup)}, 'X'),
      ce(Popup),
      ce(EditFurigana),
  );
}

/*

Render each line

*/
interface LineProps {
  line: ILightData[0];
  lineNumber: number;
  documentName: string;
}
function LightLine({line, lineNumber, documentName}: LineProps) {
  const setLocation = Recoil.useSetRecoilState(locationAtom);
  const setHits = Recoil.useSetRecoilState(hitsAtom);
  const setHiddenPopup = Recoil.useSetRecoilState(popupHiddenAtom);

  const overrides = Recoil.useRecoilValue(overridesSelector(typeof line === 'string' ? '' : line.hash)) || {};
  if (typeof line === 'string') { return ce('span', null, line); }
  const furigana = line.furigana.map((f, i) => (i in overrides ? overrides[i] : f) as typeof line.furigana[0]);
  return ce(
      'line', {is: 'span', id: 'hash-' + line.hash},
      ...furigana.map(
          (f, fidx) =>
              typeof f === 'string'
                  ? ce('span', {
                      onClick: e => clickMorpheme(line.hash, lineNumber, fidx, documentName, f, setHits, setLocation,
                                                  setHiddenPopup)
                    },
                       f)
                  : ce('span', {
                      onClick: e => clickMorpheme(line.hash, lineNumber, fidx, documentName, f, setHits, setLocation,
                                                  setHiddenPopup),
                      className: fidx in overrides ? 'furigana-override' : undefined
                    },
                       ...f.map(r => typeof r === 'string' ? r : ce('ruby', null, r.ruby, ce('rt', null, r.rt))))));
}

async function clickMorpheme(lineHash: string, lineNumber: number, morphemeIndex: number, documentName: string,
                             furigana: ILightLine['furigana'][0], setHits: SetState<IScoreHit[][]>,
                             setLocation: SetState<Location|undefined>,
                             setHiddenPopup: SetState<boolean>): Promise<void> {
  const dict = await getHash(lineHash);
  setHits(dict?.dictHits[morphemeIndex] || []);
  setLocation({docName: documentName, morphemeIdx: morphemeIndex, lineHash, lineNumber, furigana});
  setHiddenPopup(false);
}

/*

Furigana overrides

*/

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

/*

List of all flashcards

*/
interface ListFlashcardsProps {}
function ListFlashcards({}: ListFlashcardsProps) {
  const flashcards = Recoil.useRecoilValue(flashcardsSelector);
  if (!flashcards) { return ce('span') }
  return ce('div', {className: 'list-of-flashcards'},
            ce('ol', null, ...(flashcards || []).map(dict => ce('li', null, dict.summary))));
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

/*

Dictionary hits for each morpheme run in a popup

*/
interface PopupProps {}
function Popup({}: PopupProps) {
  const docName = Recoil.useRecoilValue(docNameSelector);
  const setAtom = Recoil.useSetRecoilState(docAtom);
  const location = Recoil.useRecoilValue(locationAtom);
  const hits = Recoil.useRecoilValue(hitsAtom);

  // set that we populate from Pouchdb when
  // (1) *hits* changes (we clicked a morpheme) or
  // (2) we clicked a dictionary hit to indicate it's marked as an annotation
  const [subdb, setSubdb] =
      useState({thisMorpheme: new Set([]) as Set<string>, thisDocument: new Map([]) as Map<string, number>});
  // this is a hack: whenever we toggle a dictionary entry's annotation status, we'll write to Pouchdb in the onClick
  // and then we want to refresh the above set. This counter will serve as a click-tracker... this might be ok but meh
  const [counter, setCounter] = useState(0);
  // this effect will build `subdb` by looping over Pouchdb `bulkGet`
  useEffect(() => {
    (async function() {
      if (!location) { return; }
      const results: PouchDB.Core.BulkGetResponse<AnnotatedWordIdDoc> =
          await db.bulkGet({docs: hits.flatMap(v => v.flatMap(h => ({id: wordIdToKey(docName, h.wordId)})))});
      const thisMorpheme: typeof subdb.thisMorpheme = new Set();
      const thisDocument: typeof subdb.thisDocument = new Map();
      results.results.forEach(({docs, id}) => docs.forEach(doc => {
        if ('ok' in doc) {
          if (doc.ok.locations?.[location.docName]?.[location.lineHash]?.morphemeIdxs[location.morphemeIdx]) {
            thisMorpheme.add(id);
          }
          if (doc.ok.locations?.[location.docName]) {
            const count = Object.values(doc.ok.locations[location.docName])
                              .map(o => Object.keys(o.morphemeIdxs).length)
                              .reduce((p, c) => p + c);
            if (count) { thisDocument.set(id, count); }
          }
        }
      }));
      setSubdb({thisMorpheme, thisDocument});
    })();
  }, [hits, counter, location]);
  // the final array ensures we only run this when an element changes, otherwise, infinite loop

  if (!location) { return ce('p', null); }

  return ce(
      'div',
      null,
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
                          hit => {
                            const key = wordIdToKey(docName, hit.wordId);
                            const docCount = subdb.thisDocument.get(key);
                            const buttonText =
                                (subdb.thisMorpheme.has(key) ? 'REMOVE flashcard?' : 'Add as flashcard') +
                                ((docCount) ? ` (${docCount} total)` : '');
                            const button = ce('button', {
                              onClick: () => toggleWordIdAnnotation(hit, location).then(({updated}) => {
                                if (updated) { setCounter(counter + 1); }
                                getFlashcards(docName).then(flashcards => setAtom(old => ({...old, flashcards})));
                              })
                            },
                                              buttonText);
                            return ce(
                                'li',
                                null,
                                ...highlight(hit.run, hit.summary),
                                button,
                            )
                          },
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
