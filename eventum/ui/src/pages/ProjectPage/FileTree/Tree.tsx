import {
  hotkeysCoreFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { Box, Stack, Text } from '@mantine/core';
import clsx from 'clsx';
import { FC } from 'react';

import { createFileTreeLookup } from '@/api/routes/generator-configs/modules/file-tree';
import { FileNode } from '@/api/routes/generator-configs/schemas';

interface TreeProps {
  fileTreeLookup: ReturnType<typeof createFileTreeLookup>;
}

export const Tree: FC<TreeProps> = ({ fileTreeLookup }) => {
  'use no memo';

  const tree = useTree<FileNode>({
    initialState: {},
    rootItemId: '.',
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => item.getItemData().is_dir,
    dataLoader: {
      getItem: (itemId) =>
        fileTreeLookup.items.get(itemId) ?? {
          name: '',
          is_dir: false,
          children: [],
        },
      getChildren: (itemId) => fileTreeLookup.children.get(itemId) ?? [],
    },
    indent: 20,
    features: [syncDataLoaderFeature, selectionFeature, hotkeysCoreFeature],
  });

  return (
    <Stack {...tree.getContainerProps()} className="tree" gap="xs">
      {tree.getItems().map((item) => (
        <Box
          {...item.getProps()}
          key={item.getId()}
          style={{ paddingLeft: `${item.getItemMeta().level * 10}px` }}
        >
          <Box
            className={clsx('treeitem', {
              focused: item.isFocused(),
              expanded: item.isExpanded(),
              selected: item.isSelected(),
              folder: item.isFolder(),
            })}
          >
            <Text size="sm">{item.getItemName()}</Text>
          </Box>
        </Box>
      ))}
    </Stack>
  );
};
