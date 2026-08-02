// src/latex-data.ts
import { mathSymbols } from './latex-symbols';

export interface LatexCommandInfo {
  name: string;
  template?: string;
  detail?: string;
  package?: string;
  math?: boolean;
}

export interface LatexEnvironmentInfo {
  name: string;
  package?: string;
  math?: boolean;
  mathOnly?: boolean;
}

function plain(names: string[], options: Partial<LatexCommandInfo> = {}): LatexCommandInfo[] {
  return names.map(name => ({ name, ...options }));
}

function withArgs(names: string[], arity: number, options: Partial<LatexCommandInfo> = {}): LatexCommandInfo[] {
  const suffix = '{}'.repeat(arity);
  return names.map(name => ({ name, template: `${name}${suffix}`, ...options }));
}

const structure: LatexCommandInfo[] = [
  ...withArgs(['\\documentclass', '\\usepackage', '\\RequirePackage', '\\title', '\\author',
    '\\date', '\\thanks', '\\bibliography', '\\bibliographystyle', '\\addbibresource',
    '\\input', '\\include', '\\includeonly', '\\index', '\\glossary'], 1),
  ...plain(['\\maketitle', '\\tableofcontents', '\\listoffigures', '\\listoftables',
    '\\appendix', '\\today', '\\printindex', '\\makeindex', '\\and',
    '\\makeatletter', '\\makeatother', '\\protect', '\\relax', '\\expandafter',
    '\\begin', '\\end', '\\item', '\\sloppy', '\\allowbreak']),
  { name: '\\printbibliography', package: 'biblatex' },
  { name: '\\frontmatter' }, { name: '\\mainmatter' }, { name: '\\backmatter' }
];

const sectioning = withArgs([
  '\\part', '\\chapter', '\\section', '\\subsection', '\\subsubsection',
  '\\paragraph', '\\subparagraph'
], 1);

const references: LatexCommandInfo[] = [
  ...withArgs(['\\label', '\\ref', '\\pageref', '\\nameref', '\\autoref',
    '\\cite', '\\nocite', '\\bibitem', '\\url'], 1),
  ...withArgs(['\\eqref'], 1, { package: 'amsmath' }),
  ...withArgs(['\\cref', '\\Cref'], 1, { package: 'cleveref' }),
  ...withArgs(['\\citep', '\\citet', '\\citeauthor', '\\citeyear'], 1, { package: 'natbib' }),
  ...withArgs(['\\href'], 2, { package: 'hyperref' })
];

const textFormatting: LatexCommandInfo[] = [
  ...withArgs(['\\textbf', '\\textit', '\\texttt', '\\textsf', '\\textrm', '\\textsc',
    '\\textmd', '\\textup', '\\textsl', '\\textnormal', '\\emph', '\\underline',
    '\\footnote', '\\footnotetext', '\\marginpar', '\\mbox'], 1),
  ...withArgs(['\\textcolor', '\\colorbox', '\\fcolorbox'], 2, { package: 'xcolor' }),
  ...withArgs(['\\definecolor'], 3, { package: 'xcolor' }),
  ...withArgs(['\\sout', '\\uline'], 1, { package: 'ulem' }),
  ...plain(['\\tiny', '\\scriptsize', '\\footnotesize', '\\small', '\\normalsize',
    '\\large', '\\Large', '\\LARGE', '\\huge', '\\Huge', '\\bfseries', '\\mdseries',
    '\\itshape', '\\upshape', '\\slshape', '\\scshape', '\\ttfamily', '\\sffamily',
    '\\rmfamily', '\\normalfont']),
  ...plain(['\\&', '\\%', '\\$', '\\#', '\\_', '\\{', '\\}', '\\\\', '\\S', '\\P',
    '\\dag', '\\ddag', '\\copyright', '\\pounds', '\\ldots', '\\textbackslash'])
];

