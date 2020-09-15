const code=`.container {
  display:grid;
  grid-template-columns: 1fr 1fr;
}

.left-containee {
  height: 100vh;
  overflow-y: scroll;
  font-size: xx-large; /* xxx-large is unsupported in Safari as of Aug 2020 */
}

.regular-sized {
  font-size: medium;
}

.right-containee {
  height: 100vh;
  overflow-y: scroll;
  color: #A98CFD;
}

.highlighted {
  color: white;
}

.annotated-text {
  background-color: #7E69BD;
}

.annotated-entry {
  font-weight: bold;
}

.doc textarea{
  width: 100%;
  height: 33vh;
}

.limited-height {
  max-height: 33vh;
  overflow-y: scroll;
  background-color: #5218FA; /* "Han purple" according to https://www.htmlcsscolor.com/hex/5218FA */
}

a {
  color: white;
}

a:hover {
  text-decoration: none;
}`,styleEl=document.createElement("style"),codeEl=document.createTextNode(code);styleEl.type="text/css",styleEl.appendChild(codeEl),document.head.appendChild(styleEl);
