import { EditorView, hoverTooltip, Tooltip } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { SyntaxNode } from '@lezer/common';

interface CommandInfo {
  description: string;
  syntax: string;
  example?: string;
  package?: string;
}

// Dictionary of common LaTeX command information
const commandInfoMap: Record<string, CommandInfo> = {
  '\\documentclass': {
    description: 'Defines the type of document to be created.',
    syntax: '\\documentclass[options]{class}',
    example: '\\documentclass[12pt,a4paper]{article}'
  },
  '\\usepackage': {
    description: 'Loads a LaTeX package.',
    syntax: '\\usepackage[options]{package}',
    example: '\\usepackage{graphicx}'
  },
  '\\begin': {
    description: 'Begins an environment.',
    syntax: '\\begin{environment}',
    example: '\\begin{document}'
  },
  '\\end': {
    description: 'Ends an environment.',
    syntax: '\\end{environment}',
    example: '\\end{document}'
  },
  '\\section': {
    description: 'Creates a section heading.',
    syntax: '\\section[short title]{title}',
    example: '\\section{Introduction}'
  },
  '\\subsection': {
    description: 'Creates a subsection heading.',
    syntax: '\\subsection[short title]{title}',
    example: '\\subsection{Method}'
  },
  '\\subsubsection': {
    description: 'Creates a subsubsection heading.',
    syntax: '\\subsubsection[short title]{title}',
    example: '\\subsubsection{Implementation details}'
  },
  '\\textbf': {
    description: 'Sets text in bold font.',
    syntax: '\\textbf{text}',
    example: '\\textbf{Important note}'
  },
  '\\textit': {
    description: 'Sets text in italic font.',
    syntax: '\\textit{text}',
    example: '\\textit{Emphasized term}'
  },
  '\\emph': {
    description: 'Emphasizes text. Typically renders as italic.',
    syntax: '\\emph{text}',
    example: '\\emph{Important}'
  },
  '\\cite': {
    description: 'Creates a citation.',
    syntax: '\\cite[text]{key}',
    example: '\\cite{smith2020}'
  },
  '\\ref': {
    description: 'Creates a reference to a labeled element.',
    syntax: '\\ref{label}',
    example: '\\ref{fig:sample}'
  },
  '\\label': {
    description: 'Assigns a label to an element for referencing.',
    syntax: '\\label{name}',
    example: '\\label{sec:introduction}'
  },
  '\\includegraphics': {
    description: 'Includes a graphics file.',
    syntax: '\\includegraphics[options]{filename}',
    example: '\\includegraphics[width=0.8\\textwidth]{figure.png}',
    package: 'graphicx'
  },
  '\\frac': {
    description: 'Creates a fraction.',
    syntax: '\\frac{numerator}{denominator}',
    example: '\\frac{a}{b}',
    package: 'amsmath (optional)'
  },
  '\\item': {
    description: 'Defines an item in a list environment.',
    syntax: '\\item[optional label] content',
    example: '\\item First item in list'
  },
  '\\maketitle': {
    description: 'Generates a title based on \\title, \\author, and \\date commands.',
    syntax: '\\maketitle',
    example: '\\maketitle'
  },
  '\\title': {
    description: 'Specifies the document title.',
    syntax: '\\title{title}',
    example: '\\title{My Document}'
  },
  '\\author': {
    description: 'Specifies the document author(s).',
    syntax: '\\author{name}',
    example: '\\author{John Smith}'
  },
  '\\date': {
    description: 'Specifies the document date.',
    syntax: '\\date{date}',
    example: '\\date{\\today}'
  },
  '\\caption': {
    description: 'Adds a caption to a figure or table.',
    syntax: '\\caption{text}',
    example: '\\caption{A sample figure}'
  },
  '\\hline': {
    description: 'Draws a horizontal line in a table.',
    syntax: '\\hline',
    example: '\\hline'
  },
  '\\newcommand': {
    description: 'Defines a new command.',
    syntax: '\\newcommand{\\name}[args][default]{definition}',
    example: '\\newcommand{\\mycommand}[1]{Hello #1!}'
  }
};

