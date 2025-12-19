import { FC } from 'react';

import { ReplayEventPluginWorkspace } from './ReplayEventPluginWorkspace';
import { ScriptEventPluginWorkspace } from './ScriptEventPluginWorkspace';
import { TemplateEventPluginWorkspace } from './TemplateEventPluginWorkspace';
import { EventPluginName } from '@/api/routes/generator-configs/schemas/plugins/event/base-config';

interface WorkspaceProps {
  pluginName: EventPluginName;
}

const pluginNamesToWorkspaceComponents = {
  replay: ReplayEventPluginWorkspace,
  script: ScriptEventPluginWorkspace,
  template: TemplateEventPluginWorkspace,
} as const satisfies Record<EventPluginName, FC>;

export const Workspace: FC<WorkspaceProps> = ({ pluginName }) => {
  const WorkspaceComponent = pluginNamesToWorkspaceComponents[pluginName];

  return <WorkspaceComponent />;
};
