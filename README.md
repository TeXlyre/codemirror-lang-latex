# CodeMirror 6 LaTeX Language Support

This package provides LaTeX language support for the [CodeMirror 6](https://codemirror.net/6/) code editor, based on the [Overleaf LaTeX grammar](https://github.com/overleaf/overleaf/tree/3b5a148cdc57d8a739d9773518309e54d0ecc3cd/services/web/frontend/js/features/source-editor/lezer-latex).

## Features

- LaTeX syntax highlighting
- Auto-indentation for environments and groups
- Code folding for environments and document sections
- Bracket matching
- Autocompletion for common LaTeX commands and environments
- Snippets for common LaTeX structures
- Auto-closing of environments
- Hover tooltips with command and environment documentation
- LaTeX-specific linting (missing document environment, unmatched environments, etc.)

## Installation

```bash
npm install codemirror-lang-latex
```

## Usage

```javascript
import { EditorState, EditorView } from '@codemirror/basic-setup';
import { latex } from 'codemirror-lang-latex';

let editor = new EditorView({
  state: EditorState.create({
    doc: '\\documentclass{article}\n\\begin{document}\nHello, world!\n\\end{document}',
    extensions: [
      // ... other extensions
      latex()
    ]
  }),
  parent: document.querySelector('#editor')
});
```

### Configuration Options

You can configure the LaTeX language support by passing options:

```javascript
import { latex } from 'codemirror-lang-latex';

// With all options explicitly set (these are the defaults)
const extensions = [
  // ... other extensions
  latex({
    autoCloseTags: true,    // Auto-close environments
    enableLinting: true,    // Enable linting
    enableTooltips: true    // Enable hover tooltips
  })
];
```

## API

### latex()

The main function that creates a `LanguageSupport` instance for LaTeX.

```javascript
import { latex } from 'codemirror-lang-latex';

// Include LaTeX support in your editor with default options
const extensions = [
  // ... other extensions
  latex()
];

// Or with specific options
const extensions = [
  // ... other extensions
  latex({
    autoCloseTags: true,    // Enable auto-close environments
    enableLinting: true,    // Enable linting
    enableTooltips: true    // Enable tooltips on hover
  })
];
```

### latexLanguage

The LaTeX language definition. Usually you'll want to use the `latex()` function instead, but you can access this directly if you need to.

```javascript
import { latexLanguage } from 'codemirror-lang-latex';
```

### autoCloseTags

An extension that provides automatic closing of LaTeX environments.

```javascript
import { autoCloseTags } from 'codemirror-lang-latex';

const extensions = [
  // ... other extensions
  autoCloseTags
];
```

### latexHoverTooltip

An extension that shows helpful tooltips when hovering over LaTeX commands and environments.

```javascript
import { latexHoverTooltip } from 'codemirror-lang-latex';

const extensions = [
  // ... other extensions
  latexHoverTooltip
];
```

### latexLinter

A linter function that checks for common LaTeX errors and issues.

```javascript
import { latexLinter } from 'codemirror-lang-latex';
import { linter } from '@codemirror/lint';

const extensions = [
  // ... other extensions
  linter(latexLinter({
    checkMissingDocumentEnv: true,     // Check for missing document environment
    checkUnmatchedEnvironments: true,   // Check for unmatched begin/end environments
    checkMissingReferences: true        // Check for references to undefined labels
  }))
];
```

### snippets

A collection of LaTeX-related snippets for common structures.

```javascript
import { snippets } from 'codemirror-lang-latex';
```

### Styling

The package includes CSS styles for syntax highlighting in `dist/latex.css`. Import these styles to get the default LaTeX syntax highlighting:

```javascript
import 'codemirror-lang-latex/dist/latex.css';
```

You can also customize styles in your own CSS.

## Advanced Usage

### Custom Extensions

You can compose your own editor with exactly the LaTeX features you need:

```javascript
import { EditorState, EditorView } from '@codemirror/basic-setup';
import { keymap } from '@codemirror/view';
import { linter } from '@codemirror/lint';
import { 
  latexLanguage, 
  latexCompletionSource, 
  latexBracketMatching, 
  latexLinter,
  latexHoverTooltip
} from 'codemirror-lang-latex';

// Create an editor with only specific LaTeX features
const editor = new EditorView({
  state: EditorState.create({
    doc: "\\documentclass{article}\n\\begin{document}\nHello world\n\\end{document}",
    extensions: [
      // Basic CodeMirror setup
      basicSetup,
      
      // Add just the LaTeX language with completion
      new LanguageSupport(latexLanguage, [
        latexLanguage.data.of({
          autocomplete: latexCompletionSource
        })
      ]),
      
      // Add only the extensions you want
      latexBracketMatching,
      linter(latexLinter()),
      latexHoverTooltip,
      
      // Line wrapping is useful for LaTeX editing
      EditorView.lineWrapping
    ]
  }),
  parent: document.querySelector('#editor')
});
```

### Parser Utilities

The package also provides several utility functions for working with the LaTeX syntax tree:

```javascript
import { 
  findEnvironmentName, 
  getIndentationLevel, 
  findMatchingEnvironment,
  findSectionBoundaries
} from 'codemirror-lang-latex';
```

These can be useful for implementing custom extensions that interact with LaTeX document structure.

## Building from Source

```bash
git clone https://github.com/texlyre/codemirror-lang-latex.git
cd codemirror-lang-latex
npm install
npm run build
```

## Examples

### Regular Example

To run the webpack-bundled example locally, clone the repository and run:

```bash
npm install
npm run setup-example
npm run example
```

Then open `http://localhost:3000` in your browser.

### GitHub Pages Example

To run the GitHub Pages example locally, which is also deployed to the demo site:

```bash
npm install
npm run setup-pages-example
npm run pages-example
```

This will also run on `http://localhost:3000` in your browser.
