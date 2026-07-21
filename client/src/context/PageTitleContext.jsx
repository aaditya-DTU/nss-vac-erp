import React, { createContext, useContext, useEffect, useState } from 'react';

const PageTitleContext = createContext(null);

export function PageTitleProvider({ children }) {
  const [title, setTitle] = useState('');
  return (
    <PageTitleContext.Provider value={{ title, setTitle }}>
      {children}
    </PageTitleContext.Provider>
  );
}

// Pages call this instead of passing title="..." to <Layout>. It's just a
// string in context, not a data fetch, so re-running it on every render is
// cheap and safe — unlike the API calls that used to live in Sidebar/Topbar
// and re-fire on every remount.
export function usePageTitle(title) {
  const ctx = useContext(PageTitleContext);
  useEffect(() => {
    if (ctx) ctx.setTitle(title);
  }, [title]); // eslint-disable-line react-hooks/exhaustive-deps
}

export function usePageTitleValue() {
  const ctx = useContext(PageTitleContext);
  return ctx?.title ?? '';
}