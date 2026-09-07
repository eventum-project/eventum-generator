import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { OtlpOutputPluginParams } from './OtlpOutputPluginParams';
import { OtlpOutputPluginConfig } from '@/api/routes/generator-configs/schemas/plugins/output/configs/otlp';
import { Format } from '@/api/routes/generator-configs/schemas/plugins/output/formatters';
import { ProjectNameProvider } from '@/pages/ProjectPage/context/ProjectNameContext';
import { renderWithProviders } from '@/test/render';

vi.mock('@/api/hooks/useGeneratorConfigs', () => ({
  useGeneratorFileTree: () => ({ data: undefined }),
}));

vi.mock('@/api/hooks/useSecrets', () => ({
  useSecretNames: () => ({ data: [] }),
}));

function renderForm(config: OtlpOutputPluginConfig) {
  renderWithProviders(
    <MemoryRouter>
      <ProjectNameProvider initialProjectName="demo">
        <OtlpOutputPluginParams initialConfig={config} onChange={vi.fn()} />
      </ProjectNameProvider>
    </MemoryRouter>
  );
}

describe('OtlpOutputPluginParams', () => {
  it('shows an error when the formatter cannot encode each event', async () => {
    const user = userEvent.setup();
    renderForm({
      endpoint: 'https://collector.example.com',
      formatter: { format: Format.JSON },
    });

    await user.click(screen.getByRole('textbox', { name: /Format/ }));
    const option = [
      ...document.querySelectorAll<HTMLElement>('[role="option"]'),
    ].find((candidate) => candidate.textContent === Format.JSONBatch);
    await user.click(option!);

    expect(screen.getByRole('textbox', { name: /Format/ })).toHaveAttribute(
      'aria-invalid',
      'true'
    );
    expect(
      screen.getByText(/otlp maps every event to its own record/i)
    ).toBeVisible();
  });
});
