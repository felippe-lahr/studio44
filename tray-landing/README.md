# Landing Page Premium — Tray (Studio44)

Arquivo: **`studio44-premium.html`** — página completa, autossuficiente (HTML + CSS + JS inline).
Feita para colar no editor de HTML das landing pages internas da Tray.

## Como publicar na Tray

1. Abra o recurso de **landing page / HTML personalizado** da Tray.
2. Copie **todo** o conteúdo de `studio44-premium.html` e cole no editor.
   - O CSS está inline e todo escopado sob a classe `.s44`, então não conflita com o tema da loja.
   - Se o editor da Tray aceitar apenas um *fragmento* (sem `<head>`), cole a partir da tag `<div class="s44">` até o final, e mova o bloco `<style>` e os `<link>` das fontes para o campo de "cabeçalho/head" do editor, se houver.

## O que personalizar antes de publicar

Substitua os textos-placeholder (busque no arquivo):

| Buscar | Trocar por |
|---|---|
| `5599999999999` | número real do WhatsApp (formato `55` + DDD + número), aparece 4× |
| `Rua Exemplo, 123 — Cidade/UF · CNPJ 00.000.000/0001-00` | endereço e CNPJ reais |
| `+120` / `120+` | nº real de projetos entregues (2 lugares) |
| `desde 2013` / `12+` anos | ajuste o ano de fundação / tempo de casa |
| Descrições dos serviços | ajuste conforme o portfólio atual |

## Notas técnicas

- **Fontes:** Fraunces (títulos), Manrope (texto), JetBrains Mono (rótulos/código), via Google Fonts.
  Para 100% offline, remova os `<link>` das fontes — o fallback é serifada/sans/mono do sistema.
- **Animações:** herói com *code-rain* em canvas, reveals no scroll, nav que some/reaparece.
  Tudo respeita `prefers-reduced-motion`.
- **Responsivo:** layout fluido (clamp) com breakpoints em 900/820/640/560px.
- **Acessibilidade:** foco visível, `aria-label` nos ícones/links, contraste alto sobre grafite.
