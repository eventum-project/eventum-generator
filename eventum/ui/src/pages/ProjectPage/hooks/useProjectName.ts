import { useContext } from 'react';

import ProjectNameContext, {
  ProjectNameContextValue,
} from '../context/ProjectNameContext';

export const useProjectName = (): ProjectNameContextValue => {
  const context = useContext(ProjectNameContext);

  if (!context) {
    throw new Error('useProjectName must be used within a ProjectNameProvider');
  }

  return context;
};
