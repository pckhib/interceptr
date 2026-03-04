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

const mockCreateMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockDeleteMutate = vi.fn();
let mockSavedResponsesData: unknown[] = [];

vi.mock('@/hooks/use-saved-responses', () => ({
  useSavedResponses: () => ({ data: mockSavedResponsesData }),
  useCreateSavedResponse: () => ({ mutate: mockCreateMutate, isPending: false }),
  useUpdateSavedResponse: () => ({ mutate: mockUpdateMutate, isPending: false }),
  useDeleteSavedResponse: () => ({ mutate: mockDeleteMutate }),
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
    render(<MockEditor mock={{ statusCode: 200, headers: { 'content-type': 'text/plain' }, body: '' }} onChange={onChange} />);

    // already has content-type: text/plain; clicking Content-Type should update it to application/json
    await user.click(screen.getByRole('button', { name: 'Content-Type' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'content-type': 'application/json' } }),
    );
  });

  it('formats valid JSON body when Format button is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MockEditor mock={{ ...baseMock, body: '{"a":1,"b":2}' }} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /format json/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ body: '{\n  "a": 1,\n  "b": 2\n}' }),
    );
  });

  it('disables Format button when body is empty', () => {
    render(<MockEditor mock={{ ...baseMock, body: '' }} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /format json/i })).toBeDisabled();
  });

  it('shows error and disables Format button for invalid JSON', async () => {
    render(<MockEditor mock={{ ...baseMock, body: '{invalid' }} onChange={() => {}} />);
    expect(await screen.findByRole('button', { name: /format json/i })).toBeDisabled();
    expect(await screen.findByTestId('json-error')).toBeInTheDocument();
  });

  it('shows generate button only for spec responses with a schema', () => {
    const specResponses = [
      { statusCode: 200, name: 'Success', schema: { type: 'object', properties: { id: { type: 'string' } } } },
      { statusCode: 404, name: 'Not Found' },
    ];
    render(<MockEditor mock={baseMock} specResponses={specResponses} onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'Generate test data' })).toBeInTheDocument();
  });

  it('clicking generate button calls onChange with generated body', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const specResponses = [
      {
        statusCode: 200,
        name: 'Success',
        schema: { type: 'object', properties: { id: { type: 'string', format: 'uuid' }, name: { type: 'string' } } },
      },
    ];
    render(<MockEditor mock={baseMock} specResponses={specResponses} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Generate test data' }));
    const call = onChange.mock.calls.at(-1)![0];
    expect(call.statusCode).toBe(200);
    const parsed = JSON.parse(call.body);
    expect(parsed).toHaveProperty('id');
    expect(parsed).toHaveProperty('name');
  });

  it('generate button applies status code and default content-type header', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const specResponses = [
      { statusCode: 201, name: 'Created', schema: { type: 'object', properties: { ok: { type: 'boolean' } } } },
    ];
    render(<MockEditor mock={baseMock} specResponses={specResponses} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Generate test data' }));
    const call = onChange.mock.calls.at(-1)![0];
    expect(call.statusCode).toBe(201);
    expect(call.headers).toMatchObject({ 'content-type': 'application/json' });
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

  describe('saved responses', () => {
    beforeEach(() => {
      mockSavedResponsesData = [];
      mockCreateMutate.mockReset();
      mockUpdateMutate.mockReset();
      mockDeleteMutate.mockReset();
    });

    it('shows empty state when no saved responses', () => {
      render(<MockEditor mock={baseMock} onChange={() => {}} />);
      expect(screen.getByText(/No saved responses yet/)).toBeInTheDocument();
    });

    it('shows save form when Save current is clicked', async () => {
      const user = userEvent.setup();
      render(<MockEditor mock={baseMock} onChange={() => {}} />);

      await user.click(screen.getByRole('button', { name: /save current response/i }));
      expect(screen.getByPlaceholderText('Name...')).toBeInTheDocument();
    });

    it('calls createSavedResponse.mutate with current mock data on save', async () => {
      const user = userEvent.setup();
      render(<MockEditor mock={baseMock} onChange={() => {}} />);

      await user.click(screen.getByRole('button', { name: /save current response/i }));
      await user.type(screen.getByPlaceholderText('Name...'), 'My Response');
      await user.click(screen.getByRole('button', { name: /confirm save/i }));

      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My Response',
          statusCode: 200,
          body: '{}',
        }),
        expect.anything(),
      );
    });

    it('submits save form on Enter key', async () => {
      const user = userEvent.setup();
      render(<MockEditor mock={baseMock} onChange={() => {}} />);

      await user.click(screen.getByRole('button', { name: /save current response/i }));
      await user.type(screen.getByPlaceholderText('Name...'), 'Enter Response{Enter}');

      expect(mockCreateMutate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Enter Response' }),
        expect.anything(),
      );
    });

    it('cancels save form on Escape key', async () => {
      const user = userEvent.setup();
      render(<MockEditor mock={baseMock} onChange={() => {}} />);

      await user.click(screen.getByRole('button', { name: /save current response/i }));
      const nameInput = screen.getByPlaceholderText('Name...');
      await user.type(nameInput, 'Test{Escape}');

      expect(screen.queryByPlaceholderText('Name...')).not.toBeInTheDocument();
    });

    it('renders saved response cards when data is available', () => {
      mockSavedResponsesData = [
        { id: 'sr-1', name: 'My Saved', statusCode: 201, headers: { 'content-type': 'application/json' }, body: '{"ok":true}', createdAt: '' },
      ];
      render(<MockEditor mock={baseMock} onChange={() => {}} />);
      expect(screen.getByText('My Saved')).toBeInTheDocument();
    });

    it('applies saved response on card click', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      mockSavedResponsesData = [
        { id: 'sr-1', name: 'My Saved', statusCode: 201, headers: { 'content-type': 'application/json' }, body: '{"ok":true}', createdAt: '' },
      ];
      render(<MockEditor mock={baseMock} onChange={onChange} />);

      await user.click(screen.getByText('My Saved'));
      expect(onChange).toHaveBeenCalledWith({
        statusCode: 201,
        headers: { 'content-type': 'application/json' },
        body: '{"ok":true}',
      });
    });

    it('calls deleteSavedResponse.mutate with response id on delete', async () => {
      const user = userEvent.setup();
      mockSavedResponsesData = [
        { id: 'sr-1', name: 'To Delete', statusCode: 200, headers: {}, body: '', createdAt: '' },
      ];
      render(<MockEditor mock={baseMock} onChange={() => {}} />);

      await user.click(screen.getByRole('button', { name: /delete saved response/i }));
      expect(mockDeleteMutate).toHaveBeenCalledWith('sr-1');
    });

    it('highlights the active saved response card after clicking it', async () => {
      const user = userEvent.setup();
      mockSavedResponsesData = [
        { id: 'sr-1', name: 'My Saved', statusCode: 200, headers: {}, body: '', createdAt: '' },
      ];
      const { container } = render(<MockEditor mock={baseMock} onChange={() => {}} />);

      await user.click(screen.getByText('My Saved'));
      const card = container.querySelector('[class*="border-primary"]');
      expect(card).toBeInTheDocument();
    });

    it('disables "Save current" when active saved response has no changes', async () => {
      const user = userEvent.setup();
      mockSavedResponsesData = [
        { id: 'sr-1', name: 'Same', statusCode: 200, headers: { 'content-type': 'application/json' }, body: '{}', createdAt: '' },
      ];
      render(<MockEditor mock={baseMock} onChange={() => {}} />);

      await user.click(screen.getByText('Same'));
      expect(screen.getByRole('button', { name: /save current response/i })).toBeDisabled();
    });

    it('"Save current" calls updateSavedResponse when active saved response has changes', async () => {
      const user = userEvent.setup();
      mockSavedResponsesData = [
        { id: 'sr-1', name: 'My Response', statusCode: 200, headers: {}, body: '{"old":true}', createdAt: '' },
      ];
      render(<MockEditor mock={baseMock} onChange={() => {}} />);

      // Select the saved response
      await user.click(screen.getByText('My Response'));
      // Now body matches — button should be disabled. Change the body via the textarea
      fireEvent.change(screen.getByTestId('codemirror'), { target: { value: '{"new":true}' } });
      fireEvent.blur(screen.getByTestId('codemirror'));

      await user.click(screen.getByRole('button', { name: /save current response/i }));

      expect(mockUpdateMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'sr-1',
          data: expect.objectContaining({ name: 'My Response', body: '{"new":true}' }),
        }),
      );
    });

    it('"Save current" opens the name form when no saved response is active', async () => {
      render(<MockEditor mock={baseMock} onChange={() => {}} />);

      await userEvent.setup().click(screen.getByRole('button', { name: /save current response/i }));
      expect(screen.getByPlaceholderText('Name...')).toBeInTheDocument();
    });
  });

  describe('active source — spec responses', () => {
    it('highlights the active spec response card after clicking it', async () => {
      const user = userEvent.setup();
      const specResponses = [{ statusCode: 200, name: 'OK' }, { statusCode: 404, name: 'Not Found' }];
      const { container } = render(<MockEditor mock={baseMock} specResponses={specResponses} onChange={() => {}} />);

      await user.click(screen.getByText('OK'));
      const card = container.querySelector('[class*="border-primary"]');
      expect(card).toBeInTheDocument();
    });

    it('"Save current" still opens the name form when a spec response is active', async () => {
      const user = userEvent.setup();
      const specResponses = [{ statusCode: 200, name: 'OK' }];
      render(<MockEditor mock={baseMock} specResponses={specResponses} onChange={() => {}} />);

      await user.click(screen.getByText('OK'));
      await user.click(screen.getByRole('button', { name: /save current response/i }));
      expect(screen.getByPlaceholderText('Name...')).toBeInTheDocument();
    });
  });
});
