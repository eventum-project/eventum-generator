import {
  Button,
  NumberInput,
  Select,
  Stack,
  Switch,
  Textarea,
} from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { FC } from 'react';
import YAML from 'yaml';

import {
  TemplateConfigForChanceMode,
  TemplateConfigForFSMMode,
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
  const existingTemplates = form
    .getValues()
    .templates.map((item) => Object.keys(item)[0]!);
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

      {pickingMode === TemplatePickingMode.FSM && (
        <Stack>
          <Switch
            label={
              <LabelWithTooltip
                label="Initial"
                tooltip="Set this template as initial state"
              />
            }
            checked={(template as TemplateConfigForFSMMode).initial ?? false}
            onChange={(value) => {
              form.setFieldValue('templates', (prevValue) => {
                const newValue = [...prevValue];
                const templateItem = newValue[selectedTemplateIndex]!;
                const template = templateItem[
                  selectedTemplate
                ] as TemplateConfigForFSMMode;

                template.initial = value.currentTarget.checked
                  ? true
                  : undefined;

                return newValue;
              });
            }}
          />
          <Select
            label={
              <LabelWithTooltip
                label="To"
                tooltip="Name of template of next state after transition"
              />
            }
            data={existingTemplates}
            value={
              (template as TemplateConfigForFSMMode).transition?.to ?? null
            }
            onChange={(value) => {
              form.setFieldValue('templates', (prevValue) => {
                const newValue = [...prevValue];
                const templateItem = newValue[selectedTemplateIndex]!;
                const template = templateItem[
                  selectedTemplate
                ] as TemplateConfigForFSMMode;

                if (!value) {
                  template.transition = undefined;
                } else {
                  template.transition = {
                    when: template.transition?.when ?? undefined,
                    to: value ?? '',
                  };
                }

                return newValue;
              });
            }}
            searchable
            nothingFoundMessage="No template found"
            placeholder="template name"
            clearable
          />
          <Stack gap="2px">
            <Textarea
              label="When"
              description="Condition for performing transition to next state in YAML format. See examples in documentation."
              placeholder="..."
              minRows={3}
              autosize
              defaultValue={YAML.stringify(
                (template as TemplateConfigForFSMMode).transition?.when ??
                  undefined
              )}
              onChange={(event) => {
                let parsedValue: unknown;

                if (!event.currentTarget.value) {
                  parsedValue = undefined;
                } else {
                  try {
                    parsedValue = YAML.parse(event.currentTarget.value);
                  } catch {
                    return;
                  }
                }

                form.setFieldValue('templates', (prevValue) => {
                  const newValue = [...prevValue];
                  const templateItem = newValue[selectedTemplateIndex]!;
                  const template = templateItem[
                    selectedTemplate
                  ] as TemplateConfigForFSMMode;

                  template.transition = {
                    when: parsedValue,
                    to: template.transition?.to ?? '',
                  };

                  return newValue;
                });
              }}
            />
          </Stack>
        </Stack>
      )}

      <Button
        variant="default"
        onClick={() => onDelete(selectedTemplate, template.template)}
      >
        Remove
      </Button>
    </Stack>
  );
};
