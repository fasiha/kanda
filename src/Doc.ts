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
const Lightweight =
    t.array(t.union([t.string, t.type({line: t.string, hash: t.string, furigana: t.array(t.array(Furigana))})]));

const DICT_PATH = '/dict-hits-per-line';

type IScoreHit = t.TypeOf<typeof ScoreHit>;
type IDict = t.TypeOf<typeof Dict>;
type DictData = (IDict|string)[];
type LightData = t.TypeOf<typeof Lightweight>;

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
                             setHits: SetState<PopupProps['hits']>,
                             setLocation: SetState<Location|undefined>): Promise<void> {
  const dict = await getHash(lineHash);
  setHits(dict?.dictHits[morphemeIndex] || []);
  setLocation({docName: documentName, morphemeIdx: morphemeIndex, lineHash, lineNumber});
}

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

function renderLightweight(line: LightData[0], lineNumber: number, documentName: string,
                           setHits: SetState<PopupProps['hits']>, setLocation: SetState<Location|undefined>) {
  if (typeof line === 'string') { return line; }
  return ce(
      'line', {is: 'span', id: 'hash-' + line.hash},
      ...line.furigana.map(
          (f, fidx) =>
              typeof f === 'string'
                  ? ce('morpheme', {
                      onClick: e => clickMorpheme(line.hash, lineNumber, fidx, documentName, setHits, setLocation),
                      is: 'span'
                    },
                       f)
                  : ce('morpheme', {
                      onClick: e => clickMorpheme(line.hash, lineNumber, fidx, documentName, setHits, setLocation),
                      is: 'span'
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
    return doc as AnnotatedWordIdDoc;
  });
  return x;
}

interface ListFlashcardsProps {}
function ListFlashcards({}: ListFlashcardsProps) {
  const {flashcards} = Recoil.useRecoilValue(docAtom);
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

const docAtom = Recoil.atom(
    {key: 'allFlashcards', default: {documentName: '', flashcards: undefined as undefined | AnnotatedWordIdDoc[]}});
const docNameSelector = Recoil.selector({key: 'docName', get: ({get}) => get(docAtom).documentName});
const flashcardsSelector = Recoil.selector({key: 'flashcards', get: ({get}) => get(docAtom).flashcards});
interface Location {
  docName: string;
  lineHash: string;
  lineNumber: number;
  morphemeIdx: number;
}
const locationAtom = Recoil.atom({key: 'location', default: undefined as undefined | Location})

export interface DocProps {
  data: LightData|undefined, documentName: string,
}
export function Doc({data, documentName}: DocProps) {
  const [atom, setAtom] = Recoil.useRecoilState(docAtom);
  const setLocation = Recoil.useSetRecoilState(locationAtom);

  const [hits, setHits] = useState([] as PopupProps['hits']);
  const [hiddenPopup, setHiddenPopup] = useState(true);
  useEffect(() => { getFlashcards(documentName).then(flashcards => setAtom({documentName, flashcards})); },
            [atom.documentName === documentName]);

  if (!data) { return ce('p', null, ''); }

  const setHitsOpenPopup: typeof setHits = (x) => {
    setHiddenPopup(false);
    setHits(x);
  };
  return ce('div', null, ce(ListFlashcards), ce(Popup, {hits, hidden: hiddenPopup, setHidden: setHiddenPopup}),
            ...data.map((o, lino) => ce('p', {className: 'large-content'},
                                        renderLightweight(o, lino, documentName, setHitsOpenPopup, setLocation))));
}
