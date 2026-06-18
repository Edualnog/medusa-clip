// UI do app (externo — CSP nao permite inline).
const $ = (id) => document.getElementById(id);
let mode = "file";
let filePath = null;

// ---------- navegacao (sidebar) ----------
document.querySelectorAll(".nav").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll(".nav").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    const v = b.dataset.view;
    ["inicio", "biblioteca", "apis"].forEach((id) =>
      $("view-" + id).classList.toggle("hidden", id !== v),
    );
    if (v === "biblioteca") loadLibrary();
    if (v === "apis") { loadStats(); if ($("key").value.trim()) checkKey(); }
  };
});

// ---------- abas (arquivo / link) ----------
function refreshGen() {
  const ok = mode === "file" ? !!filePath : $("linkInput").value.trim().length > 6;
  $("gen").disabled = !ok;
}
document.querySelectorAll(".tab").forEach((t) => {
  t.onclick = () => {
    document.querySelectorAll(".tab").forEach((x) => x.classList.remove("active"));
    t.classList.add("active");
    mode = t.dataset.mode;
    $("srcFile").classList.toggle("hidden", mode !== "file");
    $("srcLink").classList.toggle("hidden", mode !== "link");
    refreshGen();
  };
});
$("srcFile").onclick = async () => {
  const p = await window.api.pickFile();
  if (p) {
    filePath = p;
    $("fileName").textContent = p.split("/").pop();
    $("fileName").classList.remove("ph");
  }
  refreshGen();
};
$("linkInput").oninput = refreshGen;
$("clips").oninput = (e) => ($("clipsN").textContent = e.target.value);

// ---------- chave + custo ----------
window.api.getKey().then((k) => { if (k) $("key").value = k; });

async function checkKey() {
  const key = $("key").value.trim();
  const el = $("keyStatus");
  if (!key) { el.textContent = ""; return; }
  el.style.color = "var(--muted)";
  el.textContent = "Verificando…";
  const r = await window.api.validateKey(key);
  if (r.valid) {
    el.style.color = "var(--accent)";
    let extra = "";
    if (r.limitRemaining != null) extra = " · resta $" + Number(r.limitRemaining).toFixed(2);
    else if (r.usage != null) extra = " · usado $" + Number(r.usage).toFixed(4);
    el.textContent = "✓ Chave válida" + (r.freeTier ? " (free tier)" : "") + extra;
  } else {
    el.style.color = "#ff8a8a";
    el.textContent = "✗ " + (r.error || "Chave inválida.");
  }
}
$("saveKey").onclick = async () => {
  await window.api.setKey($("key").value.trim());
  await checkKey();
};

async function loadStats() {
  const s = await window.api.getStats();
  $("costTotal").textContent = "$" + Number(s.totalCost || 0).toFixed(4);
  $("costTokens").textContent = Number(s.totalTokens || 0).toLocaleString("pt-BR");
}

// ---------- gerar ----------
$("gen").onclick = () => {
  const key = $("key").value.trim();
  if (!key) {
    showError('Cole a sua chave da OpenRouter na aba "CHAVES API" primeiro.');
    return;
  }
  window.api.setKey(key);
  const [minLen, maxLen] = $("dur").value.split(",").map(Number);
  const source = mode === "file" ? filePath : $("linkInput").value.trim();
  startUI();
  window.api.generate({
    source, key,
    clips: Number($("clips").value),
    minLen, maxLen,
    layout: $("layout").value,
    facecam: $("facecam").value,
    captions: $("captions").checked,
  });
};

let lastWarning = "";
function startUI() {
  lastWarning = "";
  $("prog").classList.add("show");
  $("gen").disabled = true;
  $("pstate").textContent = "PROCESSANDO";
  $("result").innerHTML = "";
  setProg(2, "Iniciando…");
}
function setProg(pct, stage) {
  $("pfill").style.width = pct + "%";
  $("ppct").textContent = Math.round(pct) + "%";
  if (stage) $("pstage").textContent = stage;
}
function showError(text) {
  $("prog").classList.add("show");
  $("pstate").textContent = "ERRO";
  $("result").innerHTML = '<div class="msg err">⚠ ' + text + "</div>";
  $("gen").disabled = false;
  refreshGen();
}

window.api.onProgress((m) => setProg(Math.max(2, m.frac * 100), m.stage));
window.api.onWarning((m) => (lastWarning = m.message));
window.api.onError((m) => showError(m.message + (m.detail ? " — " + m.detail : "")));
window.api.onDone((m) => {
  setProg(100, "Pronto!");
  $("pstate").textContent = "PRONTO";
  let html = "";
  if (lastWarning) html += '<div class="msg warn">⚠ ' + lastWarning + "</div>";
  const cost = m.cost || {};
  const cl = (m.clips || []).length;
  html += '<p class="hint" style="margin-top:12px">' + cl + " corte(s) salvos · custo desta geração: $" +
    Number(cost.cost_usd || 0).toFixed(4) + " · " + Number(cost.total_tokens || 0).toLocaleString("pt-BR") +
    " tokens.</p>";
  html += '<div class="row"><button class="btn2" id="goLib">VER NA BIBLIOTECA</button>' +
    '<button class="btn2" id="openOut">ABRIR PASTA</button></div>';
  $("result").innerHTML = html;
  if (m.totals) {
    $("costTotal").textContent = "$" + Number(m.totals.totalCost || 0).toFixed(4);
    $("costTokens").textContent = Number(m.totals.totalTokens || 0).toLocaleString("pt-BR");
  }
  $("openOut").onclick = () => window.api.openFolder(m.out);
  $("goLib").onclick = () => document.querySelector('.nav[data-view="biblioteca"]').click();
  $("gen").disabled = false;
  refreshGen();
});

// ---------- biblioteca ----------
async function loadLibrary() {
  const clips = await window.api.listClips();
  const lib = $("lib");
  if (!clips.length) {
    lib.innerHTML = '<div class="empty">Nenhum corte ainda — gere o primeiro na aba INÍCIO.</div>';
    return;
  }
  lib.innerHTML = '<div class="grid">' + clips.map(clipCard).join("") + "</div>";
  // preview no hover
  lib.querySelectorAll("video").forEach((v) => {
    const wrap = v.closest(".clip-wrap");
    wrap.onmouseenter = () => { if (v.paused && v.muted) v.play().catch(() => {}); };
    wrap.onmouseleave = () => { if (v.muted) { v.pause(); try { v.currentTime = 0.4; } catch {} } };
  });
}
function clipCard(c) {
  const score = c.virality_score != null
    ? '<span class="clip-viral">★ ' + Math.round(c.virality_score) + "</span>" : "";
  const dur = c.duration_s != null ? '<span class="clip-dur">' + Math.round(c.duration_s) + "s</span>" : "";
  const hook = (c.hook || "").trim()
    ? '<div class="clip-hook">' + escapeHtml(c.hook) + "</div>"
    : '<div class="clip-hook dim">' + escapeHtml(c.file) + "</div>";
  return (
    '<div class="clip box"><div class="clip-wrap">' +
    '<video src="' + c.url + '#t=0.4" muted loop playsinline controls preload="metadata"></video>' +
    '<div class="clip-badges">' + score + dur + "</div></div>" + hook + "</div>"
  );
}
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
}

$("refresh").onclick = loadLibrary;
$("openLib").onclick = () => window.api.openFolder(null);
