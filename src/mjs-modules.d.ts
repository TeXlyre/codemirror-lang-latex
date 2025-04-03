// src/mjs-modules.d.ts

// Type declarations for .mjs modules
declare module '*.mjs' {
  import { LRParser } from '@lezer/lr';
  export const parser: LRParser;

  export * from '@lezer/lr';
}