const layout: LatexCommandInfo[] = [
  ...withArgs(['\\hspace', '\\vspace', '\\newlength', '\\stepcounter',
    '\\arabic', '\\roman', '\\Roman', '\\alph', '\\Alph', '\\pagestyle',
    '\\thispagestyle', '\\pagenumbering', '\\phantom', '\\hphantom', '\\vphantom',
    '\\makebox', '\\framebox', '\\fbox', '\\raisebox'], 1),
  ...withArgs(['\\setlength', '\\addtolength', '\\settowidth', '\\setcounter',
    '\\addtocounter', '\\parbox', '\\rule', '\\scalebox'], 2),
  ...withArgs(['\\resizebox'], 3, { package: 'graphicx' }),
  ...withArgs(['\\rotatebox'], 2, { package: 'graphicx' }),
  ...plain(['\\centering', '\\raggedright', '\\raggedleft', '\\noindent', '\\indent',
    '\\par', '\\newpage', '\\clearpage', '\\cleardoublepage', '\\pagebreak',
    '\\linebreak', '\\newline', '\\quad', '\\qquad', '\\hfill', '\\vfill',
    '\\smallskip', '\\medskip', '\\bigskip', '\\hrulefill', '\\dotfill',
    '\\,', '\\;', '\\:', '\\!'])
];

const graphics: LatexCommandInfo[] = [
  { name: '\\includegraphics', template: '\\includegraphics[]{}', package: 'graphicx' },
  { name: '\\graphicspath', template: '\\graphicspath{}', package: 'graphicx' },
  ...withArgs(['\\caption'], 1),
  ...withArgs(['\\captionof'], 2, { package: 'caption' }),
  ...withArgs(['\\todo'], 1, { package: 'todonotes' })
];

const tables: LatexCommandInfo[] = [
  ...plain(['\\hline', '\\item']),
  ...withArgs(['\\cline'], 1),
  ...withArgs(['\\multicolumn'], 3),
  ...withArgs(['\\multirow'], 3, { package: 'multirow' }),
  ...withArgs(['\\newcolumntype'], 2, { package: 'array' }),
  ...plain(['\\toprule', '\\midrule', '\\bottomrule'], { package: 'booktabs' }),
  ...withArgs(['\\cmidrule'], 1, { package: 'booktabs' })
];

const definitions: LatexCommandInfo[] = [
  ...withArgs(['\\newcommand', '\\renewcommand', '\\providecommand',
    '\\DeclareRobustCommand'], 2),
  ...withArgs(['\\newenvironment', '\\renewenvironment'], 3),
  ...withArgs(['\\newtheorem'], 2),
  ...withArgs(['\\theoremstyle'], 1, { package: 'amsthm' }),
  ...plain(['\\def', '\\let', '\\verb'])
];

const mathStructures: LatexCommandInfo[] = [
  ...withArgs(['\\frac'], 2, { math: true }),
  ...withArgs(['\\sqrt'], 1, { math: true }),
  ...withArgs(['\\ensuremath'], 1),
  ...withArgs(['\\dfrac', '\\tfrac', '\\cfrac', '\\binom', '\\dbinom', '\\tbinom'], 2,
    { math: true, package: 'amsmath' }),
  ...withArgs(['\\text', '\\substack', '\\operatorname'], 1, { math: true, package: 'amsmath' }),
  ...withArgs(['\\DeclareMathOperator'], 2, { package: 'amsmath' }),
  ...withArgs(['\\hat', '\\tilde', '\\bar', '\\vec', '\\dot', '\\ddot', '\\acute',
    '\\grave', '\\check', '\\breve', '\\mathring', '\\overline',
    '\\overrightarrow', '\\overleftarrow', '\\overbrace', '\\underbrace', '\\not'], 1,
    { math: true }),
  ...withArgs(['\\widehat', '\\widetilde'], 1, { math: true }),
  ...withArgs(['\\overset', '\\underset', '\\stackrel'], 2, { math: true }),
  ...withArgs(['\\boxed'], 1, { math: true, package: 'amsmath' }),
  ...withArgs(['\\cancel'], 1, { math: true, package: 'cancel' }),
  ...withArgs(['\\bm'], 1, { math: true, package: 'bm' }),
  ...withArgs(['\\mathbf', '\\mathrm', '\\mathit', '\\mathsf', '\\mathtt',
    '\\mathcal', '\\boldsymbol'], 1, { math: true }),
  ...withArgs(['\\mathbb', '\\mathfrak'], 1, { math: true, package: 'amssymb' }),
  ...withArgs(['\\mathscr'], 1, { math: true, package: 'mathrsfs' }),
  ...plain(['\\left', '\\right', '\\middle', '\\big', '\\Big', '\\bigg', '\\Bigg',
    '\\bigl', '\\bigr', '\\Bigl', '\\Bigr', '\\biggl', '\\biggr', '\\Biggl', '\\Biggr',
    '\\displaystyle', '\\textstyle', '\\scriptstyle', '\\limits', '\\nolimits',
    '\\nonumber', '\\mathop', '\\lcm', '\\colon'], { math: true }),
  ...plain(['\\notag', '\\intertext', '\\allowdisplaybreaks'], { math: true, package: 'amsmath' }),
  ...withArgs(['\\tag'], 1, { math: true, package: 'amsmath' }),
  ...plain(['\\qedhere'], { package: 'amsthm' }),
  { name: '\\mathbb{R}', detail: 'ℝ', math: true, package: 'amssymb' },
  { name: '\\mathbb{Z}', detail: 'ℤ', math: true, package: 'amssymb' },
  { name: '\\mathbb{N}', detail: 'ℕ', math: true, package: 'amssymb' },
  { name: '\\mathbb{Q}', detail: 'ℚ', math: true, package: 'amssymb' },
  { name: '\\mathbb{C}', detail: 'ℂ', math: true, package: 'amssymb' }
];

