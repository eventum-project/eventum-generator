import {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';

import { getCompletions } from './globals';

function jinjaVariableCompletion(
  context: CompletionContext
): CompletionResult | null | Promise<CompletionResult | null> {
  const triggerOnWord = context.matchBefore(/\w+/);
  // eslint-disable-next-line sonarjs/slow-regex
  const triggerOnDotAfterWord = context.matchBefore(/\w+\./);

  let from = 0;
  let to = 0;
  if (triggerOnWord !== null) {
    from = triggerOnWord.from;
    to = triggerOnWord.to;
  } else if (triggerOnDotAfterWord !== null) {
    from = triggerOnDotAfterWord.to;
    to = triggerOnDotAfterWord.to;
  } else {
    return null;
  }

  if (!triggerOnWord && !triggerOnDotAfterWord) return null;

  const cursorPos = context.pos;

  const ast = syntaxTree(context.state);
  const currentNode = ast.resolveInner(cursorPos, -1);

  const completions: Completion[] = [];
  if (currentNode.name === 'VariableName') {
    // variables completion
    ast.iterate({
      enter: (node) => {
        if (node.name !== 'Tag') {
          return true;
        }

        if (node.to >= cursorPos) {
          return false;
        }

        const definition = node.node.getChild('Definition');
        if (definition === null) {
          return false;
        }

        const varName = context.state.doc.sliceString(
          definition.from,
          definition.to
        );
        completions.push({ label: varName, type: 'variable' });
        return false;
      },
    });

    completions.push(...getCompletions([]));
  } else if (
    (currentNode.name === '.' || currentNode.name === 'PropertyName') &&
    currentNode.node.parent?.name === 'MemberExpression'
  ) {
    // namespaces completion
    const memberExpression = currentNode.node.parent;
    const memberExpressionText = context.state.doc.sliceString(
      memberExpression.from,
      memberExpression.to
    );

    const path = memberExpressionText.split('.').slice(0, -1);

    completions.push(...getCompletions(path));
  }

  return completions.length > 0
    ? {
        from: from,
        to: to,
        options: completions,
      }
    : null;
}

export async function jinjaCompletion(
  context: CompletionContext
): Promise<CompletionResult | null> {
  const completionSources = context.state
    .languageDataAt<CompletionSource[]>('autocomplete', context.pos)
    .flat();

  for (const completionSource of [
    jinjaVariableCompletion,
    ...completionSources,
  ]) {
    const completion = completionSource(context);

    if (completion === null) {
      continue;
    }

    if (!(completion instanceof Promise)) {
      return completion;
    }

    const resolvedCompletion = await completion;

    if (resolvedCompletion === null) {
      continue;
    }

    return resolvedCompletion;
  }

  return null;
}
