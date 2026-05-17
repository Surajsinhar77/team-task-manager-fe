import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { logout } from '../../store/slices/authSlice';
import {
  useDeleteProjectMutation,
  useGetProjectDetailsQuery,
} from '../../store/slices/projectApi';
import {
  useAddMemberToProjectMutation,
  useGetProjectMembersQuery,
  useLazyGetUserByIdQuery,
  useRemoveMemberFromProjectMutation,
} from '../../store/slices/memberApi';
import {
  useCreateTaskMutation,
  useDeleteTaskMutation,
  useGetProjectTasksQuery,
  useUpdateTaskStatusMutation,
} from '../../store/slices/taskApi';
import { setProjectMembersSnapshot } from '../../store/slices/projectViewSlice';
import Navbar from '../components/Navbar';

const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
};

const TASK_STATUS_OPTIONS = [
  { value: TASK_STATUS.TODO, label: 'To Do' },
  { value: TASK_STATUS.IN_PROGRESS, label: 'In Progress' },
  { value: TASK_STATUS.DONE, label: 'Done' },
];

const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OBJECT_ID_LENGTH = 24;

const TASK_STATUS_STYLES = {
  todo: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-purple-100 text-purple-800',
  done: 'bg-green-100 text-green-800',
};

const TASK_PRIORITY_STYLES = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const formatLabel = (value) =>
  String(value || '')
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const normalizeMemberRecord = (member) => {
  if (!member) {
    return null;
  }

  const sourceMember = member.member || member.user || member;

  return {
    id: sourceMember?._id || sourceMember?.id || member?.id || member?.memberId || '',
    memberId: sourceMember?._id || sourceMember?.id || member?.memberId || member?.id || '',
    name: sourceMember?.name || member?.name || '',
    email: sourceMember?.email || member?.email || '',
    role: member?.role || sourceMember?.role || '',
  };
};

const mergeMembers = (members) =>
  members.reduce((accumulator, member) => {
    if (!member || (!member.id && !member.email)) {
      return accumulator;
    }

    const normalizedEmail = member.email?.trim().toLowerCase() || '';
    const existingIndex = accumulator.findIndex((existingMember) => {
      const existingEmail = existingMember.email?.trim().toLowerCase() || '';

      return (
        (member.id && existingMember.id === member.id) ||
        (normalizedEmail && existingEmail === normalizedEmail)
      );
    });

    if (existingIndex === -1) {
      accumulator.push(member);
      return accumulator;
    }

    const existingMember = accumulator[existingIndex];
    accumulator[existingIndex] = {
      ...existingMember,
      ...member,
      id: existingMember.id || member.id,
      memberId: existingMember.memberId || member.memberId,
      name: existingMember.name || member.name,
      email: existingMember.email || member.email,
      role: existingMember.role || member.role,
    };

    return accumulator;
  }, []);

