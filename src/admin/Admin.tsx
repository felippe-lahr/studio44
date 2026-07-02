import { useEffect, useState } from 'react';
import {
  DEFAULT_CONTENT,
  GOOGLE_FONTS,
  mergeContent,
  type Content,
  type PosH,
  type PosV,
  type TextField,
} from '../content';

const TOKEN_KEY = 's44_token';

/* ------------------------------------------------------------------ *
 * Campos reutilizáveis
 * ------------------------------------------------------------------ */
function ImageField({
  label,
  value,
  onChange,
  token,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  token: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function handleFile(file: File) {
    setBusy(true);
    setErr('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!r.ok) throw new Error('falha no upload');
      const { url } = await r.json();
      onChange(url);
    } catch (e) {
      setErr(String(e instanceof Error ? e.message : e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-semibold text-neutral-700 mb-1">{label}</label>
      <div className="flex items-center gap-3">
        <div className="w-24 h-16 rounded bg-neutral-100 border border-neutral-200 overflow-hidden flex items-center justify-center shrink-0">
          {value ? (
            <img src={value} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-[10px] text-neutral-400">sem imagem</span>
          )}
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="URL da imagem ou /caminho"
            className="w-full text-sm border border-neutral-300 rounded px-2 py-1.5 mb-1"
          />
          <label className="inline-block text-xs font-medium text-indigo-600 cursor-pointer">
            {busy ? 'Enviando…' : 'Enviar arquivo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </label>
          {err && <span className="ml-2 text-xs text-red-600">{err}</span>}
        </div>
      </div>
    </div>
  );
}

function TextEditor({
  label,
  value,
  onChange,
  withPos = true,
}: {
  label: string;
  value: TextField;
  onChange: (v: TextField) => void;
  withPos?: boolean;
}) {
  const set = (patch: Partial<TextField>) => onChange({ ...value, ...patch });
  const pos = value.pos ?? { h: 'left', v: 'top' };

  return (
    <div className="mb-4 p-3 rounded-lg border border-neutral-200 bg-neutral-50">
      <label className="block text-sm font-semibold text-neutral-700 mb-1">{label}</label>
      <textarea
        value={value.text}
        onChange={(e) => set({ text: e.target.value })}
        rows={2}
        className="w-full text-sm border border-neutral-300 rounded px-2 py-1.5 mb-2"
        placeholder="Use Enter para quebrar linha"
      />
      <div className="flex flex-wrap gap-3 text-xs">
        <label className="flex items-center gap-1">
          Tamanho
          <input
            type="text"
            value={value.size ?? ''}
            onChange={(e) => set({ size: e.target.value || undefined })}
            placeholder="auto"
            className="w-20 border border-neutral-300 rounded px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1">
          Peso
          <select
            value={value.weight ?? ''}
            onChange={(e) => set({ weight: e.target.value ? Number(e.target.value) : undefined })}
            className="border border-neutral-300 rounded px-1.5 py-1"
          >
            <option value="">auto</option>
            <option value="400">Normal</option>
            <option value="500">Médio</option>
            <option value="600">Semibold</option>
            <option value="700">Bold</option>
            <option value="800">Extrabold</option>
          </select>
        </label>
        <label className="flex items-center gap-1">
          Altura da linha
          <input
            type="text"
            value={value.lh ?? ''}
            onChange={(e) => set({ lh: e.target.value || undefined })}
            placeholder="auto"
            className="w-16 border border-neutral-300 rounded px-1.5 py-1"
          />
        </label>
        <label className="flex items-center gap-1">
          Cor
          <input
            type="color"
            value={value.color ?? '#000000'}
            onChange={(e) => set({ color: e.target.value })}
            className="w-8 h-7 border border-neutral-300 rounded p-0.5 bg-white"
          />
          {value.color && (
            <button
              type="button"
              onClick={() => set({ color: undefined })}
              className="text-[10px] text-neutral-500 underline"
            >
              limpar
            </button>
          )}
        </label>
        {withPos && (
          <>
            <label className="flex items-center gap-1">
              Horizontal
              <select
                value={pos.h}
                onChange={(e) => set({ pos: { ...pos, h: e.target.value as PosH } })}
                className="border border-neutral-300 rounded px-1.5 py-1"
              >
                <option value="left">Esquerda</option>
                <option value="center">Centro</option>
                <option value="right">Direita</option>
              </select>
            </label>
            <label className="flex items-center gap-1">
              Vertical
              <select
                value={pos.v}
                onChange={(e) => set({ pos: { ...pos, v: e.target.value as PosV } })}
                className="border border-neutral-300 rounded px-1.5 py-1"
              >
                <option value="top">Topo</option>
                <option value="center">Centro</option>
                <option value="bottom">Base</option>
              </select>
            </label>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-neutral-900 mb-3 pb-1 border-b border-neutral-200">
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Painel
 * ------------------------------------------------------------------ */
export default function Admin() {
  const [token, setToken] = useState<string>(() => localStorage.getItem(TOKEN_KEY) || '');
  const [password, setPassword] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [content, setContent] = useState<Content | null>(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch('/api/content')
      .then((r) => r.json())
      .then((data) => setContent(mergeContent(data)))
      .catch(() => setContent(DEFAULT_CONTENT));
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginErr('');
    try {
      const r = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) throw new Error('Senha inválida');
      const { token } = await r.json();
      localStorage.setItem(TOKEN_KEY, token);
      setToken(token);
    } catch (e) {
      setLoginErr(String(e instanceof Error ? e.message : e));
    }
  }

  async function save() {
    if (!content) return;
    setStatus('Salvando…');
    try {
      const r = await fetch('/api/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(content),
      });
      if (r.status === 401) {
        setStatus('Sessão expirada — faça login novamente.');
        localStorage.removeItem(TOKEN_KEY);
        setToken('');
        return;
      }
      if (!r.ok) throw new Error('falha');
      setStatus('Salvo! Recarregue o site para ver.');
    } catch {
      setStatus('Erro ao salvar.');
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-100 p-4">
        <form onSubmit={login} className="bg-white rounded-xl shadow p-6 w-full max-w-sm">
          <h1 className="text-xl font-bold mb-1">Studio44 — Admin</h1>
          <p className="text-sm text-neutral-500 mb-4">Editor de conteúdo</p>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            className="w-full border border-neutral-300 rounded px-3 py-2 mb-3"
          />
          {loginErr && <p className="text-sm text-red-600 mb-3">{loginErr}</p>}
          <button
            type="submit"
            className="w-full bg-neutral-900 text-white rounded px-3 py-2 font-semibold hover:bg-neutral-700"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  if (!content) {
    return <div className="min-h-screen flex items-center justify-center">Carregando…</div>;
  }

  const c = content;
  const up = (patch: Partial<Content>) => setContent({ ...c, ...patch });

  return (
    <div className="min-h-screen bg-neutral-100">
      <header className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <h1 className="font-bold">Studio44 — Editor de Conteúdo</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-neutral-500">{status}</span>
          <a href="/" className="text-sm text-neutral-600 hover:underline">
            Ver site
          </a>
          <button
            onClick={save}
            className="bg-indigo-600 text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-indigo-500"
          >
            Salvar
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 md:p-6">
        <Section title="Geral">
          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            Fonte do projeto (Google Fonts)
          </label>
          <select
            value={c.font ?? ''}
            onChange={(e) => up({ font: e.target.value || undefined })}
            className="w-full text-sm border border-neutral-300 rounded px-2 py-1.5 mb-4"
          >
            <option value="">Open Sauce One (padrão)</option>
            {GOOGLE_FONTS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <ImageField
            label="Logo"
            value={c.logo}
            onChange={(v) => up({ logo: v })}
            token={token}
          />

          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            Transparência do cabeçalho — {c.headerOpacity ?? 80}% opaco
          </label>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-neutral-500">transparente</span>
            <input
              type="range"
              min={0}
              max={100}
              value={c.headerOpacity ?? 80}
              onChange={(e) => up({ headerOpacity: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-xs text-neutral-500">sólido</span>
          </div>

          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            Posição da seta de rolagem
          </label>
          <select
            value={c.arrowPos ?? 'center'}
            onChange={(e) => up({ arrowPos: e.target.value as PosH })}
            className="w-full text-sm border border-neutral-300 rounded px-2 py-1.5 mb-4"
          >
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>

          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            Cantos dos cards (border-radius) — {c.cardRadius ?? 16}px
          </label>
          <input
            type="range"
            min={0}
            max={40}
            value={c.cardRadius ?? 16}
            onChange={(e) => up({ cardRadius: Number(e.target.value) })}
            className="w-full mb-4"
          />

          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            Espaçamento entre os cards — {c.cardGap ?? 8}px
          </label>
          <input
            type="range"
            min={0}
            max={32}
            value={c.cardGap ?? 8}
            onChange={(e) => up({ cardGap: Number(e.target.value) })}
            className="w-full mb-4"
          />

          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            Link de contato (WhatsApp / e-mail)
          </label>
          <input
            type="text"
            value={c.contactHref}
            onChange={(e) => up({ contactHref: e.target.value })}
            className="w-full text-sm border border-neutral-300 rounded px-2 py-1.5"
          />
        </Section>

        <Section title="Hero">
          <TextEditor
            label="Frase de topo"
            value={c.hero.paragraph}
            onChange={(v) => up({ hero: { ...c.hero, paragraph: v } })}
          />
          <TextEditor
            label="Título principal"
            value={c.hero.headline}
            onChange={(v) => up({ hero: { ...c.hero, headline: v } })}
          />
        </Section>

        <Section title="Seção 2 — Serviços">
          <ImageField
            label="Imagem de fundo"
            value={c.section2.image}
            onChange={(v) => up({ section2: { ...c.section2, image: v } })}
            token={token}
          />
          <TextEditor
            label="Título"
            value={c.section2.title}
            onChange={(v) => up({ section2: { ...c.section2, title: v } })}
          />
          <TextEditor
            label="Subtítulo"
            value={c.section2.subtitle}
            onChange={(v) => up({ section2: { ...c.section2, subtitle: v } })}
          />
          <TextEditor
            label="Soluções Sob Medida"
            value={c.section2.solutions}
            onChange={(v) => up({ section2: { ...c.section2, solutions: v } })}
          />
          <TextEditor
            label="Chamada (CTA)"
            value={c.section2.ctaText}
            onChange={(v) => up({ section2: { ...c.section2, ctaText: v } })}
            withPos={false}
          />
          <label className="block text-sm font-semibold text-neutral-700 mb-1">Botão do CTA</label>
          <input
            type="text"
            value={c.section2.ctaButton}
            onChange={(e) => up({ section2: { ...c.section2, ctaButton: e.target.value } })}
            className="w-full text-sm border border-neutral-300 rounded px-2 py-1.5 mb-4"
          />
          <label className="block text-sm font-semibold text-neutral-700 mb-1">
            Serviços (nome — use Enter p/ quebrar linha — e número)
          </label>
          {c.section2.services.map((svc, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <textarea
                value={svc.name}
                rows={2}
                onChange={(e) => {
                  const services = [...c.section2.services];
                  services[i] = { ...svc, name: e.target.value };
                  up({ section2: { ...c.section2, services } });
                }}
                className="flex-1 text-sm border border-neutral-300 rounded px-2 py-1.5"
              />
              <input
                type="text"
                value={svc.num ?? ''}
                placeholder="nº"
                onChange={(e) => {
                  const services = [...c.section2.services];
                  services[i] = { ...svc, num: e.target.value || null };
                  up({ section2: { ...c.section2, services } });
                }}
                className="w-16 text-sm border border-neutral-300 rounded px-2 py-1.5"
              />
            </div>
          ))}
        </Section>

        <Section title="Seção 3 — Soluções com IA">
          <TextEditor
            label="Título"
            value={c.section3.title}
            onChange={(v) => up({ section3: { ...c.section3, title: v } })}
            withPos={false}
          />
          <TextEditor
            label="Subtítulo"
            value={c.section3.subtitle}
            onChange={(v) => up({ section3: { ...c.section3, subtitle: v } })}
            withPos={false}
          />
          <ImageField
            label="Imagem 1 (app)"
            value={c.section3.img1}
            onChange={(v) => up({ section3: { ...c.section3, img1: v } })}
            token={token}
          />
          <ImageField
            label="Imagem 2 (IA)"
            value={c.section3.img2}
            onChange={(v) => up({ section3: { ...c.section3, img2: v } })}
            token={token}
          />
          <ImageField
            label="Imagem da equipe (coluna direita)"
            value={c.section3.bg}
            onChange={(v) => up({ section3: { ...c.section3, bg: v } })}
            token={token}
          />
        </Section>
      </main>
    </div>
  );
}
