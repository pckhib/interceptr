import { render, screen } from '@testing-library/react';
import App from './App';

// Mock Layout to pass through children via Outlet
vi.mock('@/components/layout/Layout', async () => {
  const { Outlet } = await import('react-router');
  return {
    Layout: () => (
      <div data-testid="layout">
        <Outlet />
      </div>
    ),
  };
});

vi.mock('@/pages/EndpointsPage', () => ({
  EndpointsPage: () => <div data-testid="endpoints-page" />,
}));

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders the Layout', () => {
    render(<App />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders EndpointsPage at root path', () => {
    render(<App />);
    expect(screen.getByTestId('endpoints-page')).toBeInTheDocument();
  });

  it('redirects unknown routes to root', () => {
    window.history.pushState({}, '', '/unknown/page');
    render(<App />);
    expect(screen.getByTestId('endpoints-page')).toBeInTheDocument();
  });
});
