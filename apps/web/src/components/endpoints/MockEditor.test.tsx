import { render, screen, userEvent } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import { MockEditor } from './MockEditor';

// Mock CodeMirror since it doesn't work in jsdom
vi.mock('@uiw/react-codemirror', () => ({
  default: ({ value, onChange, onBlur }: { value: string; onChange: (v: string) => void; onBlur: () => void }) => (
    <textarea data-testid="codemirror" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} />
  ),
}));

vi.mock('@codemirror/lang-json', () => ({
  json: () => [],
}));

const baseMock = {
  statusCode: 200,
  headers: { 'content-type': 'application/json' },
  body: '{}',
};

describe('MockEditor', () => {
  it('renders status code presets', () => {
    render(<MockEditor mock={baseMock} onChange={() => {}} />);
    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('calls onChange with correct status on preset click', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MockEditor mock={baseMock} onChange={onChange} />);

    await user.click(screen.getByText('404'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it('renders existing headers as key/value rows', () => {
    render(<MockEditor mock={baseMock} onChange={() => {}} />);
    const keyInputs = screen.getAllByPlaceholderText('Header-Name');
    const valueInputs = screen.getAllByPlaceholderText('value');
    expect(keyInputs[0]).toHaveValue('content-type');
    expect(valueInputs[0]).toHaveValue('application/json');
  });

  it('renders spec responses when provided', () => {
    const specResponses = [
      { statusCode: 200, name: 'Success', description: 'Returns user list' },
      { statusCode: 404, name: 'Not Found' },
    ];
    render(<MockEditor mock={baseMock} specResponses={specResponses} onChange={() => {}} />);
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Not Found')).toBeInTheDocument();
  });

  it('does not render spec responses section when none provided', () => {
    render(<MockEditor mock={baseMock} onChange={() => {}} />);
    expect(screen.queryByText('Spec Defined Responses')).not.toBeInTheDocument();
  });

  it('calls onChange with spec response data when spec response is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const specResponses = [
      { statusCode: 201, name: 'Created', body: '{"id":1}', headers: { 'content-type': 'application/json' } },
    ];
    render(<MockEditor mock={baseMock} specResponses={specResponses} onChange={onChange} />);

    await user.click(screen.getByText('Created'));
    expect(onChange).toHaveBeenCalledWith({
      statusCode: 201,
      headers: { 'content-type': 'application/json' },
      body: '{"id":1}',
    });
  });

  it('commits on blur of manual status code input', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MockEditor mock={baseMock} onChange={onChange} />);

    const statusInput = screen.getByDisplayValue('200');
    await user.clear(statusInput);
    await user.type(statusInput, '418');
    await user.tab();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 418 }),
    );
  });

  it('commits on blur of header value input', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MockEditor mock={baseMock} onChange={onChange} />);

    const valueInput = screen.getAllByPlaceholderText('value')[0];
    await user.clear(valueInput);
    await user.type(valueInput, 'text/plain');
    await user.tab();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'content-type': 'text/plain' } }),
    );
  });

  it('adds a new empty header row via Add button', async () => {
    const user = userEvent.setup();
    render(<MockEditor mock={baseMock} onChange={() => {}} />);

    const before = screen.getAllByPlaceholderText('Header-Name').length;
    await user.click(screen.getByRole('button', { name: /add header/i }));
    const after = screen.getAllByPlaceholderText('Header-Name').length;
    expect(after).toBe(before + 1);
  });

  it('removes a header row via remove button', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MockEditor mock={baseMock} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /remove header/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ headers: {} }),
    );
  });

  it('quick-add chip adds a header with default value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MockEditor mock={{ statusCode: 200, headers: {}, body: '' }} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'No-Cache' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'cache-control': 'no-cache' } }),
    );
  });

  it('quick-add chip updates existing header instead of duplicating', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MockEditor mock={baseMock} onChange={onChange} />);

    // baseMock already has content-type: application/json; clicking Text should update it
    await user.click(screen.getByRole('button', { name: 'Text' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'content-type': 'text/plain' } }),
    );
  });

  it('commits on blur of body editor', async () => {
    const onChange = vi.fn();
    render(<MockEditor mock={baseMock} onChange={onChange} />);

    const bodyEditor = screen.getByTestId('codemirror');
    fireEvent.change(bodyEditor, { target: { value: '{"hello":"world"}' } });
    fireEvent.blur(bodyEditor);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ body: '{"hello":"world"}' }),
    );
  });
});
