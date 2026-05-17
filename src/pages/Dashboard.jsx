import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/slices/authSlice';
import { useGetProjectDetailsQuery, useGetProjectListQuery } from '../../store/slices/projectApi';
import { useGetProjectMembersQuery } from '../../store/slices/memberApi';
import { useGetDashboardTasksQuery } from '../../store/slices/taskApi';
import StatCard from '../components/StatCard';
import TaskCard from '../components/TaskCard';
import Navbar from '../components/Navbar';

const getProjectMemberCount = (project) => {
  const members = Array.isArray(project?.members) ? project.members : [];
  const memberIds = new Set();

  members.forEach((member) => {
    const source = member?.member || member?.user || member;
    const id = source?._id || source?.id || member?._id || member?.id;
    if (id) {
      memberIds.add(id);
    }
  });

  const adminId =
    project?.admin?._id ||
    project?.admin?.id ||
    project?.owner?._id ||
    project?.owner?.id ||
    project?.createdBy?._id ||
    project?.createdBy?.id;

  if (adminId) {
    memberIds.add(adminId);
  }

  return project?.memberCount ?? project?.membersCount ?? (memberIds.size || members.length || 0);
};

const getProjectMemberCountFromDetails = (projectDetails) => {
  if (!projectDetails) {
    return 0;
  }

  const members = [
    ...(Array.isArray(projectDetails?.members) ? projectDetails.members : []),
    ...(Array.isArray(projectDetails?.projectMembers) ? projectDetails.projectMembers : []),
  ];
  const memberIds = new Set();

  members.forEach((member) => {
    const source = member?.member || member?.user || member;
    const id =
      source?._id ||
      source?.id ||
      member?.memberId ||
      member?._id ||
      member?.id ||
      source;
    if (typeof id === 'string' && id.length) {
      memberIds.add(id);
    }
  });

  const adminId =
    projectDetails?.admin?._id ||
    projectDetails?.admin?.id ||
    projectDetails?.owner?._id ||
    projectDetails?.owner?.id ||
    projectDetails?.createdBy?._id ||
    projectDetails?.createdBy?.id;

  if (adminId) {
    memberIds.add(adminId);
  }

  return memberIds.size || members.length || 0;
};

function DashboardProjectItem({ project, onClick }) {
  const cachedProjectMembers = useSelector(
    (state) => state.projectView.membersByProjectId[project?._id || project?.id || ''] || []
  );
  const projectId = project?._id || project?.id || '';
  const { data: members = [] } = useGetProjectMembersQuery(projectId, {
    skip: !projectId,
  });
  const { data: projectDetails } = useGetProjectDetailsQuery(projectId, {
    skip: !projectId,
  });

  const memberIds = new Set(
    (Array.isArray(members) ? members : [])
      .map((member) => member?.id || member?.memberId || member?._id)
      .filter(Boolean)
  );
  const adminId =
    project?.admin?._id ||
    project?.admin?.id ||
    project?.owner?._id ||
    project?.owner?.id ||
    project?.createdBy?._id ||
    project?.createdBy?.id;

  if (adminId) {
    memberIds.add(adminId);
  }

  const detailsMemberCount = getProjectMemberCountFromDetails(projectDetails);
  const cachedMemberCount = Array.isArray(cachedProjectMembers)
    ? cachedProjectMembers.filter((member) => member?.id || member?.memberId || member?._id).length
    : 0;
  const memberCount =
    cachedMemberCount || memberIds.size || detailsMemberCount || getProjectMemberCount(project);

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg bg-gray-50 hover:bg-blue-50 transition border border-gray-200"
    >
      <p className="font-semibold text-gray-900">{project.name}</p>
      <p className="text-sm text-gray-600">{memberCount} members</p>
    </button>
  );
}

