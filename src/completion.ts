// src/completion.ts
import { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

// Checks if we're at the beginning of an environment name within a \begin{} or \end{}
function isInEnvironmentName(context: CompletionContext): boolean {
  const textBefore = context.state.sliceDoc(
    Math.max(0, context.pos - 20),
    context.pos
  );
  return /\\(begin|end)\{[^}]*$/.test(textBefore);
}

// Checks if we're inside a command name (after a backslash)
function isInCommandName(context: CompletionContext): boolean {
  const textBefore = context.state.sliceDoc(
    Math.max(0, context.pos - 30),
    context.pos
  );
  return /\\[a-zA-Z]*$/.test(textBefore);
}

// Checks if we're in math mode
function isInMathMode(context: CompletionContext): boolean {
  // A more sophisticated implementation would use the syntax tree
  // to determine if we're inside math mode, but this simple version
  // just checks for dollar signs
  const textBefore = context.state.sliceDoc(0, context.pos);
  const dollars = textBefore.match(/\$/g);
  return dollars ? dollars.length % 2 === 1 : false;
}

// LaTeX environment names for autocompletion
export const environments: readonly string[] = [
  // Document structure
  'document', 'abstract',

  // Sectioning alternatives
  'appendix', 'frontmatter', 'mainmatter', 'backmatter',

  // Floats
  'figure', 'figure*', 'table', 'table*', 'wrapfigure', 'subfigure',

  // Text alignment
  'center', 'flushleft', 'flushright', 'quote', 'quotation', 'verse',

  // Lists
  'itemize', 'enumerate', 'description', 'list',

  // Verbatim
  'verbatim', 'verbatim*', 'lstlisting', 'minted', 'Verbatim', 'comment',

  // Math
  'math', 'displaymath', 'equation', 'equation*', 'align', 'align*',
  'gather', 'gather*', 'multline', 'multline*', 'flalign', 'flalign*',
  'alignat', 'alignat*', 'array', 'cases', 'split',

  // Tables
  'tabular', 'tabular*', 'tabularx', 'longtable', 'xltabular',

  // Theorems
  'theorem', 'lemma', 'corollary', 'proposition', 'definition', 'example', 'proof',

  // TikZ
  'tikzpicture', 'scope',

  // Boxes
  'minipage'
];

// LaTeX commands for autocompletion
export const commands: readonly string[] = [
  // Document structure
  '\\documentclass', '\\usepackage', '\\title', '\\author', '\\date', '\\maketitle',
  '\\tableofcontents', '\\appendix', '\\bibliography', '\\bibliographystyle',

  // Sectioning commands
  '\\part', '\\chapter', '\\section', '\\subsection', '\\subsubsection', '\\paragraph', '\\subparagraph',

  // Environments
  '\\begin', '\\end',

  // References
  '\\label', '\\ref', '\\pageref', '\\cite', '\\nocite', '\\bibitem',

  // Text formatting
  '\\textbf', '\\textit', '\\texttt', '\\textsf', '\\textrm', '\\textsc', '\\emph', '\\underline',
  '\\textcolor', '\\colorbox',

  // Lists
  '\\item', '\\itemize', '\\enumerate',

  // Graphics
  '\\includegraphics', '\\caption', '\\figure',

  // Math commands
  '\\frac', '\\sqrt', '\\sum', '\\int', '\\prod', '\\lim', '\\infty', '\\partial',
  '\\alpha', '\\beta', '\\gamma', '\\delta', '\\epsilon', '\\varepsilon', '\\zeta', '\\eta', '\\theta',
  '\\iota', '\\kappa', '\\lambda', '\\mu', '\\nu', '\\xi', '\\pi', '\\rho', '\\sigma', '\\tau',
  '\\upsilon', '\\phi', '\\varphi', '\\chi', '\\psi', '\\omega',
  '\\Gamma', '\\Delta', '\\Theta', '\\Lambda', '\\Xi', '\\Pi', '\\Sigma', '\\Upsilon', '\\Phi', '\\Psi', '\\Omega',

  // Special characters and spacing
  '\\&', '\\%', '\\$', '\\#', '\\_', '\\{', '\\}', '\\\\', '\\quad', '\\qquad', '\\hspace', '\\vspace',

  // Tables
  '\\hline', '\\cline', '\\multicolumn', '\\multirow', '\\toprule', '\\midrule', '\\bottomrule',

  // Definitions
  '\\newcommand', '\\renewcommand', '\\newenvironment', '\\renewenvironment', '\\def', '\\let',

  // Input/Include
  '\\input', '\\include', '\\includeonly'
];

// Additional math commands for completion in math mode
export const mathCommands: readonly string[] = [
  // Greek letters already included in main commands

  // Math operators
  '\\sin', '\\cos', '\\tan', '\\arcsin', '\\arccos', '\\arctan',
  '\\sinh', '\\cosh', '\\tanh', '\\log', '\\ln', '\\exp',
  '\\min', '\\max', '\\sup', '\\inf', '\\lim', '\\limsup', '\\liminf',
  '\\det', '\\dim', '\\mod', '\\gcd', '\\lcm', '\\mathop',

  // Math symbols
  '\\rightarrow', '\\leftarrow', '\\Rightarrow', '\\Leftarrow', '\\mapsto',
  '\\approx', '\\sim', '\\simeq', '\\cong', '\\equiv', '\\prec', '\\succ',
  '\\neq', '\\geq', '\\leq', '\\ll', '\\gg', '\\subset', '\\subseteq', '\\in', '\\notin',
  '\\cap', '\\cup', '\\setminus', '\\emptyset', '\\varnothing',
  '\\forall', '\\exists', '\\nexists',
  '\\mathbb{R}', '\\mathbb{Z}', '\\mathbb{N}', '\\mathbb{Q}', '\\mathbb{C}',

  // Math decorations
  '\\hat', '\\tilde', '\\bar', '\\vec', '\\dot', '\\ddot', '\\underline', '\\overline',

  // Math environments
  '\\begin{equation}', '\\begin{align}', '\\begin{align*}', '\\begin{gather}', '\\begin{array}',
  '\\begin{cases}', '\\begin{matrix}', '\\begin{pmatrix}', '\\begin{bmatrix}', '\\begin{vmatrix}'
];

// Completions for package names after \usepackage
export const packages: readonly string[] = [
  'amsmath', 'amssymb', 'amsfonts', 'amsthm', 'mathtools',
  'graphicx', 'xcolor', 'hyperref', 'url',
  'geometry', 'fancyhdr', 'lastpage',
  'booktabs', 'tabularx', 'longtable', 'multirow',
  'tikz', 'pgfplots', 'pgf',
  'babel', 'inputenc', 'fontenc',
  'natbib', 'biblatex', 'cite',
  'algorithm', 'algorithmic', 'listings', 'minted',
  'enumitem', 'cleveref', 'microtype'
];

// Create environment completion with auto-closing and proper indentation
function createEnvironmentCompletion(envName: string, autoCloseEnabled: boolean): Completion {
  return {
    label: envName,
    type: "class",
    apply: (view, completion, from, to) => {
      // Check if we're completing inside \begin{} or \end{}
      const line = view.state.doc.lineAt(from);
      const beforeCursor = view.state.sliceDoc(line.from, from);

      if (/\\begin\{[^}]*$/.test(beforeCursor)) {
        // We're inside \begin{}, add closing brace
        const lineText = line.text;
        const indentMatch = lineText.match(/^(\s*)/);
        const currentIndentation = indentMatch ? indentMatch[1] : '';
        const innerIndentation = currentIndentation + "  ";

        let insertContent = `${envName}}`;
        let selectionAnchorOffset = 1; // For the closing '}'

        if (autoCloseEnabled) { // ONLY insert \n...\end{} if autoCloseEnabled is true
          insertContent += `\n${innerIndentation}\n${currentIndentation}\\end{${envName}}`;
          selectionAnchorOffset += innerIndentation.length + 1; // Adjust for the newlines and indentation
        }

        view.dispatch({
          changes: { from, to, insert: insertContent },
          selection: { anchor: from + envName.length + selectionAnchorOffset } // Position inside environment or after closing brace
        });

      } else if (/\\end\{[^}]*$/.test(beforeCursor)) {
        // We're inside \end{}, just add the name and closing brace
        view.dispatch({
          changes: { from, to, insert: `${envName}}` },
          selection: { anchor: from + envName.length + 1 }
        });
      } else {
        // Default behavior: just insert the environment name
        view.dispatch({
          changes: { from, to, insert: envName },
          selection: { anchor: from + envName.length }
        });
      }
    },
    boost: 1
  };
}

// Create command completion with environment auto-closing
function createCommandCompletion(cmd: string, autoCloseEnabled: boolean): Completion {
  if (cmd.startsWith('\\begin{')) {
    const envMatch = cmd.match(/\\begin\{([^}]+)\}/);
    if (envMatch) {
      const envName = envMatch[1];
      return {
        label: cmd,
        type: "function",
        apply: (view, completion, from, to) => {
          // Get current line indentation
          const line = view.state.doc.lineAt(from);
          const lineText = line.text;
          const indentMatch = lineText.match(/^(\s*)/);
          const currentIndentation = indentMatch ? indentMatch[1] : '';
          const innerIndentation = currentIndentation + "  ";

          let content = `\\begin{${envName}}`;
          let selectionAnchorOffset = cmd.length;

          if (autoCloseEnabled) { // ONLY insert \n...\end{} if autoCloseEnabled is true
            content += `\n${innerIndentation}\n${currentIndentation}\\end{${envName}}`;
            selectionAnchorOffset += 1 + innerIndentation.length; // Adjust for newlines and indentation
          }

          view.dispatch({
            changes: { from, to, insert: content },
            selection: { anchor: from + selectionAnchorOffset } // Position inside environment or after begin tag
          });
        },
        boost: 1
      };
    }
  }

  return {
    label: cmd,
    type: "function",
    apply: cmd,
    boost: 1
  };
}

