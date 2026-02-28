import { render, screen } from '@/test/test-utils';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders the status code', () => {
    render(<StatusBadge status={200} />);
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('applies emerald styles for 2xx', () => {
    render(<StatusBadge status={201} />);
    expect(screen.getByText('201').className).toContain('text-emerald-400');
  });

  it('applies blue styles for 3xx', () => {
    render(<StatusBadge status={301} />);
    expect(screen.getByText('301').className).toContain('text-blue-400');
  });

  it('applies amber styles for 4xx', () => {
    render(<StatusBadge status={404} />);
    expect(screen.getByText('404').className).toContain('text-amber-400');
  });

  it('applies rose styles for 5xx', () => {
    render(<StatusBadge status={500} />);
    expect(screen.getByText('500').className).toContain('text-rose-400');
  });
});
