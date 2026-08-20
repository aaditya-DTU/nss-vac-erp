import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import ChatWidget from './ChatWidget';
import { PageTitleProvider, usePageTitleValue } from '../context/PageTitleContext';

// Mounted ONCE as a parent layout route (see App.jsx) and stays mounted
// across every nested page navigation — <Outlet/> is what swaps, not this
// shell. That's what stops Sidebar/Topbar (and their unread-count /
// unanswered / notifications fetches, and the socket connection) from
// re-firing on every single route change like they used to.
function LayoutShell() {
  const title = usePageTitleValue();
  const location = useLocation();

  // Sidebar is a static column on lg+ screens and an off-canvas drawer
  // below that, toggled from the hamburger button in Topbar. Closing it
  // on every route change means a stale-open drawer never lingers over
  // the page the user just navigated to.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 min-w-0">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <ChatWidget />
    </div>
  );
}

export default function Layout() {
  return (
    <PageTitleProvider>
      <LayoutShell />
    </PageTitleProvider>
  );
}