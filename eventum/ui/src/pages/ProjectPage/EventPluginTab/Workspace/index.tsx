import { FC } from 'react';

import { TemplateEventPluginWorkspace } from './TemplateEventPluginWorkspace';
import { EventPluginName } from '@/api/routes/generator-configs/schemas/plugins/event/base-config';

interface WorkspaceProps {
  pluginName: EventPluginName;
}

const pluginNamesToWorkspaceComponents = {
  template: TemplateEventPluginWorkspace,
  replay: '',
  script: '',
} as const satisfies Record<EventPluginName, FC>;

export const Workspace: FC<WorkspaceProps> = ({ pluginName }) => {
  const WorkspaceComponent = pluginNamesToWorkspaceComponents[pluginName];

  return <WorkspaceComponent />;
};
