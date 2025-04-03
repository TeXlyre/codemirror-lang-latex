import { Diagnostic } from '@codemirror/lint';
import { EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { SyntaxNode } from '@lezer/common';

/**
 * Simple LaTeX linter for CodeMirror 6
 * Performs basic syntax checking and best practices validation
 */
export function latexLinter(options: {
  checkMissingDocumentEnv?: boolean,
  checkUnmatchedEnvironments?: boolean,
  checkMissingReferences?: boolean
} = {}) {
  const defaultOptions = {
    checkMissingDocumentEnv: true,
    checkUnmatchedEnvironments: true,
    checkMissingReferences: true
  };

  const opts = { ...defaultOptions, ...options };

  return (view: EditorView): Diagnostic[] => {
    const diagnostics: Diagnostic[] = [];
    const tree = syntaxTree(view.state);
    const doc = view.state.doc;

    // Check if document environment is missing
    if (opts.checkMissingDocumentEnv) {
      let hasDocumentEnv = false;
      tree.cursor().iterate(node => {
        if (node.name === 'DocumentEnvironment' || node.name === 'DocumentEnvName') {
          hasDocumentEnv = true;
          return false; // Stop iteration
        }
      });

      if (!hasDocumentEnv && doc.length > 100) { // Only apply to non-trivial documents
        diagnostics.push({
          from: 0,
          to: Math.min(doc.length, 200),
          severity: 'warning',
          message: 'Missing document environment. LaTeX documents should be enclosed in \\begin{document}...\\end{document}',
          source: 'LaTeX'
        });
      }
    }

    // Check for unmatched environments
    if (opts.checkUnmatchedEnvironments) {
      const beginEnvs: Map<string, number[]> = new Map();
      const endEnvs: Map<string, number[]> = new Map();

      // Collect all begin and end environments
      tree.cursor().iterate(node => {
        if (node.name === 'BeginEnv') {
          const envNameNode = findEnvName(node);
          if (envNameNode) {
            const envName = doc.sliceString(envNameNode.from, envNameNode.to);
            if (!beginEnvs.has(envName)) {
              beginEnvs.set(envName, []);
            }
            beginEnvs.get(envName)?.push(node.from);
          }
        } else if (node.name === 'EndEnv') {
          const envNameNode = findEnvName(node);
          if (envNameNode) {
            const envName = doc.sliceString(envNameNode.from, envNameNode.to);
            if (!endEnvs.has(envName)) {
              endEnvs.set(envName, []);
            }
            endEnvs.get(envName)?.push(node.from);
          }
        }
      });

      // Check for mismatches
      for (const [envName, begins] of beginEnvs.entries()) {
        const ends = endEnvs.get(envName) || [];
        if (begins.length > ends.length) {
          // More begins than ends
          for (let i = ends.length; i < begins.length; i++) {
            diagnostics.push({
              from: begins[i],
              to: begins[i] + 6 + envName.length + 1, // \begin{name}
              severity: 'error',
              message: `Missing \\end{${envName}}`,
              source: 'LaTeX'
            });
          }
        }
      }

      for (const [envName, ends] of endEnvs.entries()) {
        const begins = beginEnvs.get(envName) || [];
        if (ends.length > begins.length) {
          // More ends than begins
          for (let i = begins.length; i < ends.length; i++) {
            diagnostics.push({
              from: ends[i],
              to: ends[i] + 4 + envName.length + 1, // \end{name}
              severity: 'error',
              message: `Missing \\begin{${envName}}`,
              source: 'LaTeX'
            });
          }
        }
      }
    }

    // Check for references to missing labels
    if (opts.checkMissingReferences) {
      const labels: Set<string> = new Set();
      const refs: Map<string, number> = new Map();

      // Collect all labels and refs
      tree.cursor().iterate(node => {
        if (node.name === 'LabelCtrlSeq') {
          const labelArg = node.node.nextSibling;
          if (labelArg && labelArg.name === 'LabelArgument') {
            const content = doc.sliceString(labelArg.from + 1, labelArg.to - 1);
            labels.add(content);
          }
        } else if (node.name === 'RefCtrlSeq' || node.name === 'RefStarrableCtrlSeq') {
          const refArg = node.node.nextSibling?.nextSibling;
          if (refArg && refArg.name === 'RefArgument') {
            const content = doc.sliceString(refArg.from + 1, refArg.to - 1);
            refs.set(content, node.from);
          }
        }
      });

      // Check for refs to missing labels
      for (const [ref, pos] of refs.entries()) {
        if (!labels.has(ref)) {
          diagnostics.push({
            from: pos,
            to: pos + ref.length + 6, // Approximate length of \ref{name}
            severity: 'warning',
            message: `Reference to undefined label: ${ref}`,
            source: 'LaTeX'
          });
        }
      }
    }

    return diagnostics;
  };
}

// Helper function to find environment name node
function findEnvName(node: any): SyntaxNode | null {
  // Look for the EnvName child, possibly inside an EnvNameGroup
  const envNameGroup = node.getChild('EnvNameGroup');
  if (envNameGroup) {
    // Try to find various environment name node types
    return envNameGroup.getChild('EnvName') ||
           envNameGroup.getChild('DocumentEnvName') ||
           envNameGroup.getChild('TabularEnvName') ||
           envNameGroup.getChild('EquationEnvName') ||
           envNameGroup.getChild('EquationArrayEnvName') ||
           envNameGroup.getChild('VerbatimEnvName') ||
           envNameGroup.getChild('TikzPictureEnvName') ||
           envNameGroup.getChild('FigureEnvName') ||
           envNameGroup.getChild('ListEnvName') ||
           envNameGroup.getChild('TableEnvName');
  }
  return null;
}