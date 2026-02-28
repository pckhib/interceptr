import { render, screen, userEvent } from '@/test/test-utils';
import { EndpointCard } from './EndpointCard';
import { createMockEndpoint } from '@/test/test-utils';

// Mock the update endpoint hook
const mockMutate = vi.fn();
vi.mock('@/hooks/use-endpoints', () => ({
  useUpdateEndpoint: () => ({ mutate: mockMutate }),
}));

// Mock CodeMirror for MockEditor
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value }: { value: string }) => <textarea data-testid="codemirror" defaultValue={value} />,
}));
vi.mock('@codemirror/lang-json', () => ({
  json: () => [],
}));

describe('EndpointCard', () => {
  beforeEach(() => {
    mockMutate.mockClear();
  });

  it('renders method badge and path', () => {
    const endpoint = createMockEndpoint({ method: 'POST', path: '/api/items' });
    render(<EndpointCard endpoint={endpoint} />);
    expect(screen.getByText('POST')).toBeInTheDocument();
    expect(screen.getByText('/api/items')).toBeInTheDocument();
  });

  it('renders mode toggle', () => {
    const endpoint = createMockEndpoint();
    render(<EndpointCard endpoint={endpoint} />);
    expect(screen.getByText('Pass')).toBeInTheDocument();
    expect(screen.getByText('Delay')).toBeInTheDocument();
    expect(screen.getByText('Mock')).toBeInTheDocument();
  });

  it('expands on click to show configuration', async () => {
    const endpoint = createMockEndpoint({ mode: 'passthrough' });
    const user = userEvent.setup();
    render(<EndpointCard endpoint={endpoint} />);

    expect(screen.queryByText('Passthrough Mode Active')).not.toBeInTheDocument();
    await user.click(screen.getByText('/api/users'));
    expect(screen.getByText('Passthrough Mode Active')).toBeInTheDocument();
  });

  it('triggers mutation when mode is changed', async () => {
    const endpoint = createMockEndpoint();
    const user = userEvent.setup();
    render(<EndpointCard endpoint={endpoint} />);

    await user.click(screen.getByText('Delay'));
    expect(mockMutate).toHaveBeenCalledWith({
      id: 'ep-1',
      config: expect.objectContaining({ mode: 'delay' }),
    });
  });

  it('shows delay badge when collapsed in delay mode', () => {
    const endpoint = createMockEndpoint({
      mode: 'delay',
      delay: { ms: 2000 },
    });
    render(<EndpointCard endpoint={endpoint} />);
    expect(screen.getByText('2000ms')).toBeInTheDocument();
  });

  it('shows mock status badge when collapsed in mock mode', () => {
    const endpoint = createMockEndpoint({
      mode: 'mock',
      mock: { statusCode: 404, headers: {}, body: '' },
    });
    render(<EndpointCard endpoint={endpoint} />);
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('renders summary when provided', () => {
    const endpoint = createMockEndpoint({ summary: 'List all users' });
    render(<EndpointCard endpoint={endpoint} />);
    expect(screen.getByText('List all users')).toBeInTheDocument();
  });

  it('sets default mock when switching to mock mode without existing mock', async () => {
    const endpoint = createMockEndpoint({ mode: 'passthrough' });
    const user = userEvent.setup();
    render(<EndpointCard endpoint={endpoint} />);

    await user.click(screen.getByText('Mock'));
    expect(mockMutate).toHaveBeenCalledWith({
      id: 'ep-1',
      config: expect.objectContaining({
        mode: 'mock',
        mock: { statusCode: 200, headers: { 'content-type': 'application/json' }, body: '{}' },
      }),
    });
  });

  it('expands and shows MockEditor when in mock mode', async () => {
    const endpoint = createMockEndpoint({
      mode: 'mock',
      mock: { statusCode: 200, headers: { 'content-type': 'application/json' }, body: '{}' },
    });
    const user = userEvent.setup();
    render(<EndpointCard endpoint={endpoint} />);

    await user.click(screen.getByText('/api/users'));
    expect(screen.getByText('Mock Response')).toBeInTheDocument();
    expect(screen.getByText('Status Code')).toBeInTheDocument();
  });

  it('expands and shows DelayEditor when in delay mode', async () => {
    const endpoint = createMockEndpoint({
      mode: 'delay',
      delay: { ms: 1500 },
    });
    const user = userEvent.setup();
    render(<EndpointCard endpoint={endpoint} />);

    await user.click(screen.getByText('/api/users'));
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Base Delay')).toBeInTheDocument();
  });

  it('shows spec badge when showSpecBadge is true', () => {
    const endpoint = createMockEndpoint();
    render(<EndpointCard endpoint={endpoint} specName="Petstore" showSpecBadge />);
    expect(screen.getByText('Petstore')).toBeInTheDocument();
  });
});
