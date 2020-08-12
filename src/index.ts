import './index.css';

// import E from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import PR from 'io-ts/lib/PathReporter';
import React, {createElement as ce} from 'react';
import ReactDOM from 'react-dom';

import {Doc, setupDoc} from './Doc';

const docPromise = setupDoc('jb.md');
docPromise.then(data => ReactDOM.render(ce(React.StrictMode, null, ce(Doc, {data})), document.getElementById('root')));

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

const Dict = t.type({
  line: t.string,
  bunsetsus: t.array(t.array(Morpheme)),
  dictHits: t.array(t.array(t.array(ScoreHit))),
});

const HASH_PREFIX = 'hash-';

function findAncestor(e: Element|null, tag: string): Element|null {
  while (e && e.tagName !== tag) { e = e.parentElement; }
  return e;
}

type IDict = t.TypeOf<typeof Dict>;
const HASH_TO_DICT: Map<string, IDict> = new Map();

async function clickHandler(e: Event): Promise<void> {
  const target: Element|null = findAncestor(e.target as any, 'MORPHEME');
  const parent = findAncestor(target, 'LINE');
  const lineId = parent?.id;
  if (lineId && lineId.startsWith(HASH_PREFIX) && parent && target?.nodeName === 'MORPHEME') {
    const children = parent.querySelectorAll('morpheme');
    let morphemeIdx = 0;
    for (; morphemeIdx < children.length; morphemeIdx++) {
      if (children[morphemeIdx] === target) { break; }
    }
    if (morphemeIdx >= children.length) {
      // couldn't find morpheme?
      console.error('Error finding morpheme in line');
      return;
    }
    const hash = lineId.slice(HASH_PREFIX.length);
    let dict: IDict|undefined;
    if (HASH_TO_DICT.has(hash)) {
      dict = HASH_TO_DICT.get(hash);
    } else {
      const response = await fetch(`/dict-hits-per-line/line-${hash}.json`);
      if (response.ok) {
        const decoded = Dict.decode(await response.json());
        if (decoded._tag === 'Right') {
          // we could do basic checks here like ensuring we have as many morphemes in `bunsetsus` and `dictHits` as
          // `children` above

          dict = decoded.right;
          HASH_TO_DICT.set(hash, dict);
        } else {
          console.error(PR.PathReporter.report(decoded))
          console.error(`Error decoding dictionary results sidecar file`);
        }
      } else {
        console.error('Error requesting dictionary results sidecar file', response.statusText);
      }
    }
    if (dict) {
      const hits = dict.dictHits[morphemeIdx];
      if (hits && hits.length) {
        // found some hits
        const s: string = hits.map(v => '- ' + v.map(o => o.summary).join('\n- ')).join('\n\n');
        console.log(s);
      }
    }
  }
}

(function main() {
  const lines: Element[] = Array.from(document.querySelectorAll('line'));
  for (const node of lines) { node.addEventListener('click', clickHandler); }
})();

// Hot Module Replacement (HMR) - Remove this snippet to remove HMR.
// Learn more: https://www.snowpack.dev/#hot-module-replacement
if (import.meta.hot) { import.meta.hot.accept(); }
