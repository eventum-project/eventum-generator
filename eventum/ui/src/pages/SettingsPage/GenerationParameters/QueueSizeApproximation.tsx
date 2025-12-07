import { Alert, Box, List, NumberInput } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { IconCalculator } from '@tabler/icons-react';
import bytes from 'bytes';
import { FC, useState } from 'react';

import { Settings } from '@/api/routes/instance/schemas';

interface QueueSizeApproximationProps {
  form: UseFormReturnType<Settings>;
}

export const QueueSizeApproximation: FC<QueueSizeApproximationProps> = ({
  form,
}) => {
  const [eventSize, setEventSize] = useState<number>(1000);

  const formValues = form.getValues();
  const [batchSize, setBatchSize] = useState(formValues.generation.batch.size);
  const [queueParams, setQueueParams] = useState(formValues.generation.queue);

  form.watch('generation.batch.size', ({ value }) => {
    setBatchSize(value);
  });
  form.watch('generation.queue', ({ value }) => {
    setQueueParams(value);
  });

  return (
    <Alert
      variant="default"
      icon={<Box c="blue" component={IconCalculator}></Box>}
      title="Size approximation"
    >
      With event size{' '}
      <NumberInput
        w="80px"
        allowDecimal={false}
        value={eventSize}
        onChange={(value) => setEventSize(Number(value))}
        min={1}
        step={1}
        display="inline-block"
        size="xs"
        mx="4px"
        hideControls
        variant="filled"
        style={{
          input: {
            textAlign: 'right',
          },
        }}
      />{' '}
      bytes full queues for one generator will consume:
      <List size="sm">
        <List.Item>
          Timestamps queue ~
          <b>
            {batchSize !== null ? (
              bytes(batchSize * queueParams.max_timestamp_batches * 16, {
                decimalPlaces: 2,
              })
            ) : (
              <b style={{ color: 'var(--mantine-color-red-text)' }}>
                Possibly unlimited
              </b>
            )}
          </b>
        </List.Item>
        <List.Item>
          Events queue ~
          <b>
            {batchSize !== null ? (
              bytes(batchSize * queueParams.max_event_batches * eventSize, {
                decimalPlaces: 2,
              })
            ) : (
              <b style={{ color: 'var(--mantine-color-red-text)' }}>
                Possibly unlimited
              </b>
            )}
          </b>
        </List.Item>
      </List>
    </Alert>
  );
};
