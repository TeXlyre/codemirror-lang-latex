import { EditorState, Transaction, ChangeSpec, EditorSelection } from '@codemirror/state';
import { KeyBinding, Command } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { findEnvironmentName } from './parser-integration';

// Function to check if we're at the end of a \begin command
function isAfterBeginEnvironment(state: EditorState, pos: number): { name: string, start: number } | null {
  const tree = syntaxTree(state);
  const node = tree.resolve(pos, -1);

  // Check if we're in a begin environment context
  if (node.name === 'BeginEnv' || node.parent?.name === 'BeginEnv') {
    const beginNode = node.name === 'BeginEnv' ? node : node.parent;
    if (!beginNode) return null;

    // Extract environment name
    const envName = findEnvironmentName(beginNode);
    if (!envName) return null;

    return { name: envName, start: beginNode.from };
  }

  // Alternative approach: look at the text directly
  // This is useful when the syntax tree might not be fully parsed yet
  const lineStart = state.doc.lineAt(pos).from;
  const lineText = state.sliceDoc(lineStart, pos);

  // Look for \begin{envname} pattern
  const beginMatch = /\\begin\{([^}]+)\}/.exec(lineText);
  if (beginMatch) {
    const envName = beginMatch[1];
    const startPos = lineStart + beginMatch.index;
    return { name: envName, start: startPos };
  }

  return null;
}

// Function to check if we're typing a closing brace for an environment name
function isClosingEnvironmentBrace(state: EditorState, pos: number): string | null {
  const lineStart = state.doc.lineAt(pos).from;
  const lineText = state.sliceDoc(lineStart, pos);

  // Check for \begin{ pattern followed by a name
  const beginMatch = /\\begin\{([^}]*)$/.exec(lineText);
  if (beginMatch) {
    return beginMatch[1]; // Return the environment name (might be partial)
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

// Handler for the closing brace to auto-complete \end{}
export const handleCloseBrace: Command = (view) => {
  const state = view.state;
  const pos = state.selection.main.head;
  const envName = isClosingEnvironmentBrace(state, pos);

  if (envName) {
    // Look ahead to see if there's already an \end{} for this environment
    const restOfDoc = state.sliceDoc(pos);
    const endPattern = new RegExp(`\\\\end\\{${envName}\\}`);

    if (!endPattern.test(restOfDoc)) {
      // Insert the closing brace and the matching \end command
      const insertText = `}\n\\end{${envName}}`;

      view.dispatch({
        changes: { from: pos, insert: insertText },
        selection: { anchor: pos + 1 } // Position cursor after the closing brace
      });

      return true;
    }
  }

  return false;
};

// Auto-close tags extension implementation
export const autoCloseTags = EditorState.transactionFilter.of(tr => {
  if (!tr.isUserEvent("input")) return tr;

  const state = tr.startState;
  const changes = tr.changes;
  let newChanges: ChangeSpec[] = [];
  let newSelection = tr.selection;

  // Check if the user just typed a character that might trigger auto-completion
  changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    if (inserted.length === 1) {
      const char = inserted.sliceString(0);
      const pos = toB;

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

          // Create a proper selection object with the main selection range
          // pointing to after the indentation
          newSelection = EditorSelection.single(toB + indentation.length);
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
          }
        }
      }
    }
  });

  if (newChanges.length > 0) {
    return state.update({
      changes: [changes, ...newChanges],
      selection: newSelection
    });
  }

  return tr;
});

// Key bindings for LaTeX auto-completion
export const latexKeymap: readonly KeyBinding[] = [
  { key: "Enter", run: handleEnterInEnvironment },
  { key: "}", run: handleCloseBrace }
];