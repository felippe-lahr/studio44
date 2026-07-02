import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Admin from './admin/Admin';
import { ContentContext, DEFAULT_CONTENT, mergeContent, type Content } from './content';
import './index.css';

function Site() {
  const [content, setContent] = useState<Content>(DEFAULT_CONTENT);

  useEffect(() => {
    fetch('/api/content')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setContent(mergeContent(data)))
      .catch(() => {
        /* mantém os padrões se a API não responder */
      });
  }, []);

  return (
    <ContentContext.Provider value={content}>
      <App />
    </ContentContext.Provider>
  );
}

const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin';

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isAdmin ? <Admin /> : <Site />}</StrictMode>,
);
