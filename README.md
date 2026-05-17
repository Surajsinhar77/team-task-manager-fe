# TaskFlow - Team Task Management App

A modern, clean React.js application for managing team projects and tasks. Built with Redux Toolkit for state management, Tailwind CSS for styling, and MongoDB backend integration.

## Features

- **Authentication**: User signup and login with JWT tokens
- **Dashboard**: Overview of tasks and projects with statistics
- **Project Management**: Create, view, and manage projects
- **Task Management**: 
  - Create tasks with title, description, due date, and priority
  - Kanban board view (To Do, In Progress, Done)
  - Move tasks between columns
  - Delete tasks
- **User-friendly UI**: Clean, responsive design with Tailwind CSS
- **State Persistence**: Redux store maintains application state
- **Error Handling**: Comprehensive error messages and validations

## Tech Stack

- **Frontend Framework**: React.js (v19) - No TypeScript
- **State Management**: Redux Toolkit with Slices
- **Styling**: Tailwind CSS
- **Routing**: React Router v7
- **HTTP Client**: Axios
- **Build Tool**: Vite
- **Database**: MongoDB (backend)

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or pnpm

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd task-management-app
```

2. Install dependencies:
```bash
pnpm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your backend API URL:
```
REACT_APP_API_URL=http://localhost:5000/api
```

### Running the Application

**Development Mode:**
```bash
pnpm dev
```

The application will open at `http://localhost:3000`

**Build for Production:**
```bash
pnpm build
```

**Preview Production Build:**
```bash
pnpm start
```

## Project Structure

```
src/
├── pages/
│   ├── Login.jsx
│   ├── Signup.jsx
│   ├── Dashboard.jsx
│   ├── Projects.jsx
│   ├── ProjectDetail.jsx
│   └── NotFound.jsx
├── components/
│   ├── Navbar.jsx
│   ├── StatCard.jsx
│   ├── TaskCard.jsx
│   ├── TaskColumn.jsx
│   └── ProjectCard.jsx
├── App.jsx
└── index.jsx
store/
├── store.js
└── slices/
    ├── authSlice.js
    ├── projectSlice.js
    └── taskSlice.js
styles/
└── index.css
```

## Redux Store Structure

### Auth Slice
- `signup`: Create new user account
- `login`: Authenticate user
- `logout`: Sign out user
- State: user, token, loading, error

### Projects Slice
- `fetchProjects`: Get all user projects
- `createProject`: Create new project
- `updateProject`: Edit project details
- `addMemberToProject`: Add team member
- `removeMemberFromProject`: Remove team member

### Tasks Slice
- `fetchTasks`: Get project tasks
- `createTask`: Create new task
- `updateTask`: Update task details/status
- `deleteTask`: Remove task

## API Integration

The application connects to a MongoDB backend via REST APIs. Ensure your backend has the following endpoints:

**Auth:**
- POST `/api/auth/signup` - Register new user
- POST `/api/auth/login` - Login user

**Projects:**
- GET `/api/projects` - Get all projects
- POST `/api/projects` - Create project
- PUT `/api/projects/:id` - Update project
- POST `/api/projects/:id/members` - Add member
- DELETE `/api/projects/:id/members/:userId` - Remove member

**Tasks:**
- GET `/api/tasks?projectId=:projectId` - Get project tasks
- POST `/api/tasks` - Create task
- PUT `/api/tasks/:id` - Update task
- DELETE `/api/tasks/:id` - Delete task

## Features Implementation

### Dashboard
- Shows key metrics: Total Tasks, To Do, In Progress, Done, Overdue
- Recent tasks list
- Quick access to projects

### Projects Page
- View all projects
- Create new projects with modal
- Click to navigate to project details

### Project Detail
- Kanban board with three columns (To Do, In Progress, Done)
- Create new tasks
- Drag tasks between statuses
- Delete tasks (with confirmation)

### Task Management
- Tasks with title, description, due date, priority
- Color-coded by status and priority
- Overdue task highlighting
- Role-based edit permissions

## Role-Based Access

**Admin:**
- Manage all tasks in project
- Add/remove project members
- Edit project details

**Member:**
- View assigned projects
- Update own assigned tasks
- View all project tasks (read-only for unassigned)

## Styling

The application uses Tailwind CSS with a clean, modern design:
- Blue primary color (#2563EB)
- Gray neutral palette
- Status-based color coding
- Responsive grid layouts
- Shadow and border utilities

## Error Handling

- Form validation with user feedback
- Network error messages
- Loading states during API calls
- Unauthorized access redirection

## Security

- JWT token stored in localStorage
- Token included in all API requests via Axios interceptor
- Protected routes (login required)
- Role-based access control

## Future Enhancements

- Task filtering and search
- User profile management
- Project analytics and reports
- Email notifications
- Real-time updates with WebSockets
- Task comments and activity logs
- File attachment support

## Contributing

1. Create feature branch: `git checkout -b feature/feature-name`
2. Commit changes: `git commit -m 'Add feature'`
3. Push to branch: `git push origin feature/feature-name`
4. Create Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues or questions, please contact the development team.
