import { FileNode, FileNodesList } from '../../schemas';

export function flattenFileTree(
  fileTree: FileNodesList,
  filesOnly: boolean
): string[] {
  const result: string[] = [];

  function traverse(node: FileNode, path: string) {
    const currentPath = `${path}/${node.name}`;

    if (node.is_dir) {
      if (node.children) {
        for (const child of node.children) {
          traverse(child, currentPath);
        }
      } else if (!filesOnly) {
        result.push(currentPath);
      }
    } else {
      result.push(currentPath);
    }
  }

  for (const node of fileTree) {
    traverse(node as FileNode, '.');
  }

  return result;
}

export function createFileTreeLookup(fileTree: FileNode[]) {
  const items = new Map<string, FileNode>();
  const children = new Map<string, string[]>();

  children.set('.', []);

  function traverse(node: FileNode, parentPath: string) {
    const currentPath = `${parentPath}/${node.name}`;

    items.set(currentPath, node);

    if (!children.has(parentPath)) {
      children.set(parentPath, []);
    }

    children.get(parentPath)!.push(currentPath);

    if (node.is_dir) {
      children.set(currentPath, []);

      if (node.children) {
        for (const child of node.children) {
          traverse(child, currentPath);
        }
      }
    }
  }

  for (const node of fileTree) {
    traverse(node, '.');
  }

  return { items, children };
}
