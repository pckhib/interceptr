import { render, screen, userEvent } from '@/test/test-utils';
import { Header } from './Header';

// Mock child components
vi.mock('./ProjectSwitcher', () => ({
  ProjectSwitcher: () => <div data-testid="project-switcher" />,
}));
vi.mock('./SpecSelector', () => ({
  SpecSelector: () => <div data-testid="spec-selector" />,
}));
vi.mock('./SettingsModal', () => ({
  SettingsModal: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? <div data-testid="settings-modal"><button onClick={onClose}>Close</button></div> : null,
}));

// Mock the theme context
const mockToggleTheme = vi.fn();
vi.mock('./use-theme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: mockToggleTheme }),
}));

// Mock proxy hooks
const mockStartMutate = vi.fn();
const mockStopMutate = vi.fn();
let mockProxyStatus: { running: boolean; port: number | null } | undefined;

vi.mock('@/hooks/use-proxy', () => ({
  useProxyStatus: () => ({ data: mockProxyStatus }),
  useStartProxy: () => ({ mutate: mockStartMutate, isPending: false }),
  useStopProxy: () => ({ mutate: mockStopMutate, isPending: false }),
}));

// Mock logo import
vi.mock('@/assets/logo-full.png', () => ({ default: '/logo.png' }));

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProxyStatus = { running: false, port: null };
  });

  it('renders the logo', () => {
    render(<Header />);
    expect(screen.getByAltText('Interceptr')).toBeInTheDocument();
  });

  it('renders ProjectSwitcher and SpecSelector', () => {
    render(<Header />);
    expect(screen.getByTestId('project-switcher')).toBeInTheDocument();
    expect(screen.getByTestId('spec-selector')).toBeInTheDocument();
  });

  it('shows Offline when proxy is not running', () => {
    render(<Header />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('shows port when proxy is running', () => {
    mockProxyStatus = { running: true, port: 8080 };
    render(<Header />);
    expect(screen.getByText(':8080')).toBeInTheDocument();
  });

  it('calls startProxy when Start button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByText('Start'));
    expect(mockStartMutate).toHaveBeenCalled();
  });

  it('calls stopProxy when Stop button is clicked', async () => {
    mockProxyStatus = { running: true, port: 8080 };
    const user = userEvent.setup();
    render(<Header />);
    await user.click(screen.getByText('Stop'));
    expect(mockStopMutate).toHaveBeenCalled();
  });

  it('calls toggleTheme when theme button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);
    // In dark mode, the Sun icon button is shown
    await user.click(screen.getByTitle('Toggle theme'));
    expect(mockToggleTheme).toHaveBeenCalled();
  });

  it('opens settings modal when Settings button is clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);
    expect(screen.queryByTestId('settings-modal')).not.toBeInTheDocument();
    await user.click(screen.getByTitle('Settings'));
    expect(screen.getByTestId('settings-modal')).toBeInTheDocument();
  });
});
