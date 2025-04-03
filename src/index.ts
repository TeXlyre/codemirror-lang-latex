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
export { latexLinter } from './linter';

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

// Export the parser directly - using type assertion to bypass declaration file issue
export { parser } from './parser-integration';

// Export autocompletion components
export { autocompletion, completionKeymap } from '@codemirror/autocomplete';