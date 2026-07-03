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

/** Propriedades de estilo de um texto (por dispositivo). */
export type TextStyle = {
  /** override de tamanho da fonte, ex.: "48px" ou "3rem". Vazio = padrão. */
  size?: string;
  /** peso da fonte: 400..800. Vazio = padrão. */
  weight?: number;
  /** altura da linha, ex.: "1.2" ou "0.9". Vazio = padrão. */
  lh?: string;
  /** cor da fonte (hex). Vazio = padrão. */
  color?: string;
  /** posição dentro do card. */
  pos?: { h: PosH; v: PosV };
};

export type TextField = TextStyle & {
  text: string;
  /** overrides só para mobile (< 768px). O que não for definido aqui:
   *  - tamanho: usa o tamanho responsivo padrão (não herda o desktop);
   *  - demais (peso/cor/altura/posição): herdam do desktop. */
  mobile?: TextStyle;
};

export type Service = TextStyle & {
  name: string;
  num: string | null;
  /** overrides de estilo só para mobile (< 768px). */
  mobile?: TextStyle;
};

/** Fontes do Google (todas com pesos 400–800). */
export const GOOGLE_FONTS = [
  'Inter',
  'Poppins',
  'Montserrat',
  'Raleway',
  'Manrope',
  'DM Sans',
  'Plus Jakarta Sans',
  'Outfit',
  'Work Sans',
  'Archivo',
  'Nunito',
  'Figtree',
];

export type Content = {
  /** nome de uma Google Font (ver GOOGLE_FONTS). Vazio = fonte padrão. */
  font?: string;
  /** opacidade do fundo do cabeçalho (0–100). Padrão 80. */
  headerOpacity?: number;
  /** posição horizontal da seta de rolagem por seção. Padrão 'center'. */
  arrows?: { s1: PosH; s2: PosH; s3: PosH };
  /** margem (espaço) entre as seções em px. Padrão 0. */
  sectionGap?: number;
  /** border-radius dos cards em px. Padrão 16. */
  cardRadius?: number;
  /** espaçamento (gap) entre os cards em px. Padrão 8. */
  cardGap?: number;
  /** padding interno dos cards aninhados (subcards) em px. Padrão 20. */
  innerCardPadding?: number;
  /** exibe o menu de navegação (botão "Menu" / hambúrguer). Padrão false. */
  menuEnabled?: boolean;
  /** cor de fundo do botão flutuante do WhatsApp. Padrão '#25D366'. */
  whatsappColor?: string;
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
    consultLabel: TextField;
    consultTitle: TextField;
    consultButton: string;
    overlay1: TextField;
    overlay2: TextField;
  };
  /** Barra fina no rodapé (endereço, CNPJ, etc.). Altura máx. 50px. */
  footer: TextField;
};

export const DEFAULT_CONTENT: Content = {
  headerOpacity: 80,
  arrows: { s1: 'center', s2: 'center', s3: 'center' },
  sectionGap: 0,
  cardRadius: 16,
  cardGap: 8,
  innerCardPadding: 20,
  menuEnabled: false,
  whatsappColor: '#25D366',
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
    consultLabel: { text: 'Consultoria' },
    consultTitle: { text: 'Estratégia\nDigital\nCompleta' },
    consultButton: 'Agende uma Conversa',
    overlay1: { text: 'Do Projeto\nà Entrega,\ncom Método' },
    overlay2: { text: 'Suporte\ne Evolução\nContínua' },
  },
  footer: {
    text: 'Rua Exemplo, 123 — Cidade/UF  ·  CNPJ 00.000.000/0001-00',
    pos: { h: 'center', v: 'center' },
  },
};

/* ------------------------------------------------------------------ *
 * Contexto + helpers
 * ------------------------------------------------------------------ */
export const ContentContext = createContext<Content>(DEFAULT_CONTENT);
export const useContent = () => useContext(ContentContext);

/** Estilo inline de tamanho/peso (só aplica o que estiver definido). */
export function tStyle(f: TextStyle): CSSProperties {
  const s: CSSProperties = {};
  if (f.size) s.fontSize = f.size;
  if (f.weight) s.fontWeight = f.weight;
  if (f.lh) s.lineHeight = f.lh;
  if (f.color) s.color = f.color;
  return s;
}

/** Resolve o campo para o dispositivo atual (desktop = base; mobile aplica
 *  seus overrides — tamanho independente, o resto herda do desktop). */
export function pickField(f: TextField, isMobile: boolean): TextField {
  if (!isMobile || !f.mobile) return f;
  const m = f.mobile;
  return {
    text: f.text,
    size: m.size, // não herda o desktop (evita estourar no mobile)
    weight: m.weight ?? f.weight,
    lh: m.lh ?? f.lh,
    color: m.color ?? f.color,
    pos: m.pos ?? f.pos,
  };
}

/** Resolve o estilo de um elemento com overrides de mobile (ex.: serviços).
 *  Desktop = base; mobile aplica seus overrides (tamanho independente, o
 *  resto herda do desktop) — mesma regra do `pickField`. */
export function pickStyle(
  f: TextStyle & { mobile?: TextStyle },
  isMobile: boolean,
): TextStyle {
  if (!isMobile || !f.mobile) return f;
  const m = f.mobile;
  return {
    size: m.size, // não herda o desktop (evita estourar no mobile)
    weight: m.weight ?? f.weight,
    lh: m.lh ?? f.lh,
    color: m.color ?? f.color,
    pos: m.pos ?? f.pos,
  };
}

/** URL do CSS da Google Font escolhida (pesos 400–800). */
export function googleFontHref(font: string): string {
  return `https://fonts.googleapis.com/css2?family=${font.replace(/ /g, '+')}:wght@400;500;600;700;800&display=swap`;
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
