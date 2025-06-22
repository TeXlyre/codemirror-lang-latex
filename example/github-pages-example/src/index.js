import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { completionKeymap } from '@codemirror/autocomplete';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';

// Import the LaTeX extension from a relative path to access the built package
import { latex } from '../../..';
import './styles.css';

// Example LaTeX document
const initialDoc = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{graphicx}

\\title{CodeMirror LaTeX Extension Demo}
\\author{LaTeX Editor Example}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
This is a sample document demonstrating the LaTeX language support in CodeMirror 6.

\\subsection{Features Showcase}
Here you can see different LaTeX features supported by this extension:

\\subsection{Math Example}
Let's include some math: $E = mc^2$

Also, we can use display math:
\\begin{equation}
  f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x} \\,d\\xi
\\end{equation}

\\subsection{Lists}
\\begin{itemize}
  \\item Syntax highlighting
  \\item Auto-indentation for environments
  \\item Code folding
  \\item Bracket matching
  \\item Autocompletion
  \\item Auto-closing of environments
  \\item Hover tooltips with documentation
  \\item LaTeX-specific linting
\\end{itemize}

\\section{Figures and Tables}
\\begin{figure}[htbp]
  \\centering
  % Placeholder for an image
  \\includegraphics[width=0.7\\textwidth]{example-image}
  \\caption{Example figure}
  \\label{fig:example}
\\end{figure}

\\begin{table}[htbp]
  \\centering
  \\begin{tabular}{|l|c|r|}
    \\hline
    Left & Center & Right \\\\
    \\hline
    1 & 2 & 3 \\\\
    4 & 5 & 6 \\\\
    \\hline
  \\end{tabular}
  \\caption{A simple table}
  \\label{tab:example}
\\end{table}

\\end{document}`;

// Initialize the editor
let currentOptions = {
  autoCloseTags: true,
  enableLinting: true,
  enableTooltips: true,
  autoCloseBrackets: false  // Disable auto-closing brackets as it interferes with autoclosetags
};

function createEditor() {
  const extensions = [
    lineNumbers(),
    highlightActiveLine(),
    history(),
    highlightSelectionMatches(),
    syntaxHighlighting(defaultHighlightStyle),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
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

  document.getElementById('autoCloseBrackets').addEventListener('change', e => {
    currentOptions.autoCloseBrackets = e.target.checked;
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