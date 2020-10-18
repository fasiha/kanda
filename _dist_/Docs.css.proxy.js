const code=`.login-header {
  width: 100%;
  background-color: #1E095D;
  color: white;
}

.main {
  font-size: xx-large; /* xxx-large is unsupported in Safari as of Aug 2020 */
}

.regular-sized {
  font-size: medium;
}

.not-main {
  position: fixed;
  left: 0;
  bottom: 0;
  max-height: 50vh;
  overflow-y: scroll;
  width: 100%;
  background-color: #1E095D;
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
