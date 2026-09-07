import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FormatterParams } from './FormatterParams';
import { useGeneratorFileTree } from '@/api/hooks/useGeneratorConfigs';
import { FileNode } from '@/api/routes/generator-configs/schemas';
import { FormatterConfig } from '@/api/routes/generator-configs/schemas/plugins/output/formatters';
import { FileTreeProvider } from '@/pages/ProjectPage/context/FileTreeContext';
import { ProjectNameProvider } from '@/pages/ProjectPage/context/ProjectNameContext';
import { renderWithProviders } from '@/test/render';

vi.mock('@/api/hooks/useGeneratorConfigs');

const FILE_TREE: FileNode[] = [
  {
    name: 'templates',
    is_dir: true,
    size_in_bytes: null,
    children: [
      { name: 'out.jinja', is_dir: false, size_in_bytes: 20, children: null },
    ],
  },
];

function setup(value?: FormatterConfig) {
  vi.mocked(useGeneratorFileTree).mockReturnValue({
    data: FILE_TREE,
    isLoading: false,
    isError: false,
    isSuccess: true,
    error: null,
  } as unknown as ReturnType<typeof useGeneratorFileTree>);

  const onChange = vi.fn();

  renderWithProviders(
    <MemoryRouter>
      <ProjectNameProvider initialProjectName="web">
        <FileTreeProvider>
          <FormatterParams value={value} onChange={onChange} />
        </FileTreeProvider>
      </ProjectNameProvider>
    </MemoryRouter>
  );

  return { onChange, user: userEvent.setup() };
}

/** Pick a format from the list the select offers. */
async function pickFormat(
  user: ReturnType<typeof userEvent.setup>,
  format: string
) {
  await user.click(screen.getByRole('textbox', { name: /Format/ }));

  const option = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((candidate) => candidate.textContent === format);

  await user.click(option!);
}

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * The formatter decides what an output plugin actually delivers, and
 * each format carries settings of its own - an indent for JSON, a
 * template for the template formats. Those settings only make sense
 * under their format, so picking another one must not leave the previous
 * settings behind: they would travel to the backend under a format that
 * has no field for them.
 */
