import { render, screen, userEvent } from '@/test/test-utils';
import { ModeToggle } from './ModeToggle';

describe('ModeToggle', () => {
  it('renders three mode buttons', () => {
    render(<ModeToggle value="passthrough" onChange={() => {}} />);
    expect(screen.getByText('Pass')).toBeInTheDocument();
    expect(screen.getByText('Delay')).toBeInTheDocument();
    expect(screen.getByText('Mock')).toBeInTheDocument();
  });

  it('calls onChange with "delay" when Delay is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ModeToggle value="passthrough" onChange={onChange} />);

    await user.click(screen.getByText('Delay'));
    expect(onChange).toHaveBeenCalledWith('delay');
  });

  it('calls onChange with "mock" when Mock is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ModeToggle value="passthrough" onChange={onChange} />);

    await user.click(screen.getByText('Mock'));
    expect(onChange).toHaveBeenCalledWith('mock');
  });

  it('calls onChange with "passthrough" when Pass is clicked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ModeToggle value="delay" onChange={onChange} />);

    await user.click(screen.getByText('Pass'));
    expect(onChange).toHaveBeenCalledWith('passthrough');
  });

  it('highlights the active mode button', () => {
    render(<ModeToggle value="mock" onChange={() => {}} />);
    const mockButton = screen.getByText('Mock').closest('button')!;
    expect(mockButton.className).toContain('font-bold');
  });
});
