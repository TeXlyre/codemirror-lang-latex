import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, highlightActiveLine, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { completionKeymap } from '@codemirror/autocomplete';
import { syntaxHighlighting, defaultHighlightStyle, foldGutter, foldKeymap } from '@codemirror/language';

// Import the LaTeX extension from a relative path to access the built package
import { latex } from '../../..';
import './styles.css';

// Example LaTeX document
const initialDoc = `% { You can also collapse this block up until '% }'
\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{graphicx}
% }

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
  autoCloseBrackets: true,
  enableLinting: true,
  enableTooltips: true,
  enableAutocomplete: true,
  fileName: 'main.tex',
  linter: {
    checkMissingDocumentEnv: true,
    checkUnmatchedEnvironments: true,
    checkMissingReferences: true,
    checkUnclosedBraces: true,
    checkDuplicateLabels: true,
    checkCitesWithoutBibliography: true,
  },
};

function createEditor() {
  const extensions = [
    lineNumbers(),
    highlightActiveLine(),
    foldGutter(),
    history(),
    highlightSelectionMatches(),
    syntaxHighlighting(defaultHighlightStyle),
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      ...searchKeymap,
      ...completionKeymap,
      ...foldKeymap
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


document.addEventListener('DOMContentLoaded', () => {
  let editorView = createEditor();

  bindCheckbox('autoCloseTags', v => { currentOptions.autoCloseTags = v; });
  bindCheckbox('autoCloseBrackets', v => { currentOptions.autoCloseBrackets = v; });
  bindCheckbox('enableLinting', v => { currentOptions.enableLinting = v; });
  bindCheckbox('enableTooltips', v => { currentOptions.enableTooltips = v; });
  bindCheckbox('enableAutocomplete', v => { currentOptions.enableAutocomplete = v; });

  bindSelect('fileFormat', v => { currentOptions.fileName = `main.${v}`; });

  bindCheckbox('checkMissingDocumentEnv', v => { currentOptions.linter.checkMissingDocumentEnv = v; });
  bindCheckbox('checkUnmatchedEnvironments', v => { currentOptions.linter.checkUnmatchedEnvironments = v; });
  bindCheckbox('checkMissingReferences', v => { currentOptions.linter.checkMissingReferences = v; });
  bindCheckbox('checkUnclosedBraces', v => { currentOptions.linter.checkUnclosedBraces = v; });
  bindCheckbox('checkDuplicateLabels', v => { currentOptions.linter.checkDuplicateLabels = v; });
  bindCheckbox('checkCitesWithoutBibliography', v => { currentOptions.linter.checkCitesWithoutBibliography = v; });

  function recreateEditor() {
    const content = editorView.state.doc.toString();
    editorView.destroy();
    editorView = createEditor();
    editorView.dispatch({
      changes: { from: 0, to: editorView.state.doc.length, insert: content }
    });
  }


  function bindCheckbox(id, apply) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      const target = e.target;
      if (target instanceof HTMLInputElement) {
        apply(target.checked);
        recreateEditor();
      }
    });
  }

  function bindSelect(id, apply) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', (e) => {
      const target = e.target;
      if (target instanceof HTMLSelectElement) {
        apply(target.value);
        recreateEditor();
      }
    });
  }

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