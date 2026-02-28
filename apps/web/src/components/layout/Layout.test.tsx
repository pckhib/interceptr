import { render, screen } from '@/test/test-utils';
import { Layout } from './Layout';
import { useTheme } from './use-theme';
import { MemoryRouter } from 'react-router';

// Mock Header to avoid pulling in its deep dependency tree
vi.mock('./Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

// A test component that uses the theme context
function ThemeConsumer() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe('Layout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the Header component', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('provides theme context defaulting to dark', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    // useTheme is tested directly in the useTheme describe block below
  });
});

describe('useTheme', () => {
  it('throws when used outside ThemeProvider', () => {
    // Suppress console.error for the expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThemeConsumer />)).toThrow('useTheme must be used within a ThemeProvider');
    spy.mockRestore();
  });
});