const mathEnvironmentShortcuts = plain([
  '\\begin{equation}', '\\begin{align}', '\\begin{align*}', '\\begin{gather}',
  '\\begin{array}', '\\begin{cases}', '\\begin{matrix}', '\\begin{pmatrix}',
  '\\begin{bmatrix}', '\\begin{vmatrix}'
], { math: true });

const packageSpecific: LatexCommandInfo[] = [
  ...withArgs(['\\si', '\\num', '\\sisetup'], 1, { package: 'siunitx' }),
  ...withArgs(['\\SI'], 2, { package: 'siunitx' }),
  ...withArgs(['\\ce'], 1, { package: 'mhchem' }),
  ...withArgs(['\\lstinputlisting', '\\lstset'], 1, { package: 'listings' }),
  ...withArgs(['\\inputminted'], 2, { package: 'minted' }),
  ...withArgs(['\\pgfplotsset', '\\addplot'], 1, { package: 'pgfplots' }),
  ...withArgs(['\\tikz'], 1, { package: 'tikz' }),
  ...plain(['\\draw', '\\node', '\\foreach', '\\path', '\\fill', '\\clip'], { package: 'tikz' })
];

export const latexCommands: readonly LatexCommandInfo[] = [
  ...structure,
  ...sectioning,
  ...references,
  ...textFormatting,
  ...layout,
  ...graphics,
  ...tables,
  ...definitions,
  ...mathStructures,
  ...mathEnvironmentShortcuts,
  ...packageSpecific
];

