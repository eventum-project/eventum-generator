import {
  dragAndDropFeature,
  hotkeysCoreFeature,
  renamingFeature,
  selectionFeature,
  syncDataLoaderFeature,
} from '@headless-tree/core';
import { useTree } from '@headless-tree/react';
import { Box, Group, NavLink, Stack, Text, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { dirname, join } from 'pathe';
import { FC, useEffect } from 'react';

import { FileNodeItemIcon } from './FileNodeItemIcon';
import { useMoveGeneratorFileMutation } from '@/api/hooks/useGeneratorConfigs';
import { createFileTreeLookup } from '@/api/routes/generator-configs/modules/file-tree';
import { FileNode } from '@/api/routes/generator-configs/schemas';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { useFileTree } from '@/pages/ProjectPage/hooks/useFileTree';
import { useProjectName } from '@/pages/ProjectPage/hooks/useProjectName';

interface TreeProps {
  fileTreeLookup: ReturnType<typeof createFileTreeLookup>;
}

export const Tree: FC<TreeProps> = ({ fileTreeLookup }) => {
  'use no memo';

  const { selectedItem, setSelectedItem } = useFileTree();
  const { projectName } = useProjectName();
  const moveFile = useMoveGeneratorFileMutation();

  const tree = useTree<FileNode>({
    features: [
      syncDataLoaderFeature,
      selectionFeature,
      hotkeysCoreFeature,
      dragAndDropFeature,
      renamingFeature,
    ],
    initialState: {},
    rootItemId: '.',
    getItemName: (item) => item.getItemData().name,
    isItemFolder: (item) => item.getItemData().is_dir,
    canReorder: true,
    openOnDropDelay: 500,
    indent: 20,
    dataLoader: {
      getItem: (itemId) =>
        fileTreeLookup.items.get(itemId) ?? {
          name: '',
          is_dir: false,
          children: [],
        },
      getChildren: (itemId) => fileTreeLookup.children.get(itemId) ?? [],
    },
    onPrimaryAction: (item) => {
      setSelectedItem(item);
    },
    onRename: (item, newName) => {
      const oldName = item.getItemName();
      const directory = dirname(item.getId());

      const source = join(directory, oldName);
      const destination = join(directory, newName);

      moveFile.mutate(
        {
          name: projectName,
          source: source,
          destination: destination,
        },
        {
          onError: (error) => {
            notifications.show({
              title: 'Error',
              message: (
                <>
                  Failed to rename file
                  <ShowErrorDetailsAnchor error={error} prependDot />
                </>
              ),
              color: 'red',
            });
          },
        }
      );
    },
    onDrop: (items, target) => {
      const destination = target.item.getId();

      for (const item of items) {
        const source = item.getId();
        const sourceDirectory = dirname(source);

        if (sourceDirectory === destination) {
          continue;
        }

        moveFile.mutate(
          {
            name: projectName,
            source: source,
            destination: destination,
          },
          {
            onError: (error) => {
              notifications.show({
                title: 'Error',
                message: (
                  <>
                    Failed to move file &quot;{source}&quot;
                    <ShowErrorDetailsAnchor error={error} prependDot />
                  </>
                ),
                color: 'red',
              });
            },
          }
        );
      }
    },
  });

  useEffect(() => {
    if (selectedItem === undefined) {
      return;
    }

    const pathSegments = selectedItem.getId().split('/').slice(1);
    let currentPath = '.';

    for (const segment of pathSegments.slice(0, -1)) {
      currentPath += '/' + segment;
      const parentItem = tree.getItemInstance(currentPath);
      parentItem.expand();
    }

    tree.setSelectedItems([selectedItem.getId()]);
  }, [tree, selectedItem]);

  useEffect(() => {
    tree.rebuildTree();
  }, [tree, fileTreeLookup]);

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
                {item.isRenaming() ? (
                  <TextInput
                    {...item.getRenameInputProps()}
                    size="sm"
                    styles={{
                      input: {
                        minHeight: 'unset',
                        height: '20px',
                        padding: '0',
                        borderRadius: '4px',
                      },
                    }}
                    disabled={moveFile.isPending}
                  />
                ) : (
                  <Text size="sm">{item.getItemName()}</Text>
                )}
              </Group>
            }
          />
        </Box>
      ))}
    </Stack>
  );
};
