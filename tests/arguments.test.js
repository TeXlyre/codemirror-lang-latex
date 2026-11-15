import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { foldable } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { latexLanguage } from '../dist/index.js';
import { docState, document, lint, messages } from './helpers.js';

const raw = String.raw;

function parse(doc) {
  const tree = latexLanguage.parser.parse(doc);
  const errors = [];
  tree.iterate({ enter(node) {
    if (node.type.isError) errors.push([node.from, node.to]);
  } });
  assert.deepEqual(errors, []);
  return tree;
}

function find(tree, name) {
  let result;
  tree.iterate({ enter(node) {
    if (result) return false;
    if (node.name === name) result = node.node;
  } });
  assert.notEqual(result, undefined);
  return result;
}

describe('command arguments', () => {
  for (const [name, definition, count] of [
    ['NewCommand', raw`\newcommand*{\foo}[1]{[#1]}`, 1],
    ['RenewCommand', raw`\renewcommand*{\thesection}{\arabic{section}}`, 1],
    ['NewEnvironment', raw`\newenvironment*{myitems}{\begin{itemize}}{\end{itemize}}`, 2],
    ['RenewEnvironment', raw`\renewenvironment*{quote}{\begin{itemize}}{\end{itemize}}`, 2],
    ['NewCommand', raw`\newcommand* \foo
  [1]
  [default]
  {\textbf{#1}}`, 1],
    ['NewEnvironment', raw`\newenvironment*{myitems}
  {\begin{itemize}}
  {\end{itemize}}`, 2],
  ]) {
    it(`parses ${name} definition without losing its body: ${definition}`, () => {
      const body = name === 'NewEnvironment' ? raw`\begin{myitems}\item x\end{myitems}` : 'Text.';
      const doc = document(body, `${definition}\n`);
      const command = find(parse(doc), name);
      assert.equal(doc.slice(command.from, command.to), definition);
      assert.equal(command.getChildren('DefinitionArgument').length, count);
      if (definition.includes('{\\foo}') || name !== 'NewCommand') {
        assert.notEqual(command.getChild('LiteralArgContent'), null);
      }
      assert.deepEqual(messages(lint(doc)), []);
    });
  }

  for (const [name, source, rest] of [
    ['SetLengthCommand', raw`\setlength\parindent{1em}`, ''],
    ['SetLengthCommand', raw`\setlength\parindent\baselineskip`, ''],
    ['SetLengthCommand', raw`\setlength{\parindent}{1em}`, ''],
    ['TextTeletypeCommand', raw`\texttt\{`, 'x' + raw`\texttt\}`],
    ['TextBoldCommand', raw`\textbf\LaTeX`, ' is useful.'],
    ['TextBoldCommand', raw`\textbf h`, 'ello'],
    ['TextItalicCommand', raw`\textit {hello}`, ' world'],
    ['TextTeletypeCommand', raw`\texttt
  {hello}`, ' world'],
    ['EmphasisCommand', raw`\emph x`, 'yz'],
  ]) {
    it(`parses ${name} with the correct argument boundary: ${source}`, () => {
      const doc = document(source + rest);
      const node = find(parse(doc), name);
      assert.equal(doc.slice(node.from, node.to), source);
      if (source === raw`\texttt\{`) {
        assert.notEqual(node.getChild('CtrlSym'), null);
      }
      if (source === raw`\textbf h`) {
        assert.notEqual(node.getChild('ArgumentChar'), null);
      }
      assert.deepEqual(messages(lint(doc)), []);
    });
  }

  it('uses single-character tokens only at mandatory argument boundaries', () => {
    const doc = document(raw`\textbf hello
\textit{Braced text.}
\texttt *suffix
\texttt [suffix
\texttt =suffix
\texttt 😀suffix
$\underline x + 42$`);
    const tree = parse(doc);
    const characters = [];
    const normal = [];
    tree.iterate({ enter(node) {
      const text = doc.slice(node.from, node.to);
      if (node.name === 'ArgumentChar') characters.push(text);
      if (node.name === 'Normal') normal.push(text);
    } });
    assert.deepEqual(characters, ['h', '*', '[', '=', '😀', 'x']);
    for (const value of ['article', 'ello', 'Braced text.', 'suffix']) assert.ok(normal.includes(value), `Missing value: ${value}`);
    assert.equal(doc.slice(find(tree, 'Number').from, find(tree, 'Number').to), '42');
  });

  it('parses optional arguments separated by spaces, newlines and comments', () => {
    const doc = raw`\documentclass[11pt]
  {article}
\usepackage[utf8]
  {inputenc}
\usepackage[draft] {graphicx}
\usepackage
  {xcolor}
\title[Short] % comment
  {Long title}
\begin{document}
\section[Short]
  {Long title}
\begin{figure}
\includegraphics[width=1cm]
  {image}
\caption[Short]
  {Long caption}
\label
  {anchor}
\end{figure}
\ref
  {anchor}
\footnote[1]
  {A note.}
\parbox[t][2cm][c]
  {3cm}
  {Text.}
\textcolor{red}
  {Text.}
\end{document}`;
    const tree = parse(doc);
    assert.notEqual(find(tree, 'DocumentClass').getChild('DocumentClassArgument'), null);
    assert.notEqual(find(tree, 'UsePackage').getChild('PackageArgument'), null);
    assert.notEqual(find(tree, 'SectioningCommand').getChild('SectioningArgument'), null);
    assert.notEqual(find(tree, 'IncludeGraphics').getChild('IncludeGraphicsArgument'), null);
    assert.deepEqual(messages(lint(doc)), []);
    const diagnostics = messages(lint(document(raw`\ref
  {missing}`)));
    assert.equal(diagnostics.length, 1);
    assert.ok(diagnostics[0].includes('undefined label'));
  });

  it('preserves paragraphs and verbatim content', () => {
    const doc = document(raw`\textbf x

Normal text.
${'  '}
More text.
\verb|{x}[y]|
\begin{verbatim}
\textbf{
\end{verbatim}`);
    const tree = parse(doc);
    const paragraphs = [];
    tree.iterate({ enter(node) {
      if (node.name === 'BlankLine') paragraphs.push(doc.slice(node.from, node.to));
    } });
    assert.deepEqual(paragraphs, ['\n\n', '\n  \n']);
    assert.notEqual(find(tree, 'VerbContent'), undefined);
    assert.notEqual(find(tree, 'VerbatimContent'), undefined);
  });

  it('does not lint commands in multiline macro replacement text as executed code', () => {
    const doc = document('Text.', raw`\newcommand*{\finish}
  {\end{itemize}}
\newcommand*{\R}
  {\mathbb{R}}
`);
    parse(doc);
    assert.deepEqual(messages(lint(doc)), []);
  });
});

describe('multiline folding headers', () => {
  function foldLine(state, number) {
    const line = state.doc.line(number);
    return foldable(state, line.from, line.to);
  }

  it('preserves the complete section heading when folding', () => {
    const doc = document(raw`\section[Short]
  {Long title}
Body text.
\subsection{Child}
Nested text.
\section{Next}
More text.`);
    for (const state of [docState(doc), EditorState.create({ doc, extensions: [latexLanguage] })]) {
      assert.equal(foldLine(state, 3), null);
      assert.deepEqual(foldLine(state, 4), { from: state.doc.line(4).to, to: state.doc.line(8).from - 1 });
    }
  });

  it('preserves a multiline document class when folding the preamble', () => {
    const state = docState(raw`\documentclass[11pt]
  {article}
\usepackage{graphicx}
\begin{document}
Text.
\end{document}`);
    assert.equal(foldLine(state, 1), null);
    assert.deepEqual(foldLine(state, 2), { from: state.doc.line(2).to, to: state.doc.line(4).from - 1 });
  });
});
