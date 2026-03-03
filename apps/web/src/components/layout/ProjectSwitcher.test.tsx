import { render, screen, userEvent } from '@/test/test-utils';
import { ProjectSwitcher } from './ProjectSwitcher';
import type { Project } from '@interceptr/shared';

const mockSwitchMutate = vi.fn();
const mockCreateMutate = vi.fn();
const mockDeleteMutate = vi.fn();
const mockRenameMutate = vi.fn();

let mockProjects: Project[] | undefined;
let mockActiveProject: Project | undefined;

vi.mock('@/hooks/use-projects', () => ({
  useProjects: () => ({ data: mockProjects }),
  useActiveProject: () => ({ data: mockActiveProject }),
  useCreateProject: () => ({ mutate: mockCreateMutate }),
  useSwitchProject: () => ({ mutate: mockSwitchMutate }),
  useDeleteProject: () => ({ mutate: mockDeleteMutate }),
  useRenameProject: () => ({ mutate: mockRenameMutate }),
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
    mockRenameMutate.mockClear();
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

  // Edit panel (settings icon)

  it('opens edit panel when settings icon is clicked', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    const editBtns = screen.getAllByTitle('Edit project');
    await user.click(editBtns[0]);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Project ID')).toBeInTheDocument();
    expect(screen.getByText('p1')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('pre-fills name input with the project name', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getAllByTitle('Edit project')[0]);
    expect(screen.getByDisplayValue('Project Alpha')).toBeInTheDocument();
  });

  it('calls renameProject when confirm is clicked', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getAllByTitle('Edit project')[0]);
    const input = screen.getByDisplayValue('Project Alpha');
    await user.clear(input);
    await user.type(input, 'New Name');
    await user.click(screen.getByRole('button', { name: 'Confirm rename' }));
    expect(mockRenameMutate).toHaveBeenCalledWith({ id: 'p1', name: 'New Name' }, expect.anything());
  });

  it('calls renameProject on Enter key', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getAllByTitle('Edit project')[0]);
    const input = screen.getByDisplayValue('Project Alpha');
    await user.clear(input);
    await user.type(input, 'New Name{Enter}');
    expect(mockRenameMutate).toHaveBeenCalledWith({ id: 'p1', name: 'New Name' }, expect.anything());
  });

  it('closes edit panel on Escape key', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getAllByTitle('Edit project')[0]);
    expect(screen.getByDisplayValue('Project Alpha')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByDisplayValue('Project Alpha')).not.toBeInTheDocument();
  });

  it('closes edit panel when Cancel is clicked', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getAllByTitle('Edit project')[0]);
    await user.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Project ID')).not.toBeInTheDocument();
  });

  it('calls deleteProject when Delete is clicked and confirmed', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getAllByTitle('Edit project')[1]);
    await user.click(screen.getByText('Delete'));
    expect(mockDeleteMutate).toHaveBeenCalledWith('p2');
    vi.mocked(window.confirm).mockRestore();
  });

  it('does not delete project when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getAllByTitle('Edit project')[0]);
    await user.click(screen.getByText('Delete'));
    expect(mockDeleteMutate).not.toHaveBeenCalled();
    vi.mocked(window.confirm).mockRestore();
  });

  it('can edit active project from the panel', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getAllByTitle('Edit project')[0]);
    expect(screen.getByText('p1')).toBeInTheDocument();
  });

  it('can edit non-active project from the panel', async () => {
    const user = userEvent.setup();
    render(<ProjectSwitcher />);

    await user.click(screen.getByText('Project Alpha'));
    await user.click(screen.getAllByTitle('Edit project')[1]);
    expect(screen.getByDisplayValue('Project Beta')).toBeInTheDocument();
    expect(screen.getByText('p2')).toBeInTheDocument();
  });
});
