// src/index.ts
export {
  latex,
  latexLanguage,
  latexBracketMatching,
  latexCompletions,
  autoCloseTags,
  latexExtensions
} from './latex-language';

// Import and re-export from completion
export { latexCompletionSource } from './completion';

// Export the linter
export { latexLinter, type LatexLinterOptions } from './linter';

// Export the tooltips
export { latexHoverTooltip } from './tooltips';

// Export the parser utilities
export {
  findEnvironmentName,
  getIndentationLevel,
  findMatchingEnvironment,
  findSectionBoundaries
} from './parser-integration';

// Export snippets
export { snippets } from './completion';

// Export the shared command, environment and symbol tables
export {
  latexCommands,
  latexEnvironments,
  latexPackages,
  documentClasses,
  commandIndex,
  environmentIndex,
  mathOnlyCommands,
  requiredPackages,
  LatexCommandInfo,
  LatexEnvironmentInfo
} from './latex-data';

export { mathSymbols, symbolIndex, LatexSymbol } from './latex-symbols';

// Export the math-mode scanner used by completion and linting
export { scanLatexModes, isInMathRange, LatexModeScan } from './parser-utils';

// Export the parser directly - using type assertion to bypass declaration file issue
export { parser } from './parser-integration';

// Export autocompletion components
export { autocompletion, completionKeymap } from '@codemirror/autocomplete';