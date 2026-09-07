import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { TcpOutputPluginParams } from './TcpOutputPluginParams';
import { TcpOutputPluginConfig } from '@/api/routes/generator-configs/schemas/plugins/output/configs/tcp';
import { ProjectNameProvider } from '@/pages/ProjectPage/context/ProjectNameContext';
import { renderWithProviders } from '@/test/render';

vi.mock('@/api/hooks/useGeneratorConfigs', () => ({
  useGeneratorFileTree: () => ({ data: undefined }),
}));

function renderForm(
  config: TcpOutputPluginConfig,
  onChange: (config: TcpOutputPluginConfig) => void
) {
  renderWithProviders(
    <MemoryRouter>
      <ProjectNameProvider initialProjectName="demo">
        <TcpOutputPluginParams initialConfig={config} onChange={onChange} />
      </ProjectNameProvider>
    </MemoryRouter>
  );
}

/** Pick a value from the list a select offers. */
async function pick(
  user: ReturnType<typeof userEvent.setup>,
  label: RegExp,
  value: string
) {
  await user.click(screen.getByRole('textbox', { name: label }));

  const option = [
    ...document.querySelectorAll<HTMLElement>('[role="option"]'),
  ].find((candidate) => candidate.textContent === value);

  await user.click(option!);
}

/**
 * Octet counting delimits each event by its own length, so a separator
 * on top of it is what the backend rejects the config for. The form
 * drops the separator with the framing rather than sending a config
 * that cannot be saved.
 */
describe('TcpOutputPluginParams', () => {
  it('drops the separator when octet counting is picked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    renderForm({ host: 'localhost', port: 514, separator: '|' }, onChange);
    await pick(user, /Framing/, 'octet_counting');

    // The form reports the values it holds now and the ones it held
    // before, so the assertion looks at the current ones alone.
    expect(onChange.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({
        framing: 'octet_counting',
        separator: undefined,
      })
    );
  });

  it('keeps the separator editable under delimiter framing', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    renderForm({ host: 'localhost', port: 514 }, onChange);
    await pick(user, /Framing/, 'delimiter');

    expect(screen.getByRole('textbox', { name: /Separator/ })).toBeEnabled();
    expect(onChange.mock.lastCall?.[0]).toEqual(
      expect.objectContaining({ framing: 'delimiter' })
    );
  });

  it('leaves the separator out of reach under octet counting', () => {
    renderForm(
      { host: 'localhost', port: 514, framing: 'octet_counting' },
      vi.fn()
    );

    expect(screen.getByRole('textbox', { name: /Separator/ })).toBeDisabled();
  });
});
