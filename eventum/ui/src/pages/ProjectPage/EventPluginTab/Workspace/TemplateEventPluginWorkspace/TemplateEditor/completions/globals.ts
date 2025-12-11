import { Completion } from '@codemirror/autocomplete';

interface NamespaceMember {
  completion: Completion;
  members?: Record<string, NamespaceMember>;
}

const namespaceCompletions: NamespaceMember = {
  completion: {
    label: '#',
    type: 'namespace',
    detail: 'Global',
  },
  members: {
    rand: {
      completion: {
        label: 'rand',
        type: 'namespace',
        detail: 'Module for generating random values.',
      },
      members: {
        shuffle: {
          completion: {
            label: 'shuffle',
            type: 'function',
            detail: 'Shuffle sequence elements.',
          },
        },
        number: {
          completion: {
            label: 'number',
            type: 'namespace',
            detail: 'Generating random numbers.',
          },
          members: {
            integer: {
              completion: {
                label: 'integer',
                type: 'function',
                detail: 'Return random integer in range [a, b].',
                info: '(a: int, b: int) -> int',
              },
            },
          },
        },
      },
    },
  },
};

const completionCache = new Map<string, Completion[]>();

export function getCompletions(path: string[]): Completion[] {
  const cacheKey = path.join('.');
  const cached = completionCache.get(cacheKey);
  if (cached) return cached;

  let context = namespaceCompletions;

  for (const node of path) {
    const members = context.members;
    if (members === undefined) {
      break;
    }

    const drilledMember = members[node];
    if (drilledMember === undefined) {
      break;
    }

    context = drilledMember;
  }

  const result =
    context.members === undefined
      ? []
      : Object.values(context.members).map((item) => item.completion);

  completionCache.set(cacheKey, result);

  return result;
}
