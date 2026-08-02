import { lint, messages, document } from './helpers.js';

const has = (diagnostics, fragment) =>
  diagnostics.some(diagnostic => diagnostic.message.includes(fragment));

describe('existing checks', () => {
  it('reports a missing document environment', () => {
    const diagnostics = lint(`\\documentclass{article}\n${'\\section{A}\nSome body text that is long enough to be checked.\n'.repeat(3)}`);
    expect(has(diagnostics, 'Missing document environment')).toBe(true);
  });

  it('reports unmatched environments', () => {
    expect(has(lint(document('\\begin{itemize}\n\\item x')), 'Missing \\end{itemize}')).toBe(true);
    expect(has(lint(document('\\end{itemize}')), 'without matching \\begin')).toBe(true);
    expect(has(lint(document('\\begin{itemize}\n\\end{enumerate}')), 'Mismatched')).toBe(true);
  });

  it('reports undefined references and duplicate labels', () => {
    expect(has(lint(document('See \\ref{fig:missing}.')), 'undefined label')).toBe(true);
    expect(has(lint(document('\\label{a}\n\\label{a}')), 'Duplicate label')).toBe(true);
  });

  it('reports unclosed braces', () => {
    expect(has(lint(document('\\textbf{unclosed\n\nnext paragraph')), 'Unclosed')).toBe(true);
  });

  it('accepts a well-formed document', () => {
    expect(messages(lint(document('Hello \\emph{world}.')))).toEqual([]);
  });
});

describe('citations without a bibliography', () => {
  const cited = body => document(`\\cite{key}\n${body}`, '\\usepackage{biblatex}\n');

  it('flags citations when no bibliography exists', () => {
    expect(has(lint(document('\\cite{key}')), 'no \\bibliography')).toBe(true);
  });

  it('accepts classic BibTeX and thebibliography', () => {
    expect(has(lint(document('\\cite{key}\n\\bibliographystyle{plain}\n\\bibliography{refs}')), 'no \\bibliography')).toBe(false);
    expect(has(lint(document('\\cite{key}\n\\begin{thebibliography}{9}\n\\bibitem{key} X\n\\end{thebibliography}')), 'no \\bibliography')).toBe(false);
  });

  it('accepts biblatex and biber workflows', () => {
    for (const body of [
      '\\printbibliography',
      '\\printbibheading',
      '\\printbiblist{shorthand}',
      '\\bibbysection',
      '\\bibbysegment',
      '\\bibbycategory',
      '\\begin{refsection}\n\\end{refsection}',
      '\\begin{refsegment}\n\\end{refsegment}'
    ]) {
      expect(has(lint(cited(body)), 'no \\bibliography')).toBe(false);
    }
  });

  it('accepts \\addbibresource in the preamble', () => {
    const doc = document('\\cite{key}\n\\printbibliography', '\\usepackage[backend=biber]{biblatex}\n\\addbibresource{refs.bib}\n');
    expect(has(lint(doc), 'no \\bibliography')).toBe(false);
  });

  it('accepts bibunits and chapterbib', () => {
    expect(has(lint(document('\\cite{key}\n\\putbib', '\\usepackage{bibunits}\n')), 'no \\bibliography')).toBe(false);
    expect(has(lint(document('\\cite{key}\n\\begin{btUnit}\n\\end{btUnit}', '\\usepackage{bibunits}\n')), 'no \\bibliography')).toBe(false);
  });

  it('ignores a commented-out bibliography directive', () => {
    expect(has(lint(document('\\cite{key}\n% \\printbibliography')), 'no \\bibliography')).toBe(true);
  });

  it('can be disabled', () => {
    expect(has(lint(document('\\cite{key}'), { checkCitesWithoutBibliography: false }), 'no \\bibliography')).toBe(false);
  });
});

describe('math-mode commands', () => {
  it('flags math-only commands used in text', () => {
    const diagnostics = lint(document('Bad: \\frac{1}{2} and \\alpha here.'));
    expect(diagnostics.filter(d => d.message.includes('math mode'))).toHaveLength(2);
  });

  it('accepts math-only commands inside math', () => {
    const doc = document('$\\alpha$, \\(\\beta\\), \\[\\gamma\\]\n\\begin{align}\n  \\delta &= 1\n\\end{align}');
    expect(has(lint(doc), 'math mode')).toBe(false);
  });

  it('accepts text-safe commands outside math', () => {
    expect(has(lint(document('An ellipsis \\ldots{} and \\dots{} here.')), 'math mode')).toBe(false);
  });

  it('ignores macro definition bodies', () => {
    const doc = document('Text.', '\\newcommand{\\R}{\\mathbb{R}}\n\\def\\Z{\\mathbb{Z}}\n\\renewcommand{\\vec}[1]{\\boldsymbol{#1}}\n\\DeclareMathOperator{\\tr}{tr}\n');
    expect(has(lint(doc), 'math mode')).toBe(false);
  });

  it('ignores \\ensuremath arguments', () => {
    expect(has(lint(document('Set \\ensuremath{\\mathbb{R}} here.')), 'math mode')).toBe(false);
  });

  it('ignores comments and verbatim content', () => {
    expect(has(lint(document('% \\alpha in a comment')), 'math mode')).toBe(false);
    expect(has(lint(document('\\begin{verbatim}\n\\alpha\n\\end{verbatim}')), 'math mode')).toBe(false);
    expect(has(lint(document('Inline \\verb|\\alpha| here.')), 'math mode')).toBe(false);
  });

  it('can be disabled', () => {
    expect(has(lint(document('\\alpha'), { checkMathModeCommands: false }), 'math mode')).toBe(false);
  });
});

