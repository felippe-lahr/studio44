import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from 'react';

/* ------------------------------------------------------------------ *
 * IMAGE URLS
 * Imagens coesas, em alta resolução e na vertical/quadrada funcionam
 * melhor com a técnica de "masked cards" (Seções 1 e 2). Substitua
 * pelos seus próprios assets quando quiser.
 * ------------------------------------------------------------------ */
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=2400&auto=format&fit=crop';
const SECTION2_IMAGE =
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2400&auto=format&fit=crop';
const SECTION3_IMG1 =
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=1000&auto=format&fit=crop';
const SECTION3_IMG2 =
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1000&auto=format&fit=crop';
const SECTION3_BG =
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1200&auto=format&fit=crop';

/* Canal de contato — substitua pelo seu WhatsApp, formulário ou e-mail. */
const CONTACT_HREF = 'https://wa.me/5599999999999';

/* ------------------------------------------------------------------ *
 * DATA CONSTANTS
 * ------------------------------------------------------------------ */
const featureBars = ['12 Anos de Experiência', 'Tecnologia com IA', 'Foco em Resultados'];

type Service = { name: string; num: string | null; active: boolean };

const services: Service[] = [
  { name: 'Sites &\nWordPress', num: '01', active: true },
  { name: 'Lojas\nE-commerce', num: '02', active: false },
  { name: 'Marketing\nDigital', num: '03', active: false },
  { name: 'Apps & IA\nsob medida', num: null, active: false },
];

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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 md:px-6 py-2 md:py-3 bg-white/80 backdrop-blur-md">
        {/* Logo */}
        <a href="#" aria-label="Studio44 — Consultoria Digital" className="flex items-center">
          <img
            src="/logo.svg"
            alt="Studio44 — Consultoria Digital"
            className="h-9 md:h-11 w-auto"
          />
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="px-6 py-3 bg-white rounded-full border border-black text-sm font-semibold hover:bg-black hover:text-white transition-colors duration-200"
          >
            Menu
          </button>
          <span className="text-sm font-semibold text-black">Resposta em 24h</span>
        </div>

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
                href={CONTACT_HREF}
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
 * ------------------------------------------------------------------ */
