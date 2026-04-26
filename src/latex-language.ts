// src/latex-language.ts
import { parser } from './latex.mjs';
import {
  LRLanguage, LanguageSupport, indentNodeProp, foldNodeProp,
  foldInside, foldService, bracketMatching, syntaxTree
} from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';
import { SyntaxNode } from '@lezer/common';
import { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { linter } from '@codemirror/lint';
import { closeBrackets } from '@codemirror/autocomplete';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';

import { latexCompletionSource } from './completion';
import { autoCloseTags } from './auto-close-tags';
import { latexLinter, LatexLinterOptions } from './linter';
import { latexHoverTooltip } from './tooltips';

// Simple bracket matching for LaTeX
export const latexBracketMatching = bracketMatching({
  brackets: "()[]{}"
});

// Fold preamble
function preambleFoldRanges(state: any, lineStart: number, lineEnd: number) {
  const tree = syntaxTree(state);
  const doc = state.doc;
  const startLine = doc.lineAt(lineStart);

  if (!/^\s*\\documentclass\b/.test(startLine.text)) return null;
  if (startLine.from !== lineStart) return null;

  let documentBegin = -1;
  tree.cursor().iterate(node => {
    if (documentBegin !== -1) return false;
    if (node.name === 'DocumentEnvironment' || node.name === 'BeginEnv') {
      const text = doc.sliceString(node.from, Math.min(node.to, node.from + 30));
      if (/^\\begin\s*\{document\}/.test(text)) {
        documentBegin = node.from;
        return false;
      }
    }
  });

  if (documentBegin === -1) return null;
  const beginLine = doc.lineAt(documentBegin);
  const endPos = beginLine.from - 1;
  if (endPos <= startLine.to) return null;

  return { from: startLine.to, to: endPos };
}

// Fold comments between `% {` and `% }`
function commentFoldRanges(state: any, lineStart: number, lineEnd: number) {
  const doc = state.doc;
  const startLine = doc.lineAt(lineStart);

  // Check if the start line contains `% {`
  if (startLine.text.startsWith('% {')) {
    // Look for matching `% }`
    for (let lineNo = startLine.number + 1; lineNo <= doc.lines; lineNo++) {
      const line = doc.line(lineNo);
      if (line.text.trim() === '% }') {
        return {
          from: startLine.to,
          to: line.to - 1
        };
      }
    }
  }

  return null;
}

const SECTION_RANK: Record<string, number> = {
  Book: 0,
  Part: 1,
  Chapter: 2,
  Section: 3,
  SubSection: 4,
  SubSubSection: 5,
  Paragraph: 6,
  SubParagraph: 7,
};

// Fold books, parts, chapters, sections, and paragraphs
function sectionFoldRanges(state: any, lineStart: number, lineEnd: number) {
  const tree = syntaxTree(state);
  const doc = state.doc;

  let current: SyntaxNode | null = tree.resolveInner(lineStart, 1);
  while (current && !(current.name in SECTION_RANK)) {
    current = current.parent;
  }
  if (!current) return null;

  const headingLine = doc.lineAt(current.from);
  if (headingLine.from !== lineStart) return null;

  const rank = SECTION_RANK[current.name];
  let endPos = current.to;
  let boundaryFound = false;

  let walker: SyntaxNode | null = current;
  while (walker && !boundaryFound) {
    let sibling: SyntaxNode | null = walker.nextSibling;
    while (sibling) {
      const siblingRank = SECTION_RANK[sibling.name];
      if (siblingRank !== undefined && siblingRank <= rank) {
        const boundaryLine = doc.lineAt(sibling.from);
        endPos = boundaryLine.from - 1;
        boundaryFound = true;
        break;
      }
      endPos = sibling.to;
      sibling = sibling.nextSibling;
    }
    if (!boundaryFound) {
      walker = walker.parent;
    }
  }

  if (endPos <= headingLine.to) return null;
  return { from: headingLine.to, to: Math.min(endPos, doc.length) };
}

export const latexLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Environment: context => {
          let indent = context.baseIndent;
          return indent + context.unit;
        },
        KnownEnvironment: context => {
          let indent = context.baseIndent;
          return indent + context.unit;
        },
        Group: context => {
          return context.baseIndent + context.unit;
        },
        BeginEnv: context => {
          let indent = context.baseIndent;
          return indent + context.unit;
        },
        "Content TextArgument LongArg": context => {
          return context.baseIndent + context.unit;
        }
      }),
      foldNodeProp.add({
        Environment: foldInside,
        KnownEnvironment: foldInside,
        Group: foldInside,
        DocumentEnvironment: foldInside,
        TabularEnvironment: foldInside,
        EquationEnvironment: foldInside,
        EquationArrayEnvironment: foldInside,
        VerbatimEnvironment: foldInside,
        TikzPictureEnvironment: foldInside,
        FigureEnvironment: foldInside,
        ListEnvironment: foldInside,
        TableEnvironment: foldInside,
        Book: foldInside,
        Part: foldInside,
        Chapter: foldInside,
        Section: foldInside,
        SubSection: foldInside,
        SubSubSection: foldInside,
        Paragraph: foldInside,
        SubParagraph: foldInside
      }),
      styleTags({
        // Control sequences
        CtrlSeq: t.keyword,
        CtrlSym: t.operator,
        Csname: t.keyword,

        // Mathematical constructs
        Dollar: t.processingInstruction,
        MathSpecialChar: t.operator,
        MathChar: t.variableName,
        MathOpening: t.bracket,
        MathClosing: t.bracket,

        // Various structural elements
        EnvName: t.className,
        DocumentEnvName: t.className,
        TabularEnvName: t.className,
        EquationEnvName: t.className,
        EquationArrayEnvName: t.className,
        VerbatimEnvName: t.className,
        TikzPictureEnvName: t.className,
        FigureEnvName: t.className,
        ListEnvName: t.className,
        TableEnvName: t.className,

        // Sectioning commands
        BookCtrlSeq: t.heading,
        PartCtrlSeq: t.heading,
        ChapterCtrlSeq: t.heading,
        SectionCtrlSeq: t.heading,
        SubSectionCtrlSeq: t.heading,
        SubSubSectionCtrlSeq: t.heading,
        ParagraphCtrlSeq: t.heading,
        SubParagraphCtrlSeq: t.heading,

        // Special content
        Comment: t.comment,
        VerbContent: t.meta,
        VerbatimContent: t.meta,
        LstInlineContent: t.meta,
        LiteralArgContent: t.string,
        SpaceDelimitedLiteralArgContent: t.string,

        // Delimiters
        OpenBrace: t.bracket,
        CloseBrace: t.bracket,
        OpenBracket: t.bracket,
        CloseBracket: t.bracket,

        // Environment markers
        Begin: t.keyword,
        End: t.keyword,

        // Text formatting and styling
        TextBoldCtrlSeq: t.strong,
        TextItalicCtrlSeq: t.emphasis,
        TextSmallCapsCtrlSeq: t.className,
        TextTeletypeCtrlSeq: t.monospace,
        EmphasisCtrlSeq: t.emphasis,
        UnderlineCtrlSeq: t.emphasis,

        // Important content markers
        TitleCtrlSeq: t.heading,
        AuthorCtrlSeq: t.heading,
        DateCtrlSeq: t.heading,

        // Numbers and standard text
        Number: t.number,
        Normal: t.content,

        // Special characters
        Ampersand: t.operator,
        Tilde: t.operator,

        // Trailing content
        TrailingContent: t.invalid,

        // Other common commands
        DocumentClassCtrlSeq: t.definitionKeyword,
        UsePackageCtrlSeq: t.keyword,
        LabelCtrlSeq: t.labelName,
        RefCtrlSeq: t.labelName,
        RefStarrableCtrlSeq: t.labelName,
        CiteCtrlSeq: t.quote,
        CiteStarrableCtrlSeq: t.quote,
        BibliographyCtrlSeq: t.heading,
        BibliographyStyleCtrlSeq: t.heading
      })
    ]
  }),
  languageData: {
    commentTokens: { line: "%" },
    closeBrackets: { brackets: ["(", "[", "{", "'", '"'] },
    wordChars: "$\\-_"
  }
});

