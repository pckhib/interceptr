import { render, screen, userEvent } from '@/test/test-utils';
import { RequestDetail } from './RequestDetail';
import { createMockLogEntry } from '@/test/test-utils';

const mockCreateMutate = vi.fn();
vi.mock('@/hooks/use-saved-responses', () => ({
  useSavedResponses: () => ({ data: [] }),
  useCreateSavedResponse: () => ({ mutate: mockCreateMutate, isPending: false }),
  useDeleteSavedResponse: () => ({ mutate: vi.fn() }),
}));

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

  it('copies formatted response body to clipboard on copy button click', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<RequestDetail entry={baseEntry} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /copy response body/i }));
    expect(writeText).toHaveBeenCalledWith(
      JSON.stringify(JSON.parse('{"id":"1","name":"Alice"}'), null, 2),
    );
  });

  it('shows Copied feedback after copying', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<RequestDetail entry={baseEntry} onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /copy response body/i }));
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });

  describe('save as mock', () => {
    beforeEach(() => mockCreateMutate.mockReset());

    it('shows save form when Save as mock is clicked', async () => {
      const user = userEvent.setup();
      render(<RequestDetail entry={baseEntry} onClose={() => {}} />);

      await user.click(screen.getByRole('button', { name: /save as mock response/i }));
      expect(screen.getByPlaceholderText('Name...')).toBeInTheDocument();
    });

    it('calls createSavedResponse with entry data on confirm', async () => {
      const user = userEvent.setup();
      render(<RequestDetail entry={baseEntry} onClose={() => {}} />);

      await user.click(screen.getByRole('button', { name: /save as mock response/i }));
      await user.type(screen.getByPlaceholderText('Name...'), 'Alice response');
      await user.click(screen.getByRole('button', { name: /confirm save response/i }));

      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Alice response',
          statusCode: 201,
          headers: { 'content-type': 'application/json' },
          body: '{"id":"1","name":"Alice"}',
        }),
        expect.anything(),
      );
    });

    it('shows Saved confirmation message after successful save', async () => {
      mockCreateMutate.mockImplementation(
        (_data: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.(),
      );
      const user = userEvent.setup();
      render(<RequestDetail entry={baseEntry} onClose={() => {}} />);

      await user.click(screen.getByRole('button', { name: /save as mock response/i }));
      await user.type(screen.getByPlaceholderText('Name...'), 'Test saved');
      await user.click(screen.getByRole('button', { name: /confirm save response/i }));

      expect(screen.getByText('Saved')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /save as mock response/i })).not.toBeInTheDocument();
    });

    it('submits on Enter key', async () => {
      const user = userEvent.setup();
      render(<RequestDetail entry={baseEntry} onClose={() => {}} />);

      await user.click(screen.getByRole('button', { name: /save as mock response/i }));
      await user.type(screen.getByPlaceholderText('Name...'), 'Quick save{Enter}');

      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Quick save' }),
        expect.anything(),
      );
    });

    it('cancels on Escape key', async () => {
      const user = userEvent.setup();
      render(<RequestDetail entry={baseEntry} onClose={() => {}} />);

      await user.click(screen.getByRole('button', { name: /save as mock response/i }));
      await user.type(screen.getByPlaceholderText('Name...'), 'Test{Escape}');

      expect(screen.queryByPlaceholderText('Name...')).not.toBeInTheDocument();
    });
  });
});
