import {
  ItemInstance,
  hotkeysCoreFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { Box, Flex, Group, Stack, Text } from '@mantine/core';
import {
  IconBraces,
  IconBrandPython,
  IconChevronDown,
  IconChevronRight,
  IconCube,
  IconFileInvoice,
  IconFileSpreadsheet,
  IconFileText,
  IconFolder,
} from '@tabler/icons-react';
import clsx from 'clsx';
import { FC } from 'react';

import { createFileTreeLookup } from '@/api/routes/generator-configs/modules/file-tree';
import { FileNode } from '@/api/routes/generator-configs/schemas';
import { IconJinja } from '@/components/ui/icons/IconJinja';

interface TreeProps {
  fileTreeLookup: ReturnType<typeof createFileTreeLookup>;
}

interface FileNodeItemIconProps {
  item: ItemInstance<FileNode>;
}

const FileNodeItemIcon: FC<FileNodeItemIconProps> = ({ item }) => {
  const size = 15;

  if (item.isFolder()) {
    return (
      <Flex align="center">
        <IconFolder size={size} />
      </Flex>
    );
  }

  const fileName = item.getItemName();
  if (/^generator\.ya?ml$/.test(fileName)) {
    return (
      <Flex c="primary" align="center">
        <IconCube size={size} />
      </Flex>
    );
  }
  if (fileName.endsWith('.py')) {
    return (
      <Flex c="blue" align="center">
        <IconBrandPython size={size} />
      </Flex>
    );
  }
  if (fileName.endsWith('.jinja')) {
    return (
      <Flex c="gray.6">
        <IconJinja size={size} />
      </Flex>
    );
  }
  if (fileName.endsWith('.csv') || fileName.endsWith('.tsv')) {
    return (
      <Flex c="green" align="center">
        <IconFileSpreadsheet size={size} />
      </Flex>
    );
  }
  if (fileName.endsWith('.json')) {
    return (
      <Flex c="orange" align="center">
        <IconBraces size={size} />
      </Flex>
    );
  }
  if (fileName.endsWith('.yml') || fileName.endsWith('.yaml')) {
    return (
      <Flex c="red" align="center">
        <IconFileInvoice size={size} />
      </Flex>
    );
  }

  return (
    <Flex align="center">
      <IconFileText size={size} />
    </Flex>
  );
};

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
