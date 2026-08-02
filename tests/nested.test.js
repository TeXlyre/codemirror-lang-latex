import { EditorState } from '@codemirror/state';
import { syntaxTree, StreamLanguage } from '@codemirror/language';
import { lua } from '@codemirror/legacy-modes/mode/lua';
import { latex, latexCompletions } from '../dist/index.js';
import { lint, messages } from './helpers.js';

const luaLanguage = StreamLanguage.define(lua);

const doc = `\\documentclass{article}
\\usepackage{luacode}
\\begin{document}
\\begin{luacode}
local t = {1, 2}
tex.print("hi " .. #t)  -- comment
\\end{luacode}
\\begin{verbatim}
local x = 1
\\end{verbatim}
Text with $\\alpha$.
\\end{document}
`;

function nodesIn(state, from, length) {
  const names = [];
  syntaxTree(state).iterate({ from, to: from + length, enter: node => names.push(node.name) });
  return names;
}

describe('nested environment parsing', () => {
  const state = EditorState.create({
    doc,
    extensions: [latex({ nestedEnvironments: { luacode: luaLanguage, 'luacode*': luaLanguage } })]
  });

  it('parses luacode bodies with the nested language', () => {
    const names = nodesIn(state, doc.indexOf('local t'), 40);
    expect(names).toEqual(expect.arrayContaining(['keyword', 'variableName', 'number', 'string']));
    expect(names).not.toContain('VerbatimContent');
  });

  it('leaves other verbatim environments alone', () => {
    expect(nodesIn(state, doc.indexOf('local x = 1'), 11)).toContain('VerbatimContent');
  });

  it('keeps the default parser when no nested languages are configured', () => {
    const plain = EditorState.create({ doc, extensions: [latex()] });
    expect(nodesIn(plain, doc.indexOf('local t'), 40)).toContain('VerbatimContent');
  });

  it('treats luacode as verbatim when linting', () => {
    expect(messages(lint(doc))).toEqual([]);
  });

  it('completes the luacode environments', () => {
    expect(latexCompletions.environments).toContain('luacode');
    expect(latexCompletions.environments).toContain('luacode*');
  });
});
