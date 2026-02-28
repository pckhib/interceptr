import { render, screen, userEvent } from '@/test/test-utils';
import { EndpointList } from './EndpointList';
import { createMockEndpoint } from '@/test/test-utils';
import type { EndpointConfig, ProjectSpec } from '@interceptr/shared';

let mockEndpoints: EndpointConfig[] | undefined;
let mockSpecs: ProjectSpec[] | undefined;
let mockIsLoadingEndpoints = false;
let mockIsLoadingSpecs = false;
const mockBulkMutate = vi.fn();

vi.mock('@/hooks/use-endpoints', () => ({
  useEndpoints: () => ({ data: mockEndpoints, isLoading: mockIsLoadingEndpoints }),
  useBulkUpdateEndpoints: () => ({ mutate: mockBulkMutate }),
}));

vi.mock('@/hooks/use-specs', () => ({
  useSpecs: () => ({ data: mockSpecs, isLoading: mockIsLoadingSpecs }),
}));

// Mock EndpointCard to simplify
vi.mock('./EndpointCard', () => ({
  EndpointCard: ({ endpoint }: { endpoint: EndpointConfig }) => (
    <div data-testid={`endpoint-card-${endpoint.id}`}>{endpoint.method} {endpoint.path}</div>
  ),
}));

// Mock CodeMirror deps
vi.mock('@uiw/react-codemirror', () => ({ default: () => null }));
vi.mock('@codemirror/lang-json', () => ({ json: () => [] }));

const baseSpec: ProjectSpec = {
  id: 'spec-1',
  name: 'Petstore',
  upstreamUrl: 'https://api.example.com',
  active: true,
  metadata: { title: 'Petstore', version: '1.0', endpointCount: 2, uploadedAt: '' },
};

describe('EndpointList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoadingEndpoints = false;
    mockIsLoadingSpecs = false;
    mockSpecs = [baseSpec];
    mockEndpoints = [
      createMockEndpoint({ id: 'ep-1', tags: ['users'], path: '/api/users' }),
      createMockEndpoint({ id: 'ep-2', tags: ['users'], method: 'POST', path: '/api/users' }),
      createMockEndpoint({ id: 'ep-3', tags: ['items'], path: '/api/items' }),
    ];
  });

  it('shows loading state', () => {
    mockIsLoadingEndpoints = true;
    render(<EndpointList />);
    expect(screen.getByText('Indexing endpoints...')).toBeInTheDocument();
  });

  it('shows empty state when no endpoints', () => {
    mockEndpoints = [];
    render(<EndpointList />);
    expect(screen.getByText('No endpoints detected')).toBeInTheDocument();
  });

  it('shows empty state when no active specs', () => {
    mockSpecs = [{ ...baseSpec, active: false }];
    render(<EndpointList />);
    expect(screen.getByText('No Active Specifications')).toBeInTheDocument();
  });

  it('renders endpoint cards grouped by tag', () => {
    render(<EndpointList />);
    expect(screen.getByText('users')).toBeInTheDocument();
    expect(screen.getByText('items')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-card-ep-1')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-card-ep-2')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-card-ep-3')).toBeInTheDocument();
  });

  it('shows group endpoint counts', () => {
    render(<EndpointList />);
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<EndpointList />);
    expect(screen.getByPlaceholderText('Search by path, method, or operation...')).toBeInTheDocument();
  });

  it('filters endpoints by search', async () => {
    const user = userEvent.setup();
    render(<EndpointList />);

    const search = screen.getByPlaceholderText('Search by path, method, or operation...');
    await user.type(search, 'items');

    expect(screen.getByTestId('endpoint-card-ep-3')).toBeInTheDocument();
    expect(screen.queryByTestId('endpoint-card-ep-1')).not.toBeInTheDocument();
  });

  it('shows no results message when search has no matches', async () => {
    const user = userEvent.setup();
    render(<EndpointList />);

    const search = screen.getByPlaceholderText('Search by path, method, or operation...');
    await user.type(search, 'nonexistent');

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('collapses a tag group when clicked', async () => {
    const user = userEvent.setup();
    render(<EndpointList />);

    expect(screen.getByTestId('endpoint-card-ep-1')).toBeInTheDocument();
    await user.click(screen.getByText('users'));
    expect(screen.queryByTestId('endpoint-card-ep-1')).not.toBeInTheDocument();
    // items group is still visible
    expect(screen.getByTestId('endpoint-card-ep-3')).toBeInTheDocument();
  });

  it('renders group mode buttons (Pass, Delay, Mock)', () => {
    render(<EndpointList />);
    // Each tag group gets these buttons, plus the ModeToggle might also have them
    const passButtons = screen.getAllByTitle('Pass all in group');
    expect(passButtons.length).toBeGreaterThanOrEqual(1);
  });
});
