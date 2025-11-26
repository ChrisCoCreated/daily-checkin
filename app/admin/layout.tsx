'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  async function handleLogout() {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
      window.location.href = '/admin/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex space-x-8">
              <Link
                href="/admin/logs"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  pathname === '/admin/logs' || pathname === '/admin'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Logs
              </Link>
              <Link
                href="/admin/contacts"
                className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                  pathname === '/admin/contacts'
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Contacts
              </Link>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition text-sm font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Page Content */}
      {children}
    </div>
  );
}

