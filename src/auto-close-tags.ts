import { EditorState, Transaction, ChangeSpec, EditorSelection } from '@codemirror/state';
import { KeyBinding, Command } from '@codemirror/view';

// Function to check if we're at the end of a \begin command
function isAfterBeginEnvironment(state: EditorState, pos: number): { name: string, start: number } | null {
  const lineStart = state.doc.lineAt(pos).from;
  const lineText = state.sliceDoc(lineStart, pos);

  // Look for \begin{envname} pattern
  const beginMatch = /\\begin\{([^}]+)\}[ \t]*$/.exec(lineText);
  if (beginMatch) {
    const envName = beginMatch[1];
    const startPos = lineStart + beginMatch.index;
    return { name: envName, start: startPos };
  }

  return null;
}

// Handler for the Enter key to auto-complete environments
export const handleEnterInEnvironment: Command = (view) => {
  const state = view.state;
  const pos = state.selection.main.head;
  const beginEnv = isAfterBeginEnvironment(state, pos);

  if (beginEnv) {
    // Insert a newline, then a tab (for indentation), then another newline, then \end{envname}
    const indentation = '\t';
    const endText = `\n${indentation}\n\\end{${beginEnv.name}}`;

    view.dispatch({
      changes: { from: pos, insert: endText },
      selection: { anchor: pos + indentation.length + 1 }
    });

    return true;
  }

  return false;
};

// Auto-close tags extension implementation
export const autoCloseTags = EditorState.transactionFilter.of(tr => {
  if (!tr.isUserEvent("input.type")) return tr;

  const state = tr.startState;
  const changes = tr.changes;
  let newChanges: ChangeSpec[] = [];
  let newSelection = tr.selection;
  let modified = false;

  // Check if the user just typed a character that might trigger auto-completion
  changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    if (inserted.length === 1) {
      const char = inserted.sliceString(0);

      if (char === '\n') {
        // Handle auto-completion after \begin
        const docBefore = state.sliceDoc(0, fromA);
        // Check if the previous line ended with \begin{envname}
        const beginMatch = /\\begin\{([^}]+)\}[ \t]*$/.exec(docBefore);

        if (beginMatch) {
          const envName = beginMatch[1];
          // Insert indentation and \end at the appropriate location
          const indentation = '\t';
          const endText = `${indentation}\n\\end{${envName}}`;

          newChanges.push({ from: toB, insert: endText });
          newSelection = EditorSelection.single(toB + indentation.length);
          modified = true;
        }
      } else if (char === '}') {
        // Handle auto-completion of \end{} when closing a \begin{}
        const lineStart = state.doc.lineAt(fromA).from;
        const lineText = state.sliceDoc(lineStart, fromA);

        const beginMatch = /\\begin\{([^}]+)$/.exec(lineText);
        if (beginMatch) {
          const envName = beginMatch[1];
          // Look ahead to see if there's already an end command
          const restOfDoc = state.sliceDoc(toB);
          const endPattern = new RegExp(`\\\\end\\{${envName}\\}`);

          if (!endPattern.test(restOfDoc)) {
            // Insert the \end command
            const endText = `\n\\end{${envName}}`;

            newChanges.push({ from: toB, insert: endText });
            modified = true;
          }
        }
      }
    }
  });

  if (modified) {
    return [tr, {
      changes: newChanges,
      selection: newSelection,
      userEvent: "auto.complete"
    }];
  }

  return tr;
});

// Key bindings for LaTeX auto-completion
export const latexKeymap: readonly KeyBinding[] = [
  { key: "Enter", run: handleEnterInEnvironment }
];