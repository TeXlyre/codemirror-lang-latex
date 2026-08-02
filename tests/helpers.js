import { EditorState } from '@codemirror/state';
import { CompletionContext } from '@codemirror/autocomplete';
import { latex, latexLinter, latexCompletionSource } from '../dist/index.js';

const support = latex();

export function docState(doc) {
  return EditorState.create({ doc, extensions: [support] });
}

export function lint(doc, options = {}) {
  return latexLinter({ fileName: 'main.tex', ...options })({ state: docState(doc) });
}

export function messages(diagnostics) {
  return diagnostics.map(diagnostic => diagnostic.message);
}

export function complete(doc, pos = doc.length, explicit = false) {
  const result = latexCompletionSource(true)(new CompletionContext(docState(doc), pos, explicit));
  return result ? result.options : null;
}

export function labels(doc, pos, explicit) {
  const options = complete(doc, pos, explicit);
  return options ? options.map(option => option.label) : null;
}

export function optionFor(doc, label, pos) {
  const options = complete(doc, pos);
  return options ? options.find(option => option.label === label) : undefined;
}

// Runs a completion's apply callback and returns the resulting document and cursor
export function applyCompletion(doc, label, pos = doc.length) {
  const state = docState(doc);
  const result = latexCompletionSource(true)(new CompletionContext(state, pos, false));
  const option = result.options.find(candidate => candidate.label === label);
  let current = state;
  const view = {
    state: current,
    dispatch(spec) {
      current = current.update(spec).state;
      view.state = current;
    }
  };
  if (typeof option.apply === 'function') {
    option.apply(view, option, result.from, pos);
  } else {
    view.dispatch({
      changes: { from: result.from, to: pos, insert: option.apply ?? option.label },
      selection: { anchor: result.from + (option.apply ?? option.label).length }
    });
  }
  return { text: current.doc.toString(), cursor: current.selection.main.head };
}

export const preamble = '\\documentclass{article}\n';

export function document(body, head = '') {
  return `${preamble}${head}\\begin{document}\n${body}\n\\end{document}\n`;
}
