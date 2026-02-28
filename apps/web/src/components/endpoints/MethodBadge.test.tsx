import { render, screen } from '@/test/test-utils';
import { MethodBadge } from './MethodBadge';

describe('MethodBadge', () => {
  it('renders the method text', () => {
    render(<MethodBadge method="GET" />);
    expect(screen.getByText('GET')).toBeInTheDocument();
  });

  it('applies emerald styles for GET', () => {
    render(<MethodBadge method="GET" />);
    expect(screen.getByText('GET').className).toContain('text-emerald-400');
  });

  it('applies blue styles for POST', () => {
    render(<MethodBadge method="POST" />);
    expect(screen.getByText('POST').className).toContain('text-blue-400');
  });

  it('applies rose styles for DELETE', () => {
    render(<MethodBadge method="DELETE" />);
    expect(screen.getByText('DELETE').className).toContain('text-rose-400');
  });

  it('applies amber styles for PUT', () => {
    render(<MethodBadge method="PUT" />);
    expect(screen.getByText('PUT').className).toContain('text-amber-400');
  });

  it('applies fallback styles for unknown methods', () => {
    render(<MethodBadge method="CUSTOM" />);
    expect(screen.getByText('CUSTOM').className).toContain('text-muted-foreground');
  });
});
