import {
  ActionIcon,
  Group,
  MultiSelect,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { IconPlus } from '@tabler/icons-react';
import { FC, useState } from 'react';

import { AddTemplateModal } from './AddTemplateModal';
import { TemplateParams } from './TemplateParams';
import { useUploadGeneratorFileMutation } from '@/api/hooks/useGeneratorConfigs';
import {
  TemplateConfigForChanceMode,
  TemplateConfigForFSMMode,
  TemplateConfigForGeneralModes,
  TemplateEventPluginConfig,
  TemplatePickingMode,
} from '@/api/routes/generator-configs/schemas/plugins/event/configs/template';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { useProjectName } from '@/pages/ProjectPage/hooks/useProjectName';

interface TemplatesSectionProps {
  form: UseFormReturnType<TemplateEventPluginConfig>;
  existingFiles: string[];
}

export const TemplatesSection: FC<TemplatesSectionProps> = ({
  form,
  existingFiles,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [existingTemplates, setExistingTemplates] = useState<string[]>(
    form.getValues().templates.map((item) => Object.keys(item)[0]!)
  );

  form.watch('templates', ({ value }) => {
    if (!value) {
      setExistingTemplates([]);
      setSelectedTemplate(null);
    } else {
      const templates = value.map((item) => Object.keys(item)[0]!);
      setExistingTemplates(templates);

      if (selectedTemplate !== null && !templates.includes(selectedTemplate)) {
        setSelectedTemplate(null);
      }
    }
  });

  const uploadFile = useUploadGeneratorFileMutation();
  const { projectName } = useProjectName();

  function handleAddNewTemplate(
    templateName: string,
    templatePath: string,
    templateConfig: TemplateConfigForGeneralModes
  ) {
    uploadFile.mutate(
      {
        name: projectName,
        filepath: templatePath,
        content: 'Describe event',
      },
      {
        onSuccess: () => {
          form.setFieldValue('templates', (value) => [
            ...value,
            { [templateName]: templateConfig },
          ]);
          setSelectedTemplate(templateName);
        },
        onError: (error) => {
          notifications.show({
            title: 'Error',
            message: (
              <>
                Failed to add template file
                <ShowErrorDetailsAnchor error={error} prependDot />
              </>
            ),
            color: 'red',
          });
        },
      }
    );

    modals.closeAll();
  }

  return (
    <Stack>
      <Stack gap="4px">
        <Text size="sm" fw="bold">
          Templates
        </Text>
        <Select
          label={
            <LabelWithTooltip
              label="Template picking mode"
              tooltip="Algorithm of how template is picked for each timestamp"
            />
          }
          clearable
          searchable
          data={[
            {
              label: 'All',
              value: TemplatePickingMode.All,
            },
            {
              label: 'Any',
              value: TemplatePickingMode.Any,
            },
            {
              label: 'Chance',
              value: TemplatePickingMode.Chance,
            },
            {
              label: 'Spin',
              value: TemplatePickingMode.Spin,
            },
            {
              label: 'Chain',
              value: TemplatePickingMode.Chain,
            },
            {
              label: 'FSM',
              value: TemplatePickingMode.FSM,
            },
          ]}
          value={form.getValues().mode}
          onChange={(value) => {
            form.setFieldValue('mode', (prevValue) => {
              // remove not actual parameters of previous picking mode from state
              form.setFieldValue('templates', (prevTemplatesValue) => {
                const newValue = [...prevTemplatesValue];

                for (const templateItem of newValue) {
                  const templateName = Object.keys(templateItem)[0]!;
                  const template = templateItem[templateName];

                  if (prevValue === TemplatePickingMode.Chance) {
                    (template as TemplateConfigForChanceMode).chance =
                      undefined!;
                  } else if (prevValue === TemplatePickingMode.FSM) {
                    (template as TemplateConfigForFSMMode).initial = undefined!;
                    (template as TemplateConfigForFSMMode).transition =
                      undefined!;
                  }
                }

                if (prevValue === TemplatePickingMode.Chain) {
                  form.setFieldValue('chain', undefined!);
                }

                return newValue;
              });

              return value as TemplatePickingMode;
            });
          }}
        />
      </Stack>

      {form.getValues().mode === TemplatePickingMode.Chain && (
        <MultiSelect
          label={
            <LabelWithTooltip
              label="Chain"
              tooltip="Sequence of templates defining order of rendering"
            />
          }
          data={existingTemplates}
          clearable
          searchable
          hidePickedOptions
          onChange={(value) => {
            if (value.length === 0) {
              form.setFieldValue('chain', undefined!);
            } else {
              form.setFieldValue('chain', value);
            }
          }}
        />
      )}

      <Group align="end" wrap="nowrap" gap="xs">
        <Select
          label="Select template to edit"
          data={existingTemplates}
          value={selectedTemplate}
          onChange={setSelectedTemplate}
          searchable
          nothingFoundMessage="No templates found"
          placeholder="template name"
          w="100%"
          clearable
        />
        <ActionIcon
          title="Add new template"
          size="lg"
          variant="default"
          onClick={() => {
            modals.open({
              title: 'Adding template',
              children: (
                <AddTemplateModal
                  existingTemplates={existingTemplates}
                  existingFiles={existingFiles}
                  onAdd={handleAddNewTemplate}
                />
              ),
              size: 'md',
            });
          }}
        >
          <IconPlus size={20} />
        </ActionIcon>
      </Group>

      {selectedTemplate !== null && (
        <TemplateParams
          form={form}
          selectedTemplate={selectedTemplate}
          existingFiles={existingFiles}
        />
      )}
    </Stack>
  );
};
