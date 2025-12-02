import { Alert, Box, Button, Divider, Skeleton, Stack } from '@mantine/core';
import { isNotEmpty, useForm } from '@mantine/form';
import { IconAlertSquareRounded, IconAlertTriangle } from '@tabler/icons-react';
import { FC } from 'react';
import YAML from 'yaml';

import { TimePatternForm } from './TimePatternForm';
import { useGeneratorFileContent } from '@/api/hooks/useGeneratorConfigs';
import {
  BetaDistributionParametersSchema,
  Distribution,
  TimePatternConfig,
  TimePatternConfigSchema,
  TriangularDistributionParametersSchema,
  UniformDistributionParametersSchema,
} from '@/api/routes/generator-configs/schemas/plugins/input/configs/time_patterns';
import { ShowErrorDetailsAnchor } from '@/components/ui/ShowErrorDetailsAnchor';
import { useProjectName } from '@/pages/ProjectPage/hooks/useProjectName';

interface TimePatternParamsProps {
  filePath: string;
}
export const TimePatternParams: FC<TimePatternParamsProps> = ({ filePath }) => {
  const { projectName } = useProjectName();

  const {
    data: fileContent,
    isError: isFileContentError,
    error: fileContentError,
    isLoading: isFileContentLoading,
    isSuccess: isFileContentSuccess,
  } = useGeneratorFileContent(projectName, filePath);

  const form = useForm<TimePatternConfig>({
    validate: {
      label: isNotEmpty('Label is required'),
      oscillator: {
        start: isNotEmpty('Start time is required'),
        end: isNotEmpty('End time is required'),
        period: isNotEmpty('Period is required'),
        unit: isNotEmpty('Unit is required'),
      },
      multiplier: {
        ratio: isNotEmpty('Ratio is required'),
      },
      randomizer: {
        deviation: isNotEmpty('Deviation is required'),
      },
      spreader: {
        parameters: {
          a: (value) => {
            if (
              form.values.spreader.distribution === Distribution.BETA &&
              (value == null || value == undefined)
            ) {
              return 'Alpha is required';
            }
            return null;
          },
          b: (value) => {
            if (
              form.values.spreader.distribution === Distribution.BETA &&
              (value == null || value == undefined)
            ) {
              return 'Beta is required';
            }
            return null;
          },
        },
      },
    },
    transformValues: (values) => {
      // preserve only parameters for the selected distribution
      const newValues = { ...values };

      if (values.spreader.distribution === Distribution.BETA) {
        newValues.spreader.parameters = BetaDistributionParametersSchema.parse(
          newValues.spreader.parameters
        );
      } else if (values.spreader.distribution === Distribution.TRIANGULAR) {
        newValues.spreader.parameters =
          TriangularDistributionParametersSchema.parse(
            newValues.spreader.parameters
          );
      } else if (values.spreader.distribution === Distribution.UNIFORM) {
        newValues.spreader.parameters =
          UniformDistributionParametersSchema.parse(
            newValues.spreader.parameters
          );
      }

      return newValues;
    },
    onSubmitPreventDefault: 'always',
    validateInputOnChange: true,
  });

  if (isFileContentLoading) {
    return (
      <Stack>
        <Skeleton h="xl" animate visible />
        <Skeleton h="xl" animate visible />
        <Skeleton h="xl" animate visible />
      </Stack>
    );
  }

  if (isFileContentError) {
    return (
      <Alert
        variant="default"
        icon={<Box c="red" component={IconAlertSquareRounded}></Box>}
        title="Failed to load file"
      >
        {fileContentError.message}
        <ShowErrorDetailsAnchor error={fileContentError} prependDot />
      </Alert>
    );
  }

  if (isFileContentSuccess) {
    try {
      const timePatternConfig = TimePatternConfigSchema.parse(
        YAML.parse(fileContent)
      );

      if (!form.initialized) {
        form.initialize(timePatternConfig);
      }
    } catch {
      return (
        <Alert
          variant="default"
          icon={<Box c="orange" component={IconAlertTriangle}></Box>}
          title="Cannot display"
        >
          Structure of file is not recognized as time pattern
        </Alert>
      );
    }

    if (!form.initialized) {
      return <></>;
    }

    return (
      <Stack>
        <TimePatternForm form={form} />

        <Divider my="sm" />

        <Button variant="default">Save file</Button>
      </Stack>
    );
  }

  return <></>;
};
