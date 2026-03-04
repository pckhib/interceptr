import { render, screen, userEvent, waitFor } from '@/test/test-utils';
import { GlobalHeadersPanel, GlobalHeadersTrigger } from './GlobalHeadersPanel';
import type { ProjectSpec } from '@interceptr/shared';

const mockUpdateMutate = vi.fn();
let mockSpecs: ProjectSpec[] | undefined;

vi.mock('@/hooks/use-specs', () => ({
  useSpecs: () => ({ data: mockSpecs }),
  useUpdateSpec: () => ({ mutate: mockUpdateMutate }),
}));

const baseSpec: ProjectSpec = {
  id: 'spec-1',
  name: 'Petstore',
  upstreamUrl: 'https://api.example.com',
  active: true,
  globalHeaders: { 'x-custom': 'value1' },
  metadata: {
    title: 'Petstore API',
    version: '1.0.0',
    endpointCount: 5,
    uploadedAt: '2025-01-01T00:00:00Z',
  },
};

describe('GlobalHeadersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpecs = [baseSpec];
  });

  it('returns null when closed', () => {
    const { container } = render(<GlobalHeadersPanel open={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows "No active spec selected" when no active specs', () => {
    mockSpecs = [{ ...baseSpec, active: false }];
    render(<GlobalHeadersPanel open={true} />);
    expect(screen.getByText('No active spec selected.')).toBeInTheDocument();
  });

  it('renders header editor for active spec', () => {
    render(<GlobalHeadersPanel open={true} />);
    expect(screen.getByText('Petstore')).toBeInTheDocument();
    expect(screen.getByDisplayValue('x-custom')).toBeInTheDocument();
    expect(screen.getByDisplayValue('value1')).toBeInTheDocument();
  });

  it('shows header count badge', () => {
    render(<GlobalHeadersPanel open={true} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows empty state when no headers', () => {
    mockSpecs = [{ ...baseSpec, globalHeaders: {} }];
    render(<GlobalHeadersPanel open={true} />);
    expect(screen.getByText(/No global headers/)).toBeInTheDocument();
  });

  it('shows empty state for spec with no globalHeaders field', () => {
    mockSpecs = [{ ...baseSpec, globalHeaders: undefined }];
    render(<GlobalHeadersPanel open={true} />);
    expect(screen.getByText(/No global headers/)).toBeInTheDocument();
  });

  it('adds a new empty row when + Add is clicked', async () => {
    mockSpecs = [{ ...baseSpec, globalHeaders: {} }];
    const user = userEvent.setup();
    render(<GlobalHeadersPanel open={true} />);
    await user.click(screen.getByLabelText('Add global header'));
    expect(screen.getByPlaceholderText('Header-Name')).toBeInTheDocument();
  });

  it('removes a header row and saves', async () => {
    const user = userEvent.setup();
    render(<GlobalHeadersPanel open={true} />);
    await user.click(screen.getByLabelText('Remove global header'));
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      specId: 'spec-1',
      data: { globalHeaders: {} },
    });
  });

  it('calls updateSpec on blur', async () => {
    const user = userEvent.setup();
    render(<GlobalHeadersPanel open={true} />);
    const keyInput = screen.getByDisplayValue('x-custom');
    await user.click(keyInput);
    await user.tab();
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      specId: 'spec-1',
      data: { globalHeaders: { 'x-custom': 'value1' } },
    });
  });

  it('updates header key and saves on blur', async () => {
    const user = userEvent.setup();
    render(<GlobalHeadersPanel open={true} />);
    const keyInput = screen.getByDisplayValue('x-custom');
    await user.tripleClick(keyInput);
    await user.clear(keyInput);
    await user.type(keyInput, 'new-key');
    await user.tab();
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ specId: 'spec-1' }),
    );
  });

  it('adds quick-add CORS Origin header', async () => {
    mockSpecs = [{ ...baseSpec, globalHeaders: {} }];
    const user = userEvent.setup();
    render(<GlobalHeadersPanel open={true} />);
    await user.click(screen.getByText('CORS Origin'));
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      specId: 'spec-1',
      data: { globalHeaders: { 'access-control-allow-origin': '*' } },
    });
  });

  it('updates existing quick-add header if key already exists', async () => {
    mockSpecs = [{ ...baseSpec, globalHeaders: { 'access-control-allow-origin': 'https://example.com' } }];
    const user = userEvent.setup();
    render(<GlobalHeadersPanel open={true} />);
    await user.click(screen.getByText('CORS Origin'));
    expect(mockUpdateMutate).toHaveBeenCalledWith({
      specId: 'spec-1',
      data: { globalHeaders: { 'access-control-allow-origin': '*' } },
    });
  });

  it('shows section header text', () => {
    render(<GlobalHeadersPanel open={true} />);
    expect(screen.getByText('Global Response Headers')).toBeInTheDocument();
  });

  it('renders multiple active specs', () => {
    mockSpecs = [
      baseSpec,
      { ...baseSpec, id: 'spec-2', name: 'Users API', globalHeaders: { 'x-api': '1' } },
    ];
    render(<GlobalHeadersPanel open={true} />);
    expect(screen.getByText('Petstore')).toBeInTheDocument();
    expect(screen.getByText('Users API')).toBeInTheDocument();
  });
});

describe('GlobalHeadersTrigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSpecs = [baseSpec];
  });

  it('renders the button', () => {
    render(<GlobalHeadersTrigger open={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<GlobalHeadersTrigger open={false} onToggle={onToggle} />);
    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('shows total header count badge', () => {
    render(<GlobalHeadersTrigger open={false} onToggle={vi.fn()} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('does not show badge when no headers', () => {
    mockSpecs = [{ ...baseSpec, globalHeaders: {} }];
    render(<GlobalHeadersTrigger open={false} onToggle={vi.fn()} />);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows count across multiple active specs', () => {
    mockSpecs = [
      baseSpec,
      { ...baseSpec, id: 'spec-2', name: 'Users', globalHeaders: { 'x-api': '1', 'x-version': '2' } },
    ];
    render(<GlobalHeadersTrigger open={false} onToggle={vi.fn()} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows 0 count badge when no active specs', () => {
    mockSpecs = [];
    render(<GlobalHeadersTrigger open={false} onToggle={vi.fn()} />);
    // No badge should appear (totalHeaders = 0)
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
