import './Doc.css';

import * as t from 'io-ts';
import PR from 'io-ts/lib/PathReporter';
import PouchDB from 'pouchdb-browser';
import PouchUpsert from 'pouchdb-upsert';
import React, {createElement as ce, useEffect, useState} from 'react';

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

export interface DocProps {
  data: LightData|undefined
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

async function clickMorpheme(hash: string, morphemeIdx: number, setHits: SetState<PopupProps['hits']>): Promise<void> {
  const dict = await getHash(hash);
  setHits(dict?.dictHits[morphemeIdx] || []);
}

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

function renderLightweight(line: LightData[0], setHits: SetState<PopupProps['hits']>) {
  if (typeof line === 'string') { return line; }
  return ce(
      'line', {is: 'span', id: 'hash-' + line.hash},
      ...line.furigana.map(
          (f, fidx) =>
              typeof f === 'string'
                  ? ce('morpheme', {onClick: e => clickMorpheme(line.hash, fidx, setHits), is: 'span'}, f)
                  : ce('morpheme', {onClick: e => clickMorpheme(line.hash, fidx, setHits), is: 'span'},
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
  if (hidden) { return ce('div', null); }

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
      const results: PouchDB.Core.BulkGetResponse<AnnotatedWordIdDoc> =
          await db.bulkGet({docs: hits.flatMap(v => v.flatMap(h => ({id: wordIdToKey(h.wordId)})))});
      const newSubdb: typeof subdb = new Set();
      results.results.forEach(({docs, id}) => docs.forEach(doc => {
        if ('ok' in doc && doc.ok.include) { newSubdb.add(id); }
      }));
      setSubdb(newSubdb);
    })();
  }, [hits, counter]); // the final array ensures we only run this when either element changes, otherwise, infinite loop

  // The popup itself.
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
                                    onClick: () => toggleWordIdAnnotation(hit).then(({updated}) => {
                                      if (updated) { setCounter(counter + 1); }
                                    })
                                  },
                                  subdb.has(wordIdToKey(hit.wordId)) ? 'Flashcard!' : 'Not a flashcard',
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
function wordIdToKey(wordId: string) { return `annotated-wordId-${wordId}`; }
interface AnnotatedWordIdDoc {
  include: boolean;
  wordId: string;
  summary: string;
}
function toggleWordIdAnnotation({wordId, summary}: IScoreHit) {
  return db.upsert(wordIdToKey(wordId),
                   (doc: Partial<AnnotatedWordIdDoc>) => ({...doc, include: !doc.include, wordId, summary}));
}

interface ListFlashcardsProps {}
function ListFlashcards({}: ListFlashcardsProps) {
  const [flashcards, setFlashcards] = useState(undefined as AnnotatedWordIdDoc[] | undefined);
  useEffect(() => {
    (async function() {
      if (!flashcards) {
        const startkey = wordIdToKey('');
        const res = await db.allDocs<AnnotatedWordIdDoc>({startkey, endkey: startkey + '\ufe0f', include_docs: true});
        const docs = res.rows.map(row => row.doc);
        setFlashcards(docs.filter(x => !!x) as NonNullable<typeof docs[0]>[]);
      }
    })();
  });

  return ce('div', null, ce('ol', null, ...(flashcards || []).map(dict => ce('li', null, dict.summary))));
}

export function Doc({data}: DocProps) {
  const [hits, setHits] = useState([] as PopupProps['hits']);
  const [hiddenPopup, setHiddenPopup] = useState(true);

  if (!data) { return ce('p', null, ''); }

  const setHitsOpenPopup: typeof setHits = (x) => {
    setHiddenPopup(false);
    setHits(x);
  };
  return ce('div', null, ce(ListFlashcards), ce(Popup, {hits, hidden: hiddenPopup, setHidden: setHiddenPopup}),
            ...data.map(o => ce('p', {className: 'large-content'}, renderLightweight(o, setHitsOpenPopup))));
}