function ProjectDetail() {
  const { projectId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { data: currentProject, isLoading: isProjectLoading } =
    useGetProjectDetailsQuery(projectId, {
      skip: !projectId,
    });
  const { data: taskResponse, isLoading: isTaskLoading } = useGetProjectTasksQuery(projectId, {
    skip: !projectId,
  });
  const { data: members = [] } = useGetProjectMembersQuery(projectId, {
    skip: !projectId,
  });
  const [addMemberToProject, { isLoading: isAddingMember }] = useAddMemberToProjectMutation();
  const [createTask, { isLoading: isCreatingTask }] = useCreateTaskMutation();
  const [deleteProject, { isLoading: isDeletingProject }] = useDeleteProjectMutation();
  const [deleteTask, { isLoading: isDeletingTask }] = useDeleteTaskMutation();
  const [getUserById] = useLazyGetUserByIdQuery();
  const [removeMemberFromProject, { isLoading: isRemovingMember }] =
    useRemoveMemberFromProjectMutation();
  const [updateTaskStatus, { isLoading: isUpdatingTask }] = useUpdateTaskStatusMutation();

  const [resolvedUsersById, setResolvedUsersById] = useState({});
  const requestedAssigneeIdsRef = useRef(new Set());
  const [memberIdentifier, setMemberIdentifier] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    assignedTo: '',
  });
  const [error, setError] = useState('');

  const tasks = taskResponse?.tasks || [];
  const isLoading = isProjectLoading || isTaskLoading;
  const currentUserId = user?.id || user?._id || '';
  const currentUserEmail = user?.email?.trim().toLowerCase() || '';
  const ownerId =
    currentProject?.owner?._id ||
    currentProject?.owner?.id ||
    currentProject?.owner ||
    currentProject?.admin?._id ||
    currentProject?.admin?.id ||
    currentProject?.createdBy?._id ||
    currentProject?.createdBy?.id ||
    currentProject?.createdBy ||
    '';
  const ownerEmail =
    currentProject?.owner?.email ||
    currentProject?.admin?.email ||
    currentProject?.createdBy?.email ||
    '';
  const userRoles = Array.isArray(user?.roles) ? user.roles : [user?.role].filter(Boolean);
  const isOrgAdmin = userRoles.includes('ORG_ADMIN') || userRoles.includes('Admin');

  const projectMembers = useMemo(() => {
    const sourceMembers = (Array.isArray(members) ? members : [])
      .map((member) => normalizeMemberRecord(member))
      .filter(Boolean);

    const inferredMembers = [
      normalizeMemberRecord({
        id: ownerId,
        memberId: ownerId,
        name:
          currentProject?.owner?.name ||
          currentProject?.admin?.name ||
          currentProject?.createdBy?.name ||
          (ownerId === currentUserId ? user?.name : 'Project Owner'),
        email: ownerEmail,
        role: 'admin',
      }),
      normalizeMemberRecord({
        id: currentUserId,
        memberId: currentUserId,
        name: user?.name || '',
        email: user?.email || '',
      }),
    ].filter(Boolean);

    return mergeMembers([...sourceMembers, ...inferredMembers]).filter(
      (member) =>
        member.id &&
        (member.email?.trim().toLowerCase() !== currentUserEmail ||
          member.id === currentUserId ||
          member.id === ownerId)
    );
  }, [
    currentProject?.admin?.name,
    currentProject?.createdBy?.name,
    currentProject?.owner?.name,
    currentUserEmail,
    currentUserId,
    members,
    ownerEmail,
    ownerId,
    user?.email,
    user?.name,
  ]);

  const assignableMembers = useMemo(
    () => mergeMembers(projectMembers).filter((member) => member.id),
    [projectMembers]
  );

  useEffect(() => {
    if (!projectId) {
      return;
    }

    dispatch(
      setProjectMembersSnapshot({
        projectId,
        members: projectMembers,
      })
    );
  }, [dispatch, projectId, projectMembers]);

  const isProjectAdmin = projectMembers.some(
    (member) =>
      member.id === currentUserId && ['admin', 'Admin', 'ADMIN'].includes(member.role)
  );
  const canManageProject =
    Boolean(currentUserId) && (isOrgAdmin || ownerId === currentUserId || isProjectAdmin);
  const canManageMembers = canManageProject;
  const canCreateTask = canManageProject;

  const assignableMembersById = useMemo(
    () =>
      assignableMembers.reduce((accumulator, member) => {
        accumulator[member.id] = member;
        return accumulator;
      }, {}),
    [assignableMembers]
  );

  const todoTasks = tasks.filter((task) => task.status === TASK_STATUS.TODO);
  const inProgressTasks = tasks.filter((task) => task.status === TASK_STATUS.IN_PROGRESS);
  const doneTasks = tasks.filter((task) => task.status === TASK_STATUS.DONE);

  const taskSummary = [
    { label: 'To Do', count: todoTasks.length, tone: 'bg-yellow-50 border-yellow-200' },
    {
      label: 'In Progress',
      count: inProgressTasks.length,
      tone: 'bg-purple-50 border-purple-200',
    },
    { label: 'Done', count: doneTasks.length, tone: 'bg-green-50 border-green-200' },
  ];

  useEffect(() => {
    const unresolvedAssigneeIds = [...new Set(
      tasks
        .map((task) => task?.assignedTo?.id || task?.assignedTo?._id || task?.assignedTo)
        .filter(
          (assignedId) =>
            assignedId &&
            assignedId.length === OBJECT_ID_LENGTH &&
            !requestedAssigneeIdsRef.current.has(assignedId) &&
            !assignableMembersById[assignedId] &&
            !resolvedUsersById[assignedId]
        )
    )];

    if (!unresolvedAssigneeIds.length) {
      return;
    }

    let isMounted = true;
    unresolvedAssigneeIds.forEach((assignedId) => {
      requestedAssigneeIdsRef.current.add(assignedId);
    });

    Promise.all(
      unresolvedAssigneeIds.map((assignedId) => getUserById(assignedId).unwrap())
    )
      .then((users) => {
        if (!isMounted) {
          return;
        }

        setResolvedUsersById((previousUsers) => {
          const nextUsers = { ...previousUsers };

          users.filter(Boolean).forEach((resolvedUser) => {
            const resolvedId = resolvedUser?._id || resolvedUser?.id;

            if (resolvedId) {
              nextUsers[resolvedId] = {
                id: resolvedId,
                memberId: resolvedId,
                name: resolvedUser?.name || '',
                email: resolvedUser?.email || '',
                role: resolvedUser?.role || '',
              };
            }
          });

          return nextUsers;
        });
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [assignableMembersById, getUserById, resolvedUsersById, tasks]);

  const resetTaskForm = () => {
    setNewTask({
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      assignedTo: assignableMembers[0]?.id || currentUserId,
    });
  };

  const openTaskModal = () => {
    if (!canCreateTask) {
      setError('Only project admins can create tasks');
      return;
    }

    setError('');
    setShowTaskModal(true);
    resetTaskForm();
  };

  const handleTaskChange = (e) => {
    setNewTask((previousTask) => ({
      ...previousTask,
      [e.target.name]: e.target.value,
    }));
    setError('');
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();

    if (!newTask.title.trim()) {
      setError('Task title is required');
      return;
    }

    if (newTask.description.trim().length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    if (!newTask.assignedTo || newTask.assignedTo.length !== OBJECT_ID_LENGTH) {
      setError('Please select a valid member');
      return;
    }

    try {
      await createTask({
        projectId,
        title: newTask.title.trim(),
        description: newTask.description.trim(),
        dueDate: newTask.dueDate,
        priority: newTask.priority,
        assignedTo: newTask.assignedTo,
        status: TASK_STATUS.TODO,
      }).unwrap();

      setShowTaskModal(false);
      resetTaskForm();
    } catch (apiError) {
      setError(apiError?.data?.message || apiError?.data || 'Unable to create task right now');
    }
  };

  const handleUpdateTaskStatus = async (taskId, status) => {
    if (!taskId || taskId.length !== OBJECT_ID_LENGTH) {
      setError('Task ID is required');
      return;
    }

    try {
      await updateTaskStatus({ taskId, projectId, status }).unwrap();
      setError('');
    } catch (apiError) {
      setError(apiError?.data?.message || apiError?.data || 'Unable to update task status');
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();

    const normalizedIdentifier = memberIdentifier.trim();
    const isEmailInput = EMAIL_PATTERN.test(normalizedIdentifier);

    if (!isEmailInput) {
      setError('Enter a valid member email');
      return;
    }

    try {
      await addMemberToProject({
        projectId,
        email: normalizedIdentifier,
      }).unwrap();
      setMemberIdentifier('');
      setError('');
    } catch (apiError) {
      setError(apiError?.data?.message || apiError?.data || 'Unable to add member right now');
    }
  };

  const handleRemoveMember = async (memberId) => {
    try {
      await removeMemberFromProject({ projectId, memberId }).unwrap();
      setError('');
    } catch (apiError) {
      setError(apiError?.data?.message || apiError?.data || 'Unable to remove member right now');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!taskId || taskId.length !== OBJECT_ID_LENGTH) {
      setError('Task ID is required');
      return;
    }

    if (!window.confirm('Delete this task?')) {
      return;
    }

    try {
      await deleteTask({ taskId, projectId }).unwrap();
      setError('');
    } catch (apiError) {
      setError(apiError?.data?.message || apiError?.data || 'Unable to delete task right now');
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteProject(projectId).unwrap();
      navigate('/projects');
    } catch (apiError) {
      setError(apiError?.data?.message || apiError?.data || 'Unable to delete project right now');
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    dispatch(logout());
    navigate('/login');
  };

  const renderMembersSection = () => (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
      <div className="flex flex-col gap-2 mb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Members</h2>
          <p className="text-gray-600 mt-1">
            {projectMembers.length} team member{projectMembers.length === 1 ? '' : 's'}
          </p>
        </div>
        {canManageMembers && (
          <div className="text-sm text-gray-500">
            Add members by email
          </div>
        )}
      </div>

      {canManageMembers && (
        <form
          onSubmit={handleAddMember}
          className="flex flex-col gap-3 mb-6 rounded-lg bg-blue-50 border border-blue-100 p-4"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Member Email
            </label>
            <input
              type="text"
              name="memberIdentifier"
              value={memberIdentifier}
              onChange={(e) => {
                setMemberIdentifier(e.target.value);
                setError('');
              }}
              placeholder="Enter member email"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={isAddingMember}
            className="self-start px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
          >
            {isAddingMember ? 'Adding...' : 'Add Member'}
          </button>
        </form>
      )}

      {projectMembers.length === 0 ? (
        <p className="text-gray-500">No members found for this project yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {projectMembers.map((member) => {
            const isOwner = member.id === ownerId;
            const isCurrentUser = member.id === currentUserId;
            const canRemove =
              canManageMembers && !isOwner && !isCurrentUser && Boolean(member.id);

            return (
              <div
                key={`${member.id}-${member.email || 'member'}`}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {member.name || member.email || 'Project member'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">{member.email || member.id}</p>
                  </div>
                  {canRemove && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={isRemovingMember}
                      className="text-sm text-red-600 hover:text-red-700 disabled:text-gray-400"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {isOwner && (
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                      Owner
                    </span>
                  )}
                  {isCurrentUser && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                      You
                    </span>
                  )}
                  {member.role && (
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700 uppercase">
                      {member.role}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  const renderTasksSection = () => (
    <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <p className="text-gray-600 mt-1">Update status directly from the table.</p>
        </div>
        <div className="flex items-center gap-3">
          {canManageProject && (
            <button
              onClick={handleDeleteProject}
              disabled={isDeletingProject}
              className="border border-red-200 text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition disabled:text-gray-400 disabled:border-gray-200"
            >
              {isDeletingProject ? 'Deleting...' : 'Delete Project'}
            </button>
          )}
          {canCreateTask && (
            <button
              onClick={openTaskModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shrink-0"
            >
              + New Task
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {taskSummary.map((summaryCard) => (
          <div
            key={summaryCard.label}
            className={`rounded-lg border p-4 ${summaryCard.tone}`}
          >
            <p className="text-sm font-medium text-gray-600">{summaryCard.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{summaryCard.count}</p>
          </div>
        ))}
      </div>

      {tasks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-10 text-center text-gray-500">
          No tasks yet. Create one to get started.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Title</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Assignee</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Due Date</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Priority</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Current</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Update</th>
                {canManageProject && (
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Delete</th>
                )}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const assigneeId =
                  task?.assignedTo?.id || task?.assignedTo?._id || task?.assignedTo;
                const assignee =
                  assignableMembersById[assigneeId] ||
                  resolvedUsersById[assigneeId] ||
                  null;

                return (
                  <tr key={task.id} className="border-b border-gray-200 last:border-b-0">
                    <td className="px-4 py-4 align-top min-w-[220px]">
                      <p className="font-semibold text-gray-900">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4 align-top text-gray-700 min-w-[180px]">
                      {assignee?.name || assignee?.email || 'Unassigned'}
                    </td>
                    <td className="px-4 py-4 align-top text-gray-700 whitespace-nowrap">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          TASK_PRIORITY_STYLES[task.priority] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {formatLabel(task.priority)}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          TASK_STATUS_STYLES[task.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {formatLabel(task.status)}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-top min-w-[180px]">
                      <select
                        value={task.status}
                        disabled={isUpdatingTask || isDeletingTask}
                        onChange={(e) => {
                          if (e.target.value !== task.status) {
                            handleUpdateTaskStatus(task.id, e.target.value);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      >
                        {TASK_STATUS_OPTIONS.map((statusOption) => (
                          <option key={statusOption.value} value={statusOption.value}>
                            {statusOption.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    {canManageProject && (
                      <td className="px-4 py-4 align-top">
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(task.id)}
                          disabled={isDeletingTask}
                          className="text-red-600 hover:text-red-700 disabled:text-gray-400"
                        >
                          {isDeletingTask ? 'Deleting...' : 'Delete'}
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );

  if (!currentProject && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar onLogout={handleLogout} />
        <main className="max-w-7xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-500 text-lg">Project not found</p>
          <button
            onClick={() => navigate('/projects')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Back to Projects
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/projects')}
            className="text-blue-600 hover:underline mb-2 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{currentProject?.name}</h1>
          {currentProject?.description && (
            <p className="text-gray-600 mt-2">{currentProject.description}</p>
          )}
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">Loading project workspace...</p>
          </div>
        ) : (
          <>
            <div className="hidden xl:block">
              <PanelGroup
                direction="horizontal"
                className="min-h-[760px] rounded-xl border border-gray-200 bg-white shadow-sm"
              >
                <Panel defaultSize={34} minSize={28}>
                  <div className="h-full overflow-auto p-6">{renderMembersSection()}</div>
                </Panel>
                <PanelResizeHandle className="w-2 bg-gray-100 hover:bg-blue-100 transition relative">
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gray-300" />
                </PanelResizeHandle>
                <Panel defaultSize={66} minSize={45}>
                  <div className="h-full overflow-auto p-6">{renderTasksSection()}</div>
                </Panel>
              </PanelGroup>
            </div>

            <div className="space-y-8 xl:hidden">
              {renderMembersSection()}
              {renderTasksSection()}
            </div>
          </>
        )}
      </main>

      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Task</h2>

            <form onSubmit={handleCreateTask}>
              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Task Title</label>
                <input
                  type="text"
                  name="title"
                  value={newTask.title}
                  onChange={handleTaskChange}
                  placeholder="Task title..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Description</label>
                <textarea
                  name="description"
                  value={newTask.description}
                  onChange={handleTaskChange}
                  placeholder="Task description..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Assign To</label>
                <select
                  name="assignedTo"
                  value={newTask.assignedTo}
                  onChange={handleTaskChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select a member</option>
                  {assignableMembers.map((member) => (
                    <option key={`${member.id}-${member.email || 'member'}`} value={member.id}>
                      {member.email ? `${member.name || member.email} (${member.email})` : member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-semibold mb-2">Due Date</label>
                <input
                  type="date"
                  name="dueDate"
                  value={newTask.dueDate}
                  onChange={handleTaskChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">Priority</label>
                <select
                  name="priority"
                  value={newTask.priority}
                  onChange={handleTaskChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>
                      {formatLabel(priority)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTaskModal(false);
                    setError('');
                    resetTaskForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                >
                  {isCreatingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetail;
