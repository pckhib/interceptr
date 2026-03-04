import { render, screen, userEvent } from '@/test/test-utils';
import { SpecSelector } from './SpecSelector';
import type { ProjectSpec } from '@interceptr/shared';

const mockToggleMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockUploadMutate = vi.fn();
const mockUploadFromUrlMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockReimportMutate = vi.fn();

let mockSpecs: ProjectSpec[] | undefined;

vi.mock('@/hooks/use-specs', () => ({
  useSpecs: () => ({ data: mockSpecs }),
  useToggleSpec: () => ({ mutate: mockToggleMutate }),
  useDeleteSpec: () => ({ mutate: mockDeleteMutate }),
  useUploadSpec: () => ({ mutate: mockUploadMutate, isPending: false }),
  useUploadSpecFromUrl: () => ({ mutate: mockUploadFromUrlMutate, isPending: false }),
  useUpdateSpec: () => ({ mutate: mockUpdateMutate }),
  useReimportSpec: () => ({ mutate: mockReimportMutate, isPending: false }),
}));

const baseSpec: ProjectSpec = {
  id: 'spec-1',
  name: 'Petstore',
  upstreamUrl: 'https://api.example.com',
  active: true,
  metadata: {
    title: 'Petstore API',
    version: '1.0.0',
    endpointCount: 5,
    uploadedAt: '2025-01-01T00:00:00Z',
  },
};

