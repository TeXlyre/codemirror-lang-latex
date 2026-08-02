// src/linter.ts
import { Diagnostic } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';
import { EditorState, Text } from '@codemirror/state';
import { syntaxTree, ensureSyntaxTree } from '@codemirror/language';
import { Tree, SyntaxNode } from '@lezer/common';
import { isInMathRange, scanLatexModes } from './parser-utils';
import {
  deprecatedCommands,
  deprecatedEnvironments,
  expandProvidedPackages,
  mathOnlyCommands,
  requiredPackages,
} from './latex-data';

export interface LatexLinterOptions {
  checkMissingDocumentEnv?: boolean;
  checkUnmatchedEnvironments?: boolean;
  checkMissingReferences?: boolean;
  checkUnclosedBraces?: boolean;
  checkDuplicateLabels?: boolean;
  checkCitesWithoutBibliography?: boolean;
  checkMathModeCommands?: boolean;
  checkDeprecatedCommands?: boolean;
  checkMissingPackages?: boolean;
  fileName?: string;
}

const DEFAULTS: Required<Omit<LatexLinterOptions, 'fileName'>> & { fileName: string } = {
  checkMissingDocumentEnv: true,
  checkUnmatchedEnvironments: true,
  checkMissingReferences: true,
  checkUnclosedBraces: true,
  checkDuplicateLabels: true,
  checkCitesWithoutBibliography: true,
  checkMathModeCommands: true,
  checkDeprecatedCommands: true,
  checkMissingPackages: true,
  fileName: '',
};

const PARSE_BUDGET_MS = 500;

// Performs basic syntax checking and best practices validation
export function latexLinter(options: LatexLinterOptions = {}) {
  const opts = { ...DEFAULTS, ...options };

  return (view: EditorView): Diagnostic[] => {
    const diagnostics: Diagnostic[] = [];
    const doc = view.state.doc;
    const tree = ensureSyntaxTree(view.state, doc.length, PARSE_BUDGET_MS) ?? syntaxTree(view.state);
    const treeComplete = tree.length >= doc.length;

    if (opts.checkMissingDocumentEnv && treeComplete && !isPackageOrClassFile(opts.fileName, doc)) {
      checkDocumentEnv(tree, doc, diagnostics);
    }
    if (opts.checkUnmatchedEnvironments && treeComplete) {
      checkEnvironments(tree, doc, diagnostics);
    }
    if (opts.checkMissingReferences || opts.checkDuplicateLabels || opts.checkCitesWithoutBibliography) {
      checkReferences(tree, doc, diagnostics, {
        missingRefs: opts.checkMissingReferences && treeComplete,
        duplicateLabels: opts.checkDuplicateLabels,
        citesWithoutBib: opts.checkCitesWithoutBibliography && treeComplete,
      });
    }
    if (opts.checkUnclosedBraces) {
      checkBraces(view.state, diagnostics);
    }
    if (opts.checkMathModeCommands || opts.checkDeprecatedCommands || opts.checkMissingPackages) {
      checkUsage(tree, doc, diagnostics, {
        mathMode: opts.checkMathModeCommands,
        deprecated: opts.checkDeprecatedCommands,
        missingPackages: opts.checkMissingPackages && treeComplete,
      });
    }

    return diagnostics;
  };
}

// Warns when a non-trivial document is missing \begin{document}
function checkDocumentEnv(tree: Tree, doc: Text, diagnostics: Diagnostic[]): void {
  let hasDocumentBegin = false;

  tree.cursor().iterate(node => {
    if (hasDocumentBegin) return false;
    if (node.name === 'DocumentEnvironment' || node.name === 'DocumentEnvName') {
      hasDocumentBegin = true;
      return false;
    }
    if (node.name === 'BeginEnv') {
      const text = doc.sliceString(node.from, Math.min(node.to, node.from + 30));
      if (/^\\begin\s*\{document\}/.test(text)) {
        hasDocumentBegin = true;
        return false;
      }
    }
  });

  if (!hasDocumentBegin && doc.length > 100) {
    diagnostics.push({
      from: 0,
      to: Math.min(doc.length, 200),
      severity: 'warning',
      message: 'Missing document environment. LaTeX documents should be enclosed in \\begin{document}...\\end{document}',
      source: 'LaTeX',
    });
  }
}

