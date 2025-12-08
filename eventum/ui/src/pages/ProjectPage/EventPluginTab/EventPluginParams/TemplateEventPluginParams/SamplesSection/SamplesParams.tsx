import {
  ActionIcon,
  Button,
  Center,
  Group,
  JsonInput,
  Kbd,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
} from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { modals } from '@mantine/modals';
import { IconFile, IconList } from '@tabler/icons-react';
import { FC } from 'react';

import {
  CSVSampleConfig,
  SampleType,
  TemplateEventPluginConfig,
} from '@/api/routes/generator-configs/schemas/plugins/event/configs/template';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';

interface SamplesParamsProps {
  form: UseFormReturnType<TemplateEventPluginConfig>;
  selectedSample: string;
  existingFiles: string[];
}

export const SamplesParams: FC<SamplesParamsProps> = ({
  form,
  selectedSample,
  existingFiles,
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
          />
        )}
        {sample.type == SampleType.CSV && (
          <Stack>
            <Select
              label={<LabelWithTooltip label="Source" tooltip="CSV file" />}
              data={existingFiles}
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
          <Select
            label={<LabelWithTooltip label="Source" tooltip="JSON file" />}
            data={existingFiles}
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
          />
        )}
      </Stack>
      <Button
        variant="default"
        onClick={() => {
          modals.openConfirmModal({
            title: 'Deleting sample',
            children: (
              <Text size="sm">
                Sample <b>{selectedSample}</b> will be deleted. Do you want to
                continue?
              </Text>
            ),
            labels: { confirm: 'Confirm', cancel: 'Cancel' },
            onConfirm: () => {
              form.setFieldValue('samples', (prevValue) => {
                const newValue = { ...prevValue };
                delete newValue[selectedSample];
                return newValue;
              });
            },
          });
        }}
      >
        Remove
      </Button>
    </Stack>
  );
};
