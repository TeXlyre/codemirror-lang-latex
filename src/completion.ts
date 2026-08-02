// src/completion.ts
import { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import {
  commandIndex,
  documentClassOptions,
  documentClasses,
  includegraphicsKeys,
  latexCommands,
  latexEnvironments,
  environmentIndex,
  latexPackages,
  packageOptions,
  tabularColumnSpecs
} from './latex-data';
import { greekSymbols, mathSymbols } from './latex-symbols';
import { scanLatexModes } from './parser-utils';

const TABULAR_ENVIRONMENTS = 'tabular\\*?|tabularx|xltabular|longtable|array|NiceTabular|tabu';

function unique(names: string[]): string[] {
  return [...new Set(names)];
}

// Checks if we're at the beginning of an environment name within a \begin{} or \end{}
function isInEnvironmentName(context: CompletionContext): boolean {
  const textBefore = context.state.sliceDoc(Math.max(0, context.pos - 20), context.pos);
  return /\\(begin|end)\{[^}]*$/.test(textBefore);
}

// Checks if we're inside a command name (after a backslash)
function isInCommandName(context: CompletionContext): boolean {
  const textBefore = context.state.sliceDoc(Math.max(0, context.pos - 30), context.pos);
  return /\\[a-zA-Z]*$/.test(textBefore);
}

// Checks if we're in math mode
function isInMathMode(context: CompletionContext): boolean {
  return scanLatexModes(context.state.sliceDoc(0, context.pos)).openMath;
}

// Innermost environment that has not been closed before the cursor
function innermostOpenEnvironment(context: CompletionContext): string | null {
  const { envStack } = scanLatexModes(context.state.sliceDoc(0, context.pos));
  return envStack.length > 0 ? envStack[envStack.length - 1] : null;
}

// LaTeX environment names for autocompletion
export const environments: readonly string[] = latexEnvironments.map(environment => environment.name);

// LaTeX commands for autocompletion
export const commands: readonly string[] = unique([
  ...latexCommands.map(command => command.name),
  ...greekSymbols.map(symbol => symbol.name),
  '\\sum', '\\int', '\\prod', '\\lim', '\\infty', '\\partial'
]);

// Additional math commands for completion in math mode
export const mathCommands: readonly string[] = unique([
  ...mathSymbols.map(symbol => symbol.name),
  ...latexCommands.filter(command => command.math).map(command => command.name)
]);

// Completions for package names after \usepackage
export const packages: readonly string[] = latexPackages;

const commandSet = new Set(commands);

// Places the cursor inside the first empty group of a template
function applyTemplate(template: string): Completion['apply'] {
  const groupStart = template.indexOf('{}');
  const anchorOffset = groupStart === -1 ? template.length : groupStart + 1;
  return (view, completion, from, to) => {
    view.dispatch({
      changes: { from, to, insert: template },
      selection: { anchor: from + anchorOffset }
    });
  };
}

// Create environment completion with auto-closing and proper indentation
function createEnvironmentCompletion(envName: string, autoCloseEnabled: boolean, boost = 1): Completion {
  const info = environmentIndex.get(envName);
  return {
    label: envName,
    type: "class",
    detail: info?.package,
    apply: (view, completion, from, to) => {
      const line = view.state.doc.lineAt(from);
      const beforeCursor = view.state.sliceDoc(line.from, from);
      const nextChar = view.state.sliceDoc(to, to + 1);
      const hasExistingCloseBrace = nextChar === "}";
      const effectiveTo = hasExistingCloseBrace ? to + 1 : to;

      if (/\\begin\{[^}]*$/.test(beforeCursor)) {
        const lineText = line.text;
        const indentMatch = lineText.match(/^(\s*)/);
        const currentIndentation = indentMatch ? indentMatch[1] : '';
        const innerIndentation = currentIndentation + "  ";

        let insertContent = `${envName}}`;
        let selectionAnchorOffset = 1;

        if (autoCloseEnabled) {
          insertContent += `\n${innerIndentation}\n${currentIndentation}\\end{${envName}}`;
          selectionAnchorOffset += innerIndentation.length + 1;
        }

        view.dispatch({
          changes: { from, to: effectiveTo, insert: insertContent },
          selection: { anchor: from + envName.length + selectionAnchorOffset }
        });

      } else if (/\\end\{[^}]*$/.test(beforeCursor)) {
        view.dispatch({
          changes: { from, to: effectiveTo, insert: `${envName}}` },
          selection: { anchor: from + envName.length + 1 }
        });
      } else {
        view.dispatch({
          changes: { from, to, insert: envName },
          selection: { anchor: from + envName.length }
        });
      }
    },
    boost
  };
}

// Create command completion with environment auto-closing and argument templates
function createCommandCompletion(cmd: string, autoCloseEnabled: boolean): Completion {
  if (cmd.startsWith('\\begin{')) {
    const envMatch = cmd.match(/\\begin\{([^}]+)\}/);
    if (envMatch) {
      const envName = envMatch[1];
      return {
        label: cmd,
        type: "function",
        apply: (view, completion, from, to) => {
          const line = view.state.doc.lineAt(from);
          const lineText = line.text;
          const indentMatch = lineText.match(/^(\s*)/);
          const currentIndentation = indentMatch ? indentMatch[1] : '';
          const innerIndentation = currentIndentation + "  ";
          const nextChar = view.state.sliceDoc(to, to + 1);
          const effectiveTo = nextChar === "}" ? to + 1 : to;

          let content = `\\begin{${envName}}`;
          let selectionAnchorOffset = cmd.length;

          if (autoCloseEnabled) {
            content += `\n${innerIndentation}\n${currentIndentation}\\end{${envName}}`;
            selectionAnchorOffset += 1 + innerIndentation.length;
          }

          view.dispatch({
            changes: { from, to: effectiveTo, insert: content },
            selection: { anchor: from + selectionAnchorOffset }
          });
        },
        boost: 1
      };
    }
  }

  const info = commandIndex.get(cmd);
  return {
    label: cmd,
    type: info?.detail ? "variable" : "function",
    detail: info?.detail ?? info?.package,
    apply: info?.template ? applyTemplate(info.template) : cmd,
    boost: 1
  };
}