describe('FormatterParams', () => {
  it('offers every format the plugins deliver', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('textbox', { name: /Format/ }));

    expect(
      [...document.querySelectorAll('[role="option"]')].map(
        (option) => option.textContent
      )
    ).toEqual([
      'eventum-http-input',
      'json',
      'json-batch',
      'plain',
      'syslog',
      'template',
      'template-batch',
    ]);
  });

  it.each(['json', 'plain', 'template'])(
    'reports %s as the format that was picked',
    async (format) => {
      const { user, onChange } = setup();

      await pickFormat(user, format);

      expect(onChange).toHaveBeenCalledWith({ format });
    }
  );

  it('drops the formatter when the format is cleared', async () => {
    const { user, onChange } = setup({ format: 'json' } as FormatterConfig);

    // The clear of a Mantine select is an unnamed button inside the
    // field, so it is reached through the section it clears.
    const clear = document.querySelector<HTMLElement>(
      '.mantine-Select-section button, .mantine-CloseButton-root'
    );
    await user.click(clear!);

    // No formatter at all is a value the plugin takes; a format of
    // nothing is not.
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it.each(['json', 'json-batch'])('offers an indent for %s', (format) => {
    setup({ format } as FormatterConfig);

    expect(screen.getByRole('textbox', { name: /Indent/ })).toBeVisible();
  });

  it.each(['plain', 'template'])('offers no indent for %s', (format) => {
    setup({ format } as FormatterConfig);

    expect(screen.queryByRole('textbox', { name: /Indent/ })).toBeNull();
  });

  it.each(['template', 'template-batch'])(
    'takes a template written in place for %s',
    async (format) => {
      const { user, onChange } = setup({ format } as FormatterConfig);

      await user.click(screen.getByRole('textbox', { name: /^Template/ }));
      await user.paste('{{ event }}');

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ format, template: '{{ event }}' })
      );
    }
  );

  it('takes a template read from a file of the project instead', async () => {
    const { user, onChange } = setup({ format: 'template' } as FormatterConfig);

    await user.click(screen.getByText('Template file'));
    await user.click(screen.getByRole('textbox', { name: /Template path/ }));

    const option = [
      ...document.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((candidate) => candidate.textContent?.includes('out.jinja'));
    await user.click(option!);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'template' })
    );
  });

  it('offers the syslog header parts for the syslog format', () => {
    setup({ format: 'syslog' } as FormatterConfig);

    expect(screen.getByRole('radio', { name: 'RFC 5424' })).toBeChecked();
    expect(screen.getByRole('textbox', { name: /Facility/ })).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Severity/ })).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Hostname/ })).toBeVisible();
    expect(screen.getByRole('textbox', { name: /App name/ })).toBeVisible();
    expect(screen.getByRole('textbox', { name: /Message id/ })).toBeVisible();
  });

  it('drops what RFC 3164 has no place for when it is picked', async () => {
    const { user, onChange } = setup({
      format: 'syslog',
      msgid: 'access',
      bom: true,
      structured_data: [{ id: 'origin@32473' }],
    } as FormatterConfig);

    await user.click(screen.getByRole('radio', { name: 'RFC 3164' }));

    expect(onChange).toHaveBeenCalledWith({
      format: 'syslog',
      rfc: 3164,
      msgid: undefined,
      bom: undefined,
      structured_data: undefined,
    });
  });

  it('leaves the RFC 5424 parts out of the form under RFC 3164', () => {
    setup({ format: 'syslog', rfc: 3164 } as FormatterConfig);

    expect(screen.queryByRole('textbox', { name: /Message id/ })).toBeNull();
    expect(screen.queryByRole('switch', { name: /BOM/ })).toBeNull();
    expect(screen.queryByText('Structured data')).toBeNull();
    expect(screen.getByRole('textbox', { name: /Tag/ })).toBeVisible();
  });

  it('takes a header part from a field of the event', async () => {
    const { user, onChange } = setup({ format: 'syslog' } as FormatterConfig);

    await user.click(
      screen.getByRole('button', {
        name: 'Switch hostname to a field of the event',
      })
    );
    await user.click(screen.getByRole('textbox', { name: /Hostname/ }));
    await user.paste('host.name');

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ hostname: { field: 'host.name' } })
    );
  });

  it('keeps a nameless structured data element out of the config', async () => {
    const { user, onChange } = setup({ format: 'syslog' } as FormatterConfig);

    await user.click(screen.getByRole('button', { name: 'Add element' }));

    // The element is on screen to be filled in; the config takes it
    // only once it is named, since the engine refuses an empty id.
    expect(screen.getByRole('textbox', { name: /Element id/ })).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('writes a structured data element once it is named', async () => {
    const { user, onChange } = setup({ format: 'syslog' } as FormatterConfig);

    await user.click(screen.getByRole('button', { name: 'Add element' }));
    await user.click(screen.getByRole('textbox', { name: /Element id/ }));
    await user.paste('origin@32473');

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        structured_data: [{ id: 'origin@32473', params: {} }],
      })
    );
  });

  it.each([
    ['Facility', 'local0', { facility: 'local0' }],
    ['Severity', 'err', { severity: 'err' }],
  ])('reports the %s that was picked', async (label, option, expected) => {
    const { user, onChange } = setup({ format: 'syslog' } as FormatterConfig);

    await user.click(screen.getByRole('textbox', { name: new RegExp(label) }));

    const picked = [
      ...document.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((candidate) => candidate.textContent === option);
    await user.click(picked!);

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining(expected)
    );
  });

  it.each([
    [
      'a field of the event',
      { hostname: { field: 'host.name' } },
      'tabler-icon-braces',
      'event field',
    ],
    [
      'a value written in place',
      { hostname: 'web-01' },
      'tabler-icon-letter-case',
      'hostname',
    ],
  ])(
    'shows %s by its own icon and placeholder',
    (_mode, config, icon, placeholder) => {
      setup({ format: 'syslog', ...config } as FormatterConfig);

      const input = screen.getByRole('textbox', { name: /Hostname/ });

      // The icon names the mode the field is in, so it has to agree
      // with what the field asks for.
      expect(input).toHaveAttribute('placeholder', placeholder);
      expect(
        input.closest('.mantine-TextInput-root')?.querySelector(`.${icon}`)
      ).not.toBeNull();
    }
  );

  it('takes a header part written in place', async () => {
    const { user, onChange } = setup({ format: 'syslog' } as FormatterConfig);

    await user.click(screen.getByRole('textbox', { name: /Hostname/ }));
    await user.paste('web-01');

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ hostname: 'web-01' })
    );
  });

  it('shows a facility written as a code by its name', () => {
    setup({ format: 'syslog', facility: 16 } as FormatterConfig);

    expect(screen.getByRole('textbox', { name: /Facility/ })).toHaveValue(
      'local0'
    );
  });

  it('leaves the message format out of use for a message taken from a field', () => {
    setup({ format: 'syslog', message_field: 'message' } as FormatterConfig);

    // The backend reads it only for a message that is the event
    // itself, so the control states that rather than disappearing.
    expect(
      screen.getByRole('textbox', { name: /Message format/ })
    ).toBeDisabled();
  });

  it('keeps the message format in use while the message is the event', () => {
    setup({ format: 'syslog' } as FormatterConfig);

    expect(
      screen.getByRole('textbox', { name: /Message format/ })
    ).toBeEnabled();
  });

  /**
   * A parameter lives in the editor before it is named, and two of
   * them may carry the same name while one is retyped - neither of
   * which the `params` mapping the config carries can hold. The rows
   * are the editor's own, and the mapping is derived from them.
   */
  describe('structured data parameters', () => {
    const withElement = () =>
      setup({
        format: 'syslog',
        structured_data: [
          { id: 'origin@32473', params: { environment: 'staging' } },
        ],
      } as FormatterConfig);

    const names = () =>
      screen.queryAllByRole('textbox', { name: 'Parameter name' });

    it('adds a row on every click, named or not', async () => {
      const { user } = withElement();

      expect(names()).toHaveLength(1);

      await user.click(screen.getByRole('button', { name: 'Add parameter' }));
      expect(names()).toHaveLength(2);

      await user.click(screen.getByRole('button', { name: 'Add parameter' }));
      expect(names()).toHaveLength(3);
    });

    it('keeps an unnamed row out of the configuration', async () => {
      const { user, onChange } = withElement();

      await user.click(screen.getByRole('button', { name: 'Add parameter' }));

      expect(onChange).not.toHaveBeenCalled();
    });

    it('keeps both rows when a name is typed twice', async () => {
      const { user, onChange } = withElement();

      await user.click(screen.getByRole('button', { name: 'Add parameter' }));
      await user.type(names()[1]!, 'environment');

      expect(names()).toHaveLength(2);
      expect(onChange).toHaveBeenLastCalledWith(
        expect.objectContaining({
          structured_data: [
            expect.objectContaining({ params: { environment: '' } }),
          ],
        })
      );
    });
  });

  it('offers nothing but the format until one is picked', () => {
    setup();

    expect(screen.getByRole('textbox', { name: /Format/ })).toBeVisible();
    expect(screen.queryByRole('textbox', { name: /Indent/ })).toBeNull();
    expect(screen.queryByRole('textbox', { name: /^Template/ })).toBeNull();
  });
});
