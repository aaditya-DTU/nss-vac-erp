import React from 'react';
import { Outlet } from 'react-router-dom';
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
  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Topbar title={title} />
        <main className="p-8">
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
