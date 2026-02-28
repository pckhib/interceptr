import { render, screen, userEvent } from '@/test/test-utils';
import { ProjectSwitcher } from './ProjectSwitcher';
import type { Project } from '@interceptr/shared';

const mockSwitchMutate = vi.fn();
const mockCreateMutate = vi.fn();
const mockDeleteMutate = vi.fn();

let mockProjects: Project[] | undefined;
let mockActiveProject: Project | undefined;

vi.mock('@/hooks/use-projects', () => ({
  useProjects: () => ({ data: mockProjects }),
  useActiveProject: () => ({ data: mockActiveProject }),
  useCreateProject: () => ({ mutate: mockCreateMutate }),
  useSwitchProject: () => ({ mutate: mockSwitchMutate }),
  useDeleteProject: () => ({ mutate: mockDeleteMutate }),
}));

describe('ProjectSwitcher', () => {
  beforeEach(() => {
    mockProjects = [
      { id: 'p1', name: 'Project Alpha', createdAt: '', updatedAt: '' },
      { id: 'p2', name: 'Project Beta', createdAt: '', updatedAt: '' },
    ];
    mockActiveProject = mockProjects[0];
    mockSwitchMutate.mockClear();
    mockCreateMutate.mockClear();
    mockDeleteMutate.mockClear();
  });

  it('renders the active project name', () => {
    render(<ProjectSwitcher />);
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
  });

  it('shows "Select Project" when no active project', () => {
    mockActiveProject = undefined;
    render(<ProjectSwitcher />);
    expect(screen.getByText('Select Project')).toBeInTheDocument();
  });

  it('opens dropdown and lists projects on click', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
    expect(screen.getByText('New Project')).toBeInTheDocument();
  });

  it('calls switchProject when a different project is selected', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getByText('Project Beta'));
    expect(mockSwitchMutate).toHaveBeenCalledWith('p2');
  });

  it('shows create form when New Project is clicked', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getByText('New Project'));
    expect(screen.getByPlaceholderText('Name...')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('creates project when name is entered and Add is clicked', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getByText('New Project'));
    await user.type(screen.getByPlaceholderText('Name...'), 'Project Gamma');
    await user.click(screen.getByText('Add'));
    expect(mockCreateMutate).toHaveBeenCalledWith('Project Gamma', expect.anything());
  });

  it('creates project on Enter key', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getByText('New Project'));
    await user.type(screen.getByPlaceholderText('Name...'), 'Project Delta{Enter}');
    expect(mockCreateMutate).toHaveBeenCalledWith('Project Delta', expect.anything());
  });

  it('closes create form on Escape key', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getByText('New Project'));
    expect(screen.getByPlaceholderText('Name...')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByPlaceholderText('Name...')).not.toBeInTheDocument();
  });

  it('disables Add button when name is empty', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getByText('New Project'));
    expect(screen.getByText('Add')).toBeDisabled();
  });

  it('calls deleteProject when delete icon is clicked on non-active project', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    // The delete button has the class "p-1" and is next to "Project Beta"
    const allButtons = screen.getAllByRole('button');
    // The delete button is the one with className containing 'hover:text-destructive'
    const deleteBtn = allButtons.find(btn => btn.className.includes('hover:text-destructive'));
    expect(deleteBtn).toBeDefined();
    await user.click(deleteBtn!);
    expect(mockDeleteMutate).toHaveBeenCalledWith('p2');
  });
});
