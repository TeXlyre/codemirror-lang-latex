import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import {autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap} from '@codemirror/autocomplete';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

// Import the LaTeX extension - webpack will resolve this from the parent directory
import { latex } from '../../../dist/index.js';
// Import the LaTeX CSS
import '../../../dist/latex.css';
// Import our styles
import './styles.css';

// Example LaTeX document
const initialDoc = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{Example Document}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is a sample document to demonstrate the LaTeX language support in CodeMirror 6.

\\subsection{Math Example}
Let's include some math: $E = mc^2$

Also, we can use display math:
\\begin{equation}
  f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x} \\,d\\xi
\\end{equation}

\\subsection{Lists}
\\begin{itemize}
  \\item First item
  \\item Second item with \\textbf{bold text}
  \\item Third item with \\textit{italic text}
\\end{itemize}

\\section{Figures}
\\begin{figure}[htbp]
  \\centering
  \\includegraphics[width=0.7\\textwidth]{example-image}
  \\caption{Example figure}
  \\label{fig:example}
\\end{figure}

\\end{document}`;

// Initialize the editor
let currentOptions = {
  autoCloseTags: true,
  enableLinting: true,
  enableTooltips: true
};

function createEditor() {
  const extensions = [
    lineNumbers(),
    highlightActiveLine(),
    history(),
    highlightSelectionMatches(),
    syntaxHighlighting(defaultHighlightStyle),
    closeBrackets(),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      ...closeBracketsKeymap,
      ...completionKeymap
    ]),

    // Line wrapping is helpful for LaTeX
    EditorView.lineWrapping
  ];

  // Add the LaTeX language support with current options
  try {
    const latexExtension = latex(currentOptions);
    extensions.push(latexExtension);
  } catch (error) {
    console.error("Failed to load LaTeX extension:", error);
    // Continue with basic editor if LaTeX extension fails
  }

  const state = EditorState.create({
    doc: initialDoc,
    extensions,
  });

  return new EditorView({
    state,
    parent: document.getElementById('editor')
  });
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Create the initial editor
  let editorView = createEditor();

  // Handle option changes
  document.getElementById('autoCloseTags').addEventListener('change', e => {
    currentOptions.autoCloseTags = e.target.checked;
    recreateEditor();
  });

  document.getElementById('enableLinting').addEventListener('change', e => {
    currentOptions.enableLinting = e.target.checked;
    recreateEditor();
  });

  document.getElementById('enableTooltips').addEventListener('change', e => {
    currentOptions.enableTooltips = e.target.checked;
    recreateEditor();
  });

  function recreateEditor() {
    // Save current content
    const content = editorView.state.doc.toString();

    // Dispose the old editor
    editorView.destroy();

    // Create a new editor with the updated options
    editorView = createEditor();

    // Set the content back
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: content }
    });
  }

  // Toolbar button actions
  document.getElementById('insertSection').addEventListener('click', () => {
    insertSnippet('\\section{New Section}\n');
  });

  document.getElementById('insertEnvironment').addEventListener('click', () => {
    insertSnippet('\\begin{itemize}\n\t\\item New Item\n\\end{itemize}\n');
  });

  document.getElementById('insertMath').addEventListener('click', () => {
    insertSnippet('$E = mc^2$');
  });

  function insertSnippet(text) {
    const cursor = editorView.state.selection.main.head;
    editorView.dispatch({
      changes: { from: cursor, insert: text },
      selection: { anchor: cursor + text.length }
    });
    editorView.focus();
  }
});