import { render, screen, userEvent } from '@/test/test-utils';
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

vi.mock('@/hooks/use-specs', () => ({
  useSpecs: () => ({ data: [] }),
  useUpdateSpec: () => ({ mutate: vi.fn() }),
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

  it('opens GlobalHeadersPanel when trigger button is clicked', async () => {
    const user = userEvent.setup();
    render(<EndpointsPage />);
    const trigger = screen.getByTitle('Global Response Headers');
    await user.click(trigger);
    expect(screen.getByText('No active spec selected.')).toBeInTheDocument();
  });

  it('closes GlobalHeadersPanel when trigger button is clicked again', async () => {
    const user = userEvent.setup();
    render(<EndpointsPage />);
    const trigger = screen.getByTitle('Global Response Headers');
    await user.click(trigger);
    expect(screen.getByText('No active spec selected.')).toBeInTheDocument();
    await user.click(trigger);
    expect(screen.queryByText('No active spec selected.')).not.toBeInTheDocument();
  });
});
