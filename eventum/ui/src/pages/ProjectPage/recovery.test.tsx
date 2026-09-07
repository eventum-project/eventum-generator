import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ProjectPage from './index';
import { APIError } from '@/api/errors';
import {
  useGeneratorConfig,
  useGeneratorFileTree,
  useUpdateGeneratorConfigMutation,
} from '@/api/hooks/useGeneratorConfigs';
import { renderWithProviders } from '@/test/render';

vi.mock('@/api/hooks/useGeneratorConfigs');

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useParams: () => ({ projectName: 'broken-project' }),
}));

/**
 * The studio shell is what recovery mode opens; the gate under test only
 * decides whether it is reached, so it stands in for the whole of it.
 */
vi.mock('./studio/StudioShell', () => ({
  StudioShell: () => <div>studio shell</div>,
}));

function failWith(error: Error) {
  vi.mocked(useGeneratorConfig).mockReturnValue({
    data: undefined,
    isSuccess: false,
    isError: true,
    error,
    isLoading: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGeneratorConfig>);
}

function renderPage() {
  return renderWithProviders(
    <MemoryRouter>
      <ProjectPage />
    </MemoryRouter>
  );
}

describe('ProjectPage recovery mode', () => {
  beforeEach(() => {
    vi.mocked(useUpdateGeneratorConfigMutation).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateGeneratorConfigMutation>);

    vi.mocked(useGeneratorFileTree).mockReturnValue({
      data: [],
      isSuccess: true,
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useGeneratorFileTree>);
  });

  // a configuration this build cannot read comes back on a successful
  // request, so the status alone leaves the user at a dead end with the
  // very file that has to be edited out of reach
  it('opens the editor when the response does not match the schema', () => {
    failWith(
      new APIError({
        message: 'Unexpected server response',
        response: { status: 200 } as never,
        responseValidationErrors: [
          { path: 'output.0.s3.endpoint_url', message: 'Invalid URL' },
        ],
      })
    );

    renderPage();

    expect(document.body.textContent).toContain('studio shell');
    expect(document.body.textContent).not.toContain('Failed to open project');
  });

  it.each([422, 500])(
    'opens the editor when the server answers %i',
    (status) => {
      failWith(
        new APIError({
          message: 'Broken config',
          response: { status } as never,
        })
      );

      renderPage();

      expect(document.body.textContent).toContain('studio shell');
    }
  );

  it('keeps the plain error for a project that is not there', () => {
    failWith(
      new APIError({
        message: 'Project not found',
        response: { status: 404 } as never,
      })
    );

    renderPage();

    expect(document.body.textContent).toContain('Failed to open project');
    expect(document.body.textContent).not.toContain('studio shell');
  });
});
