import { Button, NumberInput, Select, Stack } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { modals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { FC } from 'react';

import { RemoveTemplateModal } from './RemoveTemplateModal';
import { useDeleteGeneratorFileMutation } from '@/api/hooks/useGeneratorConfigs';
import {
  TemplateConfigForChanceMode,
  TemplateEventPluginConfig,
  TemplatePickingMode,
} from '@/api/routes/generator-configs/schemas/plugins/event/configs/template';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { useProjectName } from '@/pages/ProjectPage/hooks/useProjectName';

interface TemplateParamsProps {
  form: UseFormReturnType<TemplateEventPluginConfig>;
  selectedTemplate: string;
  existingFiles: string[];
}

export const TemplateParams: FC<TemplateParamsProps> = ({
  form,
  selectedTemplate,
  existingFiles,
}) => {
  const { projectName } = useProjectName();
  const deleteFile = useDeleteGeneratorFileMutation();

  const templates = form.getValues().templates;
  const selectedTemplateIndex = templates.findIndex(
    (item) => Object.keys(item)[0] === selectedTemplate
  );
  const templateItem = templates[selectedTemplateIndex];

  if (templateItem === undefined) {
    return null;
  }

  const template = Object.values(templateItem)[0];
  if (template === undefined) {
    return null;
  }

  const pickingMode = form.getValues().mode;

  function handleRemoveTemplate(values: { isRemoveFile: boolean }) {
    form.setFieldValue('templates', (prevValue) => {
      return [
        ...prevValue.slice(0, selectedTemplateIndex),
        ...prevValue.slice(selectedTemplateIndex + 1),
      ];
    });

    if (values.isRemoveFile && template?.template) {
      deleteFile.mutate(
        { name: projectName, filepath: template.template },
        {
          onError: (error) => {
            notifications.show({
              title: 'Error',
              message: (
                <>
                  Failed to delete template file
                  <ShowErrorDetailsAnchor error={error} prependDot />
                </>
              ),
              color: 'red',
            });
          },
        }
      );
    }

    modals.closeAll();
  }

  return (
    <Stack>
      <Select
        label={
          <LabelWithTooltip label="Template" tooltip="Path to template file" />
        }
        data={existingFiles}
        value={
          template.template.startsWith('./')
            ? template.template
            : './' + template.template
        }
        onChange={(value) => {
          form.setFieldValue('templates', (prevValue) => {
            const newValue = [...prevValue];
            const templateItem = newValue[selectedTemplateIndex]!;
            const template = templateItem[selectedTemplate]!;
            template.template = value ?? '';
            return newValue;
          });
        }}
        searchable
        nothingFoundMessage="No files found"
        placeholder="path"
        clearable
      />

      {pickingMode === TemplatePickingMode.Chance && (
        <NumberInput
          label={
            <LabelWithTooltip
              label="Chance"
              tooltip="Proportional value of probability for template to be picked for rendering"
            />
          }
          min={0}
          onChange={(value) => {
            form.setFieldValue('templates', (prevValue) => {
              const newValue = [...prevValue];
              const templateItem = newValue[selectedTemplateIndex]!;
              const template = templateItem[
                selectedTemplate
              ] as TemplateConfigForChanceMode;
              if (typeof value === 'string') {
                template.chance = undefined!;
              } else {
                template.chance = value;
              }

              return newValue;
            });
          }}
          value={(template as TemplateConfigForChanceMode).chance}
        />
      )}
      <Button
        variant="default"
        onClick={() => {
          modals.open({
            title: 'Removing template',
            children: (
              <RemoveTemplateModal
                templateName={selectedTemplate}
                filePath={template.template}
                onDelete={handleRemoveTemplate}
                isDeleting={deleteFile.isPending}
              />
            ),
          });
        }}
      >
        Remove
      </Button>
    </Stack>
  );
};
