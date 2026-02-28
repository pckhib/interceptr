import { render, screen, userEvent } from '@/test/test-utils';
import { SettingsModal } from './SettingsModal';

// Mock hooks and api
vi.mock('@/hooks/use-projects', () => ({
  useActiveProject: () => ({
    data: { id: 'p1', name: 'Test Project', createdAt: '', updatedAt: '' },
  }),
  useRenameProject: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  api: {
    health: vi.fn().mockResolvedValue({ status: 'ok', version: '1.0.0' }),
    config: {
      get: vi.fn().mockResolvedValue({ proxyPort: 4000 }),
      update: vi.fn().mockResolvedValue({}),
      export: vi.fn().mockResolvedValue({}),
      import: vi.fn().mockResolvedValue({}),
    },
  },
}));

// Mock logo and icon imports
vi.mock('@/assets/logo-full.png', () => ({ default: '/logo.png' }));
vi.mock('@icons-pack/react-simple-icons', () => ({
  SiGithub: () => <span data-testid="github-icon" />,
}));

describe('SettingsModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<SettingsModal open={false} onClose={() => {}} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders when open', () => {
    render(<SettingsModal open={true} onClose={() => {}} />);
    expect(screen.getByText('System Control')).toBeInTheDocument();
  });

  it('shows Configuration tab by default', () => {
    render(<SettingsModal open={true} onClose={() => {}} />);
    expect(screen.getByText('Project Identity')).toBeInTheDocument();
    expect(screen.getByText('Network Environment')).toBeInTheDocument();
    expect(screen.getByText('Data Sovereignty')).toBeInTheDocument();
  });

  it('shows the active project name', () => {
    render(<SettingsModal open={true} onClose={() => {}} />);
    expect(screen.getByText('Test Project')).toBeInTheDocument();
  });

  it('shows proxy port input', () => {
    render(<SettingsModal open={true} onClose={() => {}} />);
    expect(screen.getByDisplayValue('4000')).toBeInTheDocument();
  });

  it('shows Backup and Restore buttons', () => {
    render(<SettingsModal open={true} onClose={() => {}} />);
    expect(screen.getByText('Backup')).toBeInTheDocument();
    expect(screen.getByText('Restore')).toBeInTheDocument();
  });

  it('switches to About tab', async () => {
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={() => {}} />);

    await user.click(screen.getByText('About'));
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
    expect(screen.getByText('GitHub Repository')).toBeInTheDocument();
    expect(screen.getByText('Patrick Hieber')).toBeInTheDocument();
  });

  it('shows Close button on About tab', async () => {
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={() => {}} />);

    await user.click(screen.getByText('About'));
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('shows Cancel and Persist Settings on Config tab', () => {
    render(<SettingsModal open={true} onClose={() => {}} />);
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Persist Settings')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={onClose} />);

    await user.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<SettingsModal open={true} onClose={onClose} />);

    const backdrop = container.querySelector('.backdrop-blur-md')!;
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when X button is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={onClose} />);

    // The X close button in the header
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find(btn => btn.querySelector('.lucide-x'));
    await user.click(xButton!);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Rename button for active project', () => {
    render(<SettingsModal open={true} onClose={() => {}} />);
    expect(screen.getByText('Rename')).toBeInTheDocument();
  });

  it('opens rename form when Rename is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={() => {}} />);

    await user.click(screen.getByText('Rename'));
    // Should show an input with the project name and check/X buttons
    expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
  });

  it('cancels rename when X button is clicked', async () => {
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={() => {}} />);

    await user.click(screen.getByText('Rename'));
    // Click the X cancel button in the rename form
    const xButtons = screen.getAllByRole('button').filter(btn => btn.querySelector('.lucide-x'));
    // The first X is the modal close, the second is the rename cancel
    await user.click(xButtons[1]);
    // Should go back to showing the Rename button
    expect(screen.getByText('Rename')).toBeInTheDocument();
  });

  it('changes proxy port value', async () => {
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={() => {}} />);

    const portInput = screen.getByDisplayValue('4000');
    await user.tripleClick(portInput);
    await user.keyboard('9090');
    expect(screen.getByDisplayValue('9090')).toBeInTheDocument();
  });

  it('calls config.update when Persist Settings is clicked', async () => {
    const { api } = await import('@/lib/api');
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={() => {}} />);

    await user.click(screen.getByText('Persist Settings'));
    expect(api.config.update).toHaveBeenCalled();
  });

  it('calls config.export when Backup is clicked', async () => {
    const { api } = await import('@/lib/api');
    const user = userEvent.setup();

    // Mock URL APIs
    const origCreateObjectURL = URL.createObjectURL;
    const origRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:test');
    URL.revokeObjectURL = vi.fn();

    render(<SettingsModal open={true} onClose={() => {}} />);
    await user.click(screen.getByText('Backup'));
    expect(api.config.export).toHaveBeenCalled();

    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
  });

  it('switches to About then back to Config tab', async () => {
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={() => {}} />);

    // Go to About tab
    const tabs = screen.getAllByRole('button');
    const aboutTab = tabs.find(btn => btn.textContent === 'About');
    await user.click(aboutTab!);
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();

    // Go back to Config tab
    const configTab = screen.getAllByRole('button').find(btn => btn.textContent === 'Configuration');
    await user.click(configTab!);
    expect(screen.getByText('Project Identity')).toBeInTheDocument();
  });

  it('calls onClose when Close button on About tab is clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<SettingsModal open={true} onClose={onClose} />);

    // Go to About tab
    const tabs = screen.getAllByRole('button');
    const aboutTab = tabs.find(btn => btn.textContent === 'About');
    await user.click(aboutTab!);

    // Click the "Close" button in the footer
    await user.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
