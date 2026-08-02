import {
  latexCompletions, snippets, commandIndex, environmentIndex, mathSymbols, symbolIndex
} from '../dist/index.js';
import { labels, optionFor, applyCompletion } from './helpers.js';

const { commands, mathCommands, environments, packages } = latexCompletions;

describe('exported tables', () => {
  it('keeps the previously exported entries', () => {
    for (const command of ['\\documentclass', '\\section', '\\textbf', '\\frac', '\\alpha', '\\Omega']) {
      expect(commands).toContain(command);
    }
    for (const command of ['\\sin', '\\rightarrow', '\\mathbb{R}', '\\begin{pmatrix}', '\\hat']) {
      expect(mathCommands).toContain(command);
    }
    for (const environment of ['document', 'itemize', 'equation*', 'pmatrix', 'tikzpicture']) {
      expect(environments).toContain(environment);
    }
    expect(packages).toContain('amsmath');
    expect(snippets).toHaveLength(5);
  });

  it('adds the missing symbol categories', () => {
    for (const symbol of ['\\otimes', '\\bigcup', '\\Longrightarrow', '\\langle', '\\ddots', '\\nabla', '\\subseteq']) {
      expect(mathCommands).toContain(symbol);
    }
  });

  it('gives every symbol a glyph', () => {
    expect(mathSymbols.length).toBeGreaterThan(200);
    for (const symbol of mathSymbols) {
      expect(typeof symbol.glyph).toBe('string');
      expect(symbol.glyph.length).toBeGreaterThan(0);
    }
    expect(symbolIndex.get('\\alpha').glyph).toBe('α');
  });

  it('records package requirements and templates', () => {
    expect(commandIndex.get('\\includegraphics').package).toBe('graphicx');
    expect(commandIndex.get('\\frac').template).toBe('\\frac{}{}');
    expect(commandIndex.get('\\varnothing').package).toBe('amssymb');
    expect(environmentIndex.get('align').package).toBe('amsmath');
    expect(environmentIndex.get('pmatrix').mathOnly).toBe(true);
  });

  it('does not export environments as commands', () => {
    for (const bogus of ['\\itemize', '\\enumerate', '\\figure']) {
      expect(commands).not.toContain(bogus);
    }
  });
});

describe('environment completion', () => {
  it('completes environment names after \\begin{', () => {
    expect(labels('\\begin{tikz')).toContain('tikzpicture');
  });

  it('hides math-only environments outside math mode', () => {
    expect(labels('\\begin{cas')).not.toContain('cases');
    expect(labels('$\\begin{cas')).toContain('cases');
  });

  it('offers the innermost open environment first after \\end{', () => {
    expect(labels('\\begin{itemize}\n\\item x\n\\end{')[0]).toBe('itemize');
    expect(labels('\\begin{figure}\n\\begin{center}\n\\end{')[0]).toBe('center');
  });

  it('shows the required package as detail', () => {
    expect(optionFor('\\begin{tikz', 'tikzpicture').detail).toBe('tikz');
  });

  it('inserts a matching \\end when auto-closing', () => {
    const { text } = applyCompletion('\\begin{itemize', 'itemize');
    expect(text).toBe('\\begin{itemize}\n  \n\\end{itemize}');
  });
});

describe('command completion', () => {
  it('completes command names', () => {
    expect(labels('\\fra')).toContain('\\frac');
  });

  it('offers symbols only in math mode', () => {
    expect(labels('\\ot')).not.toContain('\\otimes');
    expect(labels('$\\ot')).toContain('\\otimes');
  });

  it('shows glyphs as detail', () => {
    expect(optionFor('$\\alp', '\\alpha').detail).toBe('α');
  });

  it('places the cursor inside the first argument', () => {
    expect(applyCompletion('\\fra', '\\frac')).toEqual({ text: '\\frac{}{}', cursor: 6 });
    expect(applyCompletion('\\sec', '\\section')).toEqual({ text: '\\section{}', cursor: 9 });
  });

  it('leaves argumentless commands untouched', () => {
    expect(applyCompletion('\\hlin', '\\hline')).toEqual({ text: '\\hline', cursor: 6 });
  });
});

describe('argument completion', () => {
  it('completes document classes', () => {
    expect(labels('\\documentclass{art')).toContain('article');
  });

  it('completes document class options', () => {
    expect(labels('\\documentclass[12')).toContain('12pt');
  });

  it('completes package names', () => {
    expect(labels('\\usepackage{amsm')).toContain('amsmath');
    expect(labels('\\RequirePackage{amsm')).toContain('amsmath');
  });

  it('completes options of a known package', () => {
    expect(labels('\\usepackage[mar]{geometry}', 15)).toContain('margin=');
  });

  it('returns nothing for options of an unknown package', () => {
    expect(labels('\\usepackage[x]{madeuppkg}', 13)).toBeNull();
  });

  it('completes \\includegraphics keys', () => {
    expect(labels('\\includegraphics[wid')).toContain('width=');
  });

  it('completes tabular column specifications', () => {
    const columns = labels('\\begin{tabular}{');
    expect(columns).toEqual(expect.arrayContaining(['l', 'c', 'r', 'p', 'X', '|']));
    expect(labels('\\begin{tabularx}{\\textwidth}{')).toContain('X');
    expect(applyCompletion('\\begin{tabular}{', 'p')).toEqual({ text: '\\begin{tabular}{p{}', cursor: 18 });
  });

  it('does not fire outside a known argument', () => {
    expect(labels('plain text ')).toBeNull();
  });
});
