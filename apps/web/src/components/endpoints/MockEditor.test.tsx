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

  it('renders headers textarea with formatted headers', () => {
    render(<MockEditor mock={baseMock} onChange={() => {}} />);
    const textarea = screen.getByPlaceholderText('content-type: application/json');
    expect(textarea).toHaveValue('content-type: application/json');
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
    await user.tab(); // triggers blur
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 418 }),
    );
  });

  it('commits on blur of headers textarea', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MockEditor mock={baseMock} onChange={onChange} />);

    const textarea = screen.getByPlaceholderText('content-type: application/json');
    await user.clear(textarea);
    await user.type(textarea, 'x-custom: value');
    await user.tab(); // triggers blur
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'x-custom': 'value' } }),
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

  it('parses headers ignoring lines without colons', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MockEditor mock={baseMock} onChange={onChange} />);

    const textarea = screen.getByPlaceholderText('content-type: application/json');
    await user.clear(textarea);
    await user.type(textarea, 'x-key: val{enter}badline');
    await user.tab();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'x-key': 'val' } }),
    );
  });
});
