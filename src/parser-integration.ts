// src/parser-integration.ts
import { parser } from './latex.mjs';
import { foldableNodeTypes, findEnvironmentName, getIndentationLevel,
         findMatchingEnvironment, findSectionBoundaries } from './parser-utils';

// Re-export everything from parser-utils
export {
  foldableNodeTypes,
  findEnvironmentName,
  getIndentationLevel,
  findMatchingEnvironment,
  findSectionBoundaries
};

export { parser };
