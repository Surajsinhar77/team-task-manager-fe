import React from 'react';
import { useSelector } from 'react-redux';
import { useGetProjectDetailsQuery } from '../../store/slices/projectApi';
import { useGetProjectMembersQuery } from '../../store/slices/memberApi';
import { useGetProjectTasksQuery } from '../../store/slices/taskApi';

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

function ProjectCard({ project, onClick }) {
  const projectId = project?._id || project?.id || '';
  const cachedProjectMembers = useSelector(
    (state) => state.projectView.membersByProjectId[projectId] || []
  );
  const { data: projectDetails } = useGetProjectDetailsQuery(projectId, {
    skip: !projectId,
  });
  const { data: projectMembers = [] } = useGetProjectMembersQuery(projectId, {
    skip: !projectId,
  });
  const { data: taskResponse } = useGetProjectTasksQuery(projectId, {
    skip: !projectId,
  });

  const memberIds = new Set(
    projectMembers
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

  const taskCount =
    taskResponse?.count ??
    taskResponse?.tasks?.length ??
    project.taskCount ??
    project.tasksCount ??
    project.tasks?.length ??
    0;
  const detailsMemberCount = getProjectMemberCountFromDetails(projectDetails);
  const cachedMemberCount = Array.isArray(cachedProjectMembers)
    ? cachedProjectMembers.filter((member) => member?.id || member?.memberId || member?._id).length
    : 0;
  const memberCount =
    cachedMemberCount ||
    memberIds.size ||
    projectMembers.length ||
    detailsMemberCount ||
    getProjectMemberCount(project);

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-lg transition cursor-pointer"
    >
      <h3 className="text-xl font-bold text-gray-900 mb-2">{project.name}</h3>

      {project.description && (
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{project.description}</p>
      )}

      <div className="flex justify-between text-sm text-gray-600 border-t border-gray-200 pt-4">
        <div>
          <p className="font-semibold text-gray-900">{taskCount}</p>
          <p className="text-xs">Tasks</p>
        </div>
        <div>
          <p className="font-semibold text-gray-900">{memberCount}</p>
          <p className="text-xs">Members</p>
        </div>
        <div>
          <p className="font-semibold text-gray-900">
            {project.admin?.name || 'Admin'}
          </p>
          <p className="text-xs">Lead</p>
        </div>
      </div>
    </div>
  );
}

export default ProjectCard;
