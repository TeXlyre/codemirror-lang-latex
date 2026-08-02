// src/latex-symbols.ts

export interface LatexSymbol {
  name: string;
  glyph: string;
  package?: string;
}

function group(entries: Record<string, string>, pkg?: string): LatexSymbol[] {
  return Object.entries(entries).map(([key, glyph]) =>
    pkg ? { name: `\\${key}`, glyph, package: pkg } : { name: `\\${key}`, glyph }
  );
}

export const greekSymbols: readonly LatexSymbol[] = group({
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ϵ', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', varpi: 'ϖ', rho: 'ρ',
  varrho: 'ϱ', sigma: 'σ', varsigma: 'ς', tau: 'τ', upsilon: 'υ', phi: 'ϕ',
  varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω'
});

const binaryOperators = group({
  pm: '±', mp: '∓', times: '×', div: '÷', cdot: '⋅', ast: '∗', star: '⋆',
  circ: '∘', bullet: '∙', diamond: '⋄', oplus: '⊕', ominus: '⊖', otimes: '⊗',
  oslash: '⊘', odot: '⊙', wedge: '∧', vee: '∨', land: '∧', lor: '∨',
  cap: '∩', cup: '∪', sqcap: '⊓', sqcup: '⊔', setminus: '∖', uplus: '⊎',
  amalg: '⨿', triangleleft: '◁', triangleright: '▷', bigtriangleup: '△',
  bigtriangledown: '▽', dagger: '†', ddagger: '‡', wr: '≀'
});

const bigOperators = group({
  sum: '∑', prod: '∏', coprod: '∐', int: '∫', iint: '∬', iiint: '∭',
  oint: '∮', bigcup: '⋃', bigcap: '⋂', bigsqcup: '⨆', bigvee: '⋁',
  bigwedge: '⋀', bigoplus: '⨁', bigotimes: '⨂', bigodot: '⨀', biguplus: '⨄'
});

const relations = group({
  leq: '≤', geq: '≥', le: '≤', ge: '≥', ll: '≪', gg: '≫', neq: '≠', ne: '≠',
  equiv: '≡', sim: '∼', simeq: '≃', approx: '≈', cong: '≅', propto: '∝',
  asymp: '≍', doteq: '≐', prec: '≺', succ: '≻', preceq: '⪯', succeq: '⪰',
  subset: '⊂', supset: '⊃', subseteq: '⊆', supseteq: '⊇', sqsubseteq: '⊑',
  sqsupseteq: '⊒', in: '∈', ni: '∋', notin: '∉', mid: '∣', parallel: '∥',
  perp: '⊥', vdash: '⊢', dashv: '⊣', models: '⊨', bowtie: '⋈', smile: '⌣',
  frown: '⌢'
});

const amsRelations = group({
  lesssim: '≲', gtrsim: '≳', subsetneq: '⊊', supsetneq: '⊋', nsubseteq: '⊈',
  nsupseteq: '⊉', ncong: '≇', nsim: '≁', nleq: '≰', ngeq: '≱', nmid: '∤',
  nparallel: '∦', vDash: '⊨', nvdash: '⊬', lll: '⋘', ggg: '⋙',
  approxeq: '≊', eqsim: '≂', backsim: '∽', trianglelefteq: '⊴',
  trianglerighteq: '⊵'
}, 'amssymb');

const arrows = group({
  leftarrow: '←', rightarrow: '→', leftrightarrow: '↔', to: '→', gets: '←',
  Leftarrow: '⇐', Rightarrow: '⇒', Leftrightarrow: '⇔',
  longleftarrow: '⟵', longrightarrow: '⟶', longleftrightarrow: '⟷',
  Longleftarrow: '⟸', Longrightarrow: '⟹', Longleftrightarrow: '⟺',
  mapsto: '↦', longmapsto: '⟼', hookleftarrow: '↩', hookrightarrow: '↪',
  uparrow: '↑', downarrow: '↓', updownarrow: '↕', Uparrow: '⇑',
  Downarrow: '⇓', Updownarrow: '⇕', nearrow: '↗', searrow: '↘',
  swarrow: '↙', nwarrow: '↖', leftharpoonup: '↼', leftharpoondown: '↽',
  rightharpoonup: '⇀', rightharpoondown: '⇁', rightleftharpoons: '⇌',
  iff: '⟺', implies: '⟹', impliedby: '⟸'
});

