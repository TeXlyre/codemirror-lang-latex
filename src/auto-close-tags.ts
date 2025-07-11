// src/auto-close-tags.ts
import { EditorState, ChangeSpec, StateField, StateEffect, EditorSelection } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';

// Effect to signal auto-closing
const autoCloseEffect = StateEffect.define<{envName: string, pos: number}>();

// Field to track auto-closing state
export const autoCloseField = StateField.define<{active: boolean, lastEnv: string | null}>({
  create: () => ({ active: false, lastEnv: null }),
  update(value, tr) {
    for (let e of tr.effects) {
      if (e.is(autoCloseEffect)) {
        return { active: true, lastEnv: e.value.envName };
      }
    }
    return value;
  }
});

// Extract environment name from \begin{envname}
function getEnvironmentName(text: string): string | null {
  const match = /\\begin\{([^}]+)\}/.exec(text);
  return match ? match[1] : null;
}

// Get the indentation of the current line
function getCurrentLineIndentation(view: EditorView, pos: number): string {
  const line = view.state.doc.lineAt(pos);
  const lineText = line.text;
  const match = lineText.match(/^(\s*)/);
  return match ? match[1] : '';
}

// Check if cursor is after a \begin{envname}
function isAfterBeginEnvironment(view: EditorView): { name: string, pos: number } | null {
  const { state } = view;
  const { main } = state.selection;
  if (main.from !== main.to) return null;

  const line = state.doc.lineAt(main.from);
  const lineText = line.text;

  // Look for \begin{envname} pattern at the end of the line
  const match = /\\begin\{([^}]+)\}[ \t]*$/.exec(lineText);
  if (match) {
    return { name: match[1], pos: main.from };
  }

  return null;
}

// Handle Enter key when after \begin{envname}
export const handleEnterInEnvironment = (view: EditorView): boolean => {
  const envInfo = isAfterBeginEnvironment(view);
  if (!envInfo) return false;

  // Get the indentation of the current line
  const currentIndentation = getCurrentLineIndentation(view, envInfo.pos);
  const innerIndentation = currentIndentation + "  "; // Add two spaces for content

  // Create the content to insert
  const content = `\n${innerIndentation}\n${currentIndentation}\\end{${envInfo.name}}`;

  // Dispatch transaction with both changes and the effect
  view.dispatch({
    changes: { from: envInfo.pos, insert: content },
    selection: { anchor: envInfo.pos + innerIndentation.length + 1 },
    effects: [autoCloseEffect.of({ envName: envInfo.name, pos: envInfo.pos })]
  });

  return true;
};

// Handle closing brace to auto-complete environment
export const handleCloseBrace = (view: EditorView): boolean => {
  const { state } = view;
  const { main } = state.selection;
  if (main.from !== main.to) return false;

  const lineStart = state.doc.lineAt(main.from).from;
  const beforeCursor = state.sliceDoc(lineStart, main.from);

  // Check if typing a closing brace to finish \begin{envname
  const match = /\\begin\{([^}]*)$/.exec(beforeCursor);
  if (match) {
    const envName = match[1];

    // Get the indentation of the current line
    const currentIndentation = getCurrentLineIndentation(view, main.from);
    const innerIndentation = currentIndentation + "  "; // Add two spaces for content

    // Insert the closing brace and add the matching \end{envname}
    view.dispatch({
      changes: [
        { from: main.from, insert: "}" },
        { from: main.from, insert: `\n${innerIndentation}\n${currentIndentation}\\end{${envName}}` }
      ],
      selection: { anchor: main.from + innerIndentation.length + 2 }, // Position after }\n and indentation
      effects: [autoCloseEffect.of({ envName, pos: main.from })]
    });

    return true;
  }

  return false;
};

// Create a custom extension that combines keymap and transaction filter
export const autoCloseTags = [
  autoCloseField,

  // Key handlers
  keymap.of([
    { key: "Enter", run: handleEnterInEnvironment },
    { key: "}", run: handleCloseBrace }
  ]),

  // Transaction filter for tracking completions that should trigger auto-closing
  EditorState.transactionFilter.of(tr => {
    if (!tr.isUserEvent("input")) return tr;

    const state = tr.startState;
    const changes = tr.changes;
    let newChanges: ChangeSpec[] = [];
    let newSelection = tr.selection;
    let modified = false;

    // Check for environment completions that need auto-closing
    changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      const insertedText = inserted.sliceString(0);

      // Check if this looks like a \begin{env} that was just inserted via completion
      const beginMatch = /\\begin\{([^}]+)\}$/.exec(insertedText);
      if (beginMatch && tr.isUserEvent("input.complete")) {
        const envName = beginMatch[1];

        // Check if there's already a matching \end
        const docText = state.sliceDoc();
        const hasEnd = new RegExp(`\\\\end\\{${envName}\\}`).test(docText);

        if (!hasEnd) {
          // Get the indentation of the line where the \begin was inserted
          const line = state.doc.lineAt(fromA);
          const lineText = line.text;
          const indentMatch = lineText.match(/^(\s*)/);
          const currentIndentation = indentMatch ? indentMatch[1] : '';
          const innerIndentation = currentIndentation + "  ";

          newChanges.push({
            from: toB,
            insert: `\n${innerIndentation}\n${currentIndentation}\\end{${envName}}`
          });

          // Set cursor position inside the environment
          newSelection = EditorSelection.single(toB + innerIndentation.length + 1);;
          modified = true;
        }
      }
    });

    if (modified) {
      return [tr, {
        changes: newChanges,
        selection: newSelection,
        userEvent: "input.auto-close"
      }];
    }

    return tr;
  })
];
