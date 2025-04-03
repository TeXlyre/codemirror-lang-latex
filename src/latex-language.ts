import { parser } from './latex.mjs';
import { LRLanguage, LanguageSupport, indentNodeProp, foldNodeProp,
  foldInside, bracketMatching } from '@codemirror/language';
import { styleTags, tags as t } from '@lezer/highlight';
import { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { linter } from '@codemirror/lint';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';

import { latexCompletionSource } from './completion';
import { autoCloseTags, latexKeymap } from './auto-close-tags';
import { latexLinter } from './linter';
import { latexHoverTooltip } from './tooltips';

// Simple bracket matching for LaTeX - declaring it early to avoid reference before definition
export const latexBracketMatching = bracketMatching({
  brackets: "()[]{}"  // Use a string instead of array
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
  keymap.of(latexKeymap),
  autoCloseTags
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

// Export the main LanguageSupport function
export function latex(config: {
  autoCloseTags?: boolean,
  enableLinting?: boolean,
  enableTooltips?: boolean,
  enableAutocomplete?: boolean
} = {}): LanguageSupport {
  // Default configuration
  const options = {
    autoCloseTags: true,
    enableLinting: true,
    enableTooltips: true,
    enableAutocomplete: true,
    ...config
  };

  const extensions = [];

  // Add the language data with autocompletion
  extensions.push(
    latexLanguage.data.of({
      autocomplete: latexCompletionSource
    })
  );

  // Add autocomplete extension
  if (options.enableAutocomplete) {
    extensions.push(autocompletion({
      override: [latexCompletionSource],
      defaultKeymap: true, // Make sure default keymaps are enabled
      activateOnTyping: true, // Activate completion when typing
      icons: true
    }));
    extensions.push(keymap.of(completionKeymap));
  }

  // Add bracket matching and auto-closing brackets
  extensions.push(latexBracketMatching);
  extensions.push(closeBrackets());

  // Add keymap
  extensions.push(keymap.of([
    ...latexKeymap,
    ...closeBracketsKeymap
  ]));

  // Add optional extensions based on config
  if (options.autoCloseTags) {
    extensions.push(autoCloseTags);
  }

  if (options.enableLinting) {
    extensions.push(linter(latexLinter()));
  }

  if (options.enableTooltips) {
    extensions.push(latexHoverTooltip);
  }

  return new LanguageSupport(latexLanguage, extensions);
}