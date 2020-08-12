Experimental [Curtiz-Japanese-NLP](https://github.com/fasiha/curtiz-japanese-nlp) web-based frontend for annotation editors.

- Clone this repo
- Create a directory (or symlink) in `public/dict-hits-per-line` which contains JSON files output by Curtiz-Japanese-NLP annotator (multiple `line-<base64URL-encoded MD5 checksum>.json` files, one for each line, as well as a file named `jb.json` which is the same as a `lightweight-<base64URL-encoded MD5 checksum of the entire file>.json`).
- `npm i`
- `npx snowpack dev`
- view the site