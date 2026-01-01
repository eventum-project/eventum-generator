import { ItemInstance } from '@headless-tree/core';
import { createContext, useState } from 'react';

import { FileNode } from '@/api/routes/generator-configs/schemas';

export interface FileTreeContextValue {
  selectedItem: ItemInstance<FileNode> | undefined;
  setSelectedItem: React.Dispatch<
    React.SetStateAction<ItemInstance<FileNode> | undefined>
  >;
}

const FileTreeContext = createContext<FileTreeContextValue | undefined>(
  undefined
);

interface FileTreeProviderProps {
  children: React.ReactNode;
}

export const FileTreeProvider = ({ children }: FileTreeProviderProps) => {
  const [selectedItem, setSelectedItem] = useState<
    ItemInstance<FileNode> | undefined
  >();

  return (
    <FileTreeContext.Provider
      value={{ selectedItem: selectedItem, setSelectedItem: setSelectedItem }}
    >
      {children}
    </FileTreeContext.Provider>
  );
};

export default FileTreeContext;
