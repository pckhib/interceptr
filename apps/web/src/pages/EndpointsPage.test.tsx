import { render, screen } from '@/test/test-utils';
import { EndpointsPage } from './EndpointsPage';

// Mock child components to isolate page-level rendering
vi.mock('@/components/endpoints/EndpointList', () => ({
  EndpointList: () => <div data-testid="endpoint-list">EndpointList</div>,
}));

vi.mock('@/components/presets/PresetBar', () => ({
  PresetBar: () => <div data-testid="preset-bar">PresetBar</div>,
}));

vi.mock('@/components/logs/ActivityFeed', () => ({
  ActivityFeed: ({ isCompact }: { isCompact?: boolean }) => (
    <div data-testid="activity-feed" data-compact={isCompact}>ActivityFeed</div>
  ),
}));

describe('EndpointsPage', () => {
  it('renders the Endpoints Registry heading', () => {
    render(<EndpointsPage />);
    expect(screen.getByText('Endpoints Registry')).toBeInTheDocument();
  });

  it('renders the Traffic Monitor heading', () => {
    render(<EndpointsPage />);
    expect(screen.getByText('Traffic Monitor')).toBeInTheDocument();
  });

  it('renders the EndpointList component', () => {
    render(<EndpointsPage />);
    expect(screen.getByTestId('endpoint-list')).toBeInTheDocument();
  });

  it('renders the PresetBar component', () => {
    render(<EndpointsPage />);
    expect(screen.getByTestId('preset-bar')).toBeInTheDocument();
  });

  it('renders the ActivityFeed in compact mode', () => {
    render(<EndpointsPage />);
    const feed = screen.getByTestId('activity-feed');
    expect(feed).toBeInTheDocument();
    expect(feed).toHaveAttribute('data-compact', 'true');
  });
});