// Stack-based check for nesting and pairing of \begin/\end environments
function checkEnvironments(tree: Tree, doc: Text, diagnostics: Diagnostic[]): void {
  type Occurrence = { name: string; from: number; to: number; kind: 'begin' | 'end' };
  const occurrences: Occurrence[] = [];
  const reportedEnds = new Set<number>();
  const verbatimRanges: Array<[number, number]> = [];

  tree.cursor().iterate(node => {
    if (node.name === 'BeginEnv' || node.name === 'EndEnv') {
      const nameNode = findEnvName(node.node);
      if (!nameNode) return;
      occurrences.push({
        name: doc.sliceString(nameNode.from, nameNode.to),
        from: node.from,
        to: node.to,
        kind: node.name === 'BeginEnv' ? 'begin' : 'end',
      });
    } else if (node.name === 'VerbatimEnvironment' || node.name === 'VerbCtrlSeq') {
      verbatimRanges.push([node.from, node.to]);
    }
  });

  const stack: Occurrence[] = [];
  const openNames = new Set<string>();

  for (const occ of occurrences) {
    if (occ.kind === 'begin') {
      stack.push(occ);
      openNames.add(occ.name);
      continue;
    }
    const top = stack[stack.length - 1];
    if (top && top.name === occ.name) {
      stack.pop();
      if (!stack.some(s => s.name === top.name)) {
        openNames.delete(top.name);
      }
    } else if (!openNames.has(occ.name)) {
      diagnostics.push({
        from: occ.from,
        to: occ.to,
        severity: 'error',
        message: `\\end{${occ.name}} without matching \\begin{${occ.name}}`,
        source: 'LaTeX',
      });
      reportedEnds.add(occ.from);
    } else {
      diagnostics.push({
        from: occ.from,
        to: occ.to,
        severity: 'error',
        message: top
          ? `Mismatched \\end{${occ.name}} (expected \\end{${top.name}})`
          : `\\end{${occ.name}} without matching \\begin`,
        source: 'LaTeX',
      });
      reportedEnds.add(occ.from);
    }
  }

  for (const unclosed of stack) {
    diagnostics.push({
      from: unclosed.from,
      to: unclosed.to,
      severity: 'error',
      message: `Missing \\end{${unclosed.name}}`,
      source: 'LaTeX',
    });
  }

  scanOrphanEnds(doc, diagnostics, reportedEnds, verbatimRanges);
}

// Regex-based safety net for orphan \end{...} the parser does not surface as EndEnv
function scanOrphanEnds(
  doc: Text,
  diagnostics: Diagnostic[],
  reported: Set<number>,
  ignoredRanges: Array<[number, number]>,
): void {
  const text = maskCommentsAndRanges(doc.toString(), ignoredRanges);
  const beginRe = /\\begin\s*\{([^}]+)\}/g;
  const endRe = /\\end\s*\{([^}]+)\}/g;
  const beginCounts = new Map<string, number>();
  const ends: Array<{ name: string; from: number; to: number }> = [];

  let m: RegExpExecArray | null;
  while ((m = beginRe.exec(text))) {
    const name = m[1].trim();
    beginCounts.set(name, (beginCounts.get(name) ?? 0) + 1);
  }
  while ((m = endRe.exec(text))) {
    ends.push({ name: m[1].trim(), from: m.index, to: m.index + m[0].length });
  }

  const endCounts = new Map<string, number>();
  for (const e of ends) {
    if (reported.has(e.from)) continue;
    const seen = (endCounts.get(e.name) ?? 0) + 1;
    endCounts.set(e.name, seen);
    if (seen > (beginCounts.get(e.name) ?? 0)) {
      diagnostics.push({
        from: e.from,
        to: e.to,
        severity: 'error',
        message: `\\end{${e.name}} without matching \\begin{${e.name}}`,
        source: 'LaTeX',
      });
    }
  }
}

