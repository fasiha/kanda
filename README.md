Experimental [Curtiz-Japanese-NLP](https://github.com/fasiha/curtiz-japanese-nlp) web-based frontend for annotation editors.

- Clone this repo
- Create a directory (or symlink) in `public/dict-hits-per-line` which contains JSON files output by Curtiz-Japanese-NLP (`line-<base64URL-encoded MD5 checksum>.json`).
- `npm i`
- `npx snowpack dev`
- create `public/index.html`, something like the following:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/_dist_/index.js"></script>
    <!-- 
      ADD your Curtiz-Japanese-NLP text here, with <line> and <morpheme> tags!      
    -->
  </body>
</html>
```
