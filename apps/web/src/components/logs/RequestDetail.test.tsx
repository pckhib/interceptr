import { render, screen, userEvent } from '@/test/test-utils';
import { RequestDetail } from './RequestDetail';
import { createMockLogEntry } from '@/test/test-utils';

describe('RequestDetail', () => {
  const baseEntry = createMockLogEntry({
    method: 'POST',
    path: '/api/users',
    statusCode: 201,
    latencyMs: 150,
    mode: 'passthrough',
    requestHeaders: { 'content-type': 'application/json', authorization: 'Bearer token' },
    responseHeaders: { 'content-type': 'application/json' },
    responseBody: '{"id":"1","name":"Alice"}',
  });

  it('renders method badge and status badge in the header', () => {
    render(<RequestDetail entry={baseEntry} onClose={() => {}} />);
    // POST appears in the MethodBadge
    expect(screen.getByText('POST')).toBeInTheDocument();
    // 201 appears in both StatusBadge and the metadata grid — at least two
    const status201 = screen.getAllByText('201');
    expect(status201.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the path', () => {
    render(<RequestDetail entry={baseEntry} onClose={() => {}} />);
    expect(screen.getByText('/api/users')).toBeInTheDocument();
  });

  it('renders latency', () => {
    render(<RequestDetail entry={baseEntry} onClose={() => {}} />);
    expect(screen.getByText('150')).toBeInTheDocument();
  });

  it('renders mode', () => {
    render(<RequestDetail entry={baseEntry} onClose={() => {}} />);
    expect(screen.getByText('passthrough')).toBeInTheDocument();
  });

  it('renders request headers', () => {
    render(<RequestDetail entry={baseEntry} onClose={() => {}} />);
    // Headers are rendered as a single pre element with newlines
    expect(screen.getByText(/authorization: Bearer token/)).toBeInTheDocument();
  });

  it('formats JSON response body', () => {
    render(<RequestDetail entry={baseEntry} onClose={() => {}} />);
    expect(screen.getByText(/"name": "Alice"/)).toBeInTheDocument();
  });

  it('calls onClose when Dismiss is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<RequestDetail entry={baseEntry} onClose={onClose} />);

    await user.click(screen.getByText('Dismiss'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<RequestDetail entry={baseEntry} onClose={onClose} />);

    const backdrop = container.querySelector('.bg-background\\/60')!;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});
