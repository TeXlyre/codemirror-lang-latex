// Type declarations for imported modules

declare module './latex.mjs' {
  import { LRParser } from '@lezer/lr';
  export const parser: LRParser;
}

declare module './tokens.mjs' {
  import { ContextTracker } from '@lezer/lr';

  export class ElementContext {
    name: string;
    parent: ElementContext | null;
    hash: number;
    constructor(name: string, parent: ElementContext | null);
  }

  export const elementContext: ContextTracker<ElementContext | null>;

  export function specializeCtrlSeq(name: string, terms: any): number;
  export function specializeEnvName(name: string, terms: any): number;
  export function specializeCtrlSym(name: string, terms: any): number;

  // These are imported from latex.terms.mjs but accessed through tokens.mjs
  export const LiteralArgContent: number;
  export const SpaceDelimitedLiteralArgContent: number;
  export const VerbContent: number;
  export const VerbatimContent: number;
  export const LstInlineContent: number;
  export const Begin: number;
  export const End: number;
  export const KnownEnvironment: number;
  export const Csname: number;
  export const TrailingWhitespaceOnly: number;
  export const TrailingContent: number;
  export const RefCtrlSeq: number;
  export const RefStarrableCtrlSeq: number;
  export const CiteCtrlSeq: number;
  export const CiteStarrableCtrlSeq: number;
  export const LabelCtrlSeq: number;
  export const MathTextCtrlSeq: number;
  export const HboxCtrlSeq: number;
  export const TitleCtrlSeq: number;
  export const DocumentClassCtrlSeq: number;
  export const UsePackageCtrlSeq: number;
  export const HrefCtrlSeq: number;
  export const UrlCtrlSeq: number;
  export const VerbCtrlSeq: number;
  export const LstInlineCtrlSeq: number;
  export const IncludeGraphicsCtrlSeq: number;
  export const CaptionCtrlSeq: number;
  export const DefCtrlSeq: number;
  export const LetCtrlSeq: number;
  export const LeftCtrlSeq: number;
  export const RightCtrlSeq: number;
  export const NewCommandCtrlSeq: number;
  export const RenewCommandCtrlSeq: number;
  export const NewEnvironmentCtrlSeq: number;
  export const RenewEnvironmentCtrlSeq: number;
  export const DocumentEnvName: number;
  export const TabularEnvName: number;
  export const EquationEnvName: number;
  export const EquationArrayEnvName: number;
  export const VerbatimEnvName: number;
  export const TikzPictureEnvName: number;
  export const FigureEnvName: number;
  export const ListEnvName: number;
  export const TableEnvName: number;
  export const OpenParenCtrlSym: number;
  export const CloseParenCtrlSym: number;
  export const OpenBracketCtrlSym: number;
  export const CloseBracketCtrlSym: number;
  export const LineBreakCtrlSym: number;
  export const BookCtrlSeq: number;
  export const PartCtrlSeq: number;
  export const ChapterCtrlSeq: number;
  export const SectionCtrlSeq: number;
  export const SubSectionCtrlSeq: number;
  export const SubSubSectionCtrlSeq: number;
  export const ParagraphCtrlSeq: number;
  export const SubParagraphCtrlSeq: number;
  export const InputCtrlSeq: number;
  export const IncludeCtrlSeq: number;
  export const ItemCtrlSeq: number;
  export const NewTheoremCtrlSeq: number;
  export const TheoremStyleCtrlSeq: number;
  export const BibliographyCtrlSeq: number;
  export const BibliographyStyleCtrlSeq: number;
  export const CenteringCtrlSeq: number;
  export const MaketitleCtrlSeq: number;
  export const TextColorCtrlSeq: number;
  export const ColorBoxCtrlSeq: number;
  export const HLineCtrlSeq: number;
  export const TopRuleCtrlSeq: number;
  export const MidRuleCtrlSeq: number;
  export const BottomRuleCtrlSeq: number;
  export const MultiColumnCtrlSeq: number;
  export const ParBoxCtrlSeq: number;
  export const TextBoldCtrlSeq: number;
  export const TextItalicCtrlSeq: number;
  export const TextSmallCapsCtrlSeq: number;
  export const TextTeletypeCtrlSeq: number;
  export const TextMediumCtrlSeq: number;
  export const TextSansSerifCtrlSeq: number;
  export const TextSuperscriptCtrlSeq: number;
  export const TextSubscriptCtrlSeq: number;
  export const TextStrikeOutCtrlSeq: number;
  export const EmphasisCtrlSeq: number;
  export const UnderlineCtrlSeq: number;
  export const SetLengthCtrlSeq: number;
  export const AuthorCtrlSeq: number;
  export const AffilCtrlSeq: number;
  export const AffiliationCtrlSeq: number;
  export const DateCtrlSeq: number;
  export const endOfArguments: number;
  export const hasMoreArguments: number;
  export const hasMoreArgumentsOrOptionals: number;
  export const endOfArgumentsAndOptionals: number;
}