// Define and export snippets for LaTeX
export const snippets: readonly Completion[] = [
  {
    label: "\\begin{...}",
    type: "keyword",
    detail: "LaTeX environment",
    info: "Create a LaTeX environment",
    apply: (view, completion, from, to) => {
      view.dispatch({
        changes: { from, to, insert: "\\begin{}" },
        selection: { anchor: from + 7 }
      });
    },
  },
  {
    label: "\\section{...}",
    type: "keyword",
    detail: "LaTeX section",
    info: "Create a section",
    apply: "\\section{}",
  },
  {
    label: "\\subsection{...}",
    type: "keyword",
    detail: "LaTeX subsection",
    info: "Create a subsection",
    apply: "\\subsection{}",
  },
  {
    label: "\\begin{figure}",
    type: "keyword",
    detail: "LaTeX figure environment",
    info: "Create a figure environment",
    apply: (view, completion, from, to) => {
      const line = view.state.doc.lineAt(from);
      const lineText = line.text;
      const indentMatch = lineText.match(/^(\s*)/);
      const currentIndentation = indentMatch ? indentMatch[1] : '';
      const innerIndentation = currentIndentation + "  ";

      const content = `\\begin{figure}[htbp]\n${innerIndentation}\\centering\n${innerIndentation}\\includegraphics[width=0.8\\textwidth]{}\n${innerIndentation}\\caption{}\n${innerIndentation}\\label{fig:}\n${currentIndentation}\\end{figure}`;
      view.dispatch({
        changes: { from, to, insert: content },
        selection: { anchor: from + 1 + content.indexOf("{}") }
      });
    },
  },
  {
    label: "\\begin{table}",
    type: "keyword",
    detail: "LaTeX table environment",
    info: "Create a table environment",
    apply: (view, completion, from, to) => {
      const line = view.state.doc.lineAt(from);
      const lineText = line.text;
      const indentMatch = lineText.match(/^(\s*)/);
      const currentIndentation = indentMatch ? indentMatch[1] : '';
      const innerIndentation = currentIndentation + "  ";
      const tableIndentation = innerIndentation + "  ";

      const content = `\\begin{table}[htbp]\n${innerIndentation}\\centering\n${innerIndentation}\\begin{tabular}{ccc}\n${tableIndentation}header1 & header2 & header3 \\\\\n${tableIndentation}\\hline\n${tableIndentation}data1 & data2 & data3 \\\\\n${innerIndentation}\\end{tabular}\n${innerIndentation}\\caption{}\n${innerIndentation}\\label{tab:}\n${currentIndentation}\\end{table}`;
      view.dispatch({
        changes: { from, to, insert: content },
        selection: { anchor: from + 1 + content.indexOf("{}") }
      });
    },
  }
];

// Completions for a bracketed option list
function optionCompletions(values: readonly string[]): Completion[] {
  return values.map(value => ({ label: value, type: "property", apply: value, boost: 1 }));
}