// Common LaTeX environments information
const environmentInfoMap: Record<string, CommandInfo> = {
  'document': {
    description: 'The main document environment. All visible content must be inside this environment.',
    syntax: '\\begin{document}...\\end{document}',
    example: '\\begin{document}\nHello, world!\n\\end{document}'
  },
  'figure': {
    description: 'Environment for floating figures.',
    syntax: '\\begin{figure}[placement]...\\end{figure}',
    example: '\\begin{figure}[ht]\n\\centering\n\\includegraphics{image.png}\n\\caption{A figure}\n\\label{fig:example}\n\\end{figure}'
  },
  'table': {
    description: 'Environment for floating tables.',
    syntax: '\\begin{table}[placement]...\\end{table}',
    example: '\\begin{table}[ht]\n\\centering\n\\begin{tabular}{cc}\n...\n\\end{tabular}\n\\caption{A table}\n\\label{tab:example}\n\\end{table}'
  },
  'tabular': {
    description: 'Environment for creating tables.',
    syntax: '\\begin{tabular}{columns}...\\end{tabular}',
    example: '\\begin{tabular}{|l|c|r|}\n\\hline\nLeft & Center & Right \\\\\n\\hline\n\\end{tabular}'
  },
  'itemize': {
    description: 'Environment for bulleted lists.',
    syntax: '\\begin{itemize}...\\end{itemize}',
    example: '\\begin{itemize}\n\\item First item\n\\item Second item\n\\end{itemize}'
  },
  'enumerate': {
    description: 'Environment for numbered lists.',
    syntax: '\\begin{enumerate}...\\end{enumerate}',
    example: '\\begin{enumerate}\n\\item First item\n\\item Second item\n\\end{enumerate}'
  },
  'equation': {
    description: 'Environment for numbered equations.',
    syntax: '\\begin{equation}...\\end{equation}',
    example: '\\begin{equation}\nE = mc^2\n\\end{equation}'
  },
  'equation*': {
    description: 'Environment for unnumbered equations.',
    syntax: '\\begin{equation*}...\\end{equation*}',
    example: '\\begin{equation*}\nE = mc^2\n\\end{equation*}'
  },
  'align': {
    description: 'Environment for aligning multiple equations, with equation numbers.',
    syntax: '\\begin{align}...\\end{align}',
    example: '\\begin{align}\na &= b \\\\\nc &= d\n\\end{align}',
    package: 'amsmath'
  },
  'align*': {
    description: 'Environment for aligning multiple equations, without equation numbers.',
    syntax: '\\begin{align*}...\\end{align*}',
    example: '\\begin{align*}\na &= b \\\\\nc &= d\n\\end{align*}',
    package: 'amsmath'
  },
  'verbatim': {
    description: 'Environment for verbatim text, where LaTeX commands are not processed.',
    syntax: '\\begin{verbatim}...\\end{verbatim}',
    example: '\\begin{verbatim}\nThis is verbatim text.\n\\end{verbatim}'
  },
  'center': {
    description: 'Environment for centering text.',
    syntax: '\\begin{center}...\\end{center}',
    example: '\\begin{center}\nCentered text\n\\end{center}'
  },
  'tikzpicture': {
    description: 'Environment for creating TikZ pictures.',
    syntax: '\\begin{tikzpicture}...\\end{tikzpicture}',
    example: '\\begin{tikzpicture}\n\\draw (0,0) -- (1,1);\n\\end{tikzpicture}',
    package: 'tikz'
  }
};

/**
 * Provides hover tooltips for LaTeX commands and environments
 */
export const latexHoverTooltip = hoverTooltip((view, pos, side) => {
  const tree = syntaxTree(view.state);
  const node = tree.resolve(pos);

  // Check for control sequences
  if (
    node.name === 'CtrlSeq' ||
    node.name.endsWith('CtrlSeq') ||
    node.name === 'Begin' ||
    node.name === 'End'
  ) {
    const cmdText = view.state.sliceDoc(node.from, node.to);
    const info = commandInfoMap[cmdText];

    if (info) {
      return makeTooltip(info, node.from, node.to);
    }
  }

  // Check for environments
  if (node.name === 'EnvName' || node.name.endsWith('EnvName')) {
    const envName = view.state.sliceDoc(node.from, node.to);
    const info = environmentInfoMap[envName];

    if (info) {
      return makeTooltip(info, node.from, node.to);
    }
  }

  // Check if we're in a begin/end environment name
  const parent = node.parent;
  if (parent && (parent.name === 'EnvNameGroup')) {
    const envNameNode = findEnvNameNode(parent);
    if (envNameNode) {
      const envName = view.state.sliceDoc(envNameNode.from, envNameNode.to);
      const info = environmentInfoMap[envName];

      if (info) {
        return makeTooltip(info, envNameNode.from, envNameNode.to);
      }
    }
  }

  return null;
});

// Helper to find environment name node
function findEnvNameNode(node: SyntaxNode): SyntaxNode | null {
  if (!node) return null;

  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (
      child.name === 'EnvName' ||
      child.name === 'DocumentEnvName' ||
      child.name === 'TabularEnvName' ||
      child.name === 'EquationEnvName' ||
      child.name === 'EquationArrayEnvName' ||
      child.name === 'VerbatimEnvName' ||
      child.name === 'TikzPictureEnvName' ||
      child.name === 'FigureEnvName' ||
      child.name === 'ListEnvName' ||
      child.name === 'TableEnvName'
    ) {
      return child;
    }
  }

  return null;
}

// Create the tooltip element
function makeTooltip(info: CommandInfo, from: number, to: number): Tooltip {
  let content = document.createElement('div');
  content.className = 'cm-latex-tooltip';

  // Description
  let description = document.createElement('div');
  description.textContent = info.description;
  description.className = 'cm-latex-tooltip-description';
  content.appendChild(description);

  // Syntax
  let syntax = document.createElement('div');
  syntax.textContent = 'Syntax: ' + info.syntax;
  syntax.className = 'cm-latex-tooltip-syntax';
  content.appendChild(syntax);

  // Example (if provided)
  if (info.example) {
    let example = document.createElement('div');
    example.textContent = 'Example: ' + info.example;
    example.className = 'cm-latex-tooltip-example';
    content.appendChild(example);
  }

  // Package (if required)
  if (info.package) {
    let package_ = document.createElement('div');
    package_.textContent = 'Package: ' + info.package;
    package_.className = 'cm-latex-tooltip-package';
    content.appendChild(package_);
  }

  return {
    pos: from,
    end: to,
    above: true,
    create(view) {
      return { dom: content };
    }
  };
}