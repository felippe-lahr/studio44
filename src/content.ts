import {
  createContext,
  useContext,
  type CSSProperties,
} from 'react';

/* ------------------------------------------------------------------ *
 * MODELO DE CONTEÚDO EDITÁVEL (campos curados)
 * O site é "aditivo": se um campo não for definido, usa o padrão abaixo.
 * ------------------------------------------------------------------ */
export type PosH = 'left' | 'center' | 'right';
export type PosV = 'top' | 'center' | 'bottom';

export type TextField = {
  text: string;
  /** override de tamanho da fonte, ex.: "48px" ou "3rem". Vazio = padrão. */
  size?: string;
  /** peso da fonte: 400..800. Vazio = padrão. */
  weight?: number;
  /** posição dentro do card. */
  pos?: { h: PosH; v: PosV };
};

export type Service = { name: string; num: string | null };

export type Content = {
  logo: string;
  contactHref: string;
  hero: {
    paragraph: TextField;
    headline: TextField;
  };
  section2: {
    image: string;
    title: TextField;
    subtitle: TextField;
    solutions: TextField;
    ctaText: TextField;
    ctaButton: string;
    services: Service[];
  };
  section3: {
    title: TextField;
    subtitle: TextField;
    img1: string;
    img2: string;
    bg: string;
  };
};

export const DEFAULT_CONTENT: Content = {
  logo: '/logo-studio44-3.svg',
  contactHref: 'https://wa.me/5599999999999',
  hero: {
    paragraph: {
      text: 'Transformamos pequenas e médias empresas\nem referências digitais.',
      pos: { h: 'left', v: 'top' },
    },
    headline: {
      text: 'Cresça\nno Digital',
      pos: { h: 'left', v: 'bottom' },
    },
  },
  section2: {
    image: '/image-studio44-railway.jpg',
    title: { text: 'Nossos Serviços', pos: { h: 'left', v: 'top' } },
    subtitle: {
      text: 'O que entregamos para o seu negócio',
      pos: { h: 'left', v: 'bottom' },
    },
    solutions: { text: 'Soluções\nSob Medida', pos: { h: 'left', v: 'top' } },
    ctaText: {
      text: 'Quer escalar o seu negócio no digital?\nVamos conversar sobre o seu projeto.',
      pos: { h: 'left', v: 'bottom' },
    },
    ctaButton: 'Fale Conosco',
    services: [
      { name: 'Sites &\nWordPress', num: '01' },
      { name: 'Lojas\nE-commerce', num: '02' },
      { name: 'Marketing\nDigital', num: '03' },
      { name: 'Apps & IA\nsob medida', num: null },
    ],
  },
  section3: {
    title: { text: 'Soluções\ncom IA' },
    subtitle: { text: 'Automação e inteligência para o seu negócio' },
    img1: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1000&auto=format&fit=crop',
    img2: '/uprocrm-card.jpg',
    bg: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1200&auto=format&fit=crop',
  },
};

/* ------------------------------------------------------------------ *
 * Contexto + helpers
 * ------------------------------------------------------------------ */
export const ContentContext = createContext<Content>(DEFAULT_CONTENT);
export const useContent = () => useContext(ContentContext);

/** Estilo inline de tamanho/peso (só aplica o que estiver definido). */
export function tStyle(f: TextField): CSSProperties {
  const s: CSSProperties = {};
  if (f.size) s.fontSize = f.size;
  if (f.weight) s.fontWeight = f.weight;
  return s;
}

/** Classes de posicionamento absoluto dentro de um card `relative`. */
export function posClasses(pos: { h: PosH; v: PosV } | undefined): string {
  const p = pos ?? { h: 'left', v: 'top' };
  const h =
    p.h === 'center'
      ? 'left-1/2 -translate-x-1/2 text-center'
      : p.h === 'right'
        ? 'right-4 md:right-7 text-right'
        : 'left-4 md:left-7 text-left';
  const v =
    p.v === 'center'
      ? 'top-1/2 -translate-y-1/2'
      : p.v === 'bottom'
        ? 'bottom-4 md:bottom-7'
        : 'top-4 md:top-7';
  return `absolute ${h} ${v}`;
}

/** Como `posClasses`, mas com folga pro navbar no topo (usado no Hero). */
export function heroPosClasses(pos: { h: PosH; v: PosV } | undefined): string {
  const p = pos ?? { h: 'left', v: 'top' };
  const h =
    p.h === 'center'
      ? 'left-1/2 -translate-x-1/2 text-center'
      : p.h === 'right'
        ? 'right-4 md:right-8 text-right'
        : 'left-4 md:left-8 text-left';
  const v =
    p.v === 'center'
      ? 'top-1/2 -translate-y-1/2'
      : p.v === 'bottom'
        ? 'bottom-6 md:bottom-10'
        : 'top-24 md:top-28';
  return `absolute ${h} ${v}`;
}

/** Quebra "\n" em <br/> para renderizar em JSX. */
export function multiline(text: string) {
  const parts = text.split('\n');
  return parts.map((line, i) => ({ line, br: i < parts.length - 1 }));
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function deepMerge(base: any, over: any): any {
  if (over === null || over === undefined) return base;
  if (Array.isArray(base) || Array.isArray(over)) return over ?? base;
  if (typeof base === 'object' && typeof over === 'object') {
    const out: any = { ...base };
    for (const k of Object.keys(over)) out[k] = deepMerge(base[k], over[k]);
    return out;
  }
  return over ?? base;
}

/** Mescla o conteúdo salvo (parcial) sobre os padrões. */
export function mergeContent(partial: unknown): Content {
  if (!partial || typeof partial !== 'object') return DEFAULT_CONTENT;
  return deepMerge(DEFAULT_CONTENT, partial) as Content;
}