export const latexEnvironments: readonly LatexEnvironmentInfo[] = [
  { name: 'document' }, { name: 'abstract' }, { name: 'titlepage' },
  { name: 'appendix' }, { name: 'frontmatter' }, { name: 'mainmatter' }, { name: 'backmatter' },

  { name: 'figure' }, { name: 'figure*' }, { name: 'table' }, { name: 'table*' },
  { name: 'wrapfigure', package: 'wrapfig' }, { name: 'subfigure', package: 'subcaption' },
  { name: 'sidewaysfigure', package: 'rotating' }, { name: 'sidewaystable', package: 'rotating' },

  { name: 'center' }, { name: 'flushleft' }, { name: 'flushright' },
  { name: 'quote' }, { name: 'quotation' }, { name: 'verse' },
  { name: 'displayquote', package: 'csquotes' }, { name: 'landscape', package: 'pdflscape' },
  { name: 'multicols', package: 'multicol' },

  { name: 'itemize' }, { name: 'enumerate' }, { name: 'description' }, { name: 'list' },

  { name: 'verbatim' }, { name: 'verbatim*' }, { name: 'comment', package: 'verbatim' },
  { name: 'Verbatim', package: 'fancyvrb' }, { name: 'alltt', package: 'alltt' },
  { name: 'lstlisting', package: 'listings' }, { name: 'minted', package: 'minted' },
  { name: 'luacode', package: 'luacode' }, { name: 'luacode*', package: 'luacode' },

  { name: 'math', math: true }, { name: 'displaymath', math: true },
  { name: 'equation', math: true }, { name: 'equation*', math: true },
  { name: 'eqnarray', math: true }, { name: 'eqnarray*', math: true },
  { name: 'align', math: true, package: 'amsmath' },
  { name: 'align*', math: true, package: 'amsmath' },
  { name: 'gather', math: true, package: 'amsmath' },
  { name: 'gather*', math: true, package: 'amsmath' },
  { name: 'multline', math: true, package: 'amsmath' },
  { name: 'multline*', math: true, package: 'amsmath' },
  { name: 'flalign', math: true, package: 'amsmath' },
  { name: 'flalign*', math: true, package: 'amsmath' },
  { name: 'alignat', math: true, package: 'amsmath' },
  { name: 'alignat*', math: true, package: 'amsmath' },
  { name: 'subequations', package: 'amsmath' },
  { name: 'array', math: true, mathOnly: true },
  { name: 'cases', math: true, mathOnly: true, package: 'amsmath' },
  { name: 'split', math: true, mathOnly: true, package: 'amsmath' },
  { name: 'matrix', math: true, mathOnly: true, package: 'amsmath' },
  { name: 'pmatrix', math: true, mathOnly: true, package: 'amsmath' },
  { name: 'bmatrix', math: true, mathOnly: true, package: 'amsmath' },
  { name: 'Bmatrix', math: true, mathOnly: true, package: 'amsmath' },
  { name: 'vmatrix', math: true, mathOnly: true, package: 'amsmath' },
  { name: 'Vmatrix', math: true, mathOnly: true, package: 'amsmath' },
  { name: 'smallmatrix', math: true, mathOnly: true, package: 'amsmath' },

  { name: 'tabular' }, { name: 'tabular*' }, { name: 'tabbing' },
  { name: 'tabularx', package: 'tabularx' }, { name: 'longtable', package: 'longtable' },
  { name: 'xltabular', package: 'xltabular' }, { name: 'threeparttable', package: 'threeparttable' },

  { name: 'theorem' }, { name: 'lemma' }, { name: 'corollary' }, { name: 'proposition' },
  { name: 'definition' }, { name: 'example' }, { name: 'remark' }, { name: 'claim' },
  { name: 'conjecture' }, { name: 'exercise' }, { name: 'problem' }, { name: 'solution' },
  { name: 'proof', package: 'amsthm' },

  { name: 'algorithm', package: 'algorithm' },
  { name: 'algorithmic', package: 'algorithmicx' },
  { name: 'thebibliography' }, { name: 'filecontents' },

  { name: 'tikzpicture', package: 'tikz' }, { name: 'scope', package: 'tikz' },
  { name: 'axis', package: 'pgfplots' }, { name: 'tikzcd', package: 'tikz-cd' },

  { name: 'minipage' }, { name: 'framed', package: 'framed' },
  { name: 'mdframed', package: 'mdframed' }, { name: 'tcolorbox', package: 'tcolorbox' },

  { name: 'frame', package: 'beamer' }, { name: 'columns', package: 'beamer' },
  { name: 'column', package: 'beamer' }, { name: 'block', package: 'beamer' }
];

export const latexPackages: readonly string[] = [
  'amsmath', 'amssymb', 'amsfonts', 'amsthm', 'mathtools', 'bm', 'physics', 'cancel',
  'graphicx', 'xcolor', 'hyperref', 'url', 'float', 'wrapfig', 'caption', 'subcaption',
  'geometry', 'fancyhdr', 'lastpage', 'setspace', 'parskip', 'titlesec', 'titletoc',
  'booktabs', 'tabularx', 'longtable', 'multirow', 'multicol', 'array', 'makecell',
  'colortbl', 'threeparttable',
  'tikz', 'pgfplots', 'pgf', 'tikz-cd', 'standalone', 'circuitikz',
  'babel', 'polyglossia', 'inputenc', 'fontenc', 'fontspec', 'csquotes', 'microtype',
  'natbib', 'biblatex', 'cite', 'glossaries', 'nomencl', 'acronym',
  'algorithm', 'algorithmicx', 'algpseudocode', 'algorithm2e', 'listings', 'minted',
  'enumitem', 'cleveref', 'siunitx', 'mhchem', 'chemfig', 'todonotes', 'lipsum',
  'etoolbox', 'xparse', 'ifthen', 'calc', 'adjustbox', 'rotating', 'pdfpages',
  'tcolorbox', 'mdframed', 'framed', 'ulem', 'soul', 'verbatim', 'fancyvrb',
  'placeins', 'subfiles', 'import', 'xspace', 'mathrsfs', 'stmaryrd', 'luacode'
];

