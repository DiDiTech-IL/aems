import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ClerkProvider } from '@clerk/nextjs';
import { Home, Layers, FileText, Settings, UserCircle, Menu } from 'lucide-react';
import { LogoutButton } from '@/components/logout-button';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-between items-center">
          <div className="flex items-center gap-x-4">
            <div className="h-8 w-8 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold">
              AE
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              AEMS
            </h1>
          </div>
          
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <span className="text-sm font-medium leading-6 text-gray-900 border-r border-gray-200 pr-4">
              Training Simulator
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Layout Area */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-64 border-r border-gray-200 bg-white">
          <nav className="flex flex-1 flex-col px-4 pt-6 pb-4">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <div className="text-xs font-semibold leading-6 text-gray-400">Main Menu</div>
                <ul role="list" className="-mx-2 mt-2 space-y-1">
                  <li>
                    <Link
                      href="/dashboard"
                      className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    >
                      <Home className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-blue-600" />
                      Dashboard
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/cases"
                      className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    >
                      <Layers className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-blue-600" />
                      Cases
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/protocols"
                      className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-gray-700 hover:bg-gray-50 hover:text-blue-600"
                    >
                      <FileText className="h-5 w-5 shrink-0 text-gray-400 group-hover:text-blue-600" />
                      Protocols
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/simulate"
                      className="group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-White bg-blue-600 mt-4 hover:bg-blue-700 shadow-sm transition"
                    >
                      <UserCircle className="h-5 w-5 shrink-0 text-blue-200" />
                      Launch Simulation
                    </Link>
                  </li>
                </ul>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Page Content */}
        <main className="flex-1">
          <div className="py-6 px-4 sm:px-6 lg:px-8 mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
