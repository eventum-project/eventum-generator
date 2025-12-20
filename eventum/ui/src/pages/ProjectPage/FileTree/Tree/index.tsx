import {
  dragAndDropFeature,
  hotkeysCoreFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { Box, Group, NavLink, Stack, Text } from '@mantine/core';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
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
    canReorder: true,
    openOnDropDelay: 500,
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
    features: [
      syncDataLoaderFeature,
      selectionFeature,
      hotkeysCoreFeature,
      dragAndDropFeature,
    ],
  });

  return (
    <Stack {...tree.getContainerProps()} className="tree" gap="0">
      {tree.getItems().map((item) => (
        <Box
          {...item.getProps()}
          key={item.getId()}
          ml={`${item.getItemMeta().level * 10}px`}
          style={{ cursor: 'pointer' }}
        >
          <NavLink
            active={item.isSelected() || item.isDragTarget()}
            style={{ borderRadius: '6px' }}
            p="4px"
            label={
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
            }
          />
        </Box>
      ))}
    </Stack>
  );
};
