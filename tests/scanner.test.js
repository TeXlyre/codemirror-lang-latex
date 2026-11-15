import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scanLatexModes, isInMathRange } from '../dist/index.js';

describe('scanLatexModes', () => {
  it('detects inline and display math delimiters', () => {
    const text = 'a $x$ b \\(y\\) c \\[z\\] d';
    const { mathRanges, openMath } = scanLatexModes(text);
    assert.equal(openMath, false);
    assert.equal(isInMathRange(mathRanges, text.indexOf('x')), true);
    assert.equal(isInMathRange(mathRanges, text.indexOf('y')), true);
    assert.equal(isInMathRange(mathRanges, text.indexOf('z')), true);
    assert.equal(isInMathRange(mathRanges, text.indexOf('b')), false);
  });

  it('handles double dollar display math', () => {
    const text = 'before $$x + y$$ after';
    const { mathRanges, openMath } = scanLatexModes(text);
    assert.equal(openMath, false);
    assert.equal(isInMathRange(mathRanges, text.indexOf('x')), true);
    assert.equal(isInMathRange(mathRanges, text.indexOf('after')), false);
  });

  it('ignores escaped dollars', () => {
    const { openMath, mathRanges } = scanLatexModes('costs \\$5 and \\$10 today');
    assert.equal(openMath, false);
    assert.equal(mathRanges.length, 0);
  });

  it('ignores math delimiters inside comments', () => {
    const { openMath } = scanLatexModes('% a $ comment with \\[\ntext');
    assert.equal(openMath, false);
  });

  it('ignores math delimiters inside verbatim environments', () => {
    const { openMath } = scanLatexModes('\\begin{verbatim}\n$$ \\( $\n\\end{verbatim}\nafter');
    assert.equal(openMath, false);
  });

  it('ignores math delimiters inside \\verb arguments', () => {
    const { openMath } = scanLatexModes('inline \\verb|$x$ \\(| done');
    assert.equal(openMath, false);
  });

  it('treats math environments as math mode', () => {
    const text = '\\begin{align}\n  a &= b\n\\end{align}\nafter';
    const { mathRanges } = scanLatexModes(text);
    assert.equal(isInMathRange(mathRanges, text.indexOf('&')), true);
    assert.equal(isInMathRange(mathRanges, text.indexOf('after')), false);
  });

  it('reports unterminated math as open', () => {
    assert.equal(scanLatexModes('text $x^2 + y').openMath, true);
    assert.equal(scanLatexModes('\\begin{equation}\n  x').openMath, true);
    assert.equal(scanLatexModes('text \\[ x').openMath, true);
  });

  it('tracks the environment stack', () => {
    const { envStack } = scanLatexModes('\\begin{figure}\n\\begin{center}\n');
    assert.deepEqual(envStack, ['figure', 'center']);
  });

  it('pops the environment stack on \\end', () => {
    const { envStack } = scanLatexModes('\\begin{figure}\n\\begin{center}\n\\end{center}\n');
    assert.deepEqual(envStack, ['figure']);
  });

  it('returns sorted, non-overlapping ranges', () => {
    const { mathRanges } = scanLatexModes('$a$ text $$b$$ more \\(c\\) end');
    for (let i = 1; i < mathRanges.length; i++) {
      assert.ok(mathRanges[i][0] >= mathRanges[i - 1][1]);
    }
  });
});