// Extension that provides LaTeX-specific functionality
export const latexExtensions: Extension = [
  latexBracketMatching,
  ...autoCloseTags
];

// Import the environments, commands, packages from completion.ts
import {
  environments,
  commands,
  mathCommands,
  packages,
} from './completion';

// Re-export for users of the library
export const latexCompletions = {
  environments,
  commands,
  mathCommands,
  packages
};

// Re-export autoCloseTags and snippets from their respective modules
export { autoCloseTags } from './auto-close-tags';
export { snippets } from './completion';

// Provides LaTeX language support with configurable features
export function latex(config: {
  autoCloseTags?: boolean,
  enableLinting?: boolean,
  enableTooltips?: boolean,
  enableAutocomplete?: boolean,
  autoCloseBrackets?: boolean,
  fileName?: string,
  linter?: LatexLinterOptions
} = {}): LanguageSupport {
  const options = {
    ...config,
    autoCloseTags: config.autoCloseTags ?? true,
    enableLinting: config.enableLinting ?? true,
    enableTooltips: config.enableTooltips ?? true,
    enableAutocomplete: config.enableAutocomplete ?? true,
    autoCloseBrackets: config.autoCloseBrackets ?? true,
    fileName: config.fileName ?? '',
    linter: config.linter ?? {}
  };

  const extensions = [];

  extensions.push(
    latexLanguage.data.of({
      autocomplete: latexCompletionSource(options.autoCloseTags)
    })
  );
  // Add fold service for preamble, comments, and sections
  extensions.push(foldService.of(preambleFoldRanges));
  extensions.push(foldService.of(commentFoldRanges));
  extensions.push(foldService.of(sectionFoldRanges));

  // Add autocomplete extension
  if (options.enableAutocomplete) {
    extensions.push(autocompletion({
      override: [latexCompletionSource(options.autoCloseTags)],
      defaultKeymap: true,
      activateOnTyping: true,
      icons: true
    }));
    extensions.push(keymap.of(completionKeymap));
  }

  extensions.push(latexBracketMatching);

  if (options.autoCloseBrackets) {
    extensions.push(closeBrackets());
  }

  if (options.autoCloseTags) {
    extensions.push(...autoCloseTags);
  }

  if (options.enableLinting) {
    extensions.push(linter(latexLinter({ ...options.linter, fileName: options.fileName })));
  }

  if (options.enableTooltips) {
    extensions.push(latexHoverTooltip);
  }

  return new LanguageSupport(latexLanguage, extensions);
}