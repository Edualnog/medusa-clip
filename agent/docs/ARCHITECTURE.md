# Medusa Cut — Arquitetura do MOTOR

> Motor de cortes (`medusacut`). Roda **100% local** — empacotado como binario dentro
> do app desktop **Medusa Clip** (Electron). Sem SaaS, sem processamento na nuvem.
> Entrypoints: `cli.py` (CLI), `local.py` (chamado pelo Electron, progresso em JSON).

## Principio

O produto e o **motor**; o esforco vai pra **qualidade E velocidade**. Local-first:
nenhum video sai do PC do usuario (so a analise de IA, pela chave dele). Em 2026-06-21
o pipeline foi muito simplificado/acelerado (~25min -> ~3-5min num video de 12min).

## Fluxo

```
arquivo local OU link
  → ingest (yt-dlp: baixa h264 <=1080p — evita AV1 1440p, lento de decodar)
  → preprocess (ffmpeg: audio, fps, dimensoes)
  → transcribe (MLX/GPU no Mac · CUDA/GPU no Win · faster-whisper/CPU; base+greedy)
  → sinais (audio_energy + motion) → fusao → candidatos (+ propostas do roteiro/LLM)
  → analise viral 2 etapas EM PARALELO: triagem barata (texto) → juiz forte (ve keyframes)
     → GANCHO + score de viralizacao 0-100                [define o nivel Opus Clip]
  → deteccao de facecam (YuNet, so cantos superiores) -> escolhe 1 de 2 layouts
  → render 9:16 EM PARALELO + legenda karaoke + HOOK (manchete ~5s) no MESMO encode
  → <out>/clip_NN.mp4 + <out>/manifest.json
```

## Responsabilidade por modulo

| Modulo | Faz |
|---|---|
| `ingest/youtube` | baixa o video (formato h264 <=1080p) |
| `transcribe/whisper` | texto + timestamps por palavra; backend MLX/CUDA/CPU (auto+fallback) |
| `signals` | audio_energy + motion → trilhas de score no tempo |
| `signals/fusion` | combina trilhas ponderadas → candidatos |
| `hooks` | triagem (texto) + juiz multimodal: gancho + score 0-100 (chamadas paralelas) |
| `frames` | extrai keyframes p/ o juiz VER a cena |
| `reframe/compose` | **2 layouts**: facecam-terco-superior+blur · gameplay tela cheia+blur |
| `reframe/facecam` | detecta facecam (YuNet) so nos cantos superiores |
| `caption/karaoke` | legenda karaoke + hook → faixa alpha, fundida no encode do render |
| `render/ffmpeg` | (legado) plano de crop dinamico — nao usado pelos 2 layouts atuais |
| `pipeline` | orquestra tudo; render paralelo; escreve out/ + manifest |

## Por que da pra chegar no nivel Opus Clip

Qualidade de short = gancho (retencao nos 2s) + legenda + enquadramento. Os tres
sao questao de craft (prompt, template, composicao), nao de infra. Em uso pessoal
da pra usar o melhor LLM sem pensar em custo por clipe — vantagem direta no gancho.

## Transcricao — backends (`transcribe/whisper.py`)

Auto, com fallback seguro (se um falhar, cai pro proximo sem derrubar a geracao):
- **Mac Apple Silicon** → **MLX** (`mlx-whisper`, GPU/Neural Engine, ~3x). So-Mac.
- **Win/Linux** → **faster-whisper**: GPU **NVIDIA/CUDA** se houver libs (cuBLAS/cuDNN),
  senao **CPU** (int8).
- Override: `MEDUSA_WHISPER_BACKEND` (mlx|faster|auto), `MEDUSA_WHISPER_DEVICE` (cuda|cpu),
  `WHISPER_MODEL` (default base).

## Knobs de performance

- `MEDUSA_LLM_WORKERS` (default 4): paralelismo das chamadas de IA (triagem+juiz).
- `MEDUSA_RENDER_WORKERS`: paralelismo do render dos cortes.
- Layout fundido (legenda+hook no mesmo encode) e h264<=1080p no download sao os
  ganhos estruturais — ver [[../../CLAUDE.md]] "Onde mora a qualidade".

## Futuro opcional

- GPU no Windows "de fabrica" (entregar cuDNN) — pendente de hardware NVIDIA p/ testar.
- Presets de legenda por estilo de canal.
