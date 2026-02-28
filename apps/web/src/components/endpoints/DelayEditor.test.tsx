import { render, screen, userEvent } from '@/test/test-utils';
import { fireEvent } from '@testing-library/react';
import { DelayEditor } from './DelayEditor';

function getNumberInput(displayValue: string) {
  const inputs = screen.getAllByDisplayValue(displayValue);
  return inputs.find((el) => el.getAttribute('type') === 'number')!;
}

function getRangeInput(displayValue: string) {
  const inputs = screen.getAllByDisplayValue(displayValue);
  return inputs.find((el) => el.getAttribute('type') === 'range')!;
}

describe('DelayEditor', () => {
  it('renders with initial delay value in the number input', () => {
    render(<DelayEditor delay={{ ms: 500 }} onChange={() => {}} />);
    expect(getNumberInput('500')).toBeInTheDocument();
  });

  it('renders with initial jitter value in the number input', () => {
    render(<DelayEditor delay={{ ms: 1000, jitterMs: 200 }} onChange={() => {}} />);
    expect(getNumberInput('200')).toBeInTheDocument();
  });

  it('defaults jitter to 0 when not provided', () => {
    render(<DelayEditor delay={{ ms: 1000 }} onChange={() => {}} />);
    expect(getNumberInput('0')).toBeInTheDocument();
  });

  it('renders Base Delay and Jitter labels', () => {
    render(<DelayEditor delay={{ ms: 1000 }} onChange={() => {}} />);
    expect(screen.getByText('Base Delay')).toBeInTheDocument();
    expect(screen.getByText('Jitter (±)')).toBeInTheDocument();
  });

  it('calls onChange on blur of delay number input', () => {
    const onChange = vi.fn();
    render(<DelayEditor delay={{ ms: 1000 }} onChange={onChange} />);
    const input = getNumberInput('1000');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({ ms: 1000, jitterMs: undefined });
  });

  it('updates delay value via number input and commits on blur', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DelayEditor delay={{ ms: 1000 }} onChange={onChange} />);
    const input = getNumberInput('1000');
    await user.clear(input);
    await user.type(input, '3000');
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({ ms: 3000, jitterMs: undefined });
  });

  it('commits delay on range slider mouseUp', () => {
    const onChange = vi.fn();
    render(<DelayEditor delay={{ ms: 1000 }} onChange={onChange} />);
    const slider = getRangeInput('1000');
    fireEvent.change(slider, { target: { value: '5000' } });
    fireEvent.mouseUp(slider);
    expect(onChange).toHaveBeenCalledWith({ ms: 5000, jitterMs: undefined });
  });

  it('calls onChange with jitterMs on blur of jitter input', () => {
    const onChange = vi.fn();
    render(<DelayEditor delay={{ ms: 1000, jitterMs: 200 }} onChange={onChange} />);
    const input = getNumberInput('200');
    fireEvent.focus(input);
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({ ms: 1000, jitterMs: 200 });
  });

  it('updates jitter via number input and commits on blur', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DelayEditor delay={{ ms: 1000 }} onChange={onChange} />);
    const input = getNumberInput('0');
    await user.clear(input);
    await user.type(input, '500');
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({ ms: 1000, jitterMs: 500 });
  });

  it('commits jitter on range slider mouseUp', () => {
    const onChange = vi.fn();
    render(<DelayEditor delay={{ ms: 1000 }} onChange={onChange} />);
    const slider = getRangeInput('0');
    fireEvent.change(slider, { target: { value: '300' } });
    fireEvent.mouseUp(slider);
    expect(onChange).toHaveBeenCalledWith({ ms: 1000, jitterMs: 300 });
  });

  it('sends jitterMs as undefined when jitter is 0', () => {
    const onChange = vi.fn();
    render(<DelayEditor delay={{ ms: 1000, jitterMs: 200 }} onChange={onChange} />);
    const input = getNumberInput('200');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith({ ms: 1000, jitterMs: undefined });
  });
});
