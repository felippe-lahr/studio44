import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import Admin from './admin/Admin';
import {
  ContentContext,
  DEFAULT_CONTENT,
  googleFontHref,
  mergeContent,
  type Content,
} from './content';
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

  // Carrega a Google Font escolhida e aplica no site.
  useEffect(() => {
    const id = 's44-google-font';
    document.getElementById(id)?.remove();
    const font = content.font;
    if (font) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = googleFontHref(font);
      document.head.appendChild(link);
      document.documentElement.style.setProperty('--s44-font', `'${font}', sans-serif`);
    } else {
      document.documentElement.style.removeProperty('--s44-font');
    }
  }, [content.font]);

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
