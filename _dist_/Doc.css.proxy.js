const code=`.popup {
  position: sticky;
  top: 0px;
  left: 0px;
  width: 100%;
  height: 10em;
  background-color: #5218FA; /* "Han purple" according to https://www.htmlcsscolor.com/hex/5218FA */
  color: #A98CFD;
  overflow: scroll;
}

.highlight-popup {
  color: white;
}

.large-content {
  font-size: xx-large; /* xxx-large is unsupported in Safari as of Aug 2020 */
}

.regular-size-content {
  font-size: medium;
}

.furigana-override {
  color:  #C0FA18;
}

.flashcard-available {
  background-color: #7E69BD;
}

.list-of-flashcards {
  max-height: 10em;
  overflow-y: scroll;
  background-color: #1E095D;
}`,styleEl=document.createElement("style"),codeEl=document.createTextNode(code);styleEl.type="text/css",styleEl.appendChild(codeEl),document.head.appendChild(styleEl);
