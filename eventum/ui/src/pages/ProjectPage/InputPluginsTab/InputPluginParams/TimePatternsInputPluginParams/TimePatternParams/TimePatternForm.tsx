import {
  Divider,
  Group,
  NumberInput,
  RangeSlider,
  SegmentedControl,
  Select,
  Stack,
  Text,
  Textarea,
} from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { FC } from 'react';

import {
  Distribution,
  RANDOMIZER_DIRECTION,
  TIME_UNITS,
  TimePatternConfig,
} from '@/api/routes/generator-configs/schemas/plugins/input/configs/time_patterns';
import { LabelWithTooltip } from '@/components/ui/LabelWithTooltip';
import { VersatileDatetimeInput } from '@/pages/ProjectPage/VersatileDatetimeInput';

interface TimePatternFormProps {
  form: UseFormReturnType<TimePatternConfig>;
}

export const TimePatternForm: FC<TimePatternFormProps> = ({ form }) => {
  return (
    <Stack>
      <Stack gap="4px">
        <Text size="sm" fw="bold">
          General
        </Text>
        <Divider />
        <Textarea
          label="Label"
          description="Description of time pattern"
          {...form.getInputProps('label', { type: 'input' })}
        />
      </Stack>

      <Stack gap="4px">
        <Text size="sm" fw="bold">
          Oscillator
        </Text>
        <Divider />
        <Stack>
          <Group wrap="nowrap" align="start">
            <VersatileDatetimeInput
              label={
                <LabelWithTooltip
                  label="Start time"
                  tooltip="Start time of the distribution"
                />
              }
              {...form.getInputProps('oscillator.start', { type: 'input' })}
            />
            <VersatileDatetimeInput
              label={
                <LabelWithTooltip
                  label="End time"
                  tooltip="End time of the distribution"
                />
              }
              {...form.getInputProps('oscillator.end', { type: 'input' })}
            />
          </Group>
          <Group wrap="nowrap" align="start">
            <NumberInput
              label={
                <LabelWithTooltip
                  label="Period"
                  tooltip="Duration of one period"
                />
              }
              placeholder="number"
              min={0.1}
              {...form.getInputProps('oscillator.period', { type: 'input' })}
            />
            <Select
              label={
                <LabelWithTooltip
                  label="Period unit"
                  tooltip="Time unit of the period"
                />
              }
              data={TIME_UNITS}
              placeholder="unit"
              withCheckIcon={false}
              clearable
              {...form.getInputProps('oscillator.unit', { type: 'input' })}
            />
          </Group>
        </Stack>
      </Stack>

      <Stack gap="4px">
        <Text size="sm" fw="bold">
          Multiplier
        </Text>
        <Divider />
        <NumberInput
          label={
            <LabelWithTooltip
              label="Ratio"
              tooltip="Multiplication ratio (i.e. number of timestamps per each oscillation/period)"
            />
          }
          placeholder="ratio"
          min={1}
          allowDecimal={false}
          {...form.getInputProps('multiplier.ratio', { type: 'input' })}
        />
      </Stack>

      <Stack gap="4px">
        <Text size="sm" fw="bold">
          Randomizer
        </Text>
        <Divider />
        <Stack>
          <Group wrap="nowrap">
            <NumberInput
              label={
                <LabelWithTooltip
                  label="Deviation"
                  tooltip="Deviation ratio (i.e. percent of timestamps amount deviation per period)"
                />
              }
              placeholder="ratio"
              min={0}
              max={1}
              step={0.05}
              {...form.getInputProps('randomizer.deviation', {
                type: 'input',
              })}
            />
            <NumberInput
              label={
                <LabelWithTooltip
                  label="Sampling"
                  tooltip="Size of sample with random deviation ratios"
                />
              }
              placeholder="number"
              min={16}
              allowDecimal={false}
              {...form.getInputProps('randomizer.sampling', {
                type: 'input',
              })}
            />
          </Group>
          <SegmentedControl
            title="Deviation direction"
            data={RANDOMIZER_DIRECTION}
            {...form.getInputProps('randomizer.direction', {
              type: 'input',
            })}
          />
        </Stack>
      </Stack>

      <Stack gap="4px">
        <Text size="sm" fw="bold">
          Spreader
        </Text>
        <Divider />
        <SegmentedControl
          title="Distribution function"
          data={[
            Distribution.BETA,
            Distribution.TRIANGULAR,
            Distribution.UNIFORM,
          ]}
          {...form.getInputProps('spreader.distribution', {
            type: 'input',
          })}
          mt="4px"
        />
        {form.values.spreader.distribution === Distribution.BETA && (
          <Group wrap="nowrap">
            <NumberInput
              label={
                <LabelWithTooltip
                  label="Alpha"
                  tooltip="Parameter 'α' of the beta distribution"
                />
              }
              min={0}
              placeholder="number"
              {...form.getInputProps('spreader.parameters.a', {
                type: 'input',
              })}
            />
            <NumberInput
              label={
                <LabelWithTooltip
                  label="Beta"
                  tooltip="Parameter 'β' of the beta distribution"
                />
              }
              min={0}
              placeholder="number"
              {...form.getInputProps('spreader.parameters.b', {
                type: 'input',
              })}
            />
          </Group>
        )}

        {form.values.spreader.distribution === Distribution.TRIANGULAR && (
          <Stack gap="xs">
            <Text size="sm">Increasing range</Text>
            <RangeSlider
              domain={[-0.1, 1.1]}
              min={0}
              max={1}
              step={0.01}
              minRange={0.01}
              marks={[
                { value: 0, label: '' },
                { value: 0.25, label: '' },
                { value: 0.5, label: '' },
                { value: 0.75, label: '' },
                { value: 1, label: '' },
              ]}
              value={[
                form.values.spreader.parameters.left ?? 0,
                form.values.spreader.parameters.mode ?? 0.5,
              ]}
              onChange={([left, mode]) => {
                form.setFieldValue('spreader.parameters.left', left);
                form.setFieldValue('spreader.parameters.mode', mode);
              }}
            />
            <Text size="sm">Decreasing range</Text>
            <RangeSlider
              domain={[-0.1, 1.1]}
              min={0}
              max={1}
              step={0.01}
              minRange={0.01}
              marks={[
                { value: 0, label: 'Tn' },
                { value: 0.25, label: '' },
                { value: 0.5, label: '' },
                { value: 0.75, label: '' },
                { value: 1, label: 'T(n+1)' },
              ]}
              value={[
                form.values.spreader.parameters.mode ?? 0.5,
                form.values.spreader.parameters.right ?? 1,
              ]}
              onChange={([mode, right]) => {
                form.setFieldValue('spreader.parameters.mode', mode);
                form.setFieldValue('spreader.parameters.right', right);
              }}
            />
          </Stack>
        )}

        {form.values.spreader.distribution === Distribution.UNIFORM && (
          <Stack gap="xs">
            <Text size="sm">Range</Text>
            <RangeSlider
              domain={[-0.1, 1.1]}
              min={0}
              max={1}
              step={0.01}
              minRange={0.01}
              marks={[
                { value: 0, label: 'Tn' },
                { value: 0.25, label: '' },
                { value: 0.5, label: '' },
                { value: 0.75, label: '' },
                { value: 1, label: 'T(n+1)' },
              ]}
              value={[
                form.values.spreader.parameters.low ?? 0,
                form.values.spreader.parameters.high ?? 1,
              ]}
              onChange={([low, high]) => {
                form.setFieldValue('spreader.parameters.low', low);
                form.setFieldValue('spreader.parameters.high', high);
              }}
            />
          </Stack>
        )}
      </Stack>
    </Stack>
  );
};
