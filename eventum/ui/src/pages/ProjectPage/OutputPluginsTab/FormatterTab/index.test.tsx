import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormatterTab } from './index';
import { useFormatEventsMutation } from '@/api/hooks/usePreview';
import { OutputPluginsNamedConfig } from '@/api/routes/generator-configs/schemas';
import { FormattingResult } from '@/api/routes/preview/schemas';
import { ProjectNameProvider } from '@/pages/ProjectPage/context/ProjectNameContext';
import { renderWithProviders } from '@/test/render';

vi.mock('@/api/hooks/usePreview');

let format: {
  mutate: ReturnType<typeof vi.fn>;
  isPending: boolean;
};

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

  vi.mocked(useFormatEventsMutation).mockReturnValue(
    format as unknown as ReturnType<typeof useFormatEventsMutation>
  );

  return renderWithProviders(
    <ProjectNameProvider initialProjectName="web">
      <FormatterTab
        outputPlugins={outputPlugins}
        outputPluginNames={outputPluginNames}
        outputPluginIds={outputPluginIds}
        selectedOutputPluginId={outputPluginIds[selectedOutputPlugin]}
        debuggerEvents={debuggerEvents}
      />
    </ProjectNameProvider>
  );
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

    expect(sent.body.formatter_config.format).toBe('plain');
  });

  it('defaults the formatter source to the selected output plugin', () => {
    setup({ selectedOutputPlugin: 1 });

    expect(
      screen.getByRole('textbox', { name: 'Output plugin formatter source' })
    ).toHaveValue('http #2');
  });

  it('follows a new output selection without replacing manual settings', async () => {
    const user = userEvent.setup();
    const view = setup();

    await user.click(screen.getByRole('textbox', { name: /Format/ }));
    await pickSelectOption(user, 'json');

    const indent = screen.getByRole('textbox', { name: /Indent/ });
    await user.clear(indent);
    await user.type(indent, '4');

    view.rerender(
      <ProjectNameProvider initialProjectName="web">
        <FormatterTab
          outputPlugins={OUTPUT_PLUGINS}
          outputPluginNames={['file', 'http']}
          outputPluginIds={['file-id', 'http-id']}
          selectedOutputPluginId="http-id"
        />
      </ProjectNameProvider>
    );

    expect(await screen.findByDisplayValue('http #2')).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Format/ })).toHaveValue('json');
    expect(screen.getByRole('textbox', { name: /Indent/ })).toHaveValue('4');
  });

  it('loads a chosen output formatter without changing its source', async () => {
    const user = userEvent.setup();
    setup();

    const source = screen.getByRole('textbox', {
      name: 'Output plugin formatter source',
    });
    await user.click(source);
    await pickSelectOption(user, 'http #2');
    await user.click(
      screen.getByRole('button', { name: 'Load formatter from http #2' })
    );

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
      <ProjectNameProvider initialProjectName="web">
        <FormatterTab
          outputPlugins={outputs.slice(1)}
          outputPluginNames={['http', 'kafka']}
          outputPluginIds={['http-id', 'kafka-id']}
          selectedOutputPluginId="kafka-id"
        />
      </ProjectNameProvider>
    );

    await user.click(
      screen.getByRole('button', { name: 'Load formatter from http #1' })
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

    await user.click(
      screen.getByRole('button', { name: `Load formatter from ${name} #1` })
    );
    await user.click(screen.getByRole('button', { name: /Format/ }));

    const sent = format.mutate.mock.calls[0]?.[0] as {
      body: { formatter_config: unknown };
    };
    expect(sent.body.formatter_config).toEqual(expected);
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
      <ProjectNameProvider initialProjectName="web">
        <FormatterTab
          outputPlugins={OUTPUT_PLUGINS}
          outputPluginNames={['file', 'http']}
          outputPluginIds={['file-id', 'http-id']}
          selectedOutputPluginId="file-id"
          debuggerEvents={['produced later']}
        />
      </ProjectNameProvider>
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
