import {
  hotkeysCoreFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { Box, Group, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import clsx from 'clsx';
import { FC } from 'react';

import { FileNodeItemIcon } from './FileNodeItemIcon';
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
          ml={`${item.getItemMeta().level * 10}px`}
          style={{ cursor: 'pointer' }}
        >
          <Box
            className={clsx('treeitem', {
              focused: item.isFocused(),
              expanded: item.isExpanded(),
              selected: item.isSelected(),
              folder: item.isFolder(),
            })}
          >
            <Group wrap="nowrap" gap="6px" align="center">
              {item.isFolder() ? (
                <Group wrap="nowrap" gap="2px">
                  {item.isExpanded() ? (
                    <IconChevronDown size={15} />
                  ) : (
                    <IconChevronRight size={15} />
                  )}

                  <FileNodeItemIcon item={item} />
                </Group>
              ) : (
                <Box ml="16px">
                  <FileNodeItemIcon item={item} />
                </Box>
              )}
              <Text size="sm">{item.getItemName()}</Text>
            </Group>
          </Box>
        </Box>
      ))}
    </Stack>
  );
};
