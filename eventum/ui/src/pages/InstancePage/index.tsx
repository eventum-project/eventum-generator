import { useParams } from 'react-router-dom';

export default function InstancePage() {
  const { instanceId } = useParams() as { instanceId: string };

  return <>Instance: {instanceId}</>;
}