// Replaces comment bodies and ignored ranges with spaces while preserving offsets
function maskCommentsAndRanges(text: string, ranges: Array<[number, number]>): string {
  let result = '';
  let cursor = 0;
  let i = 0;

  while (i < text.length) {
    const ch = text.charCodeAt(i);
    if (ch === 92 && i + 1 < text.length) {
      const verb = /^\\verb\*?([^a-zA-Z0-9\s])/.exec(text.slice(i, i + 16));
      if (verb) {
        const closeIndex = text.indexOf(verb[1], i + verb[0].length);
        const stop = closeIndex === -1 ? text.length : closeIndex + 1;
        result += text.slice(cursor, i);
        result += text.slice(i, stop).replace(/[^\n]/g, ' ');
        cursor = stop;
        i = stop;
        continue;
      }
      i += 2;
      continue;
    }
    if (ch === 37) {
      result += text.slice(cursor, i);
      const lineEnd = text.indexOf('\n', i);
      const stop = lineEnd === -1 ? text.length : lineEnd;
      result += ' '.repeat(stop - i);
      cursor = stop;
      i = stop;
      continue;
    }
    i++;
  }
  result += text.slice(cursor);

  if (ranges.length === 0) return result;

  let masked = result;
  for (const [from, to] of ranges) {
    const safeFrom = Math.max(0, from);
    const safeTo = Math.min(masked.length, to);
    if (safeFrom >= safeTo) continue;
    const segment = masked.slice(safeFrom, safeTo).replace(/[^\n]/g, ' ');
    masked = masked.slice(0, safeFrom) + segment + masked.slice(safeTo);
  }
  return masked;
}

// Validates labels, refs, citations, and bibliography presence
function checkReferences(
  tree: Tree,
  doc: Text,
  diagnostics: Diagnostic[],
  opts: { missingRefs: boolean; duplicateLabels: boolean; citesWithoutBib: boolean },
): void {
  const labels = new Map<string, number[]>();
  const refs: Array<{ name: string; from: number; to: number }> = [];
  const cites: Array<{ from: number; to: number }> = [];
  let hasBibliography = false;
  let hasIncludes = false;

  tree.cursor().iterate(node => {
    if (node.name === 'LabelCtrlSeq') {
      const value = readBracedArgument(node.node, doc);
      if (value !== null) {
        if (!labels.has(value)) labels.set(value, []);
        labels.get(value)!.push(node.from);
      }
    } else if (node.name === 'RefCtrlSeq' || node.name === 'RefStarrableCtrlSeq') {
      const value = readBracedArgument(node.node, doc);
      if (value !== null) {
        refs.push({ name: value, from: node.from, to: node.node.nextSibling?.to ?? node.to });
      }
    } else if (node.name === 'CiteCtrlSeq' || node.name === 'CiteStarrableCtrlSeq') {
      cites.push({ from: node.from, to: node.node.nextSibling?.to ?? node.to });
    } else if (node.name === 'BibliographyCtrlSeq' || node.name === 'BiblatexCtrlSeq') {
      hasBibliography = true;
    } else if (node.name === 'IncludeCtrlSeq' || node.name === 'InputCtrlSeq' || node.name === 'IncludeOnlyCtrlSeq') {
      hasIncludes = true;
    } else if (node.name === 'BeginEnv') {
      const text = doc.sliceString(node.from, node.to);
      if (/\\begin\{thebibliography\}/.test(text)) {
        hasBibliography = true;
      }
    }
  });

  if (!hasBibliography && opts.citesWithoutBib && cites.length > 0) {
    hasBibliography = hasBibliographySource(doc);
  }

  if (opts.missingRefs) {
    for (const ref of refs) {
      if (!labels.has(ref.name)) {
        diagnostics.push({
          from: ref.from,
          to: ref.to,
          severity: hasIncludes ? 'info' : 'warning',
          message: hasIncludes
            ? `Label '${ref.name}' not defined in this file`
            : `Reference to undefined label: ${ref.name}`,
          source: 'LaTeX',
        });
      }
    }
  }

  if (opts.duplicateLabels) {
    for (const [name, positions] of labels) {
      if (positions.length > 1) {
        for (let i = 1; i < positions.length; i++) {
          diagnostics.push({
            from: positions[i],
            to: positions[i] + `\\label{${name}}`.length,
            severity: 'error',
            message: `Duplicate label: ${name}`,
            source: 'LaTeX',
          });
        }
      }
    }
  }

  if (opts.citesWithoutBib && cites.length > 0 && !hasBibliography && !hasIncludes) {
    for (const cite of cites) {
      diagnostics.push({
        from: cite.from,
        to: cite.to,
        severity: 'warning',
        message: '\\cite used but no \\bibliography or thebibliography environment found',
        source: 'LaTeX',
      });
    }
  }
}

