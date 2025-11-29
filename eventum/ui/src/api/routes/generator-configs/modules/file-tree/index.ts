import { FileNodesList } from '../../schemas';

interface FileNode {
  name: string;
  is_dir: boolean;
  children: object[];
}

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
          traverse(child as FileNode, currentPath);
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
