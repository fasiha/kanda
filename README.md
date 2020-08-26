# Kanda
Experimental web-based frontend for annotating Japanese text for intensive reading. Backed by [Curtiz-Japanese-NLP](https://github.com/fasiha/curtiz-japanese-nlp).

Visit **https://fasiha.github.io/kanda** to use the app!

## Dev
> Go [here](https://fasiha.github.io/kanda) to *use* the app. The rest of this section is for developers seeking to build and run it locally.

Install recent versions of [Git](https://git-scm.com) and [Node.js](https://nodejs.org) if you don't have them already. Then, at the command line (Terminal, xterm, Command Prompt, etc.), run the following:
```console
git checkout https://github.com/fasiha/kanda
cd kanda
npm i
npx snowpack dev
```
Then, open http://localhost:8080/

> By default, this will hit Curtiz-Japanese-NLP running on [Glitch](https://curtiz-japanese-nlp.glitch.me). If you'd like to have a much faster local experience, install 
> - MeCab,
> - UniDic, 
> - [Curtiz-Japanese-NLP](https://github.com/fasiha/curtiz-japanese-nlp) and run it.