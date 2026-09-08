import { ModalsProvider } from '@mantine/modals';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Mock, beforeEach, describe, expect, it, vi } from 'vitest';

import { FormatterTab } from './index';
import { useFormatEventsMutation } from '@/api/hooks/usePreview';
import { OutputPluginsNamedConfig } from '@/api/routes/generator-configs/schemas';
import { FormatterConfig } from '@/api/routes/generator-configs/schemas/plugins/output/formatters';
import { FormattingResult } from '@/api/routes/preview/schemas';
import { ProjectNameProvider } from '@/pages/ProjectPage/context/ProjectNameContext';
import { renderWithProviders } from '@/test/render';

vi.mock('@/api/hooks/usePreview');

let format: {
  mutate: ReturnType<typeof vi.fn>;
  isPending: boolean;
};
let setOutputPluginFormatter: Mock<
  (id: string, formatter: FormatterConfig) => void
>;

function result(
  events: string[],
  errors: { message: string; original_event: string | null }[] = []
): FormattingResult {
  return {
    events,
    formatted_count: events.length,
    errors,
  } as FormattingResult;
}

const HTTP_FORMATTER = { format: 'json-batch', indent: 2 } as const;

const OUTPUT_PLUGINS = [
  {
    file: {
      path: './output/events.log',
      formatter: { format: 'template', template: '{{ event }}' },
    },
  },
  {
    http: {
      url: 'https://example.com/events',
      formatter: HTTP_FORMATTER,
    },
  },
] as OutputPluginsNamedConfig;

interface SetupOptions {
  formatted?: FormattingResult;
  outputPlugins?: OutputPluginsNamedConfig;
  outputPluginNames?: string[];
  outputPluginIds?: string[];
  selectedOutputPlugin?: number;
  debuggerEvents?: string[];
}

function setup({
  formatted = result(['{"a":1}']),
  outputPlugins = OUTPUT_PLUGINS,
  outputPluginNames = ['file', 'http'],
  outputPluginIds = outputPluginNames.map((_, index) => `output-${index}`),
  selectedOutputPlugin = 0,
  debuggerEvents,
}: SetupOptions = {}) {
  format = {
    mutate: vi.fn(
      (
        _variables: unknown,
        handlers?: { onSuccess?: (data: FormattingResult) => void }
      ) => handlers?.onSuccess?.(formatted)
    ),
    isPending: false,
  };
  setOutputPluginFormatter = vi.fn();

  vi.mocked(useFormatEventsMutation).mockReturnValue(
    format as unknown as ReturnType<typeof useFormatEventsMutation>
  );

  return renderWithProviders(
    <ModalsProvider>
      <ProjectNameProvider initialProjectName="web">
        <FormatterTab
          outputPlugins={outputPlugins}
          outputPluginNames={outputPluginNames}
          outputPluginIds={outputPluginIds}
          selectedOutputPluginId={outputPluginIds[selectedOutputPlugin]}
          debuggerEvents={debuggerEvents}
          onSetOutputPluginFormatter={setOutputPluginFormatter}
        />
      </ProjectNameProvider>
    </ModalsProvider>
  );
}

function mockPointerCapture(element: HTMLElement): void {
  let capturedPointer: number | null = null;

  element.setPointerCapture = (pointerId: number) => {
    capturedPointer = pointerId;
  };
  element.hasPointerCapture = (pointerId: number) =>
    capturedPointer === pointerId;
  element.releasePointerCapture = (pointerId: number) => {
    if (capturedPointer === pointerId) {
      capturedPointer = null;
    }
  };
}

function eventFields(): HTMLElement[] {
  return screen.getAllByPlaceholderText('raw event ...');
}