function Section1({ ready }: { ready: boolean }) {
  const isMobile = useIsMobile();
  const section1Ref = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const s1Reveal = useStaggeredReveal(4, ready);

  const positions = useMaskPositions(section1Ref, cardRefs);
  const sectionWidth = positions[0]?.sw ?? 0;
  const sectionHeight = positions[0]?.sh ?? 0;
  const { renderW, renderH } = useCoverImage(HERO_IMAGE, sectionWidth, sectionHeight);
  const focalX = isMobile ? 0.7 : 0.8;

  return (
    <section
      ref={mergeRefs<HTMLElement>(section1Ref, s1Reveal.containerRef)}
      className="h-screen w-full overflow-hidden flex flex-col pt-24 md:pt-24 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
    >
      {/* Feature bars */}
      {featureBars.map((bar, i) => (
        <MaskedCard
          key={bar}
          bgImage={HERO_IMAGE}
          position={positions[i]}
          renderW={renderW}
          renderH={renderH}
          focalX={focalX}
          cardRef={(el) => (cardRefs.current[i] = el)}
          style={s1Reveal.getAnimStyle(i)}
          className="w-full h-14 md:h-20 shrink-0 rounded-xl md:rounded-2xl overflow-hidden relative"
        >
          <span className="flex items-center justify-center h-full text-black text-lg md:text-3xl font-bold text-center relative z-10">
            {bar}
          </span>
        </MaskedCard>
      ))}

      {/* Main hero card */}
      <MaskedCard
        bgImage={HERO_IMAGE}
        position={positions[3]}
        renderW={renderW}
        renderH={renderH}
        focalX={focalX}
        cardRef={(el) => (cardRefs.current[3] = el)}
        style={s1Reveal.getAnimStyle(3)}
        className="w-full flex-1 min-h-0 rounded-xl md:rounded-2xl overflow-hidden relative"
      >
        <p className="absolute top-4 left-4 md:top-7 md:left-7 text-black text-xs md:text-sm font-semibold leading-4 md:leading-5 max-w-[200px] md:max-w-[300px] z-10">
          Transformamos pequenas e médias empresas
          <br />
          em referências digitais.
        </p>

        <div className="absolute bottom-5 left-3 md:bottom-8 md:left-4 z-10">
          <span className="block text-black text-xs md:text-sm font-semibold mb-1 md:mb-2">
            Consultoria Digital desde 2014
          </span>
          <h1 className="text-black text-[clamp(3rem,11vw,11rem)] font-bold leading-[0.79] tracking-tight">
            Cresça
            <br />
            no Digital
          </h1>
        </div>

        <a
          href={CONTACT_HREF}
          className="absolute bottom-6 right-4 md:bottom-10 md:right-8 text-white text-xs md:text-sm font-semibold z-10"
        >
          Orçamento Grátis
        </a>
      </MaskedCard>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * SECTION 2 — SERVIÇOS / PORTFÓLIO
 * ------------------------------------------------------------------ */
function Section2({ ready }: { ready: boolean }) {
  const isMobile = useIsMobile();
  const section2Ref = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const s2Reveal = useStaggeredReveal(4, ready);

  const positions = useMaskPositions(section2Ref, cardRefs);
  const sectionWidth = positions[0]?.sw ?? 0;
  const sectionHeight = positions[0]?.sh ?? 0;
  const { renderW, renderH } = useCoverImage(SECTION2_IMAGE, sectionWidth, sectionHeight);
  const focalX = isMobile ? 0.65 : 0.8;

  return (
    <section
      ref={mergeRefs<HTMLElement>(section2Ref, s2Reveal.containerRef)}
      className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
    >
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 grid-rows-[auto_auto_auto_auto] md:grid-rows-[1fr_1fr_0.8fr] gap-1.5 md:gap-2">
        {/* Card 0 — Top Left */}
        <MaskedCard
          bgImage={SECTION2_IMAGE}
          position={positions[0]}
          renderW={renderW}
          renderH={renderH}
          focalX={focalX}
          cardRef={(el) => (cardRefs.current[0] = el)}
          style={s2Reveal.getAnimStyle(0)}
          className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[160px] md:min-h-0"
        >
          <h2 className="absolute top-4 left-5 md:top-6 md:left-7 text-white md:text-black text-2xl md:text-3xl font-bold z-10">
            Nossos Serviços
          </h2>
          <p className="absolute bottom-4 left-5 md:bottom-6 md:left-7 text-white md:text-black text-xs md:text-sm font-semibold z-10">
            O que entregamos para o seu negócio
          </p>
        </MaskedCard>

        {/* Card 1 — Top Right (spans 2 rows on desktop) */}
        <MaskedCard
          bgImage={SECTION2_IMAGE}
          position={positions[1]}
          renderW={renderW}
          renderH={renderH}
          focalX={focalX}
          cardRef={(el) => (cardRefs.current[1] = el)}
          style={s2Reveal.getAnimStyle(1)}
          className="md:row-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0"
        >
          <p className="absolute bottom-16 left-5 md:bottom-20 md:left-7 text-white text-xs md:text-sm font-semibold leading-4 md:leading-5 z-10">
            Quer escalar o seu negócio no digital?
            <br />
            Vamos conversar sobre o seu projeto.
          </p>
          <a
            href={CONTACT_HREF}
            className="absolute bottom-4 right-4 md:bottom-6 md:right-6 px-5 py-3 md:px-8 md:py-5 bg-white rounded-full text-black text-base md:text-xl font-bold z-10 hover:scale-105 transition-transform"
          >
            Fale Conosco
          </a>
        </MaskedCard>

        {/* Card 2 — Bottom Left */}
        <MaskedCard
          bgImage={SECTION2_IMAGE}
          position={positions[2]}
          renderW={renderW}
          renderH={renderH}
          focalX={focalX}
          cardRef={(el) => (cardRefs.current[2] = el)}
          style={s2Reveal.getAnimStyle(2)}
          className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[160px] md:min-h-0"
        >
          <h2 className="absolute top-4 left-5 md:top-6 md:left-7 text-white md:text-black text-[clamp(3rem,7vw,6rem)] font-bold leading-[0.9] z-10">
            Soluções
            <br />
            Sob Medida
          </h2>
        </MaskedCard>

        {/* Card 3 — Bottom Full Width (Services) */}
        <MaskedCard
          bgImage={SECTION2_IMAGE}
          position={positions[3]}
          renderW={renderW}
          renderH={renderH}
          focalX={focalX}
          cardRef={(el) => (cardRefs.current[3] = el)}
          style={s2Reveal.getAnimStyle(3)}
          className="col-span-1 md:col-span-2 rounded-xl md:rounded-2xl overflow-hidden relative min-h-[200px] md:min-h-0"
        >
          <div className="absolute inset-0 z-10 flex flex-wrap md:flex-nowrap gap-1.5 md:gap-2 p-2 md:p-3">
            {services.map((svc) => (
              <div
                key={svc.name}
                className={`flex-1 min-w-[calc(50%-4px)] md:min-w-0 rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between ${
                  svc.active ? 'bg-white/90 backdrop-blur-md' : 'bg-white/20 backdrop-blur-xl'
                }`}
              >
                <h3
                  className={`text-xl md:text-4xl font-bold leading-[1.05] whitespace-pre-line ${
                    svc.active ? 'text-black' : 'text-white'
                  }`}
                >
                  {svc.name}
                </h3>
                {svc.num && (
                  <span
                    className={`self-end w-8 h-8 md:w-12 md:h-12 rounded-full border flex items-center justify-center text-xs md:text-sm font-semibold ${
                      svc.active ? 'border-black text-black' : 'border-white text-white'
                    }`}
                  >
                    {svc.num}
                  </span>
                )}
              </div>
            ))}
          </div>
        </MaskedCard>
      </div>
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
  const s3Reveal = useStaggeredReveal(4, ready);

  return (
    <section
      ref={s3Reveal.containerRef as Ref<HTMLElement>}
      className="min-h-screen md:h-screen w-full overflow-hidden flex flex-col pt-1.5 md:pt-2 px-3 md:px-5 pb-1.5 md:pb-2 gap-1.5 md:gap-2"
    >
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-1.5 md:gap-2">
        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-1.5 md:gap-2">
          {/* 1. Heading Card */}
          <div
            style={s3Reveal.getAnimStyle(0)}
            className="rounded-xl md:rounded-2xl bg-stone-50 p-5 md:p-7 flex flex-col justify-between flex-[1.2] min-h-[180px] md:min-h-0"
          >
            <h2 className="text-[clamp(3rem,7vw,6.5rem)] font-bold leading-[0.95] text-black">
              Soluções
              <br />
              com IA
            </h2>
            <p className="text-xs md:text-sm font-semibold text-black">
              Automação e inteligência para o seu negócio
            </p>
          </div>

          {/* 2. Two Image Cards */}
          <div
            style={s3Reveal.getAnimStyle(1)}
            className="flex gap-1.5 md:gap-2 flex-1 min-h-[140px] md:min-h-0"
          >
            <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden">
              <img
                src={SECTION3_IMG1}
                alt="Aplicativo desenvolvido pela Studio44"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 rounded-xl md:rounded-2xl overflow-hidden">
              <img
                src={SECTION3_IMG2}
                alt="Solução de IA e automação"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* 3. Consultation Card */}
          <div
            style={s3Reveal.getAnimStyle(2)}
            className="rounded-xl md:rounded-2xl bg-zinc-200 p-5 md:p-7 flex items-end justify-between flex-[0.8] min-h-[160px] md:min-h-0"
          >
            <div>
              <p className="text-xs md:text-sm font-semibold text-black mb-2 md:mb-3">Consultoria</p>
              <h3 className="text-xl md:text-3xl font-bold text-black leading-6 md:leading-8">
                Estratégia
                <br />
                Digital
                <br />
                Completa
              </h3>
            </div>
            <a
              href={CONTACT_HREF}
              className="px-5 py-3 md:px-8 md:py-5 bg-white rounded-full text-black text-base md:text-xl font-bold hover:scale-105 transition-transform whitespace-nowrap"
            >
              Agende uma Conversa
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div
          style={s3Reveal.getAnimStyle(3)}
          className="rounded-xl md:rounded-2xl overflow-hidden relative min-h-[350px] md:min-h-0"
        >
          <img
            src={SECTION3_BG}
            alt="Equipe Studio44"
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-3 left-3 right-3 md:bottom-5 md:left-5 md:right-5 flex gap-1.5 md:gap-2">
            {/* Overlay Card 1 (white) */}
            <div className="flex-1 bg-white rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52">
              <h4 className="text-lg md:text-2xl font-bold text-black leading-5 md:leading-7">
                Do Projeto
                <br />
                à Entrega,
                <br />
                com Método
              </h4>
              <span className="self-end w-9 h-9 md:w-12 md:h-12 rounded-full border border-black flex items-center justify-center">
                <ArrowIcon />
              </span>
            </div>

            {/* Overlay Card 2 (glass) */}
            <div className="flex-1 bg-white/20 backdrop-blur-xl rounded-xl md:rounded-2xl p-3 md:p-5 flex flex-col justify-between h-36 md:h-52">
              <h4 className="text-lg md:text-2xl font-bold text-white leading-5 md:leading-7">
                Suporte
                <br />
                e Evolução
                <br />
                Contínua
              </h4>
              <span className="self-end w-9 h-9 md:w-12 md:h-12 rounded-full border border-white flex items-center justify-center text-white">
                <ArrowIcon className="text-white" />
              </span>
            </div>
          </div>
        </div>
      </div>
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
    <div className="bg-white">
      {showSplash && <SplashScreen onComplete={handleComplete} />}
      <Navbar />
      <Section1 ready={!showSplash} />
      <Section2 ready={!showSplash} />
      <Section3 ready={!showSplash} />
    </div>
  );
}
