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

// Re-export the parser for use in the language implementation
export { parser };