function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const { data: projects = [] } = useGetProjectListQuery();
  const validProjects = useMemo(
    () => (Array.isArray(projects) ? projects.filter((project) => project && (project._id || project.id)) : []),
    [projects]
  );
  const projectIds = useMemo(
    () =>
      [...new Set(validProjects.map((project) => project._id || project.id).filter(Boolean))].sort(),
    [validProjects]
  );
  const { data: dashboardTaskData, isLoading } = useGetDashboardTasksQuery(projectIds, {
    skip: !projectIds.length,
  });
  const tasks = dashboardTaskData?.tasks || [];
  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((a, b) => {
        const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      }),
    [tasks]
  );

  const totalTasks = tasks.length;
  const todoTasks = tasks.filter((t) => t.status === 'todo').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done'
  ).length;
  const tasksPerUser = useMemo(() => {
    const memberNameById = {};

    validProjects.forEach((project) => {
      const members = Array.isArray(project?.members) ? project.members : [];
      members.forEach((member) => {
        const source = member?.member || member?.user || member;
        const id = source?._id || source?.id || member?._id || member?.id;
        if (!id) {
          return;
        }
        memberNameById[id] = source?.name || source?.email || memberNameById[id];
      });

      const adminId =
        project?.admin?._id ||
        project?.admin?.id ||
        project?.owner?._id ||
        project?.owner?.id ||
        project?.createdBy?._id ||
        project?.createdBy?.id;
      const adminName =
        project?.admin?.name ||
        project?.owner?.name ||
        project?.createdBy?.name ||
        project?.admin?.email ||
        project?.owner?.email ||
        project?.createdBy?.email;

      if (adminId && adminName) {
        memberNameById[adminId] = adminName;
      }
    });

    const bucket = tasks.reduce((acc, task) => {
      const assignee = task?.assignedTo;
      const assigneeId = assignee?.id || assignee?._id || assignee || 'unassigned';
      const assigneeName =
        assignee?.name ||
        assignee?.email ||
        memberNameById[assigneeId] ||
        (assigneeId === 'unassigned' ? 'Unassigned' : 'Unknown user');

      if (!acc[assigneeId]) {
        acc[assigneeId] = { id: assigneeId, name: assigneeName, count: 0 };
      }
      acc[assigneeId].count += 1;
      return acc;
    }, {});

    return Object.values(bucket).sort((a, b) => b.count - a.count);
  }, [tasks, validProjects]);

  const handleLogout = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onLogout={handleLogout} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.name}!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard
            title="Total Tasks"
            value={totalTasks}
            bgColor="bg-blue-50"
            textColor="text-blue-600"
          />
          <StatCard
            title="To Do"
            value={todoTasks}
            bgColor="bg-yellow-50"
            textColor="text-yellow-600"
          />
          <StatCard
            title="In Progress"
            value={inProgressTasks}
            bgColor="bg-purple-50"
            textColor="text-purple-600"
          />
          <StatCard
            title="Done"
            value={doneTasks}
            bgColor="bg-green-50"
            textColor="text-green-600"
          />
          <StatCard
            title="Overdue"
            value={overdueTasks}
            bgColor="bg-red-50"
            textColor="text-red-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Tasks</h2>
              {isLoading ? (
                <p className="text-gray-500 text-center py-8">Loading tasks...</p>
              ) : tasks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No tasks yet</p>
              ) : (
                <div className="space-y-3">
                  {sortedTasks.slice(0, 5).map((task) => (
                    <TaskCard key={task.id || task._id} task={task} />
                  ))}
                </div>
              )}
            </div>

            {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Tasks Per User</h2>
              {isLoading ? (
                <p className="text-gray-500 text-center py-6">Loading assignees...</p>
              ) : tasksPerUser.length === 0 ? (
                <p className="text-gray-500 text-center py-6">No assignee data yet</p>
              ) : (
                <div className="space-y-3">
                  {tasksPerUser.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50"
                    >
                      <p className="font-medium text-gray-900">{entry.name}</p>
                      <span className="text-sm font-semibold text-blue-700">{entry.count} tasks</span>
                    </div>
                  ))}
                </div>
              )}
            </div> */}
          </div>

          <div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Your Projects</h2>
              {validProjects.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No projects yet</p>
              ) : (
                <div className="space-y-2">
                  {validProjects.map((project) => (
                    <DashboardProjectItem
                      key={project._id || project.id}
                      project={project}
                      onClick={() => navigate(`/projects/${project._id || project.id}`)}
                    />
                  ))}
                </div>
              )}
              <button
                onClick={() => navigate('/projects')}
                className="w-full mt-4 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
              >
                View All Projects
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
