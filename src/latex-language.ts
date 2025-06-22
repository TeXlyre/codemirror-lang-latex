// src/latex-language.ts
import { parser } from './latex.mjs';
import { LRLanguage, LanguageSupport, indentNodeProp, foldNodeProp,
  foldInside, bracketMatching } from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';
import { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { linter } from '@codemirror/lint';
import { closeBrackets } from '@codemirror/autocomplete';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';

import { latexCompletionSource } from './completion';
import { autoCloseTags } from './auto-close-tags';
import { latexLinter } from './linter';
import { latexHoverTooltip } from './tooltips';

// Simple bracket matching for LaTeX
export const latexBracketMatching = bracketMatching({
  brackets: "()[]{}"
});

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
  autoCloseBrackets?: boolean
} = {}): LanguageSupport {
  const options = {
    ...config,
    autoCloseTags: config.autoCloseTags ?? true,
    enableLinting: config.enableLinting ?? true,
    enableTooltips: config.enableTooltips ?? true,
    enableAutocomplete: config.enableAutocomplete ?? true,
    autoCloseBrackets: config.autoCloseBrackets ?? true
  };

  const extensions = [];

  extensions.push(
    latexLanguage.data.of({
      autocomplete: latexCompletionSource(options.autoCloseTags) // Call the function
    })
  );

  // Add autocomplete extension
  if (options.enableAutocomplete) {
    extensions.push(autocompletion({
      override: [latexCompletionSource(options.autoCloseTags)], // Call the function here too
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
    extensions.push(linter(latexLinter()));
  }

  if (options.enableTooltips) {
    extensions.push(latexHoverTooltip);
  }

  return new LanguageSupport(latexLanguage, extensions);
}