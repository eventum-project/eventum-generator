import { Button, NumberInput, Select, Stack } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { FC } from 'react';

import { FSMPickingModeParameters } from './FSMPickingModeParameters';
import {
  TemplateConfigForChanceMode,
  TemplateEventPluginConfig,
  TemplatePickingMode,
} from '@/api/routes/generator-configs/schemas/plugins/event/configs/template';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

interface TemplateParamsProps {
  form: UseFormReturnType<TemplateEventPluginConfig>;
  selectedTemplate: string;
  existingFiles: string[];
  onDelete: (templateName: string, templatePath: string) => void;
}

export const TemplateParams: FC<TemplateParamsProps> = ({
  form,
  selectedTemplate,
  existingFiles,
  onDelete,
}) => {
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

      {pickingMode === TemplatePickingMode.FSM && <FSMPickingModeParameters />}

      <Button
        variant="default"
        onClick={() => onDelete(selectedTemplate, template.template)}
      >
        Remove
      </Button>
    </Stack>
  );
};