export const documentClasses: readonly string[] = [
  'article', 'report', 'book', 'letter', 'beamer', 'memoir', 'standalone', 'exam',
  'scrartcl', 'scrreprt', 'scrbook', 'extarticle', 'extreport', 'extbook',
  'amsart', 'amsbook', 'IEEEtran', 'acmart', 'revtex4-2', 'moderncv', 'tufte-handout'
];

export const documentClassOptions: readonly string[] = [
  '10pt', '11pt', '12pt', 'a4paper', 'letterpaper', 'a5paper', 'legalpaper',
  'onecolumn', 'twocolumn', 'oneside', 'twoside', 'landscape', 'portrait',
  'draft', 'final', 'titlepage', 'notitlepage', 'openright', 'openany', 'fleqn', 'leqno'
];

export const packageOptions: Readonly<Record<string, readonly string[]>> = {
  geometry: ['margin=', 'top=', 'bottom=', 'left=', 'right=', 'a4paper', 'letterpaper',
    'landscape', 'includefoot', 'includehead'],
  hyperref: ['colorlinks', 'hidelinks', 'linkcolor=', 'citecolor=', 'urlcolor=',
    'breaklinks', 'pdfauthor=', 'pdftitle='],
  babel: ['english', 'american', 'british', 'german', 'ngerman', 'french', 'spanish',
    'italian', 'portuguese', 'russian'],
  inputenc: ['utf8', 'latin1', 'ascii'],
  fontenc: ['T1', 'T2A', 'OT1', 'LGR'],
  xcolor: ['dvipsnames', 'svgnames', 'x11names', 'table'],
  graphicx: ['draft', 'final', 'pdftex', 'dvips'],
  caption: ['font=', 'labelfont=', 'textfont=', 'justification=', 'skip='],
  enumitem: ['inline', 'shortlabels'],
  todonotes: ['disable', 'colorinlistoftodos', 'textsize='],
  siunitx: ['per-mode=', 'output-decimal-marker=', 'group-separator='],
  listings: ['savemem'],
  natbib: ['numbers', 'authoryear', 'square', 'round', 'super', 'sort&compress'],
  biblatex: ['backend=biber', 'style=', 'sorting=', 'natbib']
};

export const tabularColumnSpecs: ReadonlyArray<{ label: string; detail: string; template?: string }> = [
  { label: 'l', detail: 'left aligned' },
  { label: 'c', detail: 'centered' },
  { label: 'r', detail: 'right aligned' },
  { label: 'p', detail: 'fixed width, top aligned', template: 'p{}' },
  { label: 'm', detail: 'fixed width, vertically centered (array)', template: 'm{}' },
  { label: 'b', detail: 'fixed width, bottom aligned (array)', template: 'b{}' },
  { label: 'X', detail: 'stretching column (tabularx)' },
  { label: '|', detail: 'vertical rule' },
  { label: '@', detail: 'inter-column material', template: '@{}' },
  { label: '!', detail: 'rule material (array)', template: '!{}' },
  { label: '>', detail: 'prepend to column entries (array)', template: '>{}' },
  { label: '<', detail: 'append to column entries (array)', template: '<{}' },
  { label: '*', detail: 'repeat a column pattern', template: '*{}{}' }
];

export const includegraphicsKeys: ReadonlyArray<{ label: string; detail: string }> = [
  { label: 'width=', detail: 'target width' },
  { label: 'height=', detail: 'target height' },
  { label: 'scale=', detail: 'scale factor' },
  { label: 'angle=', detail: 'rotation in degrees' },
  { label: 'trim=', detail: 'left bottom right top' },
  { label: 'clip', detail: 'clip to the trimmed area' },
  { label: 'keepaspectratio', detail: 'preserve aspect ratio' },
  { label: 'page=', detail: 'page of a multi-page PDF' },
  { label: 'draft', detail: 'draw a placeholder box' }
];

