// src/parser-utils.ts
import { SyntaxNode } from '@lezer/common';
import { mathEnvironments, verbatimEnvironments } from './latex-data';

// Map of LaTeX node types that can be folded
export const foldableNodeTypes = new Set([
  'Environment',
  'KnownEnvironment',
  'Group',
  'DocumentEnvironment',
  'TabularEnvironment',
  'EquationEnvironment',
  'EquationArrayEnvironment',
  'VerbatimEnvironment',
  'TikzPictureEnvironment',
  'FigureEnvironment',
  'ListEnvironment',
  'TableEnvironment',
  'Book',
  'Part',
  'Chapter',
  'Section',
  'SubSection',
  'SubSubSection',
  'Paragraph',
  'SubParagraph'
]);

// Helper function to find the environment name in a BeginEnv node
export function findEnvironmentName(node: SyntaxNode): string | null {
  // First try to find the EnvNameGroup node
  let envNameGroup = null;

  // Find EnvNameGroup among children
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.name === 'EnvNameGroup') {
      envNameGroup = child;
      break;
    }
  }

  if (envNameGroup) {
    // Try to find various environment name node types
    for (let child = envNameGroup.firstChild; child; child = child.nextSibling) {
      if (child.name === 'EnvName' ||
          child.name === 'DocumentEnvName' ||
          child.name === 'TabularEnvName' ||
          child.name === 'EquationEnvName' ||
          child.name === 'EquationArrayEnvName' ||
          child.name === 'VerbatimEnvName' ||
          child.name === 'TikzPictureEnvName' ||
          child.name === 'FigureEnvName' ||
          child.name === 'ListEnvName' ||
          child.name === 'TableEnvName') {
        return child.name;
      }
    }
  }

  return null;
}

// Helper function to get the indentation level for a node
export function getIndentationLevel(node: SyntaxNode): number {
  if (!node) return 0;

  // Check if we're inside an environment
  if (node.name === 'Environment' || node.name.endsWith('Environment')) {
    return 1;
  }

  // Check if we're inside a group
  if (node.name === 'Group') {
    return 1;
  }

  // Find the closest ancestor that should affect indentation
  let parent = node.parent;
  let level = 0;

  while (parent) {
    if (parent.name === 'Environment' || parent.name.endsWith('Environment')) {
      level++;
    } else if (parent.name === 'Group') {
      level++;
    }
    parent = parent.parent;
  }

  return level;
}

// Helper function to find matches for environment beginnings and endings
export function findMatchingEnvironment(doc: string, pos: number, tree: any): { from: number, to: number } | null {
  const node = tree.resolve(pos);

  // Check if we're on a \begin or \end command
  if (node.name === 'Begin' || node.parent?.name === 'BeginEnv') {
    // We're on a \begin, find the matching \end
    const beginNode = node.name === 'Begin' ? node : node.parent;
    if (!beginNode) return null;

    const envName = findEnvironmentName(beginNode);
    if (!envName) return null;

    // Find the containing environment
    let envNode = beginNode.parent;
    while (envNode && !envNode.name.endsWith('Environment') && envNode.name !== 'Environment') {
      envNode = envNode.parent;
    }

    if (!envNode) return null;

    // Find the EndEnv node
    let endEnv = null;
    for (let child = envNode.firstChild; child; child = child.nextSibling) {
      if (child.name === 'EndEnv') {
        endEnv = child;
        break;
      }
    }

    if (!endEnv) return null;

    return { from: beginNode.from, to: endEnv.to };
  } else if (node.name === 'End' || node.parent?.name === 'EndEnv') {
    // We're on an \end, find the matching \begin
    const endNode = node.name === 'End' ? node : node.parent;
    if (!endNode) return null;

    const envName = findEnvironmentName(endNode);
    if (!envName) return null;

    // Find the containing environment
    let envNode = endNode.parent;
    while (envNode && !envNode.name.endsWith('Environment') && envNode.name !== 'Environment') {
      envNode = envNode.parent;
    }

    if (!envNode) return null;

    // Find the BeginEnv node
    let beginEnv = null;
    for (let child = envNode.firstChild; child; child = child.nextSibling) {
      if (child.name === 'BeginEnv') {
        beginEnv = child;
        break;
      }
    }

    if (!beginEnv) return null;

    return { from: beginEnv.from, to: endNode.to };
  }

  return null;
}