async function pickSelectOption(
  user: ReturnType<typeof userEvent.setup>,
  label: string
) {
  const option = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((candidate) => candidate.textContent === label);
  await user.click(option!);
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * The tool feeds sample events through the formatter the output plugin
 * is configured with, so what it sends is the events currently typed
 * and the configuration currently picked. An event list that cannot be
 * grown or emptied would make the tool useless for a batch formatter,
 * which behaves differently for one event than for several.
 */
describe('FormatterTab', () => {
  it('opens on one empty event', () => {
    setup();

    expect(eventFields()).toHaveLength(1);
    expect(eventFields()[0]).toHaveValue('');
  });

  it('resizes the formatter pane from its default width', () => {
    const { container } = setup();
    const panes = [...container.querySelectorAll<HTMLElement>('.tool-pane')];
    const divider = screen.getByRole('separator', {
      name: 'Resize panes 1 and 2',
    });
    vi.spyOn(panes[0]!, 'getBoundingClientRect').mockReturnValue({
      width: 300,
    } as DOMRect);
    vi.spyOn(panes[1]!, 'getBoundingClientRect').mockReturnValue({
      width: 350,
    } as DOMRect);
    vi.spyOn(panes[2]!, 'getBoundingClientRect').mockReturnValue({
      width: 350,
    } as DOMRect);
    mockPointerCapture(divider);

    fireEvent.pointerDown(divider, { pointerId: 9, clientX: 100 });
    fireEvent.pointerMove(divider, { pointerId: 9, clientX: 140 });

    expect(panes[0]).toHaveStyle({ flexBasis: '340px' });
    expect(panes[1]).toHaveStyle({ flexBasis: '310px' });
  });

  it('takes more events on request', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Add event' }));

    expect(eventFields()).toHaveLength(2);
  });

  it('drops one event without touching the others', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(eventFields()[0]!, 'first');
    await user.click(screen.getByRole('button', { name: 'Add event' }));
    await user.type(eventFields()[1]!, 'second');

    await user.click(screen.getAllByTitle('Delete event')[0]!);

    expect(eventFields()).toHaveLength(1);
    expect(eventFields()[0]).toHaveValue('second');
  });

  it('sends the events as typed, under the project', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(eventFields()[0]!, 'raw');
    await user.click(screen.getByRole('button', { name: /Format/ }));

    const sent = format.mutate.mock.calls[0]?.[0] as {
      name: string;
      body: { events: string[] };
    };

    expect(sent.name).toBe('web');
    expect(sent.body.events).toEqual(['raw']);
  });

  it('sends the formatter it was configured with', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /Format/ }));

    const sent = format.mutate.mock.calls[0]?.[0] as {
      body: { formatter_config: { format: string } };
    };

    expect(sent.body.formatter_config).toEqual({
      format: 'template',
      template: '{{ event }}',
    });
  });

  it('defaults the formatter source to the selected output plugin', () => {
    setup({ selectedOutputPlugin: 1 });

    expect(
      screen.getByRole('textbox', { name: 'Output plugin formatter source' })
    ).toHaveValue('http #2');
  });

  it('loads a newly selected output after confirming preview replacement', async () => {
    const user = userEvent.setup();
    const view = setup();

    await user.click(screen.getByRole('textbox', { name: /Format/ }));
    await pickSelectOption(user, 'json');

    const indent = screen.getByRole('textbox', { name: /Indent/ });
    await user.clear(indent);
    await user.type(indent, '4');

    view.rerender(
      <ModalsProvider>
        <ProjectNameProvider initialProjectName="web">
          <FormatterTab
            outputPlugins={OUTPUT_PLUGINS}
            outputPluginNames={['file', 'http']}
            outputPluginIds={['output-0', 'output-1']}
            selectedOutputPluginId="output-1"
            onSetOutputPluginFormatter={setOutputPluginFormatter}
          />
        </ProjectNameProvider>
      </ModalsProvider>
    );

    await waitFor(() =>
      expect(screen.getByText('Discard preview changes?')).toBeVisible()
    );
    expect(
      screen.getByRole('textbox', {
        name: 'Output plugin formatter source',
      })
    ).toHaveValue('file #1');
    expect(screen.getByRole('textbox', { name: /Format/ })).toHaveValue('json');
    expect(screen.getByRole('textbox', { name: /Indent/ })).toHaveValue('4');

    await user.click(screen.getByRole('button', { name: 'Load' }));

    expect(
      screen.getByRole('textbox', {
        name: 'Output plugin formatter source',
      })
    ).toHaveValue('http #2');
    expect(screen.getByRole('textbox', { name: /Format/ })).toHaveValue(
      'json-batch'
    );
    expect(screen.getByRole('textbox', { name: /Indent/ })).toHaveValue('2');
  });

  it('switches formatter sources without changing their settings', async () => {
    const user = userEvent.setup();
    setup();

    const source = screen.getByRole('textbox', {
      name: 'Output plugin formatter source',
    });
    await user.click(source);
    await pickSelectOption(user, 'http #2');

    expect(source).toHaveValue('http #2');
    expect(screen.getByRole('textbox', { name: /Format/ })).toHaveValue(
      'json-batch'
    );

    await user.click(screen.getByRole('button', { name: /^Format$/ }));

    const sent = format.mutate.mock.calls[0]?.[0] as {
      body: { formatter_config: unknown };
    };
    expect(sent.body.formatter_config).toEqual(HTTP_FORMATTER);

    await user.click(screen.getByRole('textbox', { name: /Format/ }));
    await pickSelectOption(user, 'plain');

    expect(source).toHaveValue('http #2');
    expect(screen.getByRole('textbox', { name: /Format/ })).toHaveValue(
      'plain'
    );
    await user.click(screen.getByRole('button', { name: /^Format$/ }));

    const manuallyEdited = format.mutate.mock.calls[1]?.[0] as {
      body: { formatter_config: unknown };
    };
    expect(manuallyEdited.body.formatter_config).toEqual({ format: 'plain' });
    expect(HTTP_FORMATTER).toEqual({
      format: 'json-batch',
      indent: 2,
    });
  });

  it('keeps a chosen formatter source when an earlier output is removed', async () => {
    const user = userEvent.setup();
    const outputs = [
      OUTPUT_PLUGINS[0],
      OUTPUT_PLUGINS[1],
      { kafka: { topic: 'events' } },
    ] as OutputPluginsNamedConfig;
    const view = setup({
      outputPlugins: outputs,
      outputPluginNames: ['file', 'http', 'kafka'],
      outputPluginIds: ['file-id', 'http-id', 'kafka-id'],
      selectedOutputPlugin: 2,
    });

    const source = screen.getByRole('textbox', {
      name: 'Output plugin formatter source',
    });
    await user.click(source);
    await pickSelectOption(user, 'http #2');

    view.rerender(
      <ModalsProvider>
        <ProjectNameProvider initialProjectName="web">
          <FormatterTab
            outputPlugins={outputs.slice(1)}
            outputPluginNames={['http', 'kafka']}
            outputPluginIds={['http-id', 'kafka-id']}
            selectedOutputPluginId="kafka-id"
            onSetOutputPluginFormatter={setOutputPluginFormatter}
          />
        </ProjectNameProvider>
      </ModalsProvider>
    );

    await user.click(screen.getByRole('button', { name: /^Format$/ }));

    const sent = format.mutate.mock.calls[0]?.[0] as {
      body: { formatter_config: unknown };
    };
    expect(sent.body.formatter_config).toEqual(HTTP_FORMATTER);
  });

  it.each([
    ['clickhouse', { format: 'json', indent: 0 }],
    ['file', { format: 'plain' }],
    ['http', { format: 'json-batch', indent: 0 }],
    ['kafka', { format: 'json', indent: 0 }],
    ['opensearch', { format: 'json', indent: 0 }],
    ['otlp', { format: 'plain' }],
    ['s3', { format: 'json', indent: 0 }],
    ['stdout', { format: 'plain' }],
    ['tcp', { format: 'plain' }],
    ['udp', { format: 'plain' }],
  ])('loads the backend default formatter for %s', async (name, expected) => {
    const user = userEvent.setup();
    setup({
      outputPlugins: [{ [name]: {} }] as OutputPluginsNamedConfig,
      outputPluginNames: [name],
    });

    await user.click(screen.getByRole('button', { name: /Format/ }));

    const sent = format.mutate.mock.calls[0]?.[0] as {
      body: { formatter_config: unknown };
    };
    expect(sent.body.formatter_config).toEqual(expected);
  });

  it('marks the preview as loaded only while it matches the source', async () => {
    const user = userEvent.setup();
    setup();

    expect(screen.getByText('Loaded')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Reset formatter changes' })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Apply formatter to file #1' })
    ).toBeNull();

    await user.click(screen.getByRole('textbox', { name: /Format/ }));
    await pickSelectOption(user, 'plain');

    expect(screen.getByText('Custom')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Reset formatter changes' })
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Apply formatter to file #1' })
    ).toBeVisible();
  });

  it('resets manual formatter changes to the source', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('textbox', { name: /Format/ }));
    await pickSelectOption(user, 'json');
    await user.click(
      screen.getByRole('button', { name: 'Reset formatter changes' })
    );

    expect(screen.getByRole('textbox', { name: /Format/ })).toHaveValue(
      'template'
    );
    expect(
      screen.queryByRole('button', { name: 'Reset formatter changes' })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Apply formatter to file #1' })
    ).toBeNull();
  });

  it('loads another clean formatter source immediately', async () => {
    const user = userEvent.setup();
    setup();

    const source = screen.getByRole('textbox', {
      name: 'Output plugin formatter source',
    });
    await user.click(source);
    await pickSelectOption(user, 'http #2');

    expect(source).toHaveValue('http #2');
    expect(screen.getByRole('textbox', { name: /Format/ })).toHaveValue(
      'json-batch'
    );
    expect(screen.getByRole('textbox', { name: /Indent/ })).toHaveValue('2');
    expect(screen.getByText('Loaded')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Reset formatter changes' })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Apply formatter to http #2' })
    ).toBeNull();
  });

  it('keeps manual preview changes when source replacement is canceled', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('textbox', { name: /Format/ }));
    await pickSelectOption(user, 'json');
    const source = screen.getByRole('textbox', {
      name: 'Output plugin formatter source',
    });
    await user.click(source);
    await pickSelectOption(user, 'http #2');

    await waitFor(() =>
      expect(screen.getByText('Discard preview changes?')).toBeVisible()
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Discard preview changes and load formatter from http #2?'
    );
    expect(source).toHaveValue('file #1');
    expect(screen.getByRole('textbox', { name: /Format/ })).toHaveValue('json');

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(source).toHaveValue('file #1');
    expect(screen.getByRole('textbox', { name: /Format/ })).toHaveValue('json');
    expect(
      screen.getByRole('button', { name: 'Apply formatter to file #1' })
    ).toBeVisible();
  });

  it('follows an external output change while the preview is clean', async () => {
    const view = setup();
    const changedOutputs = [
      {
        file: {
          path: './output/events.log',
          formatter: { format: 'json', indent: 2 },
        },
      },
      OUTPUT_PLUGINS[1],
    ] as OutputPluginsNamedConfig;

    view.rerender(
      <ModalsProvider>
        <ProjectNameProvider initialProjectName="web">
          <FormatterTab
            outputPlugins={changedOutputs}
            outputPluginNames={['file', 'http']}
            outputPluginIds={['output-0', 'output-1']}
            selectedOutputPluginId="output-0"
            onSetOutputPluginFormatter={setOutputPluginFormatter}
          />
        </ProjectNameProvider>
      </ModalsProvider>
    );

    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: /Format/ })).toHaveValue(
        'json'
      )
    );
    expect(screen.getByRole('textbox', { name: /Indent/ })).toHaveValue('2');
    expect(screen.getByText('Loaded')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Apply formatter to file #1' })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Reset formatter changes' })
    ).toBeNull();
  });

  it('resets a dirty preview to the latest output settings', async () => {
    const user = userEvent.setup();
    const view = setup();

    await user.click(screen.getByRole('textbox', { name: /Format/ }));
    await pickSelectOption(user, 'json');
    const indent = screen.getByRole('textbox', { name: /Indent/ });
    await user.clear(indent);
    await user.type(indent, '4');

    const changedOutputs = [
      {
        file: {
          path: './output/events.log',
          formatter: { format: 'json', indent: 2 },
        },
      },
      OUTPUT_PLUGINS[1],
    ] as OutputPluginsNamedConfig;
    view.rerender(
      <ModalsProvider>
        <ProjectNameProvider initialProjectName="web">
          <FormatterTab
            outputPlugins={changedOutputs}
            outputPluginNames={['file', 'http']}
            outputPluginIds={['output-0', 'output-1']}
            selectedOutputPluginId="output-0"
            onSetOutputPluginFormatter={setOutputPluginFormatter}
          />
        </ProjectNameProvider>
      </ModalsProvider>
    );

    expect(screen.getByRole('textbox', { name: /Indent/ })).toHaveValue('4');
    await user.click(
      screen.getByRole('button', { name: 'Reset formatter changes' })
    );

    expect(screen.getByRole('textbox', { name: /Indent/ })).toHaveValue('2');
    expect(screen.getByText('Loaded')).toBeVisible();
  });

  it('applies a custom formatter to its source after confirmation', async () => {
    const user = userEvent.setup();
    setup({ selectedOutputPlugin: 1 });

    await user.click(screen.getByRole('textbox', { name: /Format/ }));
    await pickSelectOption(user, 'plain');
    const apply = screen.getByRole('button', {
      name: 'Apply formatter to http #2',
    });
    expect(apply).toBeEnabled();
    await user.click(apply);

    expect(setOutputPluginFormatter).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.getByText('Applying formatter')).toBeVisible()
    );
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Replace formatter settings for http #2 with the current preview?'
    );

    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(setOutputPluginFormatter).toHaveBeenCalledWith('output-1', {
      format: 'plain',
    });
    expect(
      screen.queryByRole('button', { name: 'Reset formatter changes' })
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Apply formatter to http #2' })
    ).toBeNull();
  });

  it('replaces manually entered events with the debugger events', async () => {
    const user = userEvent.setup();
    setup({ debuggerEvents: ['first', 'second'] });

    expect(
      screen.getByRole('button', {
        name: 'Replace with 2 debugger events',
      })
    ).toHaveTextContent('Replace with 2 debugger events');
    await user.type(eventFields()[0]!, 'manual');
    await user.click(
      screen.getByRole('button', {
        name: 'Replace with 2 debugger events',
      })
    );

    expect(eventFields()).toHaveLength(2);
    expect(eventFields()[0]).toHaveValue('first');
    expect(eventFields()[1]).toHaveValue('second');

    await user.click(screen.getByRole('button', { name: /^Format$/ }));

    const sent = format.mutate.mock.calls[0]?.[0] as {
      body: { events: string[] };
    };
    expect(sent.body.events).toEqual(['first', 'second']);

    await user.clear(eventFields()[0]!);
    await user.type(eventFields()[0]!, 'edited');
    await user.click(screen.getByRole('button', { name: /^Format$/ }));

    const manuallyEdited = format.mutate.mock.calls[1]?.[0] as {
      body: { events: string[] };
    };
    expect(manuallyEdited.body.events).toEqual(['edited', 'second']);
  });

  it('offers debugger events produced after the formatter mounts', async () => {
    const user = userEvent.setup();
    const view = setup();

    view.rerender(
      <ModalsProvider>
        <ProjectNameProvider initialProjectName="web">
          <FormatterTab
            outputPlugins={OUTPUT_PLUGINS}
            outputPluginNames={['file', 'http']}
            outputPluginIds={['file-id', 'http-id']}
            selectedOutputPluginId="file-id"
            debuggerEvents={['produced later']}
            onSetOutputPluginFormatter={setOutputPluginFormatter}
          />
        </ProjectNameProvider>
      </ModalsProvider>
    );

    await user.click(
      screen.getByRole('button', { name: 'Replace with 1 debugger events' })
    );

    expect(eventFields()[0]).toHaveValue('produced later');
  });

  it('disables debugger loading before a debugger run', () => {
    setup();

    expect(
      screen.getByRole('button', { name: 'No debugger events to load' })
    ).toBeDisabled();
  });

  it('can load an empty successful debugger run', async () => {
    const user = userEvent.setup();
    setup({ debuggerEvents: [] });

    await user.click(
      screen.getByRole('button', { name: 'Replace with 0 debugger events' })
    );

    expect(screen.queryByPlaceholderText('raw event ...')).toBeNull();
    expect(screen.getByText('Add an event to format.')).toBeInTheDocument();
  });

  it('shows what the formatter produced', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /Format/ }));

    expect(await screen.findByText(/\{"a":1\}/)).toBeInTheDocument();
  });

  it('reports an event the formatter refused', async () => {
    const user = userEvent.setup();
    setup({
      formatted: result([], [{ message: 'bad shape', original_event: 'oops' }]),
    });

    await user.click(screen.getByRole('button', { name: /Format/ }));

    expect(await screen.findByText(/bad shape/)).toBeInTheDocument();
  });

  it('offers no formatting once every event is gone', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByTitle('Delete event'));

    expect(screen.getByRole('button', { name: /Format/ })).toBeDisabled();
  });
});
