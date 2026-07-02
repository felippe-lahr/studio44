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

  // Raio/espaçamento dos cards, margem entre seções e padding interno.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--s44-radius', `${content.cardRadius ?? 16}px`);
    root.style.setProperty('--s44-gap', `${content.cardGap ?? 8}px`);
    root.style.setProperty('--s44-section-gap', `${content.sectionGap ?? 0}px`);
    root.style.setProperty('--s44-inner-pad', `${content.innerCardPadding ?? 20}px`);
  }, [content.cardRadius, content.cardGap, content.sectionGap, content.innerCardPadding]);

  return (
    <ContentContext.Provider value={content}>
      <App />
    </ContentContext.Provider>
  );
}

const isAdmin = window.location.pathname.replace(/\/+$/, '') === '/admin';

// Ao recarregar, sempre começar no topo (Seção 1).
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
if (!isAdmin) window.scrollTo(0, 0);

createRoot(document.getElementById('root')!).render(
  <StrictMode>{isAdmin ? <Admin /> : <Site />}</StrictMode>,
);
