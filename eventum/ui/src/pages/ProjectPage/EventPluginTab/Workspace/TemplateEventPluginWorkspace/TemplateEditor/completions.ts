import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';

export function jinjaVariableCompletion(
  context: CompletionContext
): CompletionResult | null | Promise<CompletionResult | null> {
  console.log('run');
  const word = context.matchBefore(/\w*/);

  if (!word) return null;

  const cursorPos = context.pos;
  if (word.from === word.to) {
    return null;
  }

  const ast = syntaxTree(context.state);
  const currentNode = ast.resolveInner(cursorPos, -1);

  if (currentNode.name !== 'VariableName') {
    return null;
  }

  const variables: string[] = [];
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
      variables.push(varName);
      return false;
    },
  });

  return {
    from: word.from,
    to: word.to,
    options: variables.map((v) => ({
      label: v,
      type: 'variable',
    })),
  };
}
