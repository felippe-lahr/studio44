import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';
import {
  useContent,
  tStyle,
  pickField,
  pickStyle,
  multiline,
  type TextField,
  type PosH,
  type PosV,
} from './content';

/** Renderiza um texto (com \n → <br/>). */
function Lines({ text }: { text: string }) {
  return (
    <>
      {multiline(text).map(({ line, br }, i) => (
        <span key={i}>
          {line}
          {br && <br />}
        </span>
      ))}
    </>
  );
}

/** Seta animada de rolagem (posição por seção; aponta pra cima na última). */
function ScrollArrow({ to, pos, up = false }: { to: string; pos: PosH; up?: boolean }) {
  const place =
    pos === 'left' ? 'left-5 md:left-8' : pos === 'right' ? 'right-5 md:right-8' : 'left-1/2';
  const anim =
    pos === 'center'
      ? up
        ? 's44-bounce-up'
        : 's44-bounce'
      : up
        ? 's44-bounce-x-up'
        : 's44-bounce-x';
  const go = () => {
    if (to === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
    else document.getElementById(to)?.scrollIntoView({ behavior: 'smooth' });
  };
  return (
    <button
      type="button"
      aria-label={up ? 'Voltar ao topo' : 'Rolar'}
      onClick={go}
      data-s44-bounce
      style={{ animation: `${anim} 1.8s ease-in-out infinite` }}
      className={`absolute bottom-5 ${place} z-30 w-11 h-11 md:w-12 md:h-12 rounded-full border border-white/40 bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d={up ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * ZONE TEXTS — posiciona vários textos num card por zonas (topo/centro/
 * base). Textos na mesma zona EMPILHAM (não se sobrepõem).
 * ------------------------------------------------------------------ */
type ZoneText = { field: TextField; className: string; style?: CSSProperties };

const V_ORDER: PosV[] = ['top', 'center', 'bottom'];

function ZoneTexts({ texts, hero = false }: { texts: ZoneText[]; hero?: boolean }) {
  const inset = hero
    ? 'left-4 right-4 md:left-8 md:right-8'
    : 'left-5 right-5 md:left-7 md:right-7';
  const zoneV = (v: PosV) =>
    v === 'center'
      ? 'top-1/2 -translate-y-1/2'
      : v === 'bottom'
        ? hero
          ? 'bottom-6 md:bottom-10'
          : 'bottom-4 md:bottom-6'
        : hero
          ? 'top-24 md:top-28'
          : 'top-4 md:top-6';
  // self-* (align-self) no item: o bloco abraça o texto (+ padding) em vez de
  // esticar na largura toda do card.
  const alignH = (h: PosH) =>
    h === 'center'
      ? 'self-center text-center'
      : h === 'right'
        ? 'self-end text-right'
        : 'self-start text-left';

  return (
    <>
      {V_ORDER.map((v) => {
        const group = texts.filter((t) => (t.field.pos?.v ?? 'top') === v);
        if (!group.length) return null;
        return (
          <div
            key={v}
            className={`absolute ${inset} z-10 flex flex-col gap-2 md:gap-3 ${zoneV(v)}`}
          >
            {group.map((t, i) => (
              <div
                key={i}
                style={{ ...tStyle(t.field), ...(t.style || {}) }}
                className={`${alignH(t.field.pos?.h ?? 'left')} ${t.className}`}
              >
                <Lines text={t.field.text} />
              </div>
            ))}
          </div>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * HELPERS
 * ------------------------------------------------------------------ */
type AnyRef<T> = Ref<T> | undefined;

function mergeRefs<T>(...refs: AnyRef<T>[]) {
  return (node: T | null) => {
    refs.forEach((ref) => {
      if (!ref) return;
      if (typeof ref === 'function') ref(node);
      else (ref as React.MutableRefObject<T | null>).current = node;
    });
  };
}

/* ------------------------------------------------------------------ *
 * MASKED CARDS — técnica central
 * ------------------------------------------------------------------ */
type MaskPosition = { x: number; y: number; sw: number; sh: number };

/**
 * Observa o container da seção e calcula, para cada card, sua posição
 * (x/y) relativa à seção e as dimensões (sw/sh) da própria seção.
 */
function useMaskPositions(
  sectionRef: React.RefObject<HTMLElement>,
  cardRefs: React.MutableRefObject<(HTMLElement | null)[]>,
): MaskPosition[] {
  const [positions, setPositions] = useState<MaskPosition[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const compute = () => {
      const sRect = section.getBoundingClientRect();
      const sw = sRect.width;
      const sh = sRect.height;
      const next = cardRefs.current.map((card) => {
        if (!card) return { x: 0, y: 0, sw, sh };
        const cRect = card.getBoundingClientRect();
        return {
          x: cRect.left - sRect.left,
          y: cRect.top - sRect.top,
          sw,
          sh,
        };
      });
      setPositions(next);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(section);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, [sectionRef, cardRefs]);

  return positions;
}

type CoverSize = { renderW: number; renderH: number };

/**
 * Carrega a imagem e devolve as dimensões renderizadas usando lógica de
 * "cover": escala pelo MAIOR dos dois fatores (largura/altura) para que a
 * imagem cubra toda a seção, independente da proporção. Assim nenhuma
 * imagem (mesmo quase quadrada) deixa faixas brancas em telas largas.
 */
function useCoverImage(src: string, sectionWidth: number, sectionHeight: number): CoverSize {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = src;
  }, [src]);

  if (!natural || sectionWidth === 0 || sectionHeight === 0) {
    return { renderW: 0, renderH: 0 };
  }
  const scale = Math.max(sectionWidth / natural.w, sectionHeight / natural.h);
  return { renderW: natural.w * scale, renderH: natural.h * scale };
}

type MaskedCardProps = {
  bgImage: string;
  position?: MaskPosition;
  renderW: number;
  renderH: number;
  focalX: number;
  focalY?: number;
  className?: string;
  children?: ReactNode;
  cardRef?: Ref<HTMLDivElement>;
  style?: CSSProperties;
};

function MaskedCard({
  bgImage,
  position,
  renderW,
  renderH,
  focalX,
  focalY = 0.5,
  className = '',
  children,
  cardRef,
  style,
}: MaskedCardProps) {
  const pos = position ?? { x: 0, y: 0, sw: 0, sh: 0 };
  const overflowX = renderW > pos.sw ? renderW - pos.sw : 0;
  const overflowY = renderH > pos.sh ? renderH - pos.sh : 0;
  const focalOffsetX = overflowX * focalX;
  const focalOffsetY = overflowY * focalY;

  return (
    <div
      ref={cardRef}
      className={className}
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: `${renderW}px ${renderH}px`,
        backgroundPosition: `-${pos.x + focalOffsetX}px -${pos.y + focalOffsetY}px`,
        backgroundRepeat: 'no-repeat',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * OTHER HOOKS
 * ------------------------------------------------------------------ */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}

function useStaggeredReveal(_count: number, active = true, threshold = 0.15) {
  const containerRef = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Só observamos depois que `active` é true (ex.: após o splash desmontar).
    // O IntersectionObserver dispara um callback inicial ao chamar observe();
    // por isso só marcamos visible quando entry.isIntersecting for true.
    if (!active) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [active, threshold]);

  const getAnimStyle = (index: number): CSSProperties => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(24px)',
    transition: `opacity 0.6s cubic-bezier(0.16,1,0.3,1) ${index * 120}ms, transform 0.6s cubic-bezier(0.16,1,0.3,1) ${index * 120}ms`,
  });

  return { containerRef, getAnimStyle };
}

/* ------------------------------------------------------------------ *
 * SPLASH SCREEN
 * ------------------------------------------------------------------ */
function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [count, setCount] = useState(0);
  const [exiting, setExiting] = useState(false);

  // Trava o scroll enquanto o splash cobre a tela e SEMPRE restaura ao
  // desmontar — garante que body.overflow volte a '' depois do load.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setCount(current);
      if (current >= 100) {
        clearInterval(interval);
        window.setTimeout(() => setExiting(true), 200);
        window.setTimeout(() => onComplete(), 900);
      }
    }, 20);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] bg-white flex items-end justify-start transition-opacity duration-700 ${
        exiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <div className="p-6 md:p-10 leading-none">
        <span className="block text-xs md:text-sm font-semibold uppercase tracking-widest text-black mb-2 md:mb-3">
          Studio44
        </span>
        <span className="block text-7xl md:text-9xl font-bold tabular-nums leading-none text-black">
          {count}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * NAVBAR
 * ------------------------------------------------------------------ */
const navLinks = ['Início', 'Serviços', 'Sobre', 'Portfólio', 'Contato'];

function Navbar() {
  const c = useContent();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Menu fica escondido no topo (hero) e aparece ao rolar.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Enquanto escondido, o menu não deve capturar cliques.
  const menuVisible = scrolled || open;

  return (
    <>
      <nav
        style={{ backgroundColor: `rgba(255,255,255,${(c.headerOpacity ?? 80) / 100})` }}
        className="fixed top-0 left-0 right-0 z-50 grid grid-cols-3 items-center px-4 md:px-6 py-2 backdrop-blur-md"
      >
        {/* Espaçador esquerdo */}
        <div />

        {/* Logo centralizado */}
        <a
          href="#"
          aria-label="Studio44 — Consultoria Digital"
          className="flex justify-center items-center"
        >
          <img
            src={c.logo}
            alt="Studio44 — Consultoria Digital"
            className="h-12 md:h-16 w-auto max-w-none shrink-0"
          />
        </a>

        {/* Menu (aparece ao rolar): botão desktop + hambúrguer mobile */}
        <div
          className={`flex justify-end items-center gap-6 transition-opacity duration-300 ${
            menuVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="hidden md:block px-6 py-3 bg-white rounded-full border border-black text-sm font-semibold hover:bg-black hover:text-white transition-colors duration-200"
          >
            Menu
          </button>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label="Abrir menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="md:hidden w-10 h-10 flex items-center justify-center relative"
          >
            <span
              className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                open ? 'rotate-45 translate-y-0' : '-translate-y-2'
              }`}
            />
            <span
              className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                open ? 'opacity-0 scale-x-0' : 'opacity-100 scale-x-100'
              }`}
            />
            <span
              className={`absolute h-0.5 w-6 bg-black rounded-full transition-all duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                open ? '-rotate-45 translate-y-0' : 'translate-y-2'
              }`}
            />
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      <div
        className={`md:hidden fixed inset-0 z-40 ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          onClick={() => setOpen(false)}
          className={`absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity duration-500 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {/* Panel */}
        <div
          className={`absolute top-0 right-0 h-full w-[85%] max-w-sm bg-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex flex-col justify-center h-full px-8 gap-1">
            {navLinks.map((link, i) => (
              <a
                key={link}
                href="#"
                onClick={() => setOpen(false)}
                className={`text-4xl font-bold text-black hover:text-neutral-500 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                  open ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                }`}
                style={{ transitionDelay: `${open ? 100 + i * 60 : 0}ms` }}
              >
                {link}
              </a>
            ))}

            <div
              className={`mt-8 pt-8 border-t border-neutral-200 transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)] ${
                open ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
              }`}
              style={{ transitionDelay: `${open ? 450 : 0}ms` }}
            >
              <p className="text-sm font-semibold text-black mb-4">Resposta em 24h</p>
              <a
                href={c.contactHref}
                className="block text-center w-full px-6 py-4 bg-black rounded-full text-white text-sm font-semibold hover:bg-neutral-800 transition-colors duration-200"
              >
                Solicitar Orçamento
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * SECTION 1 — HERO
 *
 * Fundo escuro estilo "technology background": várias colunas de código
 * colorido rolando em velocidades/direções diferentes (CSS puro), com
 * vinheta de profundidade. O texto fica por cima, e atrás de cada bloco
 * de texto há um vidro fosco (backdrop-blur) para garantir a legibilidade.
 * ------------------------------------------------------------------ */

/* Colore uma linha de código em tons tipo IDE (fundo abstrato). */
const codeRegex =
  /(\/\/[^\n]*)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(const|let|var|function|return|if|else|for|while|import|export|from|async|await|class|new|this|true|false|null|type|interface|extends)\b|\b(\d+(?:\.\d+)?)\b|([{}()[\];:,.=+\-*\/<>|&!?])/g;

const TOKEN = {
  plain: '#9aa2ad',
  comment: '#586074',
  string: '#c98a63',
  keyword: '#5b93c9',
  number: '#8bbf6a',
  punct: '#6b7280',
};

function tokenizeLine(line: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let idx = 0;
  let m: RegExpExecArray | null;
  codeRegex.lastIndex = 0;
  while ((m = codeRegex.exec(line)) !== null) {
    if (m.index > last) {
      out.push(
        <span key={`${keyBase}-${idx++}`} style={{ color: TOKEN.plain }}>
          {line.slice(last, m.index)}
        </span>,
      );
    }
    let color = TOKEN.plain;
    if (m[1]) color = TOKEN.comment;
    else if (m[2]) color = TOKEN.string;
    else if (m[3]) color = TOKEN.keyword;
    else if (m[4]) color = TOKEN.number;
    else if (m[5]) color = TOKEN.punct;
    out.push(
      <span key={`${keyBase}-${idx++}`} style={{ color }}>
        {m[0]}
      </span>,
    );
    last = codeRegex.lastIndex;
  }
  if (last < line.length) {
    out.push(
      <span key={`${keyBase}-${idx++}`} style={{ color: TOKEN.plain }}>
        {line.slice(last)}
      </span>,
    );
  }
  return out;
}

const CODE_POOL: string[] = [
  "import { render } from 'core';",
  'const app = createApp(config);',
  'export async function boot() {',
  '  await db.connect(env.DB_URL);',
  '  return app.listen(3000);',
  '}',
  'function compile(src) {',
  '  const ast = parse(src);',
  '  return generate(ast, opts);',
  '}',
  "const routes = ['/', '/api', '/ia'];",
  'let cache = new Map();',
  'for (let i = 0; i < n; i++) {',
  '  queue.push(tasks[i]);',
  '}',
  'if (user.auth && token.valid) {',
  '  grant(user, scope);',
  '}',
  'class Pipeline extends Stream {',
  '  transform(c) { return map(c); }',
  '}',
  "const model = await ai.load('studio44');",
  'const score = model.predict(input);',
  '// deploy to production',
  'await ci.run({ build: true, test: true });',
  "export const version = '4.4.0';",
  'const hash = sha256(payload);',
  "socket.on('data', (d) => emit(d));",
  'try { commit(tx); } catch (e) { rollback(); }',
  'const pixels = buffer.slice(0, 1024);',
  'render(app, root);',
  'const theme = { dark: true, accent: 44 };',
  'while (running) tick(delta);',
  'const res = await fetch(api + id);',
  'type Cliente = { nome: string; ativo: boolean };',
  'matrix.forEach((row) => row.map(cell));',
  "logger.info('studio44 ready');",
];

/** Colunas de código pré-tokenizadas, com velocidade/direção/opacidade próprias. */
const HERO_COLUMNS = Array.from({ length: 6 }, (_, c) => ({
  lines: Array.from({ length: 26 }, (_, i) =>
    tokenizeLine(CODE_POOL[(i * 5 + c * 11 + (i % 3)) % CODE_POOL.length], `c${c}-l${i}`),
  ),
  dur: [26, 34, 22, 30, 24, 38][c],
  reverse: c % 2 === 1,
  opacity: [0.75, 0.5, 0.85, 0.55, 0.7, 0.5][c],
}));

/** Fundo abstrato: várias colunas de código rolando em velocidades diferentes. */
function HeroCodeField() {
  return (
    <div
      className="w-full h-full bg-[#0b0e14] overflow-hidden relative select-none"
      aria-hidden="true"
    >
      <div className="absolute inset-0 flex justify-between gap-4 md:gap-8 px-3 md:px-8">
        {HERO_COLUMNS.map((col, c) => (
          <div
            key={c}
            className={`flex-1 min-w-0 overflow-hidden ${c >= 2 ? 'hidden md:block' : ''}`}
          >
            <div
              data-s44-code
              className="font-mono text-[10px] md:text-xs leading-5 md:leading-6 whitespace-pre"
              style={{
                opacity: col.opacity,
                animation: `s44-code-scroll ${col.dur}s linear infinite`,
                animationDirection: col.reverse ? 'reverse' : 'normal',
              }}
            >
              {[0, 1].map((rep) => (
                <div key={rep}>
                  {col.lines.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* profundidade / vinheta */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 45%, rgba(11,14,20,0) 42%, rgba(11,14,20,0.92) 100%)',
        }}
      />

      {/* faixa de luz varrendo */}
      <div
        data-s44-scan
        className="absolute left-0 right-0 top-0 h-40 bg-gradient-to-b from-transparent via-white/[0.05] to-transparent pointer-events-none"
        style={{ animation: 's44-code-scan 9s ease-in-out infinite' }}
      />
    </div>
  );
}

function Section1({ ready }: { ready: boolean }) {
  const c = useContent();
  const isMobile = useIsMobile();
  const s1Reveal = useStaggeredReveal(4, ready);

  return (
    <section
      ref={s1Reveal.containerRef}
      className="relative h-[100svh] w-full overflow-hidden bg-[#0b0e14]"
    >
      {/* Fundo abstrato de código (full-bleed) */}
      <div className="absolute inset-0 z-0">
        <HeroCodeField />
      </div>

      {/* Conteúdo por cima, com vidro fosco atrás de cada texto */}
      <div className="absolute inset-0 z-10">
        <ZoneTexts
          hero
          texts={[
            {
              field: pickField(c.hero.paragraph, isMobile),
              style: s1Reveal.getAnimStyle(0),
              className:
                'max-w-[240px] md:max-w-[360px] text-white text-sm md:text-base font-semibold leading-5 md:leading-6 backdrop-blur-md bg-black/35 rounded-lg px-4 py-3',
            },
            {
              field: pickField(c.hero.headline, isMobile),
              style: s1Reveal.getAnimStyle(1),
              className:
                'max-w-[92%] text-white text-[clamp(3rem,11vw,11rem)] font-bold leading-[0.82] tracking-tight backdrop-blur-md bg-black/35 rounded-2xl px-4 py-3 md:px-6 md:py-4',
            },
          ]}
        />
      </div>

      <ScrollArrow to="servicos" pos={c.arrows?.s1 ?? 'center'} />
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * SECTION 2 — SERVIÇOS / PORTFÓLIO
 * ------------------------------------------------------------------ */
function Section2({ ready }: { ready: boolean }) {
  const c = useContent();
  const isMobile = useIsMobile();
  const section2Ref = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const s2Reveal = useStaggeredReveal(4, ready);

  const positions = useMaskPositions(section2Ref, cardRefs);
  const sectionWidth = positions[0]?.sw ?? 0;
  const sectionHeight = positions[0]?.sh ?? 0;
  const { renderW, renderH } = useCoverImage(c.section2.image, sectionWidth, sectionHeight);
  const focalX = isMobile ? 0.65 : 0.8;

  return (
    <section
      id="servicos"
      ref={mergeRefs<HTMLElement>(section2Ref, s2Reveal.containerRef)}
      className="relative min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-[var(--s44-gap,0.5rem)]"
    >
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_auto_auto_auto] md:grid-rows-[1fr_1fr_0.8fr] gap-[var(--s44-gap,0.5rem)]">
        {/* Card 0 — Top Left */}
        <MaskedCard
          bgImage={c.section2.image}
          position={positions[0]}
          renderW={renderW}
          renderH={renderH}
          focalX={focalX}
          cardRef={(el) => (cardRefs.current[0] = el)}
          style={s2Reveal.getAnimStyle(0)}
          className="rounded-[var(--s44-radius,1rem)] overflow-hidden relative min-h-[160px] md:min-h-0"
        >
          <ZoneTexts
            texts={[
              {
                field: pickField(c.section2.title, isMobile),
                className: 'text-white md:text-black text-2xl md:text-3xl font-bold',
              },
              {
                field: pickField(c.section2.subtitle, isMobile),
                className: 'text-white md:text-black text-xs md:text-sm font-semibold',
              },
            ]}
          />
        </MaskedCard>

        {/* Card 1 — Top Right (spans 2 rows on desktop) */}
        <MaskedCard
          bgImage={c.section2.image}
          position={positions[1]}
          renderW={renderW}
          renderH={renderH}
          focalX={focalX}
          cardRef={(el) => (cardRefs.current[1] = el)}
          style={s2Reveal.getAnimStyle(1)}
          className="md:row-span-2 rounded-[var(--s44-radius,1rem)] overflow-hidden relative min-h-[200px] md:min-h-0"
        >
          <p
            style={tStyle(pickField(c.section2.ctaText, isMobile))}
            className="absolute bottom-16 left-5 md:bottom-20 md:left-7 text-white text-xs md:text-sm font-semibold leading-4 md:leading-5 z-10"
          >
            <Lines text={c.section2.ctaText.text} />
          </p>
          <a
            href={c.contactHref}
            className="absolute bottom-4 right-4 md:bottom-6 md:right-6 px-5 py-3 md:px-8 md:py-5 bg-white rounded-full text-black text-base md:text-xl font-bold z-10 hover:scale-105 transition-transform"
          >
            {c.section2.ctaButton}
          </a>
        </MaskedCard>

        {/* Card 2 — Bottom Left */}
        <MaskedCard
          bgImage={c.section2.image}
          position={positions[2]}
          renderW={renderW}
          renderH={renderH}
          focalX={focalX}
          cardRef={(el) => (cardRefs.current[2] = el)}
          style={s2Reveal.getAnimStyle(2)}
          className="rounded-[var(--s44-radius,1rem)] overflow-hidden relative min-h-[160px] md:min-h-0"
        >
          <ZoneTexts
            texts={[
              {
                field: pickField(c.section2.solutions, isMobile),
                className: 'text-white md:text-black text-[clamp(3rem,7vw,6rem)] font-bold leading-[0.9]',
              },
            ]}
          />
        </MaskedCard>

        {/* Card 3 — Bottom Full Width (Services) */}
        <MaskedCard
          bgImage={c.section2.image}
          position={positions[3]}
          renderW={renderW}
          renderH={renderH}
          focalX={focalX}
          cardRef={(el) => (cardRefs.current[3] = el)}
          style={s2Reveal.getAnimStyle(3)}
          className="col-span-1 md:col-span-2 rounded-[var(--s44-radius,1rem)] overflow-hidden relative min-h-[200px] md:min-h-0"
        >
          <div className="absolute inset-0 z-10 grid grid-cols-2 grid-rows-2 md:grid-cols-4 md:grid-rows-1 gap-[var(--s44-gap,0.5rem)] p-2 md:p-3">
            {c.section2.services.map((svc, i) => {
              const active = i === 0;
              return (
                <div
                  key={i}
                  className={`rounded-[var(--s44-radius,1rem)] p-[var(--s44-inner-pad,1.25rem)] flex flex-col justify-between ${
                    active ? 'bg-white/90 backdrop-blur-md' : 'bg-white/20 backdrop-blur-xl'
                  }`}
                >
                  <h3
                    className={`text-xl md:text-4xl font-bold leading-[1.05] whitespace-pre-line ${
                      active ? 'text-black' : 'text-white'
                    }`}
                    style={tStyle(pickStyle(svc, isMobile))}
                  >
                    {svc.name}
                  </h3>
                  {svc.num && (
                    <span
                      className={`self-end w-8 h-8 md:w-12 md:h-12 rounded-full border flex items-center justify-center text-xs md:text-sm font-semibold ${
                        active ? 'border-black text-black' : 'border-white text-white'
                      }`}
                    >
                      {svc.num}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </MaskedCard>
      </div>
      <ScrollArrow to="solucoes" pos={c.arrows?.s2 ?? 'center'} />
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * SECTION 3 — SOLUÇÕES COM IA
 * ------------------------------------------------------------------ */
function ArrowIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={`rotate-[-45deg] ${className}`}
    >
      <path
        d="M1 7h12m0 0L8 2m5 5L8 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Section3({ ready }: { ready: boolean }) {
  const c = useContent();
  const isMobile = useIsMobile();
  const s3Reveal = useStaggeredReveal(4, ready);

  return (
    <section
      id="solucoes"
      ref={s3Reveal.containerRef as Ref<HTMLElement>}
      className="relative min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-[var(--s44-gap,0.5rem)]"
    >
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-[var(--s44-gap,0.5rem)]">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-[var(--s44-gap,0.5rem)]">
          {/* 1. Heading Card */}
          <div
            style={s3Reveal.getAnimStyle(0)}
            className="rounded-[var(--s44-radius,1rem)] bg-stone-50 p-5 md:p-7 flex flex-col justify-between flex-[1.2] min-h-[180px] md:min-h-0"
          >
            <h2
              style={tStyle(pickField(c.section3.title, isMobile))}
              className="text-[clamp(3rem,7vw,6.5rem)] font-bold leading-[0.95] text-black"
            >
              <Lines text={c.section3.title.text} />
            </h2>
            <p
              style={tStyle(pickField(c.section3.subtitle, isMobile))}
              className="text-xs md:text-sm font-semibold text-black"
            >
              <Lines text={c.section3.subtitle.text} />
            </p>
          </div>

          {/* 2. Two Image Cards */}
          <div
            style={s3Reveal.getAnimStyle(1)}
            className="flex gap-[var(--s44-gap,0.5rem)] flex-1 min-h-[140px] md:min-h-0"
          >
            <div className="flex-1 rounded-[var(--s44-radius,1rem)] overflow-hidden">
              <img
                src={c.section3.img1}
                alt="Aplicativo desenvolvido pela Studio44"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 rounded-[var(--s44-radius,1rem)] overflow-hidden">
              <img
                src={c.section3.img2}
                alt="Solução de IA e automação"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* 3. Consultation Card */}
          <div
            style={s3Reveal.getAnimStyle(2)}
            className="rounded-[var(--s44-radius,1rem)] bg-zinc-200 p-5 md:p-7 flex items-end justify-between flex-[0.8] min-h-[160px] md:min-h-0"
          >
            <div>
              <p
                style={tStyle(pickField(c.section3.consultLabel, isMobile))}
                className="text-xs md:text-sm font-semibold text-black mb-2 md:mb-3"
              >
                <Lines text={c.section3.consultLabel.text} />
              </p>
              <h3
                style={tStyle(pickField(c.section3.consultTitle, isMobile))}
                className="text-xl md:text-3xl font-bold text-black leading-6 md:leading-8"
              >
                <Lines text={c.section3.consultTitle.text} />
              </h3>
            </div>
            <a
              href={c.contactHref}
              className="px-5 py-3 md:px-8 md:py-5 bg-white rounded-full text-black text-base md:text-xl font-bold hover:scale-105 transition-transform whitespace-nowrap"
            >
              {c.section3.consultButton}
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div
          style={s3Reveal.getAnimStyle(3)}
          className="rounded-[var(--s44-radius,1rem)] overflow-hidden relative min-h-[350px] md:min-h-0"
        >
          <img
            src={c.section3.bg}
            alt="Equipe Studio44"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5 flex gap-[var(--s44-gap,0.5rem)]">
            {/* Overlay Card 1 (white) */}
            <div className="flex-1 bg-white rounded-[var(--s44-radius,1rem)] p-[var(--s44-inner-pad,1.25rem)] flex flex-col justify-between h-36 md:h-52">
              <h4
                style={tStyle(pickField(c.section3.overlay1, isMobile))}
                className="text-lg md:text-2xl font-bold text-black leading-5 md:leading-7"
              >
                <Lines text={c.section3.overlay1.text} />
              </h4>
              <span className="self-end w-9 h-9 md:w-12 md:h-12 rounded-full border border-black flex items-center justify-center">
                <ArrowIcon />
              </span>
            </div>

            {/* Overlay Card 2 (glass) */}
            <div className="flex-1 bg-white/20 backdrop-blur-xl rounded-[var(--s44-radius,1rem)] p-[var(--s44-inner-pad,1.25rem)] flex flex-col justify-between h-36 md:h-52">
              <h4
                style={tStyle(pickField(c.section3.overlay2, isMobile))}
                className="text-lg md:text-2xl font-bold text-white leading-5 md:leading-7"
              >
                <Lines text={c.section3.overlay2.text} />
              </h4>
              <span className="self-end w-9 h-9 md:w-12 md:h-12 rounded-full border border-white flex items-center justify-center text-white">
                <ArrowIcon className="text-white" />
              </span>
            </div>
          </div>
        </div>
      </div>
      <ScrollArrow to="top" pos={c.arrows?.s3 ?? 'center'} up />
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * APP
 * ------------------------------------------------------------------ */
export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const handleComplete = useCallback(() => setShowSplash(false), []);

  return (
    <div className="bg-white flex flex-col gap-[var(--s44-section-gap,0px)]">
      {showSplash && <SplashScreen onComplete={handleComplete} />}
      <Navbar />
      <Section1 ready={!showSplash} />
      <Section2 ready={!showSplash} />
      <Section3 ready={!showSplash} />
    </div>
  );
}