export const deprecatedCommands: Readonly<Record<string, string>> = {
  '\\bf': '\\textbf{...} or \\bfseries',
  '\\it': '\\textit{...} or \\itshape',
  '\\rm': '\\textrm{...} or \\rmfamily',
  '\\sf': '\\textsf{...} or \\sffamily',
  '\\tt': '\\texttt{...} or \\ttfamily',
  '\\sc': '\\textsc{...} or \\scshape',
  '\\sl': '\\textsl{...} or \\slshape',
  '\\centerline': 'the center environment',
  '\\over': '\\frac{...}{...}',
  '\\atop': '\\substack or \\genfrac',
  '\\choose': '\\binom{...}{...}',
  '\\epsfig': '\\includegraphics',
  '\\psfig': '\\includegraphics',
  '\\subfigure': 'the subcaption package'
};

export const deprecatedEnvironments: Readonly<Record<string, string>> = {
  eqnarray: 'the align environment from amsmath',
  'eqnarray*': 'the align* environment from amsmath'
};

const PACKAGE_PROVIDERS: Readonly<Record<string, readonly string[]>> = {
  mathtools: ['amsmath'],
  amssymb: ['amsfonts'],
  amsthm: ['amsmath'],
  pgfplots: ['tikz', 'pgf', 'graphicx'],
  tikz: ['pgf', 'graphicx'],
  'tikz-cd': ['tikz'],
  circuitikz: ['tikz'],
  tabularx: ['array'],
  xltabular: ['tabularx', 'longtable'],
  algpseudocode: ['algorithmicx'],
  algorithm2e: ['algorithm'],
  physics: ['amsmath'],
  subcaption: ['caption'],
  tcolorbox: ['xcolor']
};

const CLASS_PROVIDERS: Readonly<Record<string, readonly string[]>> = {
  beamer: ['graphicx', 'xcolor', 'amsmath', 'amssymb', 'hyperref'],
  amsart: ['amsmath', 'amsthm'],
  amsbook: ['amsmath', 'amsthm'],
  acmart: ['amsmath', 'amssymb', 'graphicx', 'xcolor', 'hyperref', 'booktabs'],
  IEEEtran: ['amsmath'],
  memoir: ['graphicx']
};

export function expandProvidedPackages(loaded: Iterable<string>, documentClass?: string): Set<string> {
  const provided = new Set<string>();
  const visit = (name: string) => {
    if (provided.has(name)) return;
    provided.add(name);
    for (const dependency of PACKAGE_PROVIDERS[name] ?? []) visit(dependency);
  };
  for (const name of loaded) visit(name);
  if (documentClass) {
    visit(documentClass);
    for (const name of CLASS_PROVIDERS[documentClass] ?? []) visit(name);
  }
  return provided;
}

export const commandIndex: ReadonlyMap<string, LatexCommandInfo> = new Map<string, LatexCommandInfo>([
  ...mathSymbols.map(symbol => [
    symbol.name,
    { name: symbol.name, detail: symbol.glyph, package: symbol.package, math: true }
  ] as [string, LatexCommandInfo]),
  ...latexCommands.map(command => [command.name, command] as [string, LatexCommandInfo])
]);

export const environmentIndex: ReadonlyMap<string, LatexEnvironmentInfo> = new Map(
  latexEnvironments.map(environment => [environment.name, environment])
);

export const mathEnvironments: ReadonlySet<string> = new Set(
  latexEnvironments.filter(environment => environment.math).map(environment => environment.name.replace(/\*$/, ''))
);

export const verbatimEnvironments: ReadonlySet<string> = new Set([
  'verbatim', 'Verbatim', 'boxedverbatim', 'lstlisting', 'minted', 'tcblisting',
  'codeexample', 'comment', 'alltt', 'filecontents', 'luacode'
]);

const TEXT_SAFE_COMMANDS = new Set(['\\ldots', '\\dots', '\\dotsc']);

export const mathOnlyCommands: ReadonlySet<string> = new Set(
  [...commandIndex.values()]
    .filter(command => command.math && !TEXT_SAFE_COMMANDS.has(command.name))
    .map(command => command.name)
);

export const requiredPackages: ReadonlyMap<string, string> = new Map([
  ...[...commandIndex.values()]
    .filter(command => command.package)
    .map(command => [command.name, command.package!] as [string, string]),
  ...latexEnvironments
    .filter(environment => environment.package)
    .map(environment => [`env:${environment.name}`, environment.package!] as [string, string])
]);
