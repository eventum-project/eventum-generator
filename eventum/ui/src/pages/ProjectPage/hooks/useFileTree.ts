import { useContext } from 'react';

import FileTreeContext, {
  FileTreeContextValue,
} from '../context/FileTreeContext';

export const useFileTree = (): FileTreeContextValue => {
  const context = useContext(FileTreeContext);

  if (!context) {
    throw new Error('useFileTree must be used within a FileTreeProvider');
  }

  return context;
};