// Helper for finding section boundaries
export function findSectionBoundaries(node: SyntaxNode): { from: number, to: number } | null {
  if (!node) return null;

  // Check if this is a section node
  if (node.name === 'Book' ||
      node.name === 'Part' ||
      node.name === 'Chapter' ||
      node.name === 'Section' ||
      node.name === 'SubSection' ||
      node.name === 'SubSubSection' ||
      node.name === 'Paragraph' ||
      node.name === 'SubParagraph') {

    // Find the SectioningCommand node
    const sectioningCommand = node.firstChild;
    if (!sectioningCommand) return null;

    // Return the boundaries of the entire section
    return { from: node.from, to: node.to };
  }

  return null;
}
export interface LatexModeScan {
  mathRanges: Array<[number, number]>;
  openMath: boolean;
  envStack: string[];
}

// Single pass that locates math regions while skipping comments, \verb and verbatim bodies
export function scanLatexModes(text: string): LatexModeScan {
  const mathRanges: Array<[number, number]> = [];
  const mathStack: Array<{ kind: string; from: number }> = [];
  const envStack: string[] = [];
  let i = 0;

  const closeMath = (kind: string, at: number): boolean => {
    for (let k = mathStack.length - 1; k >= 0; k--) {
      if (mathStack[k].kind === kind) {
        mathRanges.push([mathStack[k].from, at]);
        mathStack.length = k;
        return true;
      }
    }
    return false;
  };

  while (i < text.length) {
    const ch = text[i];

    if (ch === '%') {
      const lineEnd = text.indexOf('\n', i);
      i = lineEnd === -1 ? text.length : lineEnd + 1;
      continue;
    }

    if (ch === '\\') {
      const rest = text.slice(i, i + 128);

      const begin = /^\\begin\s*\{([^}]*)\}/.exec(rest);
      if (begin) {
        const name = begin[1].trim();
        const base = name.replace(/\*$/, '');
        if (verbatimEnvironments.has(base)) {
          const closing = `\\end{${name}}`;
          const closeIndex = text.indexOf(closing, i);
          i = closeIndex === -1 ? text.length : closeIndex + closing.length;
          continue;
        }
        envStack.push(name);
        if (mathEnvironments.has(base)) {
          mathStack.push({ kind: `env:${base}`, from: i });
        }
        i += begin[0].length;
        continue;
      }

      const end = /^\\end\s*\{([^}]*)\}/.exec(rest);
      if (end) {
        const name = end[1].trim();
        const index = envStack.lastIndexOf(name);
        if (index !== -1) envStack.splice(index, 1);
        closeMath(`env:${name.replace(/\*$/, '')}`, i + end[0].length);
        i += end[0].length;
        continue;
      }

      const verb = /^\\verb\*?([^a-zA-Z0-9\s])/.exec(rest);
      if (verb) {
        const closeIndex = text.indexOf(verb[1], i + verb[0].length);
        i = closeIndex === -1 ? text.length : closeIndex + 1;
        continue;
      }

      const next = text[i + 1];
      if (next === '(') { mathStack.push({ kind: 'inline', from: i }); i += 2; continue; }
      if (next === ')') { closeMath('inline', i + 2); i += 2; continue; }
      if (next === '[') { mathStack.push({ kind: 'display', from: i }); i += 2; continue; }
      if (next === ']') { closeMath('display', i + 2); i += 2; continue; }
      i += next === undefined ? 1 : 2;
      continue;
    }

    if (ch === '$') {
      const double = text[i + 1] === '$';
      const kind = double ? '$$' : '$';
      const width = double ? 2 : 1;
      if (!closeMath(kind, i + width)) {
        mathStack.push({ kind, from: i });
      }
      i += width;
      continue;
    }

    i++;
  }

  for (const open of mathStack) {
    mathRanges.push([open.from, text.length]);
  }

  return { mathRanges: mergeRanges(mathRanges), openMath: mathStack.length > 0, envStack };
}

// Sorted, non-overlapping ranges so lookups can binary search
function mergeRanges(ranges: Array<[number, number]>): Array<[number, number]> {
  if (ranges.length < 2) return ranges;
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [ranges[0]];
  for (let i = 1; i < ranges.length; i++) {
    const last = merged[merged.length - 1];
    if (ranges[i][0] <= last[1]) {
      last[1] = Math.max(last[1], ranges[i][1]);
    } else {
      merged.push(ranges[i]);
    }
  }
  return merged;
}

export function isInMathRange(ranges: ReadonlyArray<[number, number]>, pos: number): boolean {
  let low = 0;
  let high = ranges.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (pos < ranges[mid][0]) high = mid - 1;
    else if (pos >= ranges[mid][1]) low = mid + 1;
    else return true;
  }
  return false;
}
