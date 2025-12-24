import {
  ActionIcon,
  Button,
  Center,
  Group,
  JsonInput,
  Kbd,
  SegmentedControl,
  Stack,
  Switch,
  TextInput,
} from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { IconFile, IconList } from '@tabler/icons-react';
import { FC } from 'react';

import {
  CSVSampleConfig,
  SampleType,
  TemplateEventPluginConfig,
} from '@/api/routes/generator-configs/schemas/plugins/event/configs/template';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';
import { ProjectFileSelect } from '@/pages/ProjectPage/components/ProjectFileSelect';

interface SamplesParamsProps {
  form: UseFormReturnType<TemplateEventPluginConfig>;
  selectedSample: string;
  onDelete: () => void;
}

export const SamplesParams: FC<SamplesParamsProps> = ({
  form,
  selectedSample,
  onDelete,
}) => {
  const samples = form.getValues().samples;
  if (samples === undefined) {
    return null;
  }
  if (samples[selectedSample] === undefined) {
    return null;
  }
  const sample = samples[selectedSample];

  return (
    <Stack>
      <Stack gap="4px">
        <SegmentedControl
          data={[
            {
              label: (
                <Center>
                  <Group gap="4px">
                    <IconList size={14} />
                    <span>Items</span>
                  </Group>
                </Center>
              ),
              value: SampleType.Items,
            },
            {
              label: (
                <Center>
                  <Group gap="4px">
                    <IconFile size={14} />
                    <span>CSV</span>
                  </Group>
                </Center>
              ),
              value: SampleType.CSV,
            },
            {
              label: (
                <Center>
                  <Group gap="4px">
                    <IconFile size={14} />
                    <span>JSON</span>
                  </Group>
                </Center>
              ),
              value: SampleType.JSON,
            },
          ]}
          value={sample.type}
          onChange={(value) => {
            form.setFieldValue('samples', (prevValue) => {
              const newValue = { ...prevValue };
              const sample = newValue[selectedSample]!;
              sample.type = value as SampleType;

              if (sample.type == SampleType.JSON) {
                sample.source = '';
              } else if (sample.type == SampleType.CSV) {
                sample.source = '';
                sample.header = true;
                sample.delimiter = ',';
              } else if (sample.type == SampleType.Items) {
                sample.source = ['item1', 'item2', 'item3'];
              }

              return newValue;
            });
          }}
        />
        {sample.type == SampleType.Items && (
          <JsonInput
            label="Sample items"
            description="Each element of list is a sample's item"
            placeholder="[ ... ]"
            validationError="Invalid JSON"
            minRows={4}
            autosize
            defaultValue={JSON.stringify(sample.source ?? [])}
            onChange={(value) => {
              let parsedValue: unknown;
              try {
                parsedValue = JSON.parse(value);
              } catch {
                return;
              }

              if (!Array.isArray(parsedValue)) {
                return;
              }

              form.setFieldValue('samples', (prevValue) => {
                const newValue = { ...prevValue };
                const sample = newValue[selectedSample]!;
                sample.source = parsedValue;
                return newValue;
              });
            }}
            error={form.errors.samples}
          />
        )}
        {sample.type == SampleType.CSV && (
          <Stack>
            <ProjectFileSelect
              label={<LabelWithTooltip label="Source" tooltip="CSV file" />}
              placeholder=".csv .tsv"
              clearable
              searchable
              value={sample.source ?? null}
              onChange={(value) => {
                form.setFieldValue('samples', (prevValue) => {
                  const newValue = { ...prevValue };
                  const sample = newValue[selectedSample]!;
                  sample.source = value ?? '';
                  return newValue;
                });
              }}
              error={form.errors.samples}
              extensions={['.csv', '.tsv']}
            />
            <TextInput
              label={
                <LabelWithTooltip
                  label="Delimiter"
                  tooltip="Delimiter used in CSV file"
                />
              }
              rightSection={
                <Group wrap="nowrap" gap="2px">
                  <ActionIcon
                    variant="transparent"
                    title="Set tabulation as delimiter"
                    onClick={() => {
                      form.setFieldValue('samples', (prevValue) => {
                        const newValue = { ...prevValue };
                        const sample = newValue[
                          selectedSample
                        ] as CSVSampleConfig;
                        sample.delimiter = '\t';
                        return newValue;
                      });
                    }}
                  >
                    <Kbd>\t</Kbd>
                  </ActionIcon>
                </Group>
              }
              rightSectionWidth={40}
              value={sample.delimiter ?? ','}
              onChange={(event) => {
                form.setFieldValue('samples', (prevValue) => {
                  const newValue = { ...prevValue };
                  const sample = newValue[selectedSample] as CSVSampleConfig;
                  sample.delimiter = event.currentTarget.value;
                  return newValue;
                });
              }}
            />
            <Switch
              label={
                <LabelWithTooltip
                  label="Header"
                  tooltip="Whether CSV sample includes header on its first line"
                />
              }
              checked={sample.header ?? true}
              onChange={(event) => {
                form.setFieldValue('samples', (prevValue) => {
                  const newValue = { ...prevValue };
                  const sample = newValue[selectedSample] as CSVSampleConfig;
                  sample.header = event.currentTarget.checked;
                  return newValue;
                });
              }}
            />
          </Stack>
        )}

        {sample.type == SampleType.JSON && (
          <ProjectFileSelect
            label={<LabelWithTooltip label="Source" tooltip="JSON file" />}
            placeholder=".json"
            clearable
            searchable
            value={sample.source ?? null}
            onChange={(value) => {
              form.setFieldValue('samples', (prevValue) => {
                const newValue = { ...prevValue };
                const sample = newValue[selectedSample]!;
                sample.source = value ?? '';
                return newValue;
              });
            }}
            error={form.errors.samples}
            extensions={['.json']}
          />
        )}
      </Stack>
      <Button variant="default" onClick={onDelete}>
        Remove
      </Button>
    </Stack>
  );
};
