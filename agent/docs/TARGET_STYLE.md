# Estilo-alvo dos cortes — referência canônica

> Este é **o modelo principal** que o motor deve reproduzir. Quando um default,
> layout ou estilo de legenda for alterado, ele tem que continuar batendo com esta
> referência. Não é treino de ML (o motor é heurística + LLM por prompt) — é a
> **especificação visual-alvo** que guia defaults e prompts.

## Referência

![modelo 1](assets/target_style_model1.jpg)

`assets/target_style_model1.jpg` (1080×2037, print do dono). Definida como referência
principal em 2026-06-19. Vertical 9:16, gameplay de FPS tático com facecam.

## Anatomia do corte-alvo

| Elemento | Na referência (model 1) | Default atual no motor | Bate? |
|---|---|---|---|
| Canvas | vertical 9:16 | `1080×1920` (`compose.TARGET_W/H`, `karaoke.W/H`) | ✅ |
| Layout | facecam no topo, gameplay embaixo | `facecam_top_gameplay_bottom` (Layout A) | ✅ |
| Altura do facecam | faixa superior ≈ 1/3 da altura | `PANEL_H = 640` (terço superior) | ✅ |
| Facecam | rosto centralizado, laterais desfocadas | FIT-centralizado no painel + blur nas laterais | ✅ |
| Gameplay | preenche o resto, sem barras | `scale=...:increase` + crop (cover) | ✅ |
| Posição da legenda | terço inferior (~75–80% da altura) | `caption_y = 0.80` / `Y_CENTER_FRAC = 0.80` | ✅ |
| Hook (manchete) | título grande no início | `build_hook_track`: negrito na divisa abaixo da facecam, primeiros ~5s | ✅ (novo) |
| Estilo da legenda | sentence-case, branca, em caixa preta sólida | CAIXA ALTA, Impact, contorno preto, palavra ativa amarela (karaokê) | ➖ **divergência intencional** (ver abaixo) |

> **2 layouts só** (2026-06-21): além do A (acima), quando NÃO há facecam usa-se o
> Layout B `gameplay_blur` (gameplay tela cheia + fundo desfocado). Removidos os
> layouts antigos (scene-aware/dynamic/optical-flow).

## Escopo da referência: layout, NÃO legenda

**Decidido (2026-06-19):** a model 1 é a referência de **layout/enquadramento** —
facecam no topo, gameplay embaixo, posição da legenda. O **estilo** da legenda em si
NÃO segue a model 1.

A legenda da model 1 é "limpa" (caixa-baixa, branco, em caixa preta sólida). O motor,
de propósito, faz o estilo **karaokê gamer** que o dono pediu em outro print
(`caption/karaoke.py`): CAIXA ALTA, fonte Impact pesada, contorno preto grosso, e a
**palavra ativa em amarelo** (`COLOR_ACTIVE = (255,209,26)`), palavra a palavra. Isso
é intencional e **fica como está** — não tratar como bug nem "consertar" pra bater com
a model 1.

## Onde isto vive no código

- Layout / facecam: `src/medusacut/reframe/compose.py` (`render_facecam_layout`, `PANEL_H`,
  `render_blur_fit`). Render funde legenda+hook no mesmo encode (`_finalize`).
- Resolução do layout (só 2): `pipeline._resolve_layout` (A `facecam_top_gameplay_bottom` / B `gameplay_blur`).
- Legenda + hook: `src/medusacut/caption/karaoke.py` (fonte, cor, stroke, `Y_CENTER_FRAC`,
  `build_hook_track`/`render_hook_image`).
- Detecção de facecam (ativa o Layout A): `reframe/facecam.py` — YuNet **só nos cantos
  superiores** (`_in_top_corner`). O fallback VLM foi removido.
