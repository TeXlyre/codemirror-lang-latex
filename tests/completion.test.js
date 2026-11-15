import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  latexCompletions, snippets, commandIndex, environmentIndex, mathSymbols, symbolIndex
} from '../dist/index.js';
import { labels, optionFor, applyCompletion } from './helpers.js';

const { commands, mathCommands, environments, packages } = latexCompletions;

describe('exported tables', () => {
  it('keeps the previously exported entries', () => {
    for (const command of ['\\documentclass', '\\section', '\\textbf', '\\frac', '\\alpha', '\\Omega']) {
      assert.ok(commands.includes(command));
    }
    for (const command of ['\\sin', '\\rightarrow', '\\mathbb{R}', '\\begin{pmatrix}', '\\hat']) {
      assert.ok(mathCommands.includes(command));
    }
    for (const environment of ['document', 'itemize', 'equation*', 'pmatrix', 'tikzpicture']) {
      assert.ok(environments.includes(environment));
    }
    assert.ok(packages.includes('amsmath'));
    assert.equal(snippets.length, 5);
  });

  it('adds the missing symbol categories', () => {
    for (const symbol of ['\\otimes', '\\bigcup', '\\Longrightarrow', '\\langle', '\\ddots', '\\nabla', '\\subseteq']) {
      assert.ok(mathCommands.includes(symbol));
    }
  });

  it('gives every symbol a glyph', () => {
    assert.ok(mathSymbols.length > 200);
    for (const symbol of mathSymbols) {
      assert.equal(typeof symbol.glyph, 'string');
      assert.ok(symbol.glyph.length > 0);
    }
    assert.equal(symbolIndex.get('\\alpha').glyph, 'α');
  });

  it('records package requirements and templates', () => {
    assert.equal(commandIndex.get('\\includegraphics').package, 'graphicx');
    assert.equal(commandIndex.get('\\frac').template, '\\frac{}{}');
    assert.equal(commandIndex.get('\\varnothing').package, 'amssymb');
    assert.equal(environmentIndex.get('align').package, 'amsmath');
    assert.equal(environmentIndex.get('pmatrix').mathOnly, true);
  });

  it('does not export environments as commands', () => {
    for (const bogus of ['\\itemize', '\\enumerate', '\\figure']) {
      assert.ok(!commands.includes(bogus));
    }
  });
});

describe('environment completion', () => {
  it('completes environment names after \\begin{', () => {
    assert.ok(labels('\\begin{tikz').includes('tikzpicture'));
  });

  it('hides math-only environments outside math mode', () => {
    assert.ok(!labels('\\begin{cas').includes('cases'));
    assert.ok(labels('$\\begin{cas').includes('cases'));
  });

  it('offers the innermost open environment first after \\end{', () => {
    assert.equal(labels('\\begin{itemize}\n\\item x\n\\end{')[0], 'itemize');
    assert.equal(labels('\\begin{figure}\n\\begin{center}\n\\end{')[0], 'center');
  });

  it('shows the required package as detail', () => {
    assert.equal(optionFor('\\begin{tikz', 'tikzpicture').detail, 'tikz');
  });

  it('inserts a matching \\end when auto-closing', () => {
    const { text } = applyCompletion('\\begin{itemize', 'itemize');
    assert.equal(text, '\\begin{itemize}\n  \n\\end{itemize}');
  });
});

describe('command completion', () => {
  it('completes command names', () => {
    assert.ok(labels('\\fra').includes('\\frac'));
  });

  it('offers symbols only in math mode', () => {
    assert.ok(!labels('\\ot').includes('\\otimes'));
    assert.ok(labels('$\\ot').includes('\\otimes'));
  });

  it('shows glyphs as detail', () => {
    assert.equal(optionFor('$\\alp', '\\alpha').detail, 'α');
  });

  it('places the cursor inside the first argument', () => {
    assert.deepEqual(applyCompletion('\\fra', '\\frac'), { text: '\\frac{}{}', cursor: 6 });
    assert.deepEqual(applyCompletion('\\sec', '\\section'), { text: '\\section{}', cursor: 9 });
  });

  it('leaves argumentless commands untouched', () => {
    assert.deepEqual(applyCompletion('\\hlin', '\\hline'), { text: '\\hline', cursor: 6 });
  });
});

describe('argument completion', () => {
  it('completes document classes', () => {
    assert.ok(labels('\\documentclass{art').includes('article'));
  });

  it('completes document class options', () => {
    assert.ok(labels('\\documentclass[12').includes('12pt'));
  });

  it('completes package names', () => {
    assert.ok(labels('\\usepackage{amsm').includes('amsmath'));
    assert.ok(labels('\\RequirePackage{amsm').includes('amsmath'));
  });

  it('completes options of a known package', () => {
    assert.ok(labels('\\usepackage[mar]{geometry}', 15).includes('margin='));
  });

  it('returns nothing for options of an unknown package', () => {
    assert.equal(labels('\\usepackage[x]{madeuppkg}', 13), null);
  });

  it('completes \\includegraphics keys', () => {
    assert.ok(labels('\\includegraphics[wid').includes('width='));
  });

  it('completes tabular column specifications', () => {
    const columns = labels('\\begin{tabular}{');
    for (const value of ['l', 'c', 'r', 'p', 'X', '|']) assert.ok(columns.includes(value), `Missing value: ${value}`);
    assert.ok(labels('\\begin{tabularx}{\\textwidth}{').includes('X'));
    assert.deepEqual(applyCompletion('\\begin{tabular}{', 'p'), { text: '\\begin{tabular}{p{}', cursor: 18 });
  });

  it('does not fire outside a known argument', () => {
    assert.equal(labels('plain text '), null);
  });
});
