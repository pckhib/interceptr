import { render, screen, userEvent } from '@/test/test-utils';
import { ActivityFeed } from './ActivityFeed';
import type { ProxyLogEntry } from '@interceptr/shared';
import { createMockLogEntry } from '@/test/test-utils';

const mockClear = vi.fn();
let mockEntries: ProxyLogEntry[] = [];
let mockConnected = false;
let mockLoaded = true;

vi.mock('@/hooks/use-logs', () => ({
  useLogStream: () => ({
    entries: mockEntries,
    connected: mockConnected,
    clear: mockClear,
    loaded: mockLoaded,
  }),
}));

describe('ActivityFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEntries = [];
    mockConnected = false;
    mockLoaded = true;
  });

  it('shows empty state when no entries', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('No Traffic Recorded')).toBeInTheDocument();
  });

  it('shows filter dropdowns', () => {
    render(<ActivityFeed />);
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes).toHaveLength(3);
  });

  it('shows stream info and clear button in full mode', () => {
    render(<ActivityFeed />);
    expect(screen.getByText('Stream')).toBeInTheDocument();
    expect(screen.getByTitle('Clear logs')).toBeInTheDocument();
  });

  it('hides stream header in compact mode', () => {
    render(<ActivityFeed isCompact />);
    expect(screen.queryByText('Stream')).not.toBeInTheDocument();
  });

  it('shows clear button in compact mode toolbar', () => {
    render(<ActivityFeed isCompact />);
    expect(screen.getByTitle('Clear logs')).toBeInTheDocument();
  });

  it('renders log entries', () => {
    mockEntries = [
      createMockLogEntry({ id: 'log-1', method: 'GET', path: '/api/users', statusCode: 200 }),
      createMockLogEntry({ id: 'log-2', method: 'POST', path: '/api/items', statusCode: 201 }),
    ];
    render(<ActivityFeed />);
    expect(screen.getByText('/api/users')).toBeInTheDocument();
    expect(screen.getByText('/api/items')).toBeInTheDocument();
  });

  it('shows connection status', () => {
    mockConnected = true;
    mockEntries = [];
    render(<ActivityFeed />);
    expect(screen.getByText(/Real-time/)).toBeInTheDocument();
  });

  it('shows offline status', () => {
    mockConnected = false;
    render(<ActivityFeed />);
    expect(screen.getByText(/Offline/)).toBeInTheDocument();
  });

  it('calls clear when clear button is clicked', async () => {
    const user = userEvent.setup();
    render(<ActivityFeed />);

    await user.click(screen.getByTitle('Clear logs'));
    expect(mockClear).toHaveBeenCalled();
  });

  it('shows loading state when not loaded and no entries', () => {
    mockLoaded = false;
    const { container } = render(<ActivityFeed />);
    // When not loaded, a Loader2 spinner is shown (has animate-spin class)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows "No Matches" when filters exclude all entries', async () => {
    mockEntries = [
      createMockLogEntry({ id: 'log-1', method: 'GET', statusCode: 200 }),
    ];
    const user = userEvent.setup();
    render(<ActivityFeed />);

    // Filter by POST method — no entries match
    const methodSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(methodSelect, 'POST');

    expect(screen.getByText('No Matches')).toBeInTheDocument();
  });

  it('filters entries by status code', async () => {
    mockEntries = [
      createMockLogEntry({ id: 'log-1', statusCode: 200, path: '/ok' }),
      createMockLogEntry({ id: 'log-2', statusCode: 404, path: '/missing' }),
      createMockLogEntry({ id: 'log-3', statusCode: 500, path: '/error' }),
    ];
    const user = userEvent.setup();
    render(<ActivityFeed />);

    // Filter by 2xx
    const statusSelect = screen.getAllByRole('combobox')[1];
    await user.selectOptions(statusSelect, '2xx');
    expect(screen.getByText('/ok')).toBeInTheDocument();
    expect(screen.queryByText('/missing')).not.toBeInTheDocument();
    expect(screen.queryByText('/error')).not.toBeInTheDocument();
  });

  it('filters entries by mode', async () => {
    mockEntries = [
      createMockLogEntry({ id: 'log-1', mode: 'passthrough', path: '/pass' }),
      createMockLogEntry({ id: 'log-2', mode: 'mock', path: '/mocked' }),
    ];
    const user = userEvent.setup();
    render(<ActivityFeed />);

    const modeSelect = screen.getAllByRole('combobox')[2];
    await user.selectOptions(modeSelect, 'mock');
    expect(screen.getByText('/mocked')).toBeInTheDocument();
    expect(screen.queryByText('/pass')).not.toBeInTheDocument();
  });

  it('selects an entry and shows RequestDetail', async () => {
    mockEntries = [
      createMockLogEntry({ id: 'log-1', method: 'POST', path: '/api/data', statusCode: 201 }),
    ];
    const user = userEvent.setup();
    render(<ActivityFeed />);

    await user.click(screen.getByText('/api/data'));
    // RequestDetail should render with entry details
    expect(screen.getByText('Request Details')).toBeInTheDocument();
  });

  it('renders entry details including latency and mode', () => {
    mockEntries = [
      createMockLogEntry({ id: 'log-1', latencyMs: 150, mode: 'delay', path: '/api/slow' }),
    ];
    render(<ActivityFeed />);
    expect(screen.getByText('150ms')).toBeInTheDocument();
    expect(screen.getByText('delay')).toBeInTheDocument();
  });

  it('filters by 4xx status codes', async () => {
    mockEntries = [
      createMockLogEntry({ id: 'log-1', statusCode: 200, path: '/ok' }),
      createMockLogEntry({ id: 'log-2', statusCode: 403, path: '/forbidden' }),
    ];
    const user = userEvent.setup();
    render(<ActivityFeed />);

    const statusSelect = screen.getAllByRole('combobox')[1];
    await user.selectOptions(statusSelect, '4xx');
    expect(screen.getByText('/forbidden')).toBeInTheDocument();
    expect(screen.queryByText('/ok')).not.toBeInTheDocument();
  });

  it('filters by 5xx status codes', async () => {
    mockEntries = [
      createMockLogEntry({ id: 'log-1', statusCode: 200, path: '/ok' }),
      createMockLogEntry({ id: 'log-2', statusCode: 503, path: '/unavailable' }),
    ];
    const user = userEvent.setup();
    render(<ActivityFeed />);

    const statusSelect = screen.getAllByRole('combobox')[1];
    await user.selectOptions(statusSelect, '5xx');
    expect(screen.getByText('/unavailable')).toBeInTheDocument();
    expect(screen.queryByText('/ok')).not.toBeInTheDocument();
  });
});
