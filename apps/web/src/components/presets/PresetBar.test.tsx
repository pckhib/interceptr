import { render, screen, userEvent } from '@/test/test-utils';
import { PresetBar } from './PresetBar';
import type { EndpointConfig, Preset } from '@interceptr/shared';
import { createMockEndpoint } from '@/test/test-utils';

const mockBulkMutate = vi.fn();
const mockCreateMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockApplyMutate = vi.fn();

let mockEndpoints: EndpointConfig[] | undefined;
let mockPresets: Preset[] | undefined;

vi.mock('@/hooks/use-presets', () => ({
  usePresets: () => ({ data: mockPresets }),
  useCreatePreset: () => ({ mutate: mockCreateMutate }),
  useDeletePreset: () => ({ mutate: mockDeleteMutate }),
  useApplyPreset: () => ({ mutate: mockApplyMutate }),
}));

vi.mock('@/hooks/use-endpoints', () => ({
  useEndpoints: () => ({ data: mockEndpoints }),
  useBulkUpdateEndpoints: () => ({ mutate: mockBulkMutate }),
}));

describe('PresetBar', () => {
  beforeEach(() => {
    mockBulkMutate.mockClear();
    mockCreateMutate.mockClear();
    mockEndpoints = [createMockEndpoint()];
    mockPresets = [];
  });

  it('renders nothing when there are no endpoints', () => {
    mockEndpoints = [];
    const { container } = render(<PresetBar />);
    expect(container.innerHTML).toBe('');
  });

  it('renders quick action buttons', () => {
    render(<PresetBar />);
    expect(screen.getByText('Slow')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('Pass All')).toBeInTheDocument();
  });

  it('renders save button', () => {
    render(<PresetBar />);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('calls bulkUpdate when Slow is clicked', async () => {
    const user = userEvent.setup();
    render(<PresetBar />);

    await user.click(screen.getByText('Slow'));
    expect(mockBulkMutate).toHaveBeenCalled();
    const updates = mockBulkMutate.mock.calls[0][0];
    expect(updates['ep-1']).toEqual(
      expect.objectContaining({ mode: 'delay', delay: { ms: 2000 } }),
    );
  });

  it('calls bulkUpdate when Errors is clicked', async () => {
    const user = userEvent.setup();
    render(<PresetBar />);

    await user.click(screen.getByText('Errors'));
    expect(mockBulkMutate).toHaveBeenCalled();
    const updates = mockBulkMutate.mock.calls[0][0];
    expect(updates['ep-1']).toEqual(
      expect.objectContaining({ mode: 'mock', mock: expect.objectContaining({ statusCode: 500 }) }),
    );
  });

  it('shows save input when Save is clicked and no preset is active', async () => {
    // Use delay mode so no quick action matches (passthrough matches "Pass All")
    mockEndpoints = [createMockEndpoint({ mode: 'delay', delay: { ms: 500 } })];
    const user = userEvent.setup();
    render(<PresetBar />);

    await user.click(screen.getByText('Save'));
    expect(screen.getByPlaceholderText('Name...')).toBeInTheDocument();
  });

  it('disables save button when a preset is active', () => {
    // All endpoints in passthrough = matches "Pass All" builtin preset
    mockEndpoints = [createMockEndpoint({ mode: 'passthrough' })];
    render(<PresetBar />);
    const saveButton = screen.getByText('Save').closest('button')!;
    expect(saveButton).toBeDisabled();
  });

  it('saves a preset when name is entered and Save is clicked', async () => {
    mockEndpoints = [createMockEndpoint({ mode: 'delay', delay: { ms: 500 } })];
    const user = userEvent.setup();
    render(<PresetBar />);

    await user.click(screen.getByText('Save'));
    const input = screen.getByPlaceholderText('Name...');
    await user.type(input, 'My Preset');
    // Click the save button inside the input form
    const saveButtons = screen.getAllByText('Save');
    await user.click(saveButtons[saveButtons.length - 1]);
    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'My Preset' }),
      expect.anything(),
    );
  });

  it('saves preset on Enter key', async () => {
    mockEndpoints = [createMockEndpoint({ mode: 'delay', delay: { ms: 500 } })];
    const user = userEvent.setup();
    render(<PresetBar />);

    await user.click(screen.getByText('Save'));
    const input = screen.getByPlaceholderText('Name...');
    await user.type(input, 'Enter Preset{Enter}');
    expect(mockCreateMutate).toHaveBeenCalled();
  });

  it('closes save input on Escape key', async () => {
    mockEndpoints = [createMockEndpoint({ mode: 'delay', delay: { ms: 500 } })];
    const user = userEvent.setup();
    render(<PresetBar />);

    await user.click(screen.getByText('Save'));
    expect(screen.getByPlaceholderText('Name...')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByPlaceholderText('Name...')).not.toBeInTheDocument();
  });

  it('closes save input on X button click', async () => {
    mockEndpoints = [createMockEndpoint({ mode: 'delay', delay: { ms: 500 } })];
    const user = userEvent.setup();
    render(<PresetBar />);

    await user.click(screen.getByText('Save'));
    expect(screen.getByPlaceholderText('Name...')).toBeInTheDocument();
    // Find the X close button (has lucide-x class)
    const buttons = screen.getAllByRole('button');
    const xButton = buttons.find(btn => btn.querySelector('.lucide-x'));
    await user.click(xButton!);
    expect(screen.queryByPlaceholderText('Name...')).not.toBeInTheDocument();
  });

  it('shows saved presets dropdown with apply and delete', async () => {
    mockEndpoints = [createMockEndpoint({ mode: 'delay', delay: { ms: 500 } })];
    mockPresets = [
      { name: 'Staging Config', endpoints: { 'ep-1': { mode: 'delay', delay: { ms: 500 } } } },
    ];
    const user = userEvent.setup();
    render(<PresetBar />);

    // Click the "Saved (1)" button
    await user.click(screen.getByText(/Saved/));
    expect(screen.getByText('Staging Config')).toBeInTheDocument();
    expect(screen.getByText('1 endpoints')).toBeInTheDocument();
  });

  it('applies a saved preset when clicked', async () => {
    mockEndpoints = [createMockEndpoint({ mode: 'delay', delay: { ms: 500 } })];
    mockPresets = [
      { name: 'Staging Config', endpoints: { 'ep-1': { mode: 'delay', delay: { ms: 500 } } } },
    ];
    const user = userEvent.setup();
    render(<PresetBar />);

    await user.click(screen.getByText(/Saved/));
    await user.click(screen.getByText('Staging Config'));
    expect(mockApplyMutate).toHaveBeenCalledWith('Staging Config', expect.anything());
  });

  it('deletes a saved preset when delete button is clicked', async () => {
    mockEndpoints = [createMockEndpoint({ mode: 'delay', delay: { ms: 500 } })];
    mockPresets = [
      { name: 'Old Config', endpoints: { 'ep-1': { mode: 'passthrough' } } },
    ];
    const user = userEvent.setup();
    render(<PresetBar />);

    await user.click(screen.getByText(/Saved/));
    await user.click(screen.getByTitle('Delete'));
    expect(mockDeleteMutate).toHaveBeenCalledWith('Old Config');
  });
});