// Options of \documentclass, \usepackage and \includegraphics
function completeOptions(context: CompletionContext): CompletionResult | null {
  const classOptions = context.matchBefore(/\\documentclass\[[^\]]*$/);
  if (classOptions) {
    return {
      from: context.pos - (/[a-zA-Z0-9=.-]*$/.exec(classOptions.text)?.[0].length ?? 0),
      options: optionCompletions(documentClassOptions),
      validFor: /^[a-zA-Z0-9=.-]*$/
    };
  }

  const usepackageOptions = context.matchBefore(/\\(usepackage|RequirePackage)\[[^\]]*$/);
  if (usepackageOptions) {
    const following = context.state.sliceDoc(context.pos, context.pos + 120);
    const packageName = /^[^\]]*\]\s*\{([a-zA-Z0-9,.-]+)\}/.exec(following)?.[1].split(',')[0];
    const values = packageName ? packageOptions[packageName] : undefined;
    if (!values) return null;
    return {
      from: context.pos - (/[a-zA-Z0-9=.-]*$/.exec(usepackageOptions.text)?.[0].length ?? 0),
      options: optionCompletions(values),
      validFor: /^[a-zA-Z0-9=.-]*$/
    };
  }

  const graphicsOptions = context.matchBefore(/\\includegraphics\[[^\]]*$/);
  if (graphicsOptions) {
    return {
      from: context.pos - (/[a-zA-Z]*$/.exec(graphicsOptions.text)?.[0].length ?? 0),
      options: includegraphicsKeys.map(key => ({
        label: key.label,
        type: "property",
        detail: key.detail,
        apply: key.label,
        boost: 1
      })),
      validFor: /^[a-zA-Z]*$/
    };
  }

  return null;
}

// Braced arguments listing known names: classes, packages and column specifications
function completeBracedArguments(context: CompletionContext): CompletionResult | null {
  const columnSpec = context.matchBefore(
    new RegExp(`\\\\begin\\{(?:${TABULAR_ENVIRONMENTS})\\}(?:\\[[^\\]]*\\])?(?:\\{[^{}]*\\})?\\{[^{}]*$`)
  );
  if (columnSpec) {
    return {
      from: context.pos,
      options: tabularColumnSpecs.map(spec => ({
        label: spec.label,
        type: "type",
        detail: spec.detail,
        apply: spec.template ? applyTemplate(spec.template) : spec.label,
        boost: 1
      })),
      validFor: /^$/
    };
  }

  const classMatch = context.matchBefore(/\\documentclass(\[[^\]]*\])?\{([a-zA-Z0-9,.-]*)$/);
  if (classMatch) {
    return {
      from: classMatch.from + classMatch.text.lastIndexOf('{') + 1,
      options: documentClasses.map(name => ({ label: name, type: "constant", apply: name, boost: 1 })),
      validFor: /^[a-zA-Z0-9.-]*$/
    };
  }

  const packageMatch = context.matchBefore(/\\(usepackage|RequirePackage)(\[[^\]]*\])?\{([a-zA-Z0-9,.-]*)$/);
  if (packageMatch) {
    return {
      from: packageMatch.from + packageMatch.text.lastIndexOf('{') + 1,
      options: packages.map(pkg => ({ label: pkg, type: "constant", apply: pkg, boost: 1 })),
      validFor: /^[a-zA-Z0-9,.-]*$/
    };
  }

  return null;
}

// Main completion function that provides autocomplete suggestions based on context
export function latexCompletionSource(autoCloseTagsEnabled: boolean) {
  return function (context: CompletionContext): CompletionResult | null {
    const optionResult = completeOptions(context);
    if (optionResult) return optionResult;

    const bracedResult = completeBracedArguments(context);
    if (bracedResult) return bracedResult;

    // Check if we're in an environment name. Boost math inside math environments
    if (isInEnvironmentName(context)) {
      const envMatch = context.matchBefore(/\\(begin|end)\{([a-zA-Z*]*)$/);
      if (envMatch) {
        const inMath = isInMathMode(context);
        const available = latexEnvironments.filter(environment => !environment.mathOnly || inMath);
        const options = available.map(environment =>
          createEnvironmentCompletion(environment.name, autoCloseTagsEnabled)
        );

        if (envMatch.text.startsWith('\\end')) {
          const open = innermostOpenEnvironment(context);
          if (open) {
            options.unshift(createEnvironmentCompletion(open, autoCloseTagsEnabled, 99));
          }
        }

        return {
          from: envMatch.from + envMatch.text.lastIndexOf('{') + 1,
          options,
          validFor: /^[a-zA-Z*]*$/
        };
      }
    }

    // Check if we're in a command name
    if (isInCommandName(context)) {
      const cmdMatch = context.matchBefore(/\\([a-zA-Z]*)$/);
      if (cmdMatch) {
        let options: Completion[] = commands.map(cmd => createCommandCompletion(cmd, autoCloseTagsEnabled));

        // Add math commands if in math mode
        if (isInMathMode(context)) {
          options = [
            ...options,
            ...mathCommands
              .filter(cmd => !commandSet.has(cmd))
              .map(cmd => createCommandCompletion(cmd, autoCloseTagsEnabled))
          ];
        }

        // Add snippets to the commands
        options = [...options, ...snippets];

        return {
          from: cmdMatch.from,
          options,
          validFor: /^\\?[a-zA-Z]*$/
        };
      }
    }

    return null;
  };
}