// Define and export snippets for LaTeX
export const snippets: readonly Completion[] = [
  {
    label: "\\begin{...}",
    type: "keyword",
    detail: "LaTeX environment",
    info: "Create a LaTeX environment",
    apply: (view, completion, from, to) => {
      view.dispatch({
        changes: { from, to, insert: "\\begin{}" },
        selection: { anchor: from + 7 }
      });
    },
  },
  {
    label: "\\section{...}",
    type: "keyword",
    detail: "LaTeX section",
    info: "Create a section",
    apply: "\\section{}",
  },
  {
    label: "\\subsection{...}",
    type: "keyword",
    detail: "LaTeX subsection",
    info: "Create a subsection",
    apply: "\\subsection{}",
  },
  {
    label: "\\begin{figure}",
    type: "keyword",
    detail: "LaTeX figure environment",
    info: "Create a figure environment",
    apply: (view, completion, from, to) => {
      // Get current line indentation
      const line = view.state.doc.lineAt(from);
      const lineText = line.text;
      const indentMatch = lineText.match(/^(\s*)/);
      const currentIndentation = indentMatch ? indentMatch[1] : '';
      const innerIndentation = currentIndentation + "  ";

      const content = `\\begin{figure}[htbp]\n${innerIndentation}\\centering\n${innerIndentation}\\includegraphics[width=0.8\\textwidth]{}\n${innerIndentation}\\caption{}\n${innerIndentation}\\label{fig:}\n${currentIndentation}\\end{figure}`;
      view.dispatch({
        changes: { from, to, insert: content },
        selection: { anchor: from + content.indexOf("{}") }
      });
    },
  },
  {
    label: "\\begin{table}",
    type: "keyword",
    detail: "LaTeX table environment",
    info: "Create a table environment",
    apply: (view, completion, from, to) => {
      // Get current line indentation
      const line = view.state.doc.lineAt(from);
      const lineText = line.text;
      const indentMatch = lineText.match(/^(\s*)/);
      const currentIndentation = indentMatch ? indentMatch[1] : '';
      const innerIndentation = currentIndentation + "  ";
      const tableIndentation = innerIndentation + "  ";

      const content = `\\begin{table}[htbp]\n${innerIndentation}\\centering\n${innerIndentation}\\begin{tabular}{ccc}\n${tableIndentation}header1 & header2 & header3 \\\\\n${tableIndentation}\\hline\n${tableIndentation}data1 & data2 & data3 \\\\\n${innerIndentation}\\end{tabular}\n${innerIndentation}\\caption{}\n${innerIndentation}\\label{tab:}\n${currentIndentation}\\end{table}`;
      view.dispatch({
        changes: { from, to, insert: content },
        selection: { anchor: from + content.indexOf("{}") }
      });
    },
  }
];

