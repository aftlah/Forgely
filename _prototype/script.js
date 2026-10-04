// Simulasi lokal: memakai template contoh, tidak memanggil AI.
const PRESETS = {
  clan: {
    text: "Klan game kompetitif, sekitar 200 member. Ada tim inti, recruit, dan kami rutin scrim tiap Sabtu.",
    title: "klan-kompetitif",
    roles: [["Pemimpin", "#e5481f"], ["Tim Inti", "#e0a526"], ["Recruit", "#7fb069"], ["Tamu", "#8a8272"]],
    cats: [
      ["Info", [["aturan", 0, 1], ["pengumuman", 0, 1], ["jadwal-scrim", 0, 1]]],
      ["Komunitas", [["ngobrol", 0], ["clip-terbaik", 0], ["cari-tim", 0]]],
      ["Tim Inti", [["strategi", 0, 1], ["review-vod", 0, 1], ["Ruang Scrim", 1, 1]]],
      ["Recruit", [["tryout", 0], ["Ruang Tryout", 1]]]
    ]
  },
  study: {
    text: "Komunitas belajar pemrograman untuk pemula. Ada mentor, sesi tanya jawab mingguan, dan channel per bahasa.",
    title: "belajar-ngoding",
    roles: [["Admin", "#e5481f"], ["Mentor", "#e0a526"], ["Pelajar", "#7fb069"], ["Alumni", "#8a8272"]],
    cats: [
      ["Mulai di sini", [["selamat-datang", 0, 1], ["aturan", 0, 1], ["perkenalan", 0]]],
      ["Belajar", [["python", 0], ["javascript", 0], ["tanya-jawab", 0], ["Ruang Belajar Bareng", 1]]],
      ["Mentor", [["koordinasi-mentor", 0, 1], ["jadwal-sesi", 0, 1]]],
      ["Santai", [["showcase-proyek", 0], ["lowongan", 0], ["Nongkrong", 1]]]
    ]
  },
  studio: {
    text: "Studio game indie, tim 12 orang plus komunitas pemain. Perlu channel dev internal dan area feedback publik.",
    title: "studio-indie",
    roles: [["Founder", "#e5481f"], ["Dev", "#e0a526"], ["Playtester", "#7fb069"], ["Pemain", "#8a8272"]],
    cats: [
      ["Publik", [["pengumuman", 0, 1], ["devlog", 0, 1], ["ngobrol", 0]]],
      ["Feedback", [["laporan-bug", 0], ["saran-fitur", 0], ["sesi-playtest", 0]]],
      ["Internal Dev", [["standup", 0, 1], ["art-dump", 0, 1], ["build-status", 0, 1], ["Ruang Rapat", 1, 1]]]
    ]
  }
};

const $ = (id) => document.getElementById(id);
const promptEl = $("prompt"), tree = $("tree"), empty = $("tree-empty");
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
let timer = null;

function slug(text) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
  return words.slice(0, 2).join("-") || "server-baru";
}

function pickPreset(text) {
  const t = text.toLowerCase();
  for (const k in PRESETS) if (PRESETS[k].text === text) return PRESETS[k];
  if (/belajar|mentor|kelas|kursus|study/.test(t)) return { ...PRESETS.study, title: slug(text) };
  if (/studio|indie|dev|rilis|playtest/.test(t)) return { ...PRESETS.studio, title: slug(text) };
  return { ...PRESETS.clan, title: slug(text) };
}

function buildItems(p) {
  const items = [];
  const roles = p.roles
    .map(([n, c]) => `<span class="role" style="color:${c}">${n}</span>`)
    .join("");
  items.push(`<li class="roles">${roles}</li>`);
  for (const [cat, chans] of p.cats) {
    items.push(`<li class="cat">${cat}</li>`);
    for (const [name, voice, locked] of chans) {
      const lock = locked ? '<span class="lock">terkunci</span>' : "";
      items.push(`<li class="ch${voice ? " vc" : ""}">${name}${lock}</li>`);
    }
  }
  return items;
}

function forge() {
  clearInterval(timer);
  const preset = pickPreset(promptEl.value.trim());
  const items = buildItems(preset);
  tree.innerHTML = "";
  empty.hidden = true;
  $("tree-title").textContent = preset.title;
  $("tree-count").textContent = "0 item";

  let i = 0;
  const step = () => {
    tree.insertAdjacentHTML("beforeend", items[i]);
    i++;
    $("tree-count").textContent = `${tree.querySelectorAll(".ch, .cat, .roles").length} item`;
    if (i >= items.length) clearInterval(timer);
  };
  if (reduce) { while (i < items.length) step(); return; }
  step();
  timer = setInterval(step, 110);
}

document.querySelectorAll(".chips button").forEach((b) =>
  b.addEventListener("click", () => {
    promptEl.value = PRESETS[b.dataset.preset].text;
    document.querySelectorAll(".chips button").forEach((x) => x.classList.toggle("on", x === b));
    forge();
  })
);
$("forge-btn").addEventListener("click", forge);
$("year").textContent = new Date().getFullYear();
