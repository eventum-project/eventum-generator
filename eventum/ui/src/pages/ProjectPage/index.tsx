import { useParams } from 'react-router-dom';

export default function ProjectPage() {
  const { projectName } = useParams<{ projectName: string }>();

  return <>Project: {projectName}</>;
}
