// src/parser-utils.ts
import { SyntaxNode } from '@lezer/common';

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