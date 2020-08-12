Experimental [Curtiz-Japanese-NLP](https://github.com/fasiha/curtiz-japanese-nlp) web-based frontend for annotation editors.

- Clone this repo
- Create a directory (or symlink) in `public/dict-hits-per-line` which contains JSON files output by Curtiz-Japanese-NLP (`line-<base64URL-encoded MD5 checksum>.json`, as well as `jb.md`).
- `npm i`
- `npx snowpack dev`
- view the site