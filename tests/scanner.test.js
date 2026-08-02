import { scanLatexModes, isInMathRange } from '../dist/index.js';

describe('scanLatexModes', () => {
  it('detects inline and display math delimiters', () => {
    const text = 'a $x$ b \\(y\\) c \\[z\\] d';
    const { mathRanges, openMath } = scanLatexModes(text);
    expect(openMath).toBe(false);
    expect(isInMathRange(mathRanges, text.indexOf('x'))).toBe(true);
    expect(isInMathRange(mathRanges, text.indexOf('y'))).toBe(true);
    expect(isInMathRange(mathRanges, text.indexOf('z'))).toBe(true);
    expect(isInMathRange(mathRanges, text.indexOf('b'))).toBe(false);
  });

  it('handles double dollar display math', () => {
    const text = 'before $$x + y$$ after';
    const { mathRanges, openMath } = scanLatexModes(text);
    expect(openMath).toBe(false);
    expect(isInMathRange(mathRanges, text.indexOf('x'))).toBe(true);
    expect(isInMathRange(mathRanges, text.indexOf('after'))).toBe(false);
  });

  it('ignores escaped dollars', () => {
    const { openMath, mathRanges } = scanLatexModes('costs \\$5 and \\$10 today');
    expect(openMath).toBe(false);
    expect(mathRanges).toHaveLength(0);
  });

  it('ignores math delimiters inside comments', () => {
    const { openMath } = scanLatexModes('% a $ comment with \\[\ntext');
    expect(openMath).toBe(false);
  });

  it('ignores math delimiters inside verbatim environments', () => {
    const { openMath } = scanLatexModes('\\begin{verbatim}\n$$ \\( $\n\\end{verbatim}\nafter');
    expect(openMath).toBe(false);
  });

  it('ignores math delimiters inside \\verb arguments', () => {
    const { openMath } = scanLatexModes('inline \\verb|$x$ \\(| done');
    expect(openMath).toBe(false);
  });

  it('treats math environments as math mode', () => {
    const text = '\\begin{align}\n  a &= b\n\\end{align}\nafter';
    const { mathRanges } = scanLatexModes(text);
    expect(isInMathRange(mathRanges, text.indexOf('&'))).toBe(true);
    expect(isInMathRange(mathRanges, text.indexOf('after'))).toBe(false);
  });

  it('reports unterminated math as open', () => {
    expect(scanLatexModes('text $x^2 + y').openMath).toBe(true);
    expect(scanLatexModes('\\begin{equation}\n  x').openMath).toBe(true);
    expect(scanLatexModes('text \\[ x').openMath).toBe(true);
  });

  it('tracks the environment stack', () => {
    const { envStack } = scanLatexModes('\\begin{figure}\n\\begin{center}\n');
    expect(envStack).toEqual(['figure', 'center']);
  });

  it('pops the environment stack on \\end', () => {
    const { envStack } = scanLatexModes('\\begin{figure}\n\\begin{center}\n\\end{center}\n');
    expect(envStack).toEqual(['figure']);
  });

  it('returns sorted, non-overlapping ranges', () => {
    const { mathRanges } = scanLatexModes('$a$ text $$b$$ more \\(c\\) end');
    for (let i = 1; i < mathRanges.length; i++) {
      expect(mathRanges[i][0]).toBeGreaterThanOrEqual(mathRanges[i - 1][1]);
    }
  });
});
