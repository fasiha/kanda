import React, {createElement as ce, useEffect, useState} from 'react';
import Recoil from 'recoil';

const NLP_SERVER = 'http://localhost:8133/api/v1/sentences';

/************
Data model
************/
type Docs = Partial<{[unique: string]: Doc}>;
interface Doc {
  name: string;
  contents: string[];
  raws: (RawAnalysis|undefined)[];
}
interface RawAnalysis {
  sha1: string;
  text: string;
  furigana: Furigana[][]; // Furigana[] is a single morpheme, Furigana[][] is an array of morphemes
  hits: ScoreHits[];      // ScoreHits element is result of dictionary analysis starting at a given morpheme
  // furigana.length === hits.length!
}

type Furigana = string|{ruby: string, rt: string};
interface ScoreHit {
  wordId: string;
  score: number;
  search: string;
  summary?: string;
}
interface ScoreHits {
  startIdx: number;
  results: {
    endIdx: number,
    run: string|ContextCloze,
    results: ScoreHit[],
  }[];
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

/************
React components
************/
interface DocsProps {}
export function DocsComponent({}: DocsProps) {
  const docs = Recoil.useRecoilValue(docsAtom);
  return ce(
      'div',
      {id: 'all-docs'},
      ...Object.keys(docs).map(unique => ce(DocComponent, {unique})),
      ce(AddDocComponent),
  );
}

interface DocProps {
  unique: string;
}
function DocComponent({unique}: DocProps) {
  const doc = Recoil.useRecoilValue(docSelector(unique));
  const setDocs = Recoil.useSetRecoilState(docsAtom);
  if (!doc) { return ce('span'); }
  const deleteButton = ce('button', {
    onClick: () => setDocs(docs => {
      const ret = {...docs};
      delete ret[unique];
      return ret;
    })
  },
                          'Delete');
  return ce(
      'div',
      {className: 'doc'},
      ce('h2', null, doc.name || unique, deleteButton),
      ce('section', null, ...doc.raws.map((raw, i) => {
        if (!raw) { return ce('p', null, doc.contents[i]); }
        return ce(FuriganaComponent, {furigana: raw.furigana});
      })),
  )
}

interface FuriganaProps {
  furigana: Furigana[][];
}
function FuriganaComponent({furigana}: FuriganaProps) {
  return ce(
      'p',
      null,
      ...furigana.flatMap(v => v.map(o => typeof o === 'string' ? o : ce('ruby', null, o.ruby, ce('rt', null, o.rt)))),
  );
}

interface AddDocProps {}
function AddDocComponent({}: AddDocProps) {
  const [name, setName] = useState('');
  const [fullText, setContents] = useState('');
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
        setDocs(docs => ({...docs, [(new Date()).toISOString()]: {name, contents, raws}}))
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

// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest
async function digestMessage(message: string, algorithm = 'SHA-1') {
  const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest(algorithm, msgUint8);           // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
}