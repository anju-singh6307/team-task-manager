import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/tasks': 'My Tasks',
  '/teams': 'Teams',
  '/projects': 'Projects',
  '/settings': 'Settings',
};

export function Layout() {
  const { pathname } = useLocation();
  const title = PAGE_TITLES[pathname] ?? 'TaskFlow';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      {/* Offset main content by sidebar width */}
      <div className="flex flex-1 flex-col pl-64">
        <Navbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
