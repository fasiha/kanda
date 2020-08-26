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
}`,styleEl=document.createElement("style"),codeEl=document.createTextNode(code);styleEl.type="text/css",styleEl.appendChild(codeEl),document.head.appendChild(styleEl);