// Flags command braces left unclosed across a paragraph break or at EOF
function checkBraces(state: EditorState, diagnostics: Diagnostic[]): void {
  const text = state.doc.toString();
  const tree = syntaxTree(state);

  const verbatimRanges: Array<[number, number]> = [];
  tree.cursor().iterate(node => {
    if (node.name === 'VerbatimEnvironment' || node.name === 'VerbCtrlSeq') {
      verbatimRanges.push([node.from, node.to]);
    }
  });
  const inVerbatim = (pos: number) =>
    verbatimRanges.some(([from, to]) => pos >= from && pos < to);

  type OpenBrace = { pos: number; commandStart: number; commandName: string };
  const stack: OpenBrace[] = [];
  let lastCommand: { start: number; name: string } | null = null;
  let i = 0;

  while (i < text.length) {
    const ch = text[i];

    if (ch === '\\' && i + 1 < text.length) {
      const next = text[i + 1];
      if (next === '\\' || !/[a-zA-Z]/.test(next)) {
        i += 2;
        continue;
      }
      const start = i;
      i++;
      while (i < text.length && /[a-zA-Z]/.test(text[i])) i++;
      if (!inVerbatim(start)) {
        lastCommand = { start, name: text.slice(start, i) };
      }
      continue;
    }

    if (ch === '%' && (i === 0 || text[i - 1] !== '\\')) {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }

    if (inVerbatim(i)) {
      i++;
      continue;
    }

    if (ch === '{') {
      stack.push({
        pos: i,
        commandStart: lastCommand?.start ?? i,
        commandName: lastCommand?.name ?? '',
      });
      lastCommand = null;
    } else if (ch === '}') {
      stack.pop();
      lastCommand = null;
    } else if (ch === '\n' && i + 1 < text.length && text[i + 1] === '\n') {
      while (stack.length > 0) {
        const open = stack.pop()!;
        const label = open.commandName ? `\\${open.commandName}` : 'group';
        diagnostics.push({
          from: open.commandStart,
          to: open.pos + 1,
          severity: 'error',
          message: `Unclosed ${label} — '{' opened here is not closed before paragraph break`,
          source: 'LaTeX',
        });
      }
    } else if (!/\s/.test(ch)) {
      lastCommand = null;
    }

    i++;
  }

  while (stack.length > 0) {
    const open = stack.pop()!;
    const label = open.commandName ? `\\${open.commandName}` : 'group';
    diagnostics.push({
      from: open.commandStart,
      to: open.pos + 1,
      severity: 'error',
      message: `Unclosed ${label} — '{' opened here is never closed`,
      source: 'LaTeX',
    });
  }
}

// Detects .sty/.cls/.dtx/.ltx/.def files by extension or \Provides* declaration
function isPackageOrClassFile(fileName: string, doc: Text): boolean {
  if (/\.(sty|cls|dtx|ltx|def)$/i.test(fileName)) {
    return true;
  }
  if (!fileName) {
    const head = doc.sliceString(0, Math.min(doc.length, 4000));
    return /\\Provides(Package|Class|File|Explicit(Package|Class))\b/.test(head);
  }
  return false;
}

// Returns the EnvName-suffixed child inside an EnvNameGroup
function findEnvName(node: SyntaxNode): SyntaxNode | null {
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.name === 'EnvNameGroup') {
      for (let inner = child.firstChild; inner; inner = inner.nextSibling) {
        if (inner.name.endsWith('EnvName')) {
          return inner;
        }
      }
    }
  }
  return null;
}

// Reads the next braced argument after a command node, skipping optional [..] arguments
function readBracedArgument(node: SyntaxNode, doc: Text): string | null {
  let sibling: SyntaxNode | null = node.nextSibling;
  while (sibling) {
    const name = sibling.name;
    if (name === 'OptionalArgument' || name.startsWith('Optional')) {
      sibling = sibling.nextSibling;
      continue;
    }
    if (name.endsWith('Argument') || name === 'Group' || name === 'TextArgument') {
      const text = doc.sliceString(sibling.from, sibling.to);
      return text.replace(/^\{|\}$/g, '');
    }
    break;
  }
  return null;
}
// Validates math-mode usage, deprecated constructs and package requirements
function checkUsage(
  tree: Tree,
  doc: Text,
  diagnostics: Diagnostic[],
  opts: { mathMode: boolean; deprecated: boolean; missingPackages: boolean },
): void {
  const text = doc.toString();
  const verbatimRanges: Array<[number, number]> = [];
  tree.cursor().iterate(node => {
    if (node.name === 'VerbatimEnvironment' || node.name === 'VerbCtrlSeq') {
      verbatimRanges.push([node.from, node.to]);
    }
  });

  const masked = maskDefinitionBodies(maskCommentsAndRanges(text, verbatimRanges));
  const { mathRanges } = scanLatexModes(text);
  const reportedPackages = new Set<string>();

  const documentClass = /\\documentclass\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/.exec(masked)?.[1].trim();
  const loadedPackages = new Set<string>();
  const packageRe = /\\(?:usepackage|RequirePackage)\s*(?:\[[^\]]*\])?\s*\{([^}]*)\}/g;
  let packageMatch: RegExpExecArray | null;
  while ((packageMatch = packageRe.exec(masked))) {
    for (const name of packageMatch[1].split(',')) {
      const trimmed = name.trim();
      if (trimmed) loadedPackages.add(trimmed);
    }
  }

  const hasIncludes = /\\(?:input|include|subfile|import)\b/.test(masked);
  const checkPackages = opts.missingPackages && !!documentClass && !hasIncludes;
  const provided = checkPackages ? expandProvidedPackages(loadedPackages, documentClass) : new Set<string>();

  const reportMissingPackage = (key: string, label: string, from: number, to: number) => {
    if (!checkPackages) return;
    const required = requiredPackages.get(key);
    if (!required || provided.has(required) || reportedPackages.has(required)) return;
    reportedPackages.add(required);
    diagnostics.push({
      from,
      to,
      severity: 'warning',
      message: `${label} requires \\usepackage{${required}}`,
      source: 'LaTeX',
    });
  };

  const commandRe = /\\[a-zA-Z]+/g;
  let match: RegExpExecArray | null;
  while ((match = commandRe.exec(masked))) {
    const name = match[0];
    const from = match.index;
    const to = from + name.length;

    if (opts.mathMode && mathOnlyCommands.has(name) && !isInMathRange(mathRanges, from)) {
      diagnostics.push({
        from,
        to,
        severity: 'error',
        message: `${name} can only be used in math mode`,
        source: 'LaTeX',
      });
    }

    if (opts.deprecated && deprecatedCommands[name]) {
      diagnostics.push({
        from,
        to,
        severity: 'warning',
        message: `${name} is obsolete; use ${deprecatedCommands[name]}`,
        source: 'LaTeX',
      });
    }

    reportMissingPackage(name, name, from, to);
  }

  const environmentRe = /\\begin\s*\{([^}]*)\}/g;
  while ((match = environmentRe.exec(masked))) {
    const name = match[1].trim();
    const from = match.index;
    const to = from + match[0].length;

    if (opts.deprecated && deprecatedEnvironments[name]) {
      diagnostics.push({
        from,
        to,
        severity: 'warning',
        message: `The ${name} environment is obsolete; use ${deprecatedEnvironments[name]}`,
        source: 'LaTeX',
      });
    }

    reportMissingPackage(`env:${name}`, `The ${name} environment`, from, to);
  }

  if (opts.deprecated) {
    let opening = true;
    for (let i = 0; i < masked.length - 1; i++) {
      if (masked[i] !== '$' || masked[i + 1] !== '$') continue;
      if (opening) {
        diagnostics.push({
          from: i,
          to: i + 2,
          severity: 'warning',
          message: '$$...$$ is obsolete in LaTeX; use \\[...\\] or the equation* environment',
          source: 'LaTeX',
        });
      }
      opening = !opening;
      i++;
    }
  }
}

// Blanks out macro definition bodies and \ensuremath arguments, preserving offsets
function maskDefinitionBodies(text: string): string {
  const chars = text.split('');
  const definitionRe = /\\(?:re)?new(?:command|environment)\*?|\\providecommand\*?|\\DeclareRobustCommand\*?|\\DeclareMathOperator\*?|\\ensuremath|\\def/g;

  const blank = (from: number, to: number) => {
    for (let i = from; i < to; i++) {
      if (chars[i] !== '\n') chars[i] = ' ';
    }
  };

  let match: RegExpExecArray | null;
  while ((match = definitionRe.exec(text))) {
    let i = match.index + match[0].length;
    while (i < text.length) {
      while (i < text.length && /[ \t]/.test(text[i])) i++;
      const ch = text[i];
      if (ch === '[') {
        const end = text.indexOf(']', i);
        if (end === -1) break;
        blank(i, end + 1);
        i = end + 1;
        continue;
      }
      if (ch === '\\' && /[a-zA-Z]/.test(text[i + 1] ?? '')) {
        let j = i + 1;
        while (j < text.length && /[a-zA-Z]/.test(text[j])) j++;
        blank(i, j);
        i = j;
        continue;
      }
      if (ch === '{') {
        const end = matchingBrace(text, i);
        if (end === -1) break;
        blank(i, end + 1);
        i = end + 1;
        continue;
      }
      break;
    }
    definitionRe.lastIndex = Math.max(i, definitionRe.lastIndex);
  }

  return chars.join('');
}

// Index of the brace closing the group that starts at `start`
function matchingBrace(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\\') {
      i++;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

const BIBLIOGRAPHY_SOURCE_RE = /\\(?:addbibresource|addglobalbib|addsectionbib|printbibliography|printbibheading|printbiblist|bibbysection|bibbysegment|bibbycategory|nobibliography|putbib|bibliographyunit|bibliography|begin\s*\{(?:thebibliography|refsection|refsegment|btSect|btUnit)\})/;

// Detects bibliographies declared through BibTeX, biblatex/biber or bibunits
function hasBibliographySource(doc: Text): boolean {
  return BIBLIOGRAPHY_SOURCE_RE.test(maskCommentsAndRanges(doc.toString(), []));
}
