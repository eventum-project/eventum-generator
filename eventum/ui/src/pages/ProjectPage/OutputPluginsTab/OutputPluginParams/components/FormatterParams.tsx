import {
  Center,
  Group,
  NumberInput,
  SegmentedControl,
  Select,
  Stack,
  Textarea,
} from '@mantine/core';
import type { FormErrors, SetErrors } from '@mantine/form';
import { IconBraces, IconFile } from '@tabler/icons-react';
import { zod4Resolver } from 'mantine-form-zod-resolver';
import { FC, ReactNode, useState } from 'react';

import { ProjectFileSelect } from '../../../components/ProjectFileSelect';
import { SyslogFormatterParams } from './SyslogFormatterParams';
import {
  Format,
  FormatterConfig,
  FormatterConfigSchema,
  SyslogFormatterConfig,
} from '@/api/routes/generator-configs/schemas/plugins/output/formatters';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

const validateGenericFormatter = zod4Resolver(FormatterConfigSchema);

interface FormatterParamsProps {
  value: FormatterConfig | undefined;
  errors: FormErrors;
  setErrors?: SetErrors;
  validate?: (config: FormatterConfig | undefined) => FormErrors;
  onChange: (config: FormatterConfig | undefined) => void;
}

export const FormatterParams: FC<FormatterParamsProps> = ({
  value,
  errors,
  setErrors,
  validate,
  onChange,
}) => {
  const [templateSourceType, setTemplateSourceType] = useState<
    'template' | 'template-path'
  >('template');

  const update = (config: FormatterConfig | undefined) => {
    onChange(config);
    setErrors?.((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(
          ([path]) => path !== 'formatter' && !path.startsWith('formatter.')
        )
      );

      const validationErrors =
        validate?.(config) ??
        (config === undefined
          ? {}
          : Object.fromEntries(
              Object.entries(validateGenericFormatter(config)).map(
                ([path, error]) => [`formatter.${path}`, error]
              )
            ));

      for (const [path, error] of Object.entries(validationErrors)) {
        if (path === 'formatter' || path.startsWith('formatter.')) {
          next[path] = error;
        }
      }

      return next;
    });
  };

  return (
    <Stack gap="xs">
      <Select
        label={
          <LabelWithTooltip label="Format" tooltip="Target format of content" />
        }
        placeholder="format"
        data={[
          Format.EventumHTTPInput,
          Format.JSON,
          Format.JSONBatch,
          Format.Plain,
          Format.Syslog,
          Format.Template,
          Format.TemplateBatch,
        ]}
        clearable
        error={errors['formatter.format']}
        value={value?.format ?? null}
        onChange={(value) => {
          if (value === null) {
            // eslint-disable-next-line unicorn/no-useless-undefined
            update(undefined);
          } else {
            update({ format: value as Format });
          }
        }}
      />

      {(value?.format === Format.JSON ||
        value?.format === Format.JSONBatch) && (
        <NumberInput
          label={
            <LabelWithTooltip
              label="Indent"
              tooltip="Indentation size of JSON content"
            />
          }
          placeholder="number"
          min={0}
          step={1}
          allowDecimal={false}
          error={errors['formatter.indent']}
          value={value.indent ?? 0}
          onChange={(val) => {
            update({
              format: value.format,
              indent: typeof val === 'number' ? val : 0,
            });
          }}
        />
      )}

      {value?.format === Format.Syslog && (
        <SyslogFormatterParams
          value={value}
          errors={errors}
          onChange={(config: SyslogFormatterConfig) => update(config)}
        />
      )}

      {(value?.format === Format.Template ||
        value?.format === Format.TemplateBatch) && (
        <Stack gap="xs">
          <SegmentedControl
            data={
              [
                {
                  label: (
                    <Center>
                      <Group gap="4px">
                        <IconBraces size={14} />
                        <span>Template</span>
                      </Group>
                    </Center>
                  ),
                  value: 'template',
                },
                {
                  label: (
                    <Center>
                      <Group gap="4px">
                        <IconFile size={14} />
                        <span>Template file</span>
                      </Group>
                    </Center>
                  ),
                  value: 'template-path',
                },
              ] as const satisfies {
                label: ReactNode;
                value: typeof templateSourceType;
              }[]
            }
            value={templateSourceType}
            onChange={(value) =>
              setTemplateSourceType(value as typeof templateSourceType)
            }
          />
          {templateSourceType === 'template' && (
            <Textarea
              label={
                <LabelWithTooltip
                  label="Template"
                  tooltip="Jinja template content"
                />
              }
              placeholder="template code"
              description="To access original event(s) use `event` or `events` variables
              in template for `template` and `template-batch` modes correspondingly"
              minRows={3}
              autosize
              error={errors['formatter.template']}
              value={value.template ?? ''}
              onChange={(e) => {
                update({
                  format: value.format,
                  template: e.currentTarget.value,
                });
              }}
            />
          )}
          {templateSourceType === 'template-path' && (
            <ProjectFileSelect
              label={
                <LabelWithTooltip
                  label="Template path"
                  tooltip="Path to file with template content"
                />
              }
              clearable
              searchable
              error={
                errors['formatter.template_path'] ??
                (!value?.template_path ? 'Template path is required' : null)
              }
              value={value?.template_path ?? null}
              onChange={(val) => {
                update({
                  format: value.format,
                  template_path: val ?? undefined,
                });
              }}
              extensions={['.jinja']}
            />
          )}
        </Stack>
      )}
    </Stack>
  );
};