describe('deprecated constructs', () => {
  it('flags obsolete font commands and \\centerline', () => {
    const diagnostics = lint(document('{\\bf bold} {\\it italic} \\centerline{x}'));
    expect(diagnostics.filter(d => d.message.includes('obsolete')).length).toBeGreaterThanOrEqual(3);
  });

  it('flags the eqnarray environment', () => {
    expect(has(lint(document('\\begin{eqnarray}\na\n\\end{eqnarray}')), 'eqnarray environment is obsolete')).toBe(true);
  });

  it('flags $$ once per display', () => {
    expect(lint(document('$$x$$')).filter(d => d.message.includes('$$'))).toHaveLength(1);
  });

  it('does not flag escaped dollars', () => {
    expect(has(lint(document('Costs \\$5 and \\$10.')), '$$')).toBe(false);
  });

  it('can be disabled', () => {
    expect(has(lint(document('{\\bf x}'), { checkDeprecatedCommands: false }), 'obsolete')).toBe(false);
  });
});

describe('missing packages', () => {
  it('flags a command whose package is not loaded', () => {
    expect(has(lint(document('\\includegraphics{a.png}')), 'usepackage{graphicx}')).toBe(true);
  });

  it('flags an environment whose package is not loaded', () => {
    expect(has(lint(document('\\begin{tikzpicture}\n\\end{tikzpicture}')), 'usepackage{tikz}')).toBe(true);
  });

  it('accepts a loaded package', () => {
    expect(has(lint(document('\\includegraphics{a.png}', '\\usepackage{graphicx}\n')), 'usepackage')).toBe(false);
  });

  it('accepts a package loaded through a comma list', () => {
    expect(has(lint(document('\\includegraphics{a.png}', '\\usepackage{amsmath,graphicx}\n')), 'usepackage')).toBe(false);
  });

  it('resolves packages provided by other packages', () => {
    expect(has(lint(document('$\\dfrac{1}{2}$', '\\usepackage{mathtools}\n')), 'usepackage')).toBe(false);
    expect(has(lint(document('\\begin{axis}\n\\end{axis}', '\\usepackage{pgfplots}\n')), 'usepackage')).toBe(false);
  });

  it('resolves packages provided by the document class', () => {
    const doc = '\\documentclass{beamer}\n\\begin{document}\n\\begin{frame}\n\\includegraphics{a.png}\n\\end{frame}\n\\end{document}\n';
    expect(has(lint(doc), 'usepackage')).toBe(false);
  });

  it('reports each package only once', () => {
    const doc = document('\\includegraphics{a.png}\n\\includegraphics{b.png}\n\\resizebox{1cm}{1cm}{x}');
    expect(lint(doc).filter(d => d.message.includes('graphicx'))).toHaveLength(1);
  });

  it('skips files that pull in other sources', () => {
    expect(has(lint(document('\\includegraphics{a.png}', '\\input{preamble}\n')), 'usepackage')).toBe(false);
  });

  it('skips files without a document class', () => {
    expect(has(lint('\\ProvidesPackage{mypkg}\n\\newcommand{\\x}{\\includegraphics{a.png}}\n'), 'usepackage')).toBe(false);
  });

  it('can be disabled', () => {
    expect(has(lint(document('\\includegraphics{a.png}'), { checkMissingPackages: false }), 'usepackage')).toBe(false);
  });
});

describe('realistic document', () => {
  it('produces no diagnostics', () => {
    const doc = String.raw`\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage{amsmath,amssymb,amsthm}
\usepackage{graphicx}
\usepackage{booktabs}
\usepackage[margin=2cm]{geometry}
\usepackage{tikz}
\newtheorem{theorem}{Theorem}
\DeclareMathOperator{\tr}{tr}
\newcommand{\R}{\ensuremath{\mathbb{R}}}

\begin{document}
\section{Introduction}
Text with \emph{emphasis}, a footnote\footnote{With $\alpha$ inside.}, an ellipsis \ldots{}
and a section symbol \S~3. Verbatim: \verb|$\alpha \bf|.
Inline math $x^2 + y^2 = z^2$ and \(\tr(A) \le \|A\|\) and display:
\[
  \int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}
\]
\begin{align}
  a &= b \\
  c &\ne d \label{eq:one}
\end{align}
See \eqref{eq:one} and Table~\ref{tab:one}.

\begin{theorem}
  For all $\varepsilon > 0$ there is $\delta$ with $\left(\frac{a}{b}\right) \in \R$.
\end{theorem}

\begin{table}[htbp]
  \centering
  \begin{tabular}{lcr}
    \toprule
    A & B & C \\
    \midrule
    1 & 2 & 3 \\
    \bottomrule
  \end{tabular}
  \caption{A table}
  \label{tab:one}
\end{table}

\begin{itemize}
  \item First, with 50\% and \$5 and a\_b.
  \item Second, $\mathcal{O}(n \log n)$.
\end{itemize}

\begin{tikzpicture}
  \draw (0,0) -- (1,1);
\end{tikzpicture}

% A comment with $ and \bf and \alpha
\end{document}
`;
    expect(messages(lint(doc))).toEqual([]);
  });
});