describe('SpecSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpecs = [baseSpec];
  });

  it('renders the active spec name', () => {
    render(<SpecSelector />);
    expect(screen.getByText('Petstore')).toBeInTheDocument();
  });

  it('shows "Select Spec" when no specs are active', () => {
    mockSpecs = [{ ...baseSpec, active: false }];
    render(<SpecSelector />);
    expect(screen.getByText('Select Spec')).toBeInTheDocument();
  });

  it('shows count when multiple specs are active', () => {
    mockSpecs = [
      baseSpec,
      { ...baseSpec, id: 'spec-2', name: 'Users API' },
    ];
    render(<SpecSelector />);
    expect(screen.getByText('2 Specs')).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    expect(screen.getByText('API Specifications')).toBeInTheDocument();
    expect(screen.getByText(/Petstore API/)).toBeInTheDocument();
  });

  it('shows total and active counts in footer', async () => {
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    expect(screen.getByText('Total: 1')).toBeInTheDocument();
    expect(screen.getByText('1 Active')).toBeInTheDocument();
  });

  it('calls toggleSpec when a spec is clicked', async () => {
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    // Click on the spec name in the dropdown
    const specName = screen.getAllByText('Petstore');
    // The dropdown list item (second instance)
    await user.click(specName[1]);
    expect(mockToggleMutate).toHaveBeenCalledWith('spec-1');
  });

  it('shows empty state when no specs exist', async () => {
    mockSpecs = [];
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Select Spec'));
    expect(screen.getByText(/No specifications yet/)).toBeInTheDocument();
  });

  it('shows import form when plus button is clicked', async () => {
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    // Click the plus button
    const buttons = screen.getAllByRole('button');
    const plusButton = buttons.find(btn => btn.querySelector('.lucide-plus'));
    await user.click(plusButton!);

    expect(screen.getByText('Spec Identifier')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. staging-api')).toBeInTheDocument();
  });

  it('imports spec from URL', async () => {
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    const buttons = screen.getAllByRole('button');
    const plusButton = buttons.find(btn => btn.querySelector('.lucide-plus'));
    await user.click(plusButton!);

    await user.type(screen.getByPlaceholderText('e.g. staging-api'), 'my-api');
    await user.type(screen.getByPlaceholderText('https://api.example.com/spec.json'), 'https://example.com/spec.json');
    await user.click(screen.getByText('Import from URL'));
    expect(mockUploadFromUrlMutate).toHaveBeenCalledWith(
      { url: 'https://example.com/spec.json', name: 'my-api' },
      expect.anything(),
    );
  });

  it('toggles between URL and File import modes', async () => {
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    const buttons = screen.getAllByRole('button');
    const plusButton = buttons.find(btn => btn.querySelector('.lucide-plus'));
    await user.click(plusButton!);

    // Default mode is URL
    expect(screen.getByPlaceholderText('https://api.example.com/spec.json')).toBeInTheDocument();

    // Switch to File mode
    await user.click(screen.getByText('File'));
    expect(screen.getByText('Click to select file')).toBeInTheDocument();

    // Switch back to URL
    await user.click(screen.getByText('URL'));
    expect(screen.getByPlaceholderText('https://api.example.com/spec.json')).toBeInTheDocument();
  });

  it('opens editing panel when settings icon is clicked', async () => {
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    const settingsBtn = screen.getByTitle('Configure');
    await user.click(settingsBtn);
    expect(screen.getByText('Upstream URL')).toBeInTheDocument();
    expect(screen.getByText('Reimport')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('saves upstream URL when check button is clicked', async () => {
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    await user.click(screen.getByTitle('Configure'));
    const urlInput = screen.getByDisplayValue('https://api.example.com');
    await user.clear(urlInput);
    await user.type(urlInput, 'https://new-api.example.com');
    // Click the check/save button (has lucide-check class)
    const checkBtns = screen.getAllByRole('button').filter(btn => btn.querySelector('.lucide-check'));
    await user.click(checkBtns[0]);
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { specId: 'spec-1', data: { upstreamUrl: 'https://new-api.example.com' } },
      expect.anything(),
    );
  });

  it('closes editing panel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    await user.click(screen.getByTitle('Configure'));
    expect(screen.getByText('Upstream URL')).toBeInTheDocument();
    await user.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Upstream URL')).not.toBeInTheDocument();
  });

  it('calls deleteSpec when delete icon is clicked and confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    await user.click(screen.getByTitle('Delete'));
    expect(mockDeleteMutate).toHaveBeenCalledWith('spec-1');
    vi.mocked(window.confirm).mockRestore();
  });

  it('does not delete spec when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    await user.click(screen.getByTitle('Delete'));
    expect(mockDeleteMutate).not.toHaveBeenCalled();
    vi.mocked(window.confirm).mockRestore();
  });

  it('reimports spec with sourceUrl', async () => {
    mockSpecs = [{ ...baseSpec, metadata: { ...baseSpec.metadata, sourceUrl: 'https://example.com/spec.json' } }];
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    await user.click(screen.getByTitle('Configure'));
    await user.click(screen.getByText('Reimport'));
    expect(mockReimportMutate).toHaveBeenCalledWith({ specId: 'spec-1' });
  });

  it('handles reimport for spec without sourceUrl (triggers file picker)', async () => {
    // baseSpec has no sourceUrl — should not call reimportSpec.mutate
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    await user.click(screen.getByTitle('Configure'));
    await user.click(screen.getByText('Reimport'));
    expect(mockReimportMutate).not.toHaveBeenCalled();
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    expect(screen.getByText('API Specifications')).toBeInTheDocument();

    await user.click(document.body);
    expect(screen.queryByText('API Specifications')).not.toBeInTheDocument();
  });

  it('closes import form when X button is clicked', async () => {
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    const buttons = screen.getAllByRole('button');
    const plusButton = buttons.find(btn => btn.querySelector('.lucide-plus'));
    await user.click(plusButton!);

    expect(screen.getByText('Spec Identifier')).toBeInTheDocument();
    // Click X to close the import form
    const xButton = screen.getAllByRole('button').find(btn => btn.querySelector('.lucide-x'));
    await user.click(xButton!);
    expect(screen.queryByText('Spec Identifier')).not.toBeInTheDocument();
  });

  it('does not import from URL when fields are empty', async () => {
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    const buttons = screen.getAllByRole('button');
    const plusButton = buttons.find(btn => btn.querySelector('.lucide-plus'));
    await user.click(plusButton!);

    // Import button should be disabled without name/url
    const importBtn = screen.getByText('Import from URL').closest('button');
    expect(importBtn).toBeDisabled();
  });

  it('toggles settings panel off when clicked again', async () => {
    const user = userEvent.setup();
    render(<SpecSelector />);

    await user.click(screen.getByText('Petstore'));
    await user.click(screen.getByTitle('Configure'));
    expect(screen.getByText('Upstream URL')).toBeInTheDocument();
    // Click configure again to close
    await user.click(screen.getByTitle('Configure'));
    expect(screen.queryByText('Upstream URL')).not.toBeInTheDocument();
  });
});
