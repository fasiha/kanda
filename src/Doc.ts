import * as t from 'io-ts';
import PR from 'io-ts/lib/PathReporter';
import React, {createElement as ce, Fragment} from 'react';

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

type DictData = (t.TypeOf<typeof Dict>|string)[];
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

function renderLightweight(line: LightData[0]) {
  if (typeof line === 'string') { return line; }
  return ce(
      Fragment, null,
      ...line.furigana.map(
          f => typeof f === 'string'
                   ? ce('morpheme', {is: 'span'}, f)
                   : ce('morpheme', {is: 'span'},
                        ...f.map(r => typeof r === 'string' ? r : ce('ruby', null, r.ruby, ce('rt', null, r.rt))))));
}

export function Doc({data}: DocProps) {
  if (!data) { return ce('p', null, ''); }
  return ce('div', null, ...data.map(o => ce('p', null, renderLightweight(o))));
}
