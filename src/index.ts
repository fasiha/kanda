import './index.css';

// import {isRight} from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import PR from 'io-ts/lib/PathReporter';

{
  const User = t.type({userId: t.number, name: t.string});
  const result = User.decode({name: 'Giulio'});

  // console.log(PathReporter.report(result))
  console.log(PR.PathReporter.report(result));
}
/*
import App from './App';
import React, {createElement as ce} from 'react';
import ReactDOM from 'react-dom';
ReactDOM.render(
ce(React.StrictMode, null, ce(App)),
document.getElementById('root'),
);
*/

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

async function clickHandler(e: Event): Promise<void> {
  const target: Element|null = e.target as any;
  const parent: Element|null|undefined = target?.parentElement;
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
    const response = await fetch(`/dict-hits-per-line/line-${hash}.json`);
    if (response.ok) {
      const decoded = Dict.decode(await response.json());
      if (decoded._tag === 'Right') {
        // we could do basic checks here like ensuring we have as many morphemes in `bunsetsus` and `dictHits` as
        // `children` above

        const hits = decoded.right.dictHits[morphemeIdx];
        if (hits && hits.length) {
          // found some hits
          console.log(hits);
        }
      } else {
        console.log(PR.PathReporter.report(decoded))

        console.error(`Error decoding dictionary results sidecar file`);
      }
    } else {
      console.error('Error requesting dictionary results sidecar file', response.statusText);
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