// Main completion function that provides autocomplete suggestions based on context
export function latexCompletionSource(autoCloseTagsEnabled: boolean) {
  return function(context: CompletionContext): CompletionResult | null {
    // Broaden the matching pattern for better detection
    if (!context.explicit) {
      const before = context.matchBefore(/\\[a-zA-Z]*$|\\(begin|end)\{[a-zA-Z]*$/);
      if (!before || before.from === before.to) {
        return null;
      }
    }

    // Check if we're in an environment name
    if (isInEnvironmentName(context)) {
      const envMatch = context.matchBefore(/\\(begin|end)\{([a-zA-Z]*)$/);
      if (envMatch) {
        const options = environments.map(env => createEnvironmentCompletion(env, autoCloseTagsEnabled));

        return {
          from: envMatch.from + envMatch.text.lastIndexOf('{') + 1,
          options,
          validFor: /^[a-zA-Z*]*$/
        };
      }
    }

    // Check if we're in a command name
    if (isInCommandName(context)) {
      const cmdMatch = context.matchBefore(/\\([a-zA-Z]*)$/);
      if (cmdMatch) {
        let options: Completion[] = commands.map(cmd => createCommandCompletion(cmd, autoCloseTagsEnabled));

        // Add math commands if in math mode
        if (isInMathMode(context)) {
          options = [...options, ...mathCommands.map(cmd => createCommandCompletion(cmd, autoCloseTagsEnabled))];
        }

        // Add snippets to the commands
        options = [...options, ...snippets];

        return {
          from: cmdMatch.from,
          options,
          validFor: /^\\?[a-zA-Z]*$/
        };
      }
    }

    // Check if we're after \usepackage{
    const packageMatch = context.matchBefore(/\\usepackage(\[\S*\])?\{([a-zA-Z,]*)$/);
    if (packageMatch) {
      return {
        from: packageMatch.from + packageMatch.text.lastIndexOf('{') + 1,
        options: packages.map(pkg => ({
          label: pkg,
          type: "constant",
          apply: pkg,
          boost: 1
        })),
        validFor: /^[a-zA-Z,]*$/
      };
    }

    return null;
  };
}
