import { render, screen, userEvent } from '@/test/test-utils';
import { Layout } from './Layout';
import { useTheme } from './use-theme';
import { createMemoryRouter, RouterProvider, MemoryRouter } from 'react-router';

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

function renderWithLayout(children?: React.ReactNode) {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <Layout />,
      children: [{ path: '', element: children ?? null }],
    },
  ]);
  return render(<RouterProvider router={router} />);
}

describe('Layout', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
  });

  it('renders the Header component', () => {
    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('header')).toBeInTheDocument();
  });

  it('applies dark theme class by default', () => {
    renderWithLayout();
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('reads theme from localStorage on mount', () => {
    localStorage.setItem('theme', 'light');
    renderWithLayout();
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('toggles theme when toggleTheme is called', async () => {
    const user = userEvent.setup();
    renderWithLayout(<ThemeConsumer />);
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    await user.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('toggles back to dark from light', async () => {
    localStorage.setItem('theme', 'light');
    const user = userEvent.setup();
    renderWithLayout(<ThemeConsumer />);
    expect(screen.getByTestId('theme')).toHaveTextContent('light');
    await user.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('persists theme to localStorage on toggle', async () => {
    const user = userEvent.setup();
    renderWithLayout(<ThemeConsumer />);
    await user.click(screen.getByText('Toggle'));
    expect(localStorage.getItem('theme')).toBe('light');
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
