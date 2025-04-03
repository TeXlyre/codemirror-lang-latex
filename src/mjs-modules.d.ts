// Type declarations for .mjs modules

declare module '*.mjs' {
  import { LRParser } from '@lezer/lr';
  export const parser: LRParser;

  // Add other exports from the .mjs files as needed
  export * from '@lezer/lr';
}