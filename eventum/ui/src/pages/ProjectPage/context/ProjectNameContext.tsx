import { createContext, useState } from 'react';

export interface ProjectNameContextValue {
  projectName: string;
  setProjectName: (name: string) => void;
}

const ProjectNameContext = createContext<ProjectNameContextValue | undefined>(
  undefined
);

interface ProjectNameProviderProps {
  children: React.ReactNode;
  initialProjectName: string;
}

export const ProjectNameProvider = ({
  children,
  initialProjectName,
}: ProjectNameProviderProps) => {
  const [projectName, setProjectName] = useState<string>(initialProjectName);

  return (
    <ProjectNameContext.Provider value={{ projectName, setProjectName }}>
      {children}
    </ProjectNameContext.Provider>
  );
};

export default ProjectNameContext;