const amsArrows = group({
  twoheadrightarrow: '↠', twoheadleftarrow: '↞', rightarrowtail: '↣',
  leftarrowtail: '↢', rightrightarrows: '⇉', leftleftarrows: '⇇',
  rightsquigarrow: '⇝', leftrightsquigarrow: '↭', circlearrowleft: '↺',
  circlearrowright: '↻'
}, 'amssymb');

const delimiters = group({
  langle: '⟨', rangle: '⟩', lfloor: '⌊', rfloor: '⌋', lceil: '⌈',
  rceil: '⌉', vert: '|', Vert: '‖', backslash: '\\', '|': '‖'
});

const amsDelimiters = group({
  lvert: '|', rvert: '|', lVert: '‖', rVert: '‖', ulcorner: '⌜',
  urcorner: '⌝', llcorner: '⌞', lrcorner: '⌟'
}, 'amssymb');

const dots = group({
  ldots: '…', cdots: '⋯', vdots: '⋮', ddots: '⋱', dots: '…', dotsb: '⋯',
  dotsc: '…', dotsm: '⋯'
});

const miscellaneous = group({
  infty: '∞', partial: '∂', nabla: '∇', forall: '∀', exists: '∃',
  emptyset: '∅', neg: '¬', lnot: '¬', angle: '∠', triangle: '△',
  aleph: 'ℵ', hbar: 'ℏ', ell: 'ℓ', wp: '℘', Re: 'ℜ', Im: 'ℑ',
  imath: 'ı', jmath: 'ȷ', top: '⊤', bot: '⊥', flat: '♭', sharp: '♯',
  natural: '♮', prime: '′', surd: '√', clubsuit: '♣', diamondsuit: '♢',
  heartsuit: '♡', spadesuit: '♠'
});

const amsMiscellaneous = group({
  nexists: '∄', varnothing: '∅', complement: '∁', measuredangle: '∡',
  sphericalangle: '∢', square: '□', blacksquare: '■', lozenge: '◊',
  blacklozenge: '⧫', therefore: '∴', because: '∵', circledast: '⊛',
  circledcirc: '⊚', boxtimes: '⊠', boxplus: '⊞', digamma: 'ϝ',
  Bbbk: '𝕜', eth: 'ð', mho: '℧'
}, 'amssymb');

const namedOperators = group({
  sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc',
  arcsin: 'arcsin', arccos: 'arccos', arctan: 'arctan', sinh: 'sinh',
  cosh: 'cosh', tanh: 'tanh', coth: 'coth', log: 'log', ln: 'ln',
  lg: 'lg', exp: 'exp', min: 'min', max: 'max', sup: 'sup', inf: 'inf',
  lim: 'lim', limsup: 'lim sup', liminf: 'lim inf', arg: 'arg', deg: 'deg',
  det: 'det', dim: 'dim', ker: 'ker', hom: 'hom', mod: 'mod', bmod: 'mod',
  pmod: 'mod', gcd: 'gcd', Pr: 'Pr'
});

export const mathSymbols: readonly LatexSymbol[] = [
  ...greekSymbols,
  ...binaryOperators,
  ...bigOperators,
  ...relations,
  ...amsRelations,
  ...arrows,
  ...amsArrows,
  ...delimiters,
  ...amsDelimiters,
  ...dots,
  ...miscellaneous,
  ...amsMiscellaneous,
  ...namedOperators
];

export const symbolIndex: ReadonlyMap<string, LatexSymbol> = new Map(
  mathSymbols.map(symbol => [symbol.name, symbol])
);
