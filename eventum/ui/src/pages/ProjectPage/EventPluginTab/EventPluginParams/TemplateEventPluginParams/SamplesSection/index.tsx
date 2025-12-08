import { ActionIcon, Group, Select, Stack, Text } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { modals } from '@mantine/modals';
import { IconPlus } from '@tabler/icons-react';
import { FC, useState } from 'react';

import { AddSampleModal } from './AddSampleModal';
import { SamplesParams } from './SamplesParams';
import { TemplateEventPluginConfig } from '@/api/routes/generator-configs/schemas/plugins/event/configs/template';

interface SamplesSectionProps {
  form: UseFormReturnType<TemplateEventPluginConfig>;
  existingFiles: string[];
}

export const SamplesSection: FC<SamplesSectionProps> = ({
  form,
  existingFiles,
}) => {
  const [selectedSample, setSelectedSample] = useState<string | null>(null);
  const [existingSamples, setExistingSamples] = useState<string[]>([]);

  form.watch('samples', ({ value }) => {
    if (!value) {
      setExistingSamples([]);
      setSelectedSample(null);
    } else {
      const samples = Object.keys(value);
      setExistingSamples(samples);
      if (selectedSample !== null && !samples.includes(selectedSample)) {
        setSelectedSample(null);
      }
    }
  });

  return (
    <Stack>
      <Stack gap="4px">
        <Text size="sm" fw="bold">
          Samples
        </Text>
        <Group align="end" wrap="nowrap" gap="xs">
          <Select
            label="Select sample to edit"
            data={existingSamples}
            value={selectedSample}
            onChange={setSelectedSample}
            searchable
            nothingFoundMessage="No samples found"
            placeholder="sample name"
            w="100%"
            clearable
          />
          <ActionIcon
            title="Adding sample"
            size="lg"
            variant="default"
            onClick={() => {
              modals.open({
                title: 'Add new sample',
                children: (
                  <AddSampleModal
                    existingSamples={existingSamples}
                    onAdd={(sampleName, sampleConfig) => {
                      form.setFieldValue('samples', (value) => ({
                        ...value,
                        [sampleName]: sampleConfig,
                      }));
                      modals.closeAll();
                      setSelectedSample(sampleName);
                    }}
                  />
                ),
                size: 'md',
              });
            }}
          >
            <IconPlus size={20} />
          </ActionIcon>
        </Group>
      </Stack>

      {selectedSample !== null && (
        <SamplesParams
          form={form}
          selectedSample={selectedSample}
          existingFiles={existingFiles}
        />
      )}
    </Stack>
  );
};
