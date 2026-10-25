// Pisces: Space Journey. (c) 2024 An Nguyen. Licensed under the MIT License.
// Voyage Recap: the end of run screen that replaces GAME OVER. It shows the
// score, the sigils picked, what was defeated, damage by source, the battle
// timeline and a share card, all read from window._matchStats; it never
// touches gameplay state. Opened by _openVoyageRecap from main.js.
(function () {
'use strict';

const I18N = {
  en: {
    rcAstralSub: "Flight Log",
    rcTitle: "Voyage's End",
    rcScore: "Total Score",
    rcScoreSub: "Earned over the whole flight",
    rcWave: "Wave Reached",
    rcWaveSub: "The furthest wave you reached",
    rcTime: "Flight Time",
    rcTimeSub: "Time spent in battle",
    rcEpitaphPrefix: "Shot down by",
    rcQuitLine: "Left the voyage mid flight",
    rcLivesLostBadge: "Lives lost: {lost}",
    rcSigilTitle: "Sigils Chosen",
    rcSigilSub: "In the order you chose them",
    rcAtWave: "Launch",
    rcWaveNum: "Wave {w}",
    rcKillsTitle: "Enemies Defeated",
    rcKillsSub: "Most defeated enemies",
    rcKillsTotalLabel: "Total defeated",
    rcAnalysisTitle: "Match Statistics",
    rcAnalysisSub: "Damage by source and lives lost",
    rcTabAlly: "Damage Dealt",
    rcTabEnemy: "Damage Taken",
    rcTabLives: "Lives Lost",
    rcUnitLives: "x",
    rcDonutTotal: "TOTAL",
    rcNameLabel: "Callsign",
    rcEmptySigils: "No sigil was chosen on this voyage",
    rcEmptyKills: "No enemy fell this time",
    rcEmptyStats: "Nothing recorded here yet",
    rcEmptyTimeline: "The voyage was too short to chart",
    rcTimelineTitle: "Battle Timeline",
    rcTimelineSub: "Every 5 seconds, with a 30 second moving average",
    rcLegOutput: "Damage dealt (5s)",
    rcLegMa: "Moving average (30s)",
    rcLegTaken: "Damage taken",
    rcLegWave: "Wave and boss marks",
    rcPeakTag: "Peak: {v} ({t})",
    rcDangerTag: "Most dangerous: {v} ({t})",
    rcSumDps: "Damage per second",
    rcSumPeak: "Peak damage (5s)",
    rcSumMvp: "Top source",
    rcSumTop3: "Top 3 sources share",
    rcBtnPlayAgain: "Play Again",
    rcBtnMainMenu: "Main Menu",
    rcBtnCreateImg: "Create Image",
    rcModalTitle: "Create Share Image",
    rcFmtPortrait: "Portrait 1080x1350 (Story, Feed)",
    rcFmtLandscape: "Landscape 1200x630 (Link, Post)",
    rcBtnDownload: "Download (PNG)",
    rcBtnShare: "Share",
    rcShareSaved: "Image downloaded",
    rcSaveStarted: "Downloading. If it does not show up, press and hold the image to save it",
    rcSaveHint: "Press and hold the image to save it",
    rcSaveViewHint: "Press and hold the image, then choose Save to Photos",
    rcBtnDone: "Done",
    rcSaveFailed: "Could not create the image, please try again"
  },
  vi: {
    rcAstralSub: "Nhật Ký Chuyến Bay",
    rcTitle: "Chuyến Bay Kết Thúc",
    rcScore: "Tổng Điểm",
    rcScoreSub: "Điểm tích lũy cả chuyến bay",
    rcWave: "Wave Đạt Tới",
    rcWaveSub: "Wave xa nhất đã chạm tới",
    rcTime: "Thời Gian Bay",
    rcTimeSub: "Thời gian chiến đấu",
    rcEpitaphPrefix: "Bị hạ bởi",
    rcQuitLine: "Rời chuyến bay giữa chừng",
    rcLivesLostBadge: "Mất {lost} mạng",
    rcSigilTitle: "Các Sigil Đã Chọn",
    rcSigilSub: "Theo thứ tự đã chọn",
    rcAtWave: "Khởi hành",
    rcWaveNum: "Wave {w}",
    rcKillsTitle: "Hạ Gục",
    rcKillsSub: "Những kẻ địch bị hạ nhiều nhất",
    rcKillsTotalLabel: "Tổng hạ gục",
    rcAnalysisTitle: "Thống Kê Trận Đấu",
    rcAnalysisSub: "Sát thương theo nguồn và số mạng đã mất",
    rcTabAlly: "Sát Thương Gây Ra",
    rcTabEnemy: "Sát Thương Nhận",
    rcTabLives: "Mạng Đã Mất",
    rcUnitLives: "lần",
    rcDonutTotal: "TỔNG",
    rcNameLabel: "Biệt danh",
    rcEmptySigils: "Chuyến bay này chưa chọn Sigil nào",
    rcEmptyKills: "Chưa hạ được kẻ địch nào",
    rcEmptyStats: "Chưa có số liệu ở mục này",
    rcEmptyTimeline: "Chuyến bay quá ngắn để vẽ diễn biến",
    rcTimelineTitle: "Diễn Biến Trận Đấu",
    rcTimelineSub: "Mỗi 5 giây, kèm đường trung bình 30 giây",
    rcLegOutput: "Sát thương gây ra (5s)",
    rcLegMa: "Trung bình 30 giây",
    rcLegTaken: "Sát thương nhận",
    rcLegWave: "Mốc wave và boss",
    rcPeakTag: "Đỉnh: {v} ({t})",
    rcDangerTag: "Nguy hiểm nhất: {v} ({t})",
    rcSumDps: "Sát thương mỗi giây",
    rcSumPeak: "Đỉnh sát thương (5s)",
    rcSumMvp: "Nguồn mạnh nhất",
    rcSumTop3: "3 nguồn đầu chiếm",
    rcBtnPlayAgain: "Chơi Lại",
    rcBtnMainMenu: "Về Menu",
    rcBtnCreateImg: "Tạo Ảnh",
    rcModalTitle: "Tạo Ảnh Chia Sẻ",
    rcFmtPortrait: "Dọc 1080x1350 (Story, Feed)",
    rcFmtLandscape: "Ngang 1200x630 (Link, Bài đăng)",
    rcBtnDownload: "Tải Về (PNG)",
    rcBtnShare: "Chia Sẻ",
    rcShareSaved: "Đã tải ảnh về máy",
    rcSaveStarted: "Đang tải ảnh về. Nếu chưa thấy, nhấn giữ ảnh để lưu",
    rcSaveHint: "Nhấn giữ ảnh để lưu vào máy",
    rcSaveViewHint: "Nhấn giữ ảnh rồi chọn Lưu vào Ảnh",
    rcBtnDone: "Xong",
    rcSaveFailed: "Chưa tạo được ảnh, bạn thử lại nhé"
  }
};

// Vietnamese names for every damage source and enemy label the game records,
// matching the names the Guide and the sigils already use. Enemy names and
// enemy skill names stay in English, as they do in the Guide.
const LABEL_VI = {
  "Umbral Serpent: Devour": "Dực Hỏa: Phệ Hồn",
  "Umbral Serpent: Shards": "Dực Hỏa: Mảnh Hắc Viêm",
  "Umbral Serpent: Array": "Dực Hỏa: Pháp Trận",
  "Umbral Serpent: Serpents": "Dực Hỏa: Bầy Rắn",
  "Umbral Serpent: Venom": "Dực Hỏa: Kịch Độc",
  "Player Auto-Fire": "Đạn Thường",
  "Player Charged Shot": "Bắn Sạc",
  "Sentinel Auto-Fire": "Sentinel: Đạn Thường",
  "Sentinel Special Shot": "Sentinel: Đạn Đặc Biệt",
  "Overload Laser": "Laser Quá Tải",
  "Overload Laser: Mirror": "Laser Quá Tải: Gương",
  "Skill A: Thunder Orbs": "Chiêu A: Cầu Sấm Sét",
  "Skill A: Onslaught": "Chiêu A: Cầu Sấm Sét",
  "Skill A: Scattered Projectiles": "Chiêu A: Mảnh Tán Xạ",
  "Skill A: Dimensional Rift": "Chiêu A: Khe Nứt Không Gian",
  "Dimensional Rift": "Khe Nứt Không Gian",
  "Skill D: Death Star": "Chiêu D: Tử Long Tinh",
  "Skill D: Mark & Annihilate": "Chiêu D: Đánh Dấu & Tiêu Diệt",
  "Skill D: Galactic Spaceships": "Chiêu D: Phi Thuyền Thiên Hà",
  "Skill F: Annihilation Sweep": "Chiêu F: Càn Quét Hủy Diệt",
  "Blade Arc": "Chiêu S: Nhát Chém Hình Cung",
  "Skill G: Tesla Coil": "Chiêu G: Ma Trận Tesla",
  "Chain Lightning": "Liên Hoàn Lôi",
  "Skill S: Remembrance Spirit": "Chiêu S: Tinh Linh Hoài Niệm",
  "Skill S: Photokrystos": "Chiêu S: Phōtokrystos",
  "Skill S: Spinner": "Chiêu S: Spinner",
  "Skill S: Danger Not Today": "Chiêu S: Danger Not Today",
  "Skill S: Back to Motherland": "Chiêu S: Back to Motherland",
  "Yog-Sothoth Domain": "Lãnh Địa Yog-Sothoth",
  "Soul Devourer": "Soul Devourer",
  "Soul Reaver": "Soul Reaver",
  "Vulnerability": "Vulnerability",
  "Solar Flare": "Sư Tử Hống: Thiêu Đốt",
  "Boon & Bane": "Boon & Bane",
  "Mountainfall": "Thái Sơn Áp Đỉnh",
  "Divine Fate: Shatter": "Thần Mệnh: Đá Vỡ",
  "Golden Needle": "Tú Hoa Châm",
  "Golden Needle: Reflect": "Tú Hoa Châm: Phản Chiêu",
  "Aries: Gate of Babylon": "Cổng Babylon",
  "Aries: Enuma Elish": "Enuma Elish",
  "Sigil: Yuusha Party": "Tổ Đội Dũng Giả",
  "Sigil: Mirror Laser": "Gương Quang Tuyến",
  "Sigil: Blood Arrow": "Huyết Tiễn",
  "Shadow Twin": "Ảnh Song",
  "Virgo: Forest Guardian": "Hộ Lâm",
  "Pisces: Flow Fish": "Song Ngư: Cá Luân Hồi",
  "Cancer: Riptide Surge": "Cự Giải: Triều Cường",
  "Cancer: Riptide Surge (DOT)": "Cự Giải: Triều Cường (DOT)",
  "Great Sage: Root Shockwave": "Đấu Chiến Thắng Phật: Root Shockwave",
  "Great Sage: Phantom Strike": "Đấu Chiến Thắng Phật: Phantom Strike",
  "Great Sage: Perseverance Sweep": "Đấu Chiến Thắng Phật: Perseverance Sweep",
  "Great Sage: Null Slash": "Đấu Chiến Thắng Phật: Null Slash",
  "Great Sage: Lumen Nova": "Đấu Chiến Thắng Phật: Lumen Nova",
  "Great Sage: Arc Barrier": "Đấu Chiến Thắng Phật: Arc Barrier",
  "Great Sage: Absolute Verdict": "Đấu Chiến Thắng Phật: Absolute Verdict",
  "Enemy Bullet": "Đạn Địch",
  "Enemy Chain Lightning": "Xích Sét Địch",
  "Boss Attack": "Đòn Boss",
  "Normal Enemy": "Địch Thường",
  "Debug Kill": "Debug",
  "Unknown": "Không Rõ",
  "Other": "Khác"
};

function label(raw, lang) {
  return (lang === "vi" && LABEL_VI[raw]) ? LABEL_VI[raw] : raw;
}

function t(key, lang, vars) {
  const dict = I18N[lang] || I18N.en;
  let str = dict[key] || I18N.en[key] || key;
  if (vars) for (const k in vars) str = str.replace("{" + k + "}", vars[k]);
  return str;
}

// Cinzel and Orbitron break Vietnamese marks, so Vietnamese uses Playfair
// Display, Cormorant Garamond and Be Vietnam Pro. Each set loads the first
// time its language opens the recap.
const RC_FONTS = {
  en: { title: "'Cinzel', Georgia, serif", ui: "'Orbitron', 'Segoe UI', sans-serif", italic: "'Playfair Display', Georgia, serif" },
  vi: { title: "'Playfair Display', Georgia, serif", ui: "'Be Vietnam Pro', 'Segoe UI', sans-serif", italic: "'Cormorant Garamond', Georgia, serif" }
};
const RC_FONT_URL = {
  en: "https://fonts.googleapis.com/css2?family=Orbitron:wght@600;700&family=Playfair+Display:ital@1&display=swap",
  vi: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Cormorant+Garamond:ital,wght@1,500;1,600&family=Be+Vietnam+Pro:wght@400;600;700&display=swap"
};
const RC_FONT_FACES = {
  en: ["700 16px Cinzel", "700 16px Orbitron", "italic 16px 'Playfair Display'"],
  vi: ["700 16px 'Playfair Display'", "italic 600 16px 'Cormorant Garamond'", "600 16px 'Be Vietnam Pro'", "700 16px 'Be Vietnam Pro'"]
};
let _rcF = RC_FONTS.en;
const _rcFontPromise = {};
function _rcUseLang(lang) { _rcF = RC_FONTS[lang] || RC_FONTS.en; }
function _rcLoadFonts(lang) {
  const key = RC_FONTS[lang] ? lang : "en";
  if (_rcFontPromise[key]) return _rcFontPromise[key];
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = RC_FONT_URL[key];
  // The faces only exist once the stylesheet is in, so the loads wait for it.
  const sheet = new Promise(function(resolve) { link.onload = resolve; link.onerror = resolve; });
  document.head.appendChild(link);
  _rcFontPromise[key] = sheet.then(function() {
    if (!document.fonts || !document.fonts.load) return null;
    return Promise.all(RC_FONT_FACES[key].map(function(f) { return document.fonts.load(f, "ĐẾNỘ Ãi"); }));
  }).catch(function() {});
  return _rcFontPromise[key];
}

// The callsign typed in the share dialog replaces the share card's title.
// It is kept on this device only.
const RC_NAME_MAX = 16;
const RC_NAME_KEY = "pisces_pilot_name";
function _rcCleanName(raw) {
  const s = String(raw || "").normalize("NFC").replace(/[\u0000-\u001F\u007F]/g, "").replace(/\s+/g, " ").trim();
  return Array.from(s).slice(0, RC_NAME_MAX).join("");
}
function _rcLoadName() {
  try { return _rcCleanName(localStorage.getItem(RC_NAME_KEY)); } catch (_) { return ""; }
}
function _rcSaveName(name) {
  try {
    if (name) localStorage.setItem(RC_NAME_KEY, name);
    else localStorage.removeItem(RC_NAME_KEY);
  } catch (_) {}
}
// Cinzel has no Vietnamese marks, so any name beyond plain ASCII uses the
// Vietnamese title face.
function _rcNeedsViFont(text) { return /[^\x20-\x7E]/.test(text); }
// Steps the size down from size to min until text fits in maxW.
function _rcFitFont(ctx, text, weight, size, min, family, maxW) {
  let s = size;
  ctx.font = weight + " " + s + "px " + family;
  while (s > min && ctx.measureText(text).width > maxW) {
    s -= 2;
    ctx.font = weight + " " + s + "px " + family;
  }
}

// The share card's centrepiece: the game's own ship inside its cyan shield,
// on a square canvas built once.
let _rcShipCanvas = null;
function _rcShieldedShip() {
  if (_rcShipCanvas) return _rcShipCanvas;
  if (typeof _getPlayerShipBaseSprite !== "function") return null;
  const hull = _getPlayerShipBaseSprite();
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const scale = 1.9, w = hull.width * scale, h = hull.height * scale;
  g.drawImage(hull, 128 - w / 2, 128 - h * 0.45, w, h);
  g.strokeStyle = "rgba(0, 229, 255, 0.85)";
  g.lineWidth = 5;
  g.beginPath(); g.arc(128, 128, 100, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = "rgba(0, 229, 255, 0.25)";
  g.lineWidth = 14;
  g.beginPath(); g.arc(128, 128, 100, 0, Math.PI * 2); g.stroke();
  _rcShipCanvas = c;
  return c;
}

const SPRITE_CACHE = {
  glowCyan: null,
  glowBlue: null,
  glowGold: null,
  glowCrimson: null,
  starSpark: null,
  shipFallback: null,
  shipImage: null,
  shipLoaded: false,
  glyphImages: {},
  glyphFallbacks: {}
};

function createGlowSprite(r, g, b, size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, "rgba(" + r + "," + g + "," + b + ",1)");
  grad.addColorStop(0.32, "rgba(" + r + "," + g + "," + b + ",0.45)");
  grad.addColorStop(0.7, "rgba(" + r + "," + g + "," + b + ",0.12)");
  grad.addColorStop(1, "rgba(" + r + "," + g + "," + b + ",0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return c;
}

function createStarSparkSprite(size) {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const half = size * 0.5;
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half);
  grad.addColorStop(0, "rgba(220,232,245,1)");
  grad.addColorStop(0.4, "rgba(0,229,255,0.5)");
  grad.addColorStop(1, "rgba(0,229,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(232,196,106,0.85)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(half, 2);
  ctx.lineTo(half, size - 2);
  ctx.moveTo(2, half);
  ctx.lineTo(size - 2, half);
  ctx.stroke();
  return c;
}

function createShipFallbackSprite() {
  const c = document.createElement("canvas");
  c.width = 180;
  c.height = 180;
  const ctx = c.getContext("2d");
  const cx = 90, cy = 92;

  // Blue energy shield aura
  const shieldGrad = ctx.createRadialGradient(cx, cy, 18, cx, cy, 78);
  shieldGrad.addColorStop(0, "rgba(0,229,255,0.08)");
  shieldGrad.addColorStop(0.68, "rgba(63,169,245,0.22)");
  shieldGrad.addColorStop(0.92, "rgba(0,229,255,0.65)");
  shieldGrad.addColorStop(1, "rgba(0,229,255,0)");
  ctx.fillStyle = shieldGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 78, 0, Math.PI * 2);
  ctx.fill();

  // Hexagonal astral shield lattice ring
  ctx.strokeStyle = "rgba(0,229,255,0.75)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 68, 0, Math.PI * 2);
  ctx.stroke();

  // Thruster flame
  const flameGrad = ctx.createLinearGradient(cx, cy + 28, cx, cy + 66);
  flameGrad.addColorStop(0, "#FFFFFF");
  flameGrad.addColorStop(0.4, "#00E5FF");
  flameGrad.addColorStop(1, "rgba(0,229,255,0)");
  ctx.fillStyle = flameGrad;
  ctx.beginPath();
  ctx.moveTo(cx - 10, cy + 26);
  ctx.lineTo(cx, cy + 64);
  ctx.lineTo(cx + 10, cy + 26);
  ctx.closePath();
  ctx.fill();

  // Swept celestial wings
  ctx.fillStyle = "#12204A";
  ctx.strokeStyle = "#3FA9F5";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 48);
  ctx.lineTo(cx + 46, cy + 22);
  ctx.lineTo(cx + 18, cy + 28);
  ctx.lineTo(cx, cy + 16);
  ctx.lineTo(cx - 18, cy + 28);
  ctx.lineTo(cx - 46, cy + 22);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Inner hull & gold trim
  ctx.fillStyle = "#DCE8F5";
  ctx.strokeStyle = "#E8C46A";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 52);
  ctx.lineTo(cx + 15, cy + 18);
  ctx.lineTo(cx, cy + 28);
  ctx.lineTo(cx - 15, cy + 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Core crystal cockpit
  ctx.fillStyle = "#00E5FF";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 22);
  ctx.lineTo(cx + 7, cy - 2);
  ctx.lineTo(cx, cy + 12);
  ctx.lineTo(cx - 7, cy - 2);
  ctx.closePath();
  ctx.fill();

  return c;
}

function drawZodiacVector(ctx, id, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = "#FFFFFF";
  ctx.fillStyle = "#FFFFFF";
  ctx.lineWidth = Math.max(2, r * 0.13);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (id === "capricorn") {
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, cy - r * 0.45);
    ctx.lineTo(cx - r * 0.15, cy + r * 0.35);
    ctx.lineTo(cx + r * 0.2, cy - r * 0.25);
    ctx.quadraticCurveTo(cx + r * 0.65, cy - r * 0.25, cx + r * 0.45, cy + r * 0.35);
    ctx.quadraticCurveTo(cx + r * 0.25, cy + r * 0.65, cx + r * 0.05, cy + r * 0.35);
    ctx.stroke();
  } else if (id === "leo") {
    ctx.beginPath();
    ctx.arc(cx - r * 0.32, cy + r * 0.18, r * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.15, cy + r * 0.02);
    ctx.bezierCurveTo(cx - r * 0.2, cy - r * 0.65, cx + r * 0.45, cy - r * 0.55, cx + r * 0.25, cy + r * 0.25);
    ctx.quadraticCurveTo(cx + r * 0.2, cy + r * 0.5, cx + r * 0.52, cy + r * 0.42);
    ctx.stroke();
  } else if (id === "pisces") {
    ctx.beginPath();
    ctx.arc(cx - r * 0.55, cy, r * 0.48, -Math.PI * 0.38, Math.PI * 0.38);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + r * 0.55, cy, r * 0.48, Math.PI * 0.62, Math.PI * 1.38);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, cy);
    ctx.lineTo(cx + r * 0.55, cy);
    ctx.stroke();
  } else {
    // Generic celestial sigil star for other 11 zodiac IDs
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI) / 4;
      const rad = i % 2 === 0 ? r * 0.65 : r * 0.28;
      const x = cx + Math.cos(ang) * rad;
      const y = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function getGlyphSprite(id) {
  if (SPRITE_CACHE.glyphImages[id] && SPRITE_CACHE.glyphImages[id].complete && SPRITE_CACHE.glyphImages[id].naturalWidth > 0) {
    return SPRITE_CACHE.glyphImages[id];
  }
  if (!SPRITE_CACHE.glyphFallbacks[id]) {
    const c = document.createElement("canvas");
    c.width = 96;
    c.height = 96;
    const ctx = c.getContext("2d");
    drawZodiacVector(ctx, id, 48, 48, 34);
    SPRITE_CACHE.glyphFallbacks[id] = c;

    // The game's own zodiac art replaces the vector stand in once it loads.
    if (!SPRITE_CACHE.glyphImages[id] && window.location.protocol !== "blob:") {
      const img = new Image();
      img.src = "assets/images/game/zodiac/zodiac_" + id + ".png";
      SPRITE_CACHE.glyphImages[id] = img;
    }
  }
  return SPRITE_CACHE.glyphFallbacks[id];
}

function ensureSpritesInitialized() {
  if (!SPRITE_CACHE.glowCyan) {
    SPRITE_CACHE.glowCyan = createGlowSprite(0, 229, 255, 96);
    SPRITE_CACHE.glowBlue = createGlowSprite(63, 169, 245, 128);
    SPRITE_CACHE.glowGold = createGlowSprite(232, 196, 106, 96);
    SPRITE_CACHE.glowCrimson = createGlowSprite(255, 77, 109, 96);
    SPRITE_CACHE.starSpark = createStarSparkSprite(28);
    SPRITE_CACHE.shipFallback = createShipFallbackSprite();

    SPRITE_CACHE.shipImage = _rcShieldedShip();
    SPRITE_CACHE.shipLoaded = !!SPRITE_CACHE.shipImage;
  }
}

function getShipDrawable() {
  if (SPRITE_CACHE.shipLoaded && SPRITE_CACHE.shipImage) {
    return SPRITE_CACHE.shipImage;
  }
  return SPRITE_CACHE.shipFallback;
}

// 4. PRE-ALLOCATED CELESTIAL ASTROLABE BACKGROUND LOOP (ZERO PER-FRAME ALLOC)
const STAR_COUNT = 64;
const STAR_X = new Float32Array(STAR_COUNT);
const STAR_Y = new Float32Array(STAR_COUNT);
const STAR_SPEED = new Float32Array(STAR_COUNT);
const STAR_SIZE = new Float32Array(STAR_COUNT);
const STAR_PHASE = new Float32Array(STAR_COUNT);

(function initStarBuffers() {
  for (let i = 0; i < STAR_COUNT; i++) {
    STAR_X[i] = ((i * 73 + 19) % 100) / 100;
    STAR_Y[i] = ((i * 41 + 7) % 100) / 100;
    STAR_SPEED[i] = 0.006 + (i % 7) * 0.0025;
    STAR_SIZE[i] = 1.0 + (i % 4) * 0.65;
    STAR_PHASE[i] = (i * 1.17) % (Math.PI * 2);
  }
})();

function renderCelestialBackground(ctx, w, h, nowMs, bgBrightnessPct, fxBrightnessPct) {
  ensureSpritesInitialized();
  const bgScale = (bgBrightnessPct !== undefined ? bgBrightnessPct : 100) / 100;
  const fxScale = (fxBrightnessPct !== undefined ? fxBrightnessPct : 100) / 100;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#02020C";
  ctx.fillRect(0, 0, w, h);

  const tSec = nowMs * 0.001;
  const breath = 0.72 + 0.28 * Math.sin(tSec * 1.15);

  // Soft nebula glow sprites (pre-rendered, no shadowBlur)
  ctx.globalAlpha = Math.min(1, 0.32 * bgScale * breath);
  ctx.drawImage(SPRITE_CACHE.glowBlue, w * 0.15 - 220, h * 0.2 - 220, 440, 440);
  ctx.drawImage(SPRITE_CACHE.glowCyan, w * 0.78 - 200, h * 0.72 - 200, 400, 400);

  // Revolving Astrolabe Rings at center-top
  const cx = w * 0.5;
  const cy = h * 0.26;
  const baseR = Math.min(w, h) * 0.34;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = "rgba(63, 169, 245, " + (0.14 * bgScale).toFixed(3) + ")";
  ctx.lineWidth = 1;

  ctx.beginPath();
  ctx.arc(0, 0, baseR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, baseR * 0.74, 0, Math.PI * 2);
  ctx.stroke();

  // Astrolabe degree ticks
  const rot = tSec * 0.045;
  ctx.rotate(rot);
  ctx.strokeStyle = "rgba(232, 196, 106, " + (0.18 * bgScale).toFixed(3) + ")";
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i * Math.PI) / 12;
    const c = Math.cos(a), s = Math.sin(a);
    const r1 = baseR * 0.95;
    const r2 = (i % 3 === 0) ? baseR * 1.04 : baseR * 0.99;
    ctx.moveTo(c * r1, s * r1);
    ctx.lineTo(c * r2, s * r2);
  }
  ctx.stroke();
  ctx.restore();

  // Drifting stardust particles
  for (let i = 0; i < STAR_COUNT; i++) {
    let py = (STAR_Y[i] - tSec * STAR_SPEED[i]) % 1;
    if (py < 0) py += 1;
    const px = STAR_X[i] * w;
    const yPos = py * h;
    const twinkle = 0.35 + 0.65 * Math.sin(tSec * 1.8 + STAR_PHASE[i]);
    ctx.globalAlpha = Math.max(0.05, Math.min(1, twinkle * 0.65 * bgScale * (0.5 + 0.5 * fxScale)));
    const sz = STAR_SIZE[i];
    if (i % 9 === 0) {
      ctx.drawImage(SPRITE_CACHE.starSpark, px - sz * 3, yPos - sz * 3, sz * 6, sz * 6);
    } else {
      ctx.fillStyle = (i % 5 === 0) ? "#00E5FF" : "#DCE8F5";
      ctx.fillRect(px, yPos, sz, sz);
    }
  }
  ctx.globalAlpha = 1;
}

// 5. FORMATTING HELPERS
function formatNumber(n) {
  return Math.round(n).toLocaleString("en-US");
}

function formatCompact(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "K";
  return String(Math.round(n));
}

function formatTimeMs(ms) {
  const totalSec = Math.max(0, Math.floor((ms || 0) / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return m + ":" + (s < 10 ? "0" + s : s);
}

function formatSec(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return m + ":" + (s < 10 ? "0" + s : s);
}

// 6. RECAP SCREEN ENGINE: openRecap, closeRecap, drawShareCard
const DONUT_PALETTE_ALLY = [
  "#00E5FF", "#3FA9F5", "#E8C46A", "#7F77DD", "#4D9B2A", "#DCE8F5", "#2B6CB0"
];
const DONUT_PALETTE_ENEMY = [
  "#3FA9F5", "#00E5FF", "#7F77DD", "#E8C46A", "#DCE8F5", "#4A78B8"
];
const DONUT_PALETTE_LIVES = [
  "#FF4D6D", "#E8C46A", "#3FA9F5", "#7F77DD", "#00E5FF", "#DCE8F5"
];

// How long the title holds the middle of the screen before it lifts.
const RC_INTRO_LIFT_MS = 1364;

let _recapState = {
  active: false,
  rafId: 0,
  startMs: 0,
  container: null,
  data: null,
  lang: "vi",
  activeTab: "allyDamage",
  shareFormat: "portrait",
  cleanupFns: []
};

function computeTimelineMetrics(data) {
  const tl = (data && data.timeline) ? data.timeline : [];
  const n = tl.length;
  const ma30 = new Float64Array(n);
  let peakIdx = 0;
  let peakVal = -1;
  let dangerIdx = 0;
  let dangerVal = -1;
  let totalAlly = 0;
  const waveChanges = [];
  let prevWave = n > 0 ? tl[0].wave : 1;

  for (let i = 0; i < n; i++) {
    const pt = tl[i];
    totalAlly += pt.allyDamage || 0;
    // 30s moving average = up to 6 points (each point is 5s)
    let sum = 0, cnt = 0;
    for (let j = Math.max(0, i - 5); j <= i; j++) {
      sum += tl[j].allyDamage || 0;
      cnt++;
    }
    ma30[i] = cnt > 0 ? sum / cnt : 0;

    if ((pt.allyDamage || 0) > peakVal) {
      peakVal = pt.allyDamage || 0;
      peakIdx = i;
    }
    if ((pt.damageTaken || 0) > dangerVal) {
      dangerVal = pt.damageTaken || 0;
      dangerIdx = i;
    }
    if (pt.wave !== prevWave) {
      waveChanges.push({ index: i, wave: pt.wave, t: pt.t });
      prevWave = pt.wave;
    }
  }

  // MVP and Top 3 share from matchStats.allyDamage
  const allyMap = (data && data.matchStats && data.matchStats.allyDamage) || {};
  const entries = Object.entries(allyMap).sort(function(a, b) { return b[1] - a[1]; });
  let statTotal = 0;
  for (let i = 0; i < entries.length; i++) statTotal += entries[i][1];
  const mvpRaw = entries.length > 0 ? entries[0][0] : "-";
  const mvpPct = (entries.length > 0 && statTotal > 0) ? ((entries[0][1] / statTotal) * 100).toFixed(1) + "%" : "0%";
  let top3Sum = 0;
  for (let i = 0; i < Math.min(3, entries.length); i++) top3Sum += entries[i][1];
  const top3Pct = statTotal > 0 ? ((top3Sum / statTotal) * 100).toFixed(1) + "%" : "0%";

  const durationSec = Math.max(1, (data.timeMs || (n * 5000)) / 1000);
  const avgDps = Math.round((statTotal > 0 ? statTotal : totalAlly) / durationSec);

  return {
    tl: tl,
    ma30: ma30,
    peakIdx: peakIdx,
    peakVal: peakVal > 0 ? peakVal : 0,
    peakTime: n > 0 ? tl[peakIdx].t : 0,
    dangerIdx: dangerIdx,
    dangerVal: dangerVal > 0 ? dangerVal : 0,
    dangerTime: n > 0 ? tl[dangerIdx].t : 0,
    waveChanges: waveChanges,
    avgDps: avgDps,
    mvpRaw: mvpRaw,
    mvpPct: mvpPct,
    top3Pct: top3Pct
  };
}

function drawSigilConstellationCanvas(canvas, sigils, lang, progress, nowMs) {
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(260, Math.floor(rect.width));
  const h = Math.max(120, Math.floor(rect.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  // Subtle background star grid lines
  ctx.strokeStyle = "rgba(63, 169, 245, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.5);
  ctx.lineTo(w, h * 0.5);
  ctx.stroke();

  const count = sigils ? sigils.length : 0;
  if (count === 0) {
    ctx.textAlign = "center";
    ctx.font = "italic 14px " + _rcF.italic;
    ctx.fillStyle = "#8CA6C6";
    ctx.fillText(t("rcEmptySigils", lang), w * 0.5, h * 0.5 + 5);
    ctx.restore();
    return;
  }

  const pts = [];
  for (let i = 0; i < count; i++) {
    const x = count === 1 ? w * 0.5 : (w * 0.18) + (i / (count - 1)) * (w * 0.64);
    const yOffset = (i % 2 === 0) ? -12 : 14;
    const y = h * 0.45 + (count === 1 ? 0 : yOffset);
    pts.push({ x: x, y: y, sigil: sigils[i] });
  }

  // Constellation connecting lines
  if (count > 1) {
    ctx.strokeStyle = "rgba(0, 229, 255, 0.48)";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < count; i++) {
      const pPrev = pts[i - 1];
      const pCurr = pts[i];
      const segProg = Math.max(0, Math.min(1, progress * count - (i - 0.5)));
      const tx = pPrev.x + (pCurr.x - pPrev.x) * segProg;
      const ty = pPrev.y + (pCurr.y - pPrev.y) * segProg;
      ctx.lineTo(tx, ty);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Draw each sigil node
  const pulse = 0.88 + 0.12 * Math.sin(nowMs * 0.003);
  for (let i = 0; i < count; i++) {
    const p = pts[i];
    const s = p.sigil;
    const col = s.color || "#00E5FF";

    // Pre-rendered glow behind node
    ctx.globalAlpha = 0.65 * pulse;
    ctx.drawImage(SPRITE_CACHE.glowCyan, p.x - 42, p.y - 42, 84, 84);
    ctx.globalAlpha = 1;

    // Outer astrolabe ring
    ctx.strokeStyle = col;
    ctx.lineWidth = 2;
    ctx.fillStyle = "#060E26";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner gold rim
    ctx.strokeStyle = "rgba(232, 196, 106, 0.65)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Sigil glyph sprite
    const glyph = getGlyphSprite(s.id);
    if (glyph) {
      ctx.drawImage(glyph, p.x - 14, p.y - 14, 28, 28);
    }

    // Sigil name & wave below node
    const dispName = lang === "vi" ? (s.vi || s.name) : s.name;
    const waveTxt = s.atWave === 0 ? t("rcAtWave", lang) : t("rcWaveNum", lang, { w: s.atWave });

    ctx.font = "700 11px " + _rcF.title;
    ctx.fillStyle = "#DCE8F5";
    ctx.textAlign = "center";
    ctx.fillText(dispName, p.x, p.y + 39);

    ctx.font = "600 9px " + _rcF.ui;
    ctx.fillStyle = col;
    ctx.fillText(waveTxt, p.x, p.y + 52);
  }

  ctx.restore();
}

function drawDonutChart(canvas, statsObj, tabKey, lang, progress) {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = 156;
  if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
    canvas.width = size * dpr;
    canvas.height = size * dpr;
  }
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, size, size);

  const palette = tabKey === "allyDamage"
    ? DONUT_PALETTE_ALLY
    : (tabKey === "enemyDamage" ? DONUT_PALETTE_ENEMY : DONUT_PALETTE_LIVES);

  const entries = Object.entries(statsObj || {}).sort(function(a, b) { return b[1] - a[1]; });
  let total = 0;
  for (let i = 0; i < entries.length; i++) total += entries[i][1];

  const cx = size * 0.5, cy = size * 0.5;
  const rOuter = 66, rInner = 43;

  // Background ring, a faint dashed outline when there is nothing to split
  if (total > 0) {
    ctx.strokeStyle = "rgba(11, 42, 91, 0.65)";
    ctx.lineWidth = rOuter - rInner;
  } else {
    ctx.strokeStyle = "rgba(140, 166, 198, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
  }
  ctx.beginPath();
  ctx.arc(cx, cy, (rOuter + rInner) * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  if (total > 0) {
    let startAngle = -Math.PI * 0.5;
    const sweepMax = Math.PI * 2 * Math.max(0.05, Math.min(1, progress));
    let accumulated = 0;

    const topCount = Math.min(5, entries.length);
    let otherSum = 0;
    for (let i = topCount; i < entries.length; i++) otherSum += entries[i][1];
    const slices = entries.slice(0, topCount);
    if (otherSum > 0) slices.push(["Other", otherSum]);

    for (let i = 0; i < slices.length; i++) {
      const val = slices[i][1];
      const sliceAngle = (val / total) * sweepMax;
      if (sliceAngle > 0.01) {
        ctx.strokeStyle = palette[i % palette.length];
        ctx.lineWidth = rOuter - rInner;
        ctx.beginPath();
        ctx.arc(cx, cy, (rOuter + rInner) * 0.5, startAngle, startAngle + Math.max(0.01, sliceAngle - 0.025));
        ctx.stroke();
      }
      startAngle += sliceAngle;
      accumulated += val;
    }
  }

  // Decorative inner gold ring
  ctx.strokeStyle = "rgba(232, 196, 106, 0.45)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, rInner - 3, 0, Math.PI * 2);
  ctx.stroke();

  // Center total text
  ctx.textAlign = "center";
  ctx.font = "600 9px " + _rcF.ui;
  ctx.fillStyle = "#8CA6C6";
  ctx.fillText(t("rcDonutTotal", lang), cx, cy - 6);

  ctx.font = "700 14px " + _rcF.title;
  ctx.fillStyle = tabKey === "lifeLoss" ? "#FF4D6D" : "#00E5FF";
  const centerVal = tabKey === "lifeLoss" ? String(total) : formatCompact(total);
  ctx.fillText(centerVal, cx, cy + 12);

  ctx.restore();
}

function drawTimelineCanvas(canvas, metrics, lang, progress) {
  if (!canvas || !metrics) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(300, Math.floor(rect.width));
  const h = Math.max(180, Math.floor(rect.height));
  if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
  }
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);

  const padL = 44, padR = 18, padT = 26, padB = 26;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;
  const upperH = plotH * 0.68;
  const lowerTop = padT + upperH + 6;
  const lowerH = plotH - upperH - 6;

  const tl = metrics.tl;
  const n = tl.length;
  if (n < 2) {
    ctx.textAlign = "center";
    ctx.font = "italic 14px " + _rcF.italic;
    ctx.fillStyle = "#8CA6C6";
    ctx.fillText(t("rcEmptyTimeline", lang), w * 0.5, h * 0.5 + 5);
    ctx.restore();
    return;
  }

  const maxAlly = Math.max(1000, metrics.peakVal * 1.12);
  const maxTaken = Math.max(100, metrics.dangerVal * 1.18);

  // Horizontal grid lines
  ctx.strokeStyle = "rgba(63, 169, 245, 0.14)";
  ctx.lineWidth = 1;
  for (let g = 0; g <= 3; g++) {
    const gy = padT + (upperH * g) / 3;
    ctx.beginPath();
    ctx.moveTo(padL, gy);
    ctx.lineTo(padL + plotW, gy);
    ctx.stroke();

    const val = Math.round(maxAlly * (1 - g / 3));
    ctx.fillStyle = "#8CA6C6";
    ctx.font = "600 9px " + _rcF.ui;
    ctx.textAlign = "right";
    ctx.fillText(formatCompact(val), padL - 6, gy + 3);
  }

  // Divider between ally damage upper chart and damage taken lower bars
  ctx.strokeStyle = "rgba(232, 196, 106, 0.35)";
  ctx.beginPath();
  ctx.moveTo(padL, padT + upperH);
  ctx.lineTo(padL + plotW, padT + upperH);
  ctx.stroke();

  // Wave transition vertical lines (Wave 5 & 10 boss highlighted)
  for (let i = 0; i < metrics.waveChanges.length; i++) {
    const wc = metrics.waveChanges[i];
    const x = padL + (wc.index / Math.max(1, n - 1)) * plotW;
    const isBoss = (wc.wave === 5 || wc.wave === 10);
    ctx.strokeStyle = isBoss ? "rgba(232, 196, 106, 0.65)" : "rgba(63, 169, 245, 0.18)";
    ctx.lineWidth = isBoss ? 1.4 : 1;
    ctx.setLineDash(isBoss ? [4, 2] : [2, 3]);
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    if (isBoss || wc.wave % 2 === 1 || n <= 36) {
      ctx.fillStyle = isBoss ? "#E8C46A" : "rgba(140, 166, 198, 0.78)";
      ctx.font = (isBoss ? "700 " : "600 ") + "8px " + _rcF.ui;
      ctx.textAlign = "center";
      ctx.fillText("W" + wc.wave, x, padT + plotH + 14);
    }
  }

  const visibleCount = Math.max(2, Math.floor(n * Math.min(1, progress)));

  // Lower chart: Damage Taken columns
  const barW = Math.max(1.5, (plotW / n) * 0.68);
  for (let i = 0; i < visibleCount; i++) {
    const dt = tl[i].damageTaken || 0;
    if (dt <= 0) continue;
    const x = padL + (i / Math.max(1, n - 1)) * plotW;
    const bh = Math.min(lowerH, (dt / maxTaken) * lowerH);
    ctx.fillStyle = (i === metrics.dangerIdx) ? "#FF4D6D" : "rgba(63, 169, 245, 0.68)";
    ctx.fillRect(x - barW * 0.5, lowerTop + lowerH - bh, barW, bh);
  }

  // Upper chart: Ally Damage area fill + 5s line
  const areaGrad = ctx.createLinearGradient(0, padT, 0, padT + upperH);
  areaGrad.addColorStop(0, "rgba(0, 229, 255, 0.34)");
  areaGrad.addColorStop(1, "rgba(0, 229, 255, 0.02)");

  ctx.beginPath();
  for (let i = 0; i < visibleCount; i++) {
    const x = padL + (i / Math.max(1, n - 1)) * plotW;
    const y = padT + upperH - ((tl[i].allyDamage || 0) / maxAlly) * upperH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  const lastX = padL + ((visibleCount - 1) / Math.max(1, n - 1)) * plotW;
  ctx.lineTo(lastX, padT + upperH);
  ctx.lineTo(padL, padT + upperH);
  ctx.closePath();
  ctx.fillStyle = areaGrad;
  ctx.fill();

  // Ally damage 5s line
  ctx.strokeStyle = "#00E5FF";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let i = 0; i < visibleCount; i++) {
    const x = padL + (i / Math.max(1, n - 1)) * plotW;
    const y = padT + upperH - ((tl[i].allyDamage || 0) / maxAlly) * upperH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // 30s Moving Average gold line
  ctx.strokeStyle = "#E8C46A";
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  for (let i = 0; i < visibleCount; i++) {
    const x = padL + (i / Math.max(1, n - 1)) * plotW;
    const y = padT + upperH - (metrics.ma30[i] / maxAlly) * upperH;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Peak Damage callout badge
  if (progress > 0.75 && metrics.peakIdx < visibleCount) {
    const px = padL + (metrics.peakIdx / Math.max(1, n - 1)) * plotW;
    const py = padT + upperH - (metrics.peakVal / maxAlly) * upperH;
    ctx.fillStyle = "#00E5FF";
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();

    const pText = t("rcPeakTag", lang, {
      v: formatCompact(metrics.peakVal),
      t: formatSec(metrics.peakTime)
    });
    ctx.font = "700 9px " + _rcF.ui;
    const tw = ctx.measureText(pText).width + 10;
    const bx = Math.min(w - padR - tw, Math.max(padL + 2, px - tw * 0.5));
    const by = Math.max(4, py - 20);
    ctx.fillStyle = "rgba(6, 18, 46, 0.92)";
    ctx.strokeStyle = "#00E5FF";
    ctx.lineWidth = 1;
    ctx.fillRect(bx, by, tw, 15);
    ctx.strokeRect(bx, by, tw, 15);
    ctx.fillStyle = "#00E5FF";
    ctx.textAlign = "left";
    ctx.fillText(pText, bx + 5, by + 11);
  }

  // Most Dangerous Window callout badge
  if (progress > 0.75 && metrics.dangerIdx < visibleCount && metrics.dangerVal > 0) {
    const dx = padL + (metrics.dangerIdx / Math.max(1, n - 1)) * plotW;
    const dy = lowerTop + lowerH - (metrics.dangerVal / maxTaken) * lowerH;
    ctx.fillStyle = "#FF4D6D";
    ctx.beginPath();
    ctx.arc(dx, dy, 3.5, 0, Math.PI * 2);
    ctx.fill();

    const dText = t("rcDangerTag", lang, {
      v: formatCompact(metrics.dangerVal),
      t: formatSec(metrics.dangerTime)
    });
    ctx.font = "700 9px " + _rcF.ui;
    const tw = ctx.measureText(dText).width + 10;
    const bx = Math.min(w - padR - tw, Math.max(padL + 2, dx - tw * 0.7));
    const by = Math.max(padT + upperH - 16, dy - 18);
    ctx.fillStyle = "rgba(28, 8, 20, 0.92)";
    ctx.strokeStyle = "#FF4D6D";
    ctx.lineWidth = 1;
    ctx.fillRect(bx, by, tw, 15);
    ctx.strokeRect(bx, by, tw, 15);
    ctx.fillStyle = "#FF4D6D";
    ctx.textAlign = "left";
    ctx.fillText(dText, bx + 5, by + 11);
  }

  ctx.restore();
}

// 7. SHARE CARD GENERATOR: drawShareCard(canvas, data, lang, format)
function drawOrnateCanvasFrame(ctx, x, y, w, h, borderCol, accentCol) {
  ctx.save();
  ctx.strokeStyle = borderCol || "rgba(63, 169, 245, 0.55)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);

  ctx.strokeStyle = accentCol || "rgba(232, 196, 106, 0.45)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);

  // 8-pointed corner stars
  const corners = [
    [x + 8, y + 8],
    [x + w - 8, y + 8],
    [x + 8, y + h - 8],
    [x + w - 8, y + h - 8]
  ];
  ctx.fillStyle = "#E8C46A";
  for (let i = 0; i < corners.length; i++) {
    const cx = corners[i][0], cy = corners[i][1];
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawShareCard(canvas, data, lang, format) {
  _rcUseLang(lang);
  const pilot = _recapState.pilotName || "";
  const cardTitle = (pilot || t("rcTitle", lang)).toUpperCase();
  const cardTitleFace = pilot && _rcNeedsViFont(pilot) ? RC_FONTS.vi.title : _rcF.title;
  if (!canvas || !data) return;
  ensureSpritesInitialized();
  const isLandscape = format === "landscape";
  const W = isLandscape ? 1200 : 1080;
  const H = isLandscape ? 630 : 1350;
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d");
  const metrics = computeTimelineMetrics(data);

  // 1. Deep Celestial Night Background
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#02020C");
  bgGrad.addColorStop(0.5, "#0A0F2A");
  bgGrad.addColorStop(1, "#12204A");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Luminous Nebula Aura
  ctx.globalAlpha = 0.55;
  ctx.drawImage(SPRITE_CACHE.glowBlue, W * 0.1 - 300, H * 0.15 - 300, 600, 600);
  ctx.drawImage(SPRITE_CACHE.glowCyan, W * 0.82 - 320, H * 0.78 - 320, 640, 640);
  ctx.globalAlpha = 1;

  // Astrolabe Dial Watermark
  const astroX = isLandscape ? W * 0.25 : W * 0.5;
  const astroY = isLandscape ? H * 0.44 : H * 0.26;
  const astroR = isLandscape ? 210 : 310;
  ctx.save();
  ctx.translate(astroX, astroY);
  ctx.strokeStyle = "rgba(63, 169, 245, 0.22)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, astroR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, astroR * 0.76, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(232, 196, 106, 0.28)";
  ctx.beginPath();
  for (let i = 0; i < 36; i++) {
    const a = (i * Math.PI) / 18;
    const r1 = astroR * 0.94;
    const r2 = i % 3 === 0 ? astroR * 1.04 : astroR * 0.99;
    ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
  }
  ctx.stroke();
  ctx.restore();

  // Starfield specks
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 97 + 31) % 1000) / 1000 * W;
    const sy = ((i * 53 + 17) % 1000) / 1000 * H;
    ctx.fillStyle = (i % 4 === 0) ? "#00E5FF" : "rgba(220, 232, 245, 0.7)";
    const r = 1 + (i % 3);
    ctx.fillRect(sx, sy, r, r);
  }

  // Outer Ornate Frame
  drawOrnateCanvasFrame(ctx, 24, 24, W - 48, H - 48, "rgba(0, 229, 255, 0.65)", "rgba(232, 196, 106, 0.5)");

  const shipImg = getShipDrawable();
  const sigils = data.sigils || [];

  if (!isLandscape) {
    // Portrait 1080x1350 layout
    ctx.textAlign = "center";
    ctx.fillStyle = "#3FA9F5";
    ctx.font = "italic 24px " + _rcF.italic;
    ctx.fillText(t("rcAstralSub", lang), W * 0.5, 86);

    ctx.fillStyle = "#DCE8F5";
    _rcFitFont(ctx, cardTitle, "700", 54, 32, cardTitleFace, W - 180);
    ctx.fillText(cardTitle, W * 0.5, 148);

    // Ship centerpiece with blue shield
    if (shipImg) {
      ctx.drawImage(SPRITE_CACHE.glowCyan, W * 0.5 - 140, 175, 280, 280);
      ctx.drawImage(shipImg, W * 0.5 - 92, 220, 184, 184);
    }

    // 3 Big Metrics Cards
    const cardY = 430, cardH = 148, gap = 22;
    const cardW = (W - 120 - gap * 2) / 3;
    const mItems = [
      { label: t("rcScore", lang), val: formatNumber(data.score || 0), col: "#00E5FF" },
      { label: t("rcWave", lang), val: "WAVE " + (data.wave || 1), col: "#DCE8F5" },
      { label: t("rcTime", lang), val: formatTimeMs(data.timeMs || 0), col: "#DCE8F5" }
    ];
    for (let i = 0; i < 3; i++) {
      const bx = 60 + i * (cardW + gap);
      ctx.fillStyle = "rgba(11, 42, 91, 0.65)";
      ctx.fillRect(bx, cardY, cardW, cardH);
      ctx.strokeStyle = i === 0 ? "#E8C46A" : "rgba(0, 229, 255, 0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(bx, cardY, cardW, cardH);

      ctx.fillStyle = "#3FA9F5";
      ctx.font = "700 16px " + _rcF.ui;
      ctx.fillText(mItems[i].label.toUpperCase(), bx + cardW * 0.5, cardY + 46);

      ctx.fillStyle = mItems[i].col;
      ctx.font = "700 40px " + _rcF.title;
      ctx.fillText(mItems[i].val, bx + cardW * 0.5, cardY + 108);
    }

    // Engraved Cause of Fall Banner
    const epY = 604;
    ctx.fillStyle = "rgba(24, 12, 34, 0.82)";
    ctx.fillRect(60, epY, W - 120, 68);
    ctx.strokeStyle = "rgba(232, 196, 106, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(60, epY, W - 120, 68);

    ctx.font = "italic 24px " + _rcF.italic;
    ctx.fillStyle = "#DCE8F5";
    const epTxt = (data.quit ? t("rcQuitLine", lang) : t("rcEpitaphPrefix", lang) + " " + label(data.cause || "Unknown", lang));
    ctx.fillText(epTxt, W * 0.5, epY + 43);

    // Sigil Constellation Box
    const sigY = 698, sigH = 195;
    ctx.fillStyle = "rgba(6, 14, 38, 0.78)";
    ctx.fillRect(60, sigY, W - 120, sigH);
    ctx.strokeStyle = "rgba(63, 169, 245, 0.4)";
    ctx.strokeRect(60, sigY, W - 120, sigH);

    ctx.fillStyle = "#00E5FF";
    ctx.font = "700 18px " + _rcF.title;
    ctx.textAlign = "left";
    ctx.fillText(t("rcSigilTitle", lang).toUpperCase(), 86, sigY + 34);

    // Draw constellation nodes inside box
    if (sigils.length > 0) {
      const nodePositions = [];
      for (let i = 0; i < sigils.length; i++) {
        const nx = sigils.length === 1 ? W * 0.5 : 220 + (i / (sigils.length - 1)) * (W - 440);
        const ny = sigY + 104 + (i % 2 === 0 ? -8 : 10);
        nodePositions.push({ x: nx, y: ny, s: sigils[i] });
      }
      ctx.strokeStyle = "rgba(0, 229, 255, 0.55)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < nodePositions.length; i++) {
        if (i === 0) ctx.moveTo(nodePositions[i].x, nodePositions[i].y);
        else ctx.lineTo(nodePositions[i].x, nodePositions[i].y);
      }
      ctx.stroke();

      ctx.textAlign = "center";
      for (let i = 0; i < nodePositions.length; i++) {
        const np = nodePositions[i];
        ctx.fillStyle = "#060E26";
        ctx.strokeStyle = np.s.color || "#00E5FF";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(np.x, np.y, 32, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const gSprite = getGlyphSprite(np.s.id);
        if (gSprite) ctx.drawImage(gSprite, np.x - 20, np.y - 20, 40, 40);

        const sName = lang === "vi" ? (np.s.vi || np.s.name) : np.s.name;
        ctx.fillStyle = "#DCE8F5";
        ctx.font = "700 16px " + _rcF.title;
        ctx.fillText(sName, np.x, np.y + 54);
      }
    }

    // Mini Timeline Chart Box
    const tlY = 918, tlH = 290;
    ctx.fillStyle = "rgba(6, 14, 38, 0.82)";
    ctx.fillRect(60, tlY, W - 120, tlH);
    ctx.strokeStyle = "rgba(63, 169, 245, 0.4)";
    ctx.strokeRect(60, tlY, W - 120, tlH);

    ctx.textAlign = "left";
    ctx.fillStyle = "#00E5FF";
    ctx.font = "700 18px " + _rcF.title;
    ctx.fillText(t("rcTimelineTitle", lang).toUpperCase(), 86, tlY + 34);

    ctx.textAlign = "right";
    ctx.fillStyle = "#E8C46A";
    ctx.font = "600 15px " + _rcF.ui;
    ctx.fillText("MVP: " + label(metrics.mvpRaw, lang) + " (" + metrics.mvpPct + ")", W - 86, tlY + 34);

    drawMiniTimelineInShareCard(ctx, 86, tlY + 54, W - 172, tlH - 76, metrics);

    // Footer Branding
    ctx.textAlign = "between";
    ctx.fillStyle = "#DCE8F5";
    ctx.font = "700 22px " + _rcF.title;
    ctx.textAlign = "left";
    ctx.fillText("PISCES: SPACE JOURNEY", 60, H - 56);

    ctx.fillStyle = "#00E5FF";
    ctx.font = "700 20px " + _rcF.ui;
    ctx.textAlign = "right";
    ctx.fillText("aansensei.dev/space-shooter", W - 60, H - 56);

  } else {
    // Landscape 1200x630 layout
    // Left Column: Ship + Title + 3 Metrics + Cause
    ctx.textAlign = "left";
    ctx.fillStyle = "#3FA9F5";
    ctx.font = "italic 18px " + _rcF.italic;
    ctx.fillText(t("rcAstralSub", lang), 56, 72);

    ctx.fillStyle = "#DCE8F5";
    _rcFitFont(ctx, cardTitle, "700", 30, 18, cardTitleFace, 380);
    ctx.fillText(cardTitle, 56, 112);

    if (shipImg) {
      ctx.drawImage(SPRITE_CACHE.glowCyan, 446, 22, 136, 136);
      ctx.drawImage(shipImg, 468, 44, 92, 92);
    }

    // 3 Metrics Row on Left
    const mW = 160, mH = 98, mGap = 14, mY = 148;
    const mList = [
      { label: t("rcScore", lang), val: formatNumber(data.score || 0), col: "#00E5FF" },
      { label: t("rcWave", lang), val: "W" + (data.wave || 1), col: "#DCE8F5" },
      { label: t("rcTime", lang), val: formatTimeMs(data.timeMs || 0), col: "#DCE8F5" }
    ];
    ctx.textAlign = "center";
    for (let i = 0; i < 3; i++) {
      const bx = 56 + i * (mW + mGap);
      ctx.fillStyle = "rgba(11, 42, 91, 0.7)";
      ctx.fillRect(bx, mY, mW, mH);
      ctx.strokeStyle = i === 0 ? "#E8C46A" : "rgba(0, 229, 255, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, mY, mW, mH);

      ctx.fillStyle = "#3FA9F5";
      ctx.font = "700 11px " + _rcF.ui;
      ctx.fillText(mList[i].label.toUpperCase(), bx + mW * 0.5, mY + 30);

      ctx.fillStyle = mList[i].col;
      ctx.font = "700 24px " + _rcF.title;
      ctx.fillText(mList[i].val, bx + mW * 0.5, mY + 72);
    }

    // Epitaph Cause Box on Left
    const epY = 264, epW = 508, epH = 54;
    ctx.fillStyle = "rgba(24, 12, 34, 0.82)";
    ctx.fillRect(56, epY, epW, epH);
    ctx.strokeStyle = "rgba(232, 196, 106, 0.5)";
    ctx.strokeRect(56, epY, epW, epH);
    ctx.fillStyle = "#DCE8F5";
    ctx.font = "italic 18px " + _rcF.italic;
    ctx.fillText((data.quit ? t("rcQuitLine", lang) : t("rcEpitaphPrefix", lang) + " " + label(data.cause || "Unknown", lang)), 56 + epW * 0.5, epY + 34);

    // Sigil Constellation Box on Bottom-Left
    const sigY = 336, sigW = 508, sigH = 196;
    ctx.fillStyle = "rgba(6, 14, 38, 0.78)";
    ctx.fillRect(56, sigY, sigW, sigH);
    ctx.strokeStyle = "rgba(63, 169, 245, 0.4)";
    ctx.strokeRect(56, sigY, sigW, sigH);

    ctx.textAlign = "left";
    ctx.fillStyle = "#00E5FF";
    ctx.font = "700 14px " + _rcF.title;
    ctx.fillText(t("rcSigilTitle", lang).toUpperCase(), 74, sigY + 28);

    if (sigils.length > 0) {
      const nPos = [];
      for (let i = 0; i < sigils.length; i++) {
        const nx = sigils.length === 1 ? 56 + sigW * 0.5 : 136 + (i / (sigils.length - 1)) * (sigW - 160);
        const ny = sigY + 98 + (i % 2 === 0 ? -6 : 8);
        nPos.push({ x: nx, y: ny, s: sigils[i] });
      }
      ctx.strokeStyle = "rgba(0, 229, 255, 0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < nPos.length; i++) {
        if (i === 0) ctx.moveTo(nPos[i].x, nPos[i].y);
        else ctx.lineTo(nPos[i].x, nPos[i].y);
      }
      ctx.stroke();

      ctx.textAlign = "center";
      for (let i = 0; i < nPos.length; i++) {
        const np = nPos[i];
        ctx.fillStyle = "#060E26";
        ctx.strokeStyle = np.s.color || "#00E5FF";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(np.x, np.y, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const gSprite = getGlyphSprite(np.s.id);
        if (gSprite) ctx.drawImage(gSprite, np.x - 16, np.y - 16, 32, 32);

        const sName = lang === "vi" ? (np.s.vi || np.s.name) : np.s.name;
        ctx.fillStyle = "#DCE8F5";
        ctx.font = "700 13px " + _rcF.title;
        ctx.fillText(sName, np.x, np.y + 44);
      }
    }

    // Right Column: Mini Battle Timeline + Top Sources
    const rX = 590, rY = 64, rW = W - 646, rH = 468;
    ctx.fillStyle = "rgba(6, 14, 38, 0.82)";
    ctx.fillRect(rX, rY, rW, rH);
    ctx.strokeStyle = "rgba(63, 169, 245, 0.42)";
    ctx.strokeRect(rX, rY, rW, rH);

    ctx.textAlign = "left";
    ctx.fillStyle = "#00E5FF";
    ctx.font = "700 15px " + _rcF.title;
    ctx.fillText(t("rcTimelineTitle", lang).toUpperCase(), rX + 22, rY + 32);

    drawMiniTimelineInShareCard(ctx, rX + 22, rY + 48, rW - 44, 220, metrics);

    // Top 3 Damage Sources inside right panel
    ctx.fillStyle = "#E8C46A";
    ctx.font = "700 14px " + _rcF.title;
    ctx.fillText(t("rcTabAlly", lang).toUpperCase() + " · TOP MVP", rX + 22, rY + 304);

    const allyMap = (data.matchStats && data.matchStats.allyDamage) || {};
    const topEntries = Object.entries(allyMap).sort(function(a, b) { return b[1] - a[1]; });
    let totA = 0;
    for (let i = 0; i < topEntries.length; i++) totA += topEntries[i][1];

    for (let i = 0; i < Math.min(3, topEntries.length); i++) {
      const ey = rY + 334 + i * 42;
      const eName = label(topEntries[i][0], lang);
      const eVal = topEntries[i][1];
      const ePct = totA > 0 ? (eVal / totA) : 0;

      ctx.textAlign = "left";
      ctx.fillStyle = "#DCE8F5";
      ctx.font = "600 13px " + _rcF.ui;
      ctx.fillText(eName, rX + 22, ey);

      ctx.textAlign = "right";
      ctx.fillStyle = "#00E5FF";
      ctx.font = "700 13px " + _rcF.title;
      ctx.fillText(formatCompact(eVal) + " (" + (ePct * 100).toFixed(1) + "%)", rX + rW - 22, ey);

      ctx.fillStyle = "rgba(11, 42, 91, 0.8)";
      ctx.fillRect(rX + 22, ey + 8, rW - 44, 8);
      ctx.fillStyle = DONUT_PALETTE_ALLY[i % DONUT_PALETTE_ALLY.length];
      ctx.fillRect(rX + 22, ey + 8, (rW - 44) * ePct, 8);
    }

    // Footer Branding
    ctx.textAlign = "left";
    ctx.fillStyle = "#DCE8F5";
    ctx.font = "700 18px " + _rcF.title;
    ctx.fillText("PISCES: SPACE JOURNEY   ·   " + t("rcKillsTotalLabel", lang).toUpperCase() + ": " + formatNumber((data.kills && data.kills.total) || 0), 56, H - 46);

    ctx.textAlign = "right";
    ctx.fillStyle = "#00E5FF";
    ctx.font = "700 17px " + _rcF.ui;
    ctx.fillText("aansensei.dev/space-shooter", W - 56, H - 46);
  }
}

function drawMiniTimelineInShareCard(ctx, x, y, w, h, metrics) {
  const tl = metrics.tl;
  const n = tl.length;
  if (n === 0) return;

  const upperH = h * 0.72;
  const lowerTop = y + upperH + 6;
  const lowerH = h - upperH - 6;
  const maxAlly = Math.max(1000, metrics.peakVal * 1.12);
  const maxTaken = Math.max(100, metrics.dangerVal * 1.15);

  ctx.save();
  ctx.strokeStyle = "rgba(63, 169, 245, 0.2)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);

  // Area fill under Ally Damage
  const grad = ctx.createLinearGradient(0, y, 0, y + upperH);
  grad.addColorStop(0, "rgba(0, 229, 255, 0.38)");
  grad.addColorStop(1, "rgba(0, 229, 255, 0.02)");
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const px = x + (i / Math.max(1, n - 1)) * w;
    const py = y + upperH - ((tl[i].allyDamage || 0) / maxAlly) * (upperH - 12);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.lineTo(x + w, y + upperH);
  ctx.lineTo(x, y + upperH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // Ally Damage Line
  ctx.strokeStyle = "#00E5FF";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const px = x + (i / Math.max(1, n - 1)) * w;
    const py = y + upperH - ((tl[i].allyDamage || 0) / maxAlly) * (upperH - 12);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Moving Average 30s Line
  ctx.strokeStyle = "#E8C46A";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const px = x + (i / Math.max(1, n - 1)) * w;
    const py = y + upperH - (metrics.ma30[i] / maxAlly) * (upperH - 12);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.stroke();

  // Damage Taken Bars
  const bw = Math.max(2, (w / n) * 0.65);
  for (let i = 0; i < n; i++) {
    const dt = tl[i].damageTaken || 0;
    if (dt <= 0) continue;
    const px = x + (i / Math.max(1, n - 1)) * w;
    const bh = Math.min(lowerH, (dt / maxTaken) * lowerH);
    ctx.fillStyle = (i === metrics.dangerIdx) ? "#FF4D6D" : "rgba(63, 169, 245, 0.7)";
    ctx.fillRect(px - bw * 0.5, lowerTop + lowerH - bh, bw, bh);
  }
  ctx.restore();
}

// 8. openRecap(container, data, lang, onPlayAgain, onMainMenu) & closeRecap()
function renderStatBarsHtml(statsObj, tabKey, lang) {
  const palette = tabKey === "allyDamage"
    ? DONUT_PALETTE_ALLY
    : (tabKey === "enemyDamage" ? DONUT_PALETTE_ENEMY : DONUT_PALETTE_LIVES);

  const entries = Object.entries(statsObj || {}).sort(function(a, b) { return b[1] - a[1]; });
  let total = 0;
  for (let i = 0; i < entries.length; i++) total += entries[i][1];
  if (entries.length === 0) return '<div class="rc-empty">' + t("rcEmptyStats", lang) + '</div>';

  let html = "";
  for (let i = 0; i < entries.length; i++) {
    const rawKey = entries[i][0];
    const val = entries[i][1];
    const pct = total > 0 ? ((val / total) * 100) : 0;
    const col = palette[i % palette.length];
    const dispVal = tabKey === "lifeLoss"
      ? (val + " " + t("rcUnitLives", lang) + " · " + pct.toFixed(1) + "%")
      : (formatNumber(val) + " · " + pct.toFixed(1) + "%");

    html += (
      '<div class="rc-stat-item">' +
        '<div class="rc-stat-row-top">' +
          '<span class="rc-stat-name">' +
            '<span class="rc-stat-swatch" style="background:' + col + '"></span>' +
            '<span>' + label(rawKey, lang) + '</span>' +
          '</span>' +
          '<span class="rc-stat-numbers" style="color:' + (tabKey === "lifeLoss" ? "#FF4D6D" : "#00E5FF") + '">' + dispVal + '</span>' +
        '</div>' +
        '<div class="rc-stat-track">' +
          '<div class="rc-stat-fill" style="width:' + pct.toFixed(1) + '%;background:' + col + '"></div>' +
        '</div>' +
      '</div>'
    );
  }
  return html;
}

function openRecap(container, data, lang, onPlayAgain, onMainMenu) {
  closeRecap();
  ensureSpritesInitialized();

  const useLang = lang || (data && data.lang) || "vi";
  const useData = data;
  const metrics = computeTimelineMetrics(useData);

  _rcUseLang(useLang);
  _rcLoadFonts(useLang);
  _recapState.active = true;
  _recapState.container = container;
  _recapState.data = useData;
  _recapState.lang = useLang;
  _recapState.activeTab = "allyDamage";
  _recapState.shareFormat = "portrait";
  _recapState.pilotName = _rcLoadName();
  // Counters start once the title has lifted out of the way.
  _recapState.startMs = performance.now() + RC_INTRO_LIFT_MS + 273;
  _recapState.cleanupFns = [];

  // Top 5 kills
  const killsByType = (useData.kills && useData.kills.byType) || {};
  const killEntries = Object.entries(killsByType).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);
  const maxKillVal = killEntries.length > 0 ? Math.max(1, killEntries[0][1]) : 1;
  let killsRowsHtml = "";
  for (let i = 0; i < killEntries.length; i++) {
    const kName = label(killEntries[i][0], useLang);
    const kCount = killEntries[i][1];
    const kPct = Math.min(100, (kCount / maxKillVal) * 100);
    killsRowsHtml += (
      '<div class="rc-kill-row">' +
        '<span class="rc-kill-name">' + kName + '</span>' +
        '<div class="rc-kill-bar-bg"><div class="rc-kill-bar-fill" style="width:' + kPct.toFixed(1) + '%"></div></div>' +
        '<span class="rc-kill-count">' + formatNumber(kCount) + '</span>' +
      '</div>'
    );
  }

  if (killEntries.length === 0) killsRowsHtml = '<div class="rc-empty">' + t("rcEmptyKills", useLang) + '</div>';

  // Sigil pills legend
  const sigils = useData.sigils || [];
  let sigilPillsHtml = "";
  for (let i = 0; i < sigils.length; i++) {
    const s = sigils[i];
    const sName = useLang === "vi" ? (s.vi || s.name) : s.name;
    const wLabel = s.atWave === 0 ? t("rcAtWave", useLang) : t("rcWaveNum", useLang, { w: s.atWave });
    sigilPillsHtml += (
      '<span class="rc-sigil-pill">' +
        '<span class="rc-sigil-dot" style="background:' + (s.color || "#00E5FF") + '"></span>' +
        '<span>' + sName + '</span>' +
        '<span class="rc-sigil-wave">(' + wLabel + ')</span>' +
      '</span>'
    );
  }

  const canShareFiles = Boolean(navigator.share && navigator.canShare);

  container.innerHTML = (
    '<div class="rc-root rc-lang-' + useLang + '">' +
      '<canvas class="rc-bg-canvas" id="rcBgCanvas"></canvas>' +
      '<div class="rc-bottom-glow"></div>' +
      '<div class="rc-scroll">' +
        '<div class="rc-container">' +

          /* 1. Title with faint Pisces Constellation behind */
          '<header class="rc-header rc-stage-item" id="rcStageTitle">' +
            '<svg class="rc-pisces-emblem" viewBox="0 0 320 110" fill="none">' +
              '<path d="M28 84 L68 58 L112 48 L158 56 L204 42 L248 28 L292 38" stroke="#00E5FF" stroke-width="1.2" stroke-dasharray="3 3"/>' +
              '<path d="M68 58 L54 24 L92 18 L112 48 M204 42 L228 78 L268 72 L248 28" stroke="#3FA9F5" stroke-width="1"/>' +
              '<circle cx="28" cy="84" r="3" fill="#E8C46A"/>' +
              '<circle cx="68" cy="58" r="3.5" fill="#00E5FF"/>' +
              '<circle cx="112" cy="48" r="3" fill="#DCE8F5"/>' +
              '<circle cx="158" cy="56" r="4" fill="#E8C46A"/>' +
              '<circle cx="204" cy="42" r="3.5" fill="#00E5FF"/>' +
              '<circle cx="248" cy="28" r="3" fill="#DCE8F5"/>' +
              '<circle cx="292" cy="38" r="3" fill="#E8C46A"/>' +
            '</svg>' +
            '<div class="rc-subtitle-top">' + t("rcAstralSub", useLang) + '</div>' +
            '<h1 class="rc-title">' + t("rcTitle", useLang) + '</h1>' +
            '<div class="rc-divider-ornate">' +
              '<span class="rc-divider-line"></span>' +
              '<svg class="rc-star-oct" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0L14.8 9.2L24 12L14.8 14.8L12 24L9.2 14.8L0 12L9.2 9.2L12 0Z"/></svg>' +
              '<span class="rc-divider-line rc-right"></span>' +
            '</div>' +
          '</header>' +

          /* 2. Three Big Numbers + Cause of Fall */
          '<section class="rc-stage-item" id="rcStageMetrics">' +
            '<div class="rc-hero-metrics">' +
              '<div class="rc-metric-box rc-metric-primary">' +
                '<div class="rc-metric-label">' + t("rcScore", useLang) + '</div>' +
                '<div class="rc-metric-val" id="rcCountScore">0</div>' +
                '<div class="rc-metric-sub">' + t("rcScoreSub", useLang) + '</div>' +
              '</div>' +
              '<div class="rc-metric-box">' +
                '<div class="rc-metric-label">' + t("rcWave", useLang) + '</div>' +
                '<div class="rc-metric-val" id="rcCountWave">0</div>' +
                '<div class="rc-metric-sub">' + t("rcWaveSub", useLang) + '</div>' +
              '</div>' +
              '<div class="rc-metric-box">' +
                '<div class="rc-metric-label">' + t("rcTime", useLang) + '</div>' +
                '<div class="rc-metric-val" id="rcCountTime">0:00</div>' +
                '<div class="rc-metric-sub">' + t("rcTimeSub", useLang) + '</div>' +
              '</div>' +
            '</div>' +
          '</section>' +

          /* 5. Engraved Cause of Fall */
          '<section class="rc-epitaph rc-stage-item" id="rcStageEpitaph">' +
            '<div class="rc-epitaph-left">' +
              '<i class="rc-mark"></i>' +
              '<div class="rc-epitaph-text">' +
                (useData.quit
                  ? t("rcQuitLine", useLang)
                  : t("rcEpitaphPrefix", useLang) + '<span class="rc-epitaph-cause">' + label(useData.cause || "Unknown", useLang) + '</span>') +
              '</div>' +
            '</div>' +
            '<div class="rc-epitaph-lives">' +
              t("rcLivesLostBadge", useLang, { lost: useData.livesLost || 0, start: useData.livesStart || 0 }) +
            '</div>' +
          '</section>' +

          /* Main 2-column Grid: Left (Sigils + Kills) | Right (Match Statistics + Battle Timeline) */
          '<div class="rc-main-grid rc-stage-item" id="rcStageCharts">' +
            '<div class="rc-col">' +
              /* 4. Chosen Sigil Constellation */
              '<article class="rc-card">' +
                '<div class="rc-section-head">' +
                  '<div class="rc-section-title">' +
                    '<i class="rc-mark"></i>' +
                    '<span>' + t("rcSigilTitle", useLang) + '</span>' +
                  '</div>' +
                  '<span class="rc-section-sub">' + t("rcSigilSub", useLang) + '</span>' +
                '</div>' +
                '<div class="rc-sigil-canvas-wrap">' +
                  '<canvas class="rc-sigil-canvas" id="rcSigilCanvas"></canvas>' +
                '</div>' +
                '<div class="rc-sigil-legend">' + sigilPillsHtml + '</div>' +
              '</article>' +

              /* 3. Kills Breakdown */
              '<article class="rc-card">' +
                '<div class="rc-section-head">' +
                  '<div class="rc-section-title">' +
                    '<i class="rc-mark"></i>' +
                    '<span>' + t("rcKillsTitle", useLang) + '</span>' +
                  '</div>' +
                  '<span class="rc-section-sub">' + t("rcKillsSub", useLang) + '</span>' +
                '</div>' +
                '<div class="rc-kills-top">' +
                  '<span class="st-desc">' + t("rcKillsTotalLabel", useLang) + '</span>' +
                  '<span class="rc-kills-total-num" id="rcCountKills">0</span>' +
                '</div>' +
                '<div class="rc-kills-list">' + killsRowsHtml + '</div>' +
              '</article>' +
            '</div>' +

            '<div class="rc-col">' +
              /* 6. Match Analysis (3 tabs + donut + horizontal bars) */
              '<article class="rc-card">' +
                '<div class="rc-section-head">' +
                  '<div class="rc-section-title">' +
                    '<i class="rc-mark"></i>' +
                    '<span>' + t("rcAnalysisTitle", useLang) + '</span>' +
                  '</div>' +
                  '<span class="rc-section-sub">' + t("rcAnalysisSub", useLang) + '</span>' +
                '</div>' +
                '<div class="rc-tabs">' +
                  '<button type="button" class="rc-tab-btn rc-active" data-rctab="allyDamage">' + t("rcTabAlly", useLang) + '</button>' +
                  '<button type="button" class="rc-tab-btn" data-rctab="enemyDamage">' + t("rcTabEnemy", useLang) + '</button>' +
                  '<button type="button" class="rc-tab-btn rc-tab-danger" data-rctab="lifeLoss">' + t("rcTabLives", useLang) + '</button>' +
                '</div>' +
                '<div class="rc-analysis-body">' +
                  '<div class="rc-donut-wrap"><canvas class="rc-donut-canvas" id="rcDonutCanvas"></canvas></div>' +
                  '<div class="rc-stat-bars" id="rcStatBars">' +
                    renderStatBarsHtml((useData.matchStats && useData.matchStats.allyDamage) || {}, "allyDamage", useLang) +
                  '</div>' +
                '</div>' +
              '</article>' +

              /* 7. Battle Timeline Chart */
              '<article class="rc-card">' +
                '<div class="rc-section-head">' +
                  '<div class="rc-section-title">' +
                    '<i class="rc-mark"></i>' +
                    '<span>' + t("rcTimelineTitle", useLang) + '</span>' +
                  '</div>' +
                  '<span class="rc-section-sub">' + t("rcTimelineSub", useLang) + '</span>' +
                '</div>' +
                '<div class="rc-timeline-wrap"><canvas class="rc-timeline-canvas" id="rcTimelineCanvas"></canvas></div>' +
                '<div class="rc-timeline-legend">' +
                  '<span class="rc-legend-item"><span class="rc-legend-line" style="background:#00E5FF"></span><span>' + t("rcLegOutput", useLang) + '</span></span>' +
                  '<span class="rc-legend-item"><span class="rc-legend-line" style="background:#E8C46A"></span><span>' + t("rcLegMa", useLang) + '</span></span>' +
                  '<span class="rc-legend-item"><span class="rc-legend-line" style="background:#FF4D6D"></span><span>' + t("rcLegTaken", useLang) + '</span></span>' +
                  '<span class="rc-legend-item"><span class="rc-legend-line" style="background:rgba(232,196,106,0.55)"></span><span>' + t("rcLegWave", useLang) + '</span></span>' +
                '</div>' +
                '<div class="rc-timeline-summary">' +
                  '<div class="rc-sum-cell"><div class="rc-sum-label">' + t("rcSumDps", useLang) + '</div><div class="rc-sum-val">' + formatNumber(metrics.avgDps) + '/s</div></div>' +
                  '<div class="rc-sum-cell"><div class="rc-sum-label">' + t("rcSumPeak", useLang) + '</div><div class="rc-sum-val">' + formatNumber(metrics.peakVal) + '</div></div>' +
                  '<div class="rc-sum-cell"><div class="rc-sum-label">' + t("rcSumMvp", useLang) + '</div><div class="rc-sum-val" title="' + label(metrics.mvpRaw, useLang) + '">' + label(metrics.mvpRaw, useLang) + '</div></div>' +
                  '<div class="rc-sum-cell"><div class="rc-sum-label">' + t("rcSumTop3", useLang) + '</div><div class="rc-sum-val">' + metrics.top3Pct + '</div></div>' +
                '</div>' +
              '</article>' +
            '</div>' +
          '</div>' +

        '</div>' +
      '</div>' +

      /* 8. Footer Action Buttons */
      '<footer class="rc-actions rc-stage-item" id="rcStageButtons">' +
        '<button type="button" class="rc-btn rc-btn-secondary" id="rcBtnMainMenu">' + t("rcBtnMainMenu", useLang) + '</button>' +
        '<button type="button" class="rc-btn rc-btn-primary" id="rcBtnPlayAgain">' + t("rcBtnPlayAgain", useLang) + '</button>' +
        '<button type="button" class="rc-btn rc-btn-share" id="rcBtnCreateImg">' + t("rcBtnCreateImg", useLang) + '</button>' +
      '</footer>' +

      /* 9. Share Card Preview Modal */
      '<div class="rc-modal-backdrop" id="rcShareModal">' +
        '<div class="rc-modal">' +
          '<div class="rc-modal-header">' +
            '<span class="rc-modal-title"><i class="rc-mark"></i>' + t("rcModalTitle", useLang) + '</span>' +
            '<button type="button" class="rc-modal-close" id="rcBtnCloseModal"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6L18 18"/></svg></button>' +
          '</div>' +
          '<div class="rc-modal-body">' +
            '<div class="rc-format-switch">' +
              '<button type="button" class="rc-tab-btn rc-active" data-sharefmt="portrait">' + t("rcFmtPortrait", useLang) + '</button>' +
              '<button type="button" class="rc-tab-btn" data-sharefmt="landscape">' + t("rcFmtLandscape", useLang) + '</button>' +
            '</div>' +
            '<label class="rc-name-field">' +
              '<span class="rc-name-label">' + t("rcNameLabel", useLang) + '</span>' +
              '<input type="text" class="rc-name-input" id="rcNameInput" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done" placeholder="' + t("rcTitle", useLang) + '">' +
              '<span class="rc-name-count" id="rcNameCount"></span>' +
            '</label>' +
            '<div class="rc-preview-frame">' +
              '<canvas class="rc-share-canvas" id="rcShareCanvas"></canvas>' +
              '<img class="rc-share-img" id="rcShareImg" alt="">' +
            '</div>' +
            '<div class="rc-save-hint">' + t("rcSaveHint", useLang) + '</div>' +
          '</div>' +
          '<div class="rc-modal-footer">' +
            '<button type="button" class="rc-btn rc-btn-primary" id="rcBtnDownloadCard">' + t("rcBtnDownload", useLang) + '</button>' +
            (canShareFiles
              ? '<button type="button" class="rc-btn rc-btn-share" id="rcBtnNativeShare">' + t("rcBtnShare", useLang) + '</button>'
              : '') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="rc-save-view" id="rcSaveView">' +
        '<div class="rc-save-view-hint">' + t("rcSaveViewHint", useLang) + '</div>' +
        '<img class="rc-save-view-img" id="rcSaveViewImg" alt="">' +
        '<button type="button" class="rc-btn rc-btn-secondary" id="rcBtnCloseSaveView">' + t("rcBtnDone", useLang) + '</button>' +
      '</div>' +
      '<div class="rc-toast" id="rcToast"></div>' +
    '</div>'
  );

  // The title opens centred and enlarged. Measured before the intro class goes
  // on so the header starts there instead of sliding in from the top.
  const rootEl = container.querySelector(".rc-root");
  const elTitle = container.querySelector("#rcStageTitle");
  const titleText = container.querySelector(".rc-title");
  if (rootEl && elTitle && titleText) {
    const rootRect = rootEl.getBoundingClientRect();
    const headRect = elTitle.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(titleText);
    const textW = Math.max(1, range.getBoundingClientRect().width);
    const introScale = Math.max(1, Math.min(1.75, (rootRect.width * 0.9) / textW));
    const introY = rootRect.top + rootRect.height * 0.46 - (headRect.top + headRect.height * 0.5) + 14;
    rootEl.style.setProperty("--rc-intro-y", introY.toFixed(1) + "px");
    rootEl.style.setProperty("--rc-intro-s", introScale.toFixed(3));
    elTitle.style.transition = "none";
    rootEl.classList.add("rc-intro");
    void elTitle.offsetHeight;
    elTitle.style.transition = "";
  }

  // Sequenced Entrance Triggers
  const elMetrics = container.querySelector("#rcStageMetrics");
  const elEpitaph = container.querySelector("#rcStageEpitaph");
  const elCharts = container.querySelector("#rcStageCharts");
  const elButtons = container.querySelector("#rcStageButtons");

  const t1 = setTimeout(function() { if (elTitle) elTitle.classList.add("rc-visible"); }, 40);
  const tLift = setTimeout(function() { if (rootEl) rootEl.classList.remove("rc-intro"); }, RC_INTRO_LIFT_MS);
  const t2 = setTimeout(function() {
    if (elMetrics) elMetrics.classList.add("rc-visible");
    if (elEpitaph) elEpitaph.classList.add("rc-visible");
  }, RC_INTRO_LIFT_MS + 382);
  const t3 = setTimeout(function() { if (elCharts) elCharts.classList.add("rc-visible"); }, RC_INTRO_LIFT_MS + 582);
  const t4 = setTimeout(function() { if (elButtons) elButtons.classList.add("rc-visible"); }, RC_INTRO_LIFT_MS + 782);
  _recapState.cleanupFns.push(function() {
    clearTimeout(t1); clearTimeout(tLift); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
  });

  // Wire Match Analysis Tabs
  const tabBtns = container.querySelectorAll("[data-rctab]");
  const statBarsEl = container.querySelector("#rcStatBars");
  const donutCanvas = container.querySelector("#rcDonutCanvas");

  for (let i = 0; i < tabBtns.length; i++) {
    tabBtns[i].addEventListener("click", function() {
      const targetTab = this.getAttribute("data-rctab");
      _recapState.activeTab = targetTab;
      for (let j = 0; j < tabBtns.length; j++) {
        tabBtns[j].classList.toggle("rc-active", tabBtns[j].getAttribute("data-rctab") === targetTab);
      }
      const mapObj = (useData.matchStats && useData.matchStats[targetTab]) || {};
      if (statBarsEl) statBarsEl.innerHTML = renderStatBarsHtml(mapObj, targetTab, useLang);
      drawDonutChart(donutCanvas, mapObj, targetTab, useLang, 1);
    });
  }

  // Wire Action Buttons
  let toastTimer = 0;
  const showToast = function(msg, ms) {
    const toast = container.querySelector("#rcToast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("rc-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { toast.classList.remove("rc-show"); }, ms || 2200);
  };

  const btnPlayAgain = container.querySelector("#rcBtnPlayAgain");
  if (btnPlayAgain) {
    btnPlayAgain.addEventListener("click", function() {
      if (typeof onPlayAgain === "function") onPlayAgain();
    });
  }

  const btnMainMenu = container.querySelector("#rcBtnMainMenu");
  if (btnMainMenu) {
    btnMainMenu.addEventListener("click", function() {
      if (typeof onMainMenu === "function") onMainMenu();
    });
  }

  // Wire Share Card Modal
  const shareModal = container.querySelector("#rcShareModal");
  const shareCanvas = container.querySelector("#rcShareCanvas");
  const btnCreateImg = container.querySelector("#rcBtnCreateImg");
  const btnCloseModal = container.querySelector("#rcBtnCloseModal");
  const fmtBtns = container.querySelectorAll("[data-sharefmt]");
  const shareImg = container.querySelector("#rcShareImg");
  const previewFrame = container.querySelector(".rc-preview-frame");

  // Every draw marks the PNG stale; a new one is encoded once drawing pauses,
  // so the save buttons can hand it over inside the tap itself.
  let cardBlob = null, cardUrl = "", cardTimer = 0, cardVersion = 0;
  const encodeCard = function() {
    cardTimer = 0;
    const v = cardVersion;
    shareCanvas.toBlob(function(blob) {
      if (!blob || v !== cardVersion || !_recapState.active) return;
      cardBlob = blob;
      if (cardUrl) URL.revokeObjectURL(cardUrl);
      cardUrl = URL.createObjectURL(blob);
      if (shareImg) shareImg.src = cardUrl;
      if (previewFrame) previewFrame.classList.add("rc-img-ready");
    }, "image/png");
  };
  const drawCard = function() {
    drawShareCard(shareCanvas, useData, useLang, _recapState.shareFormat);
    cardVersion++;
    cardBlob = null;
    if (previewFrame) previewFrame.classList.remove("rc-img-ready");
    clearTimeout(cardTimer);
    cardTimer = setTimeout(encodeCard, 250);
  };
  const withCardBlob = function(fn) {
    if (cardBlob) { fn(cardBlob); return; }
    shareCanvas.toBlob(function(blob) { fn(blob); }, "image/png");
  };
  const cardFileName = function() {
    return "pisces-voyage-" + Math.round(useData.score || 0) + "-" + _recapState.shareFormat + ".png";
  };
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isTouch = !!(window.matchMedia && window.matchMedia("(pointer: coarse)").matches);
  if (shareImg) {
    // The page blocks the context menu everywhere; this image is the one
    // place a long press must reach it.
    shareImg.addEventListener("contextmenu", function(e) { e.stopPropagation(); });
  }
  const saveView = container.querySelector("#rcSaveView");
  const saveViewImg = container.querySelector("#rcSaveViewImg");
  let saveViewUrl = "";
  const closeSaveView = function() {
    if (saveView) saveView.classList.remove("rc-open");
    if (saveViewUrl) { URL.revokeObjectURL(saveViewUrl); saveViewUrl = ""; }
  };
  const openSaveView = function(blob) {
    if (!saveView || !saveViewImg) return;
    closeSaveView();
    if (blob === cardBlob && cardUrl) saveViewImg.src = cardUrl;
    else { saveViewUrl = URL.createObjectURL(blob); saveViewImg.src = saveViewUrl; }
    saveView.classList.add("rc-open");
  };
  if (saveViewImg) saveViewImg.addEventListener("contextmenu", function(e) { e.stopPropagation(); });
  const btnCloseSaveView = container.querySelector("#rcBtnCloseSaveView");
  if (btnCloseSaveView) btnCloseSaveView.addEventListener("click", closeSaveView);
  _recapState.cleanupFns.push(function() {
    clearTimeout(cardTimer);
    clearTimeout(toastTimer);
    closeSaveView();
    if (cardUrl) URL.revokeObjectURL(cardUrl);
    cardUrl = "";
  });

  if (btnCreateImg && shareModal) {
    btnCreateImg.addEventListener("click", function() {
      shareModal.classList.add("rc-open");
      drawCard();
      Promise.all([_rcLoadFonts(useLang), _rcNeedsViFont(_recapState.pilotName) ? _rcLoadFonts("vi") : null]).then(function() {
        if (_recapState.active) drawCard();
      });
    });
  }
  if (btnCloseModal && shareModal) {
    // Closing the dialog hands back the card's memory (about 6MB of pixels
    // plus its PNG); opening it again redraws it.
    const releaseCard = function() {
      clearTimeout(cardTimer);
      cardVersion++;
      cardBlob = null;
      closeSaveView();
      if (cardUrl) { URL.revokeObjectURL(cardUrl); cardUrl = ""; }
      if (shareImg) shareImg.removeAttribute("src");
      if (previewFrame) previewFrame.classList.remove("rc-img-ready");
      shareCanvas.width = 1;
      shareCanvas.height = 1;
    };
    btnCloseModal.addEventListener("click", function() {
      shareModal.classList.remove("rc-open");
      releaseCard();
    });
  }
  for (let i = 0; i < fmtBtns.length; i++) {
    fmtBtns[i].addEventListener("click", function() {
      const fmt = this.getAttribute("data-sharefmt");
      _recapState.shareFormat = fmt;
      for (let j = 0; j < fmtBtns.length; j++) {
        fmtBtns[j].classList.toggle("rc-active", fmtBtns[j].getAttribute("data-sharefmt") === fmt);
      }
      drawCard();
    });
  }

  // Callsign field: the preview follows each keystroke, one redraw per frame.
  const nameInput = container.querySelector("#rcNameInput");
  const nameCount = container.querySelector("#rcNameCount");
  let nameRaf = 0;
  const redrawCard = function() {
    nameRaf = 0;
    if (_recapState.active) drawCard();
  };
  const queueRedraw = function() {
    if (!nameRaf) nameRaf = requestAnimationFrame(redrawCard);
  };
  const applyName = function() {
    const chars = Array.from(nameInput.value.normalize("NFC"));
    if (chars.length > RC_NAME_MAX) nameInput.value = chars.slice(0, RC_NAME_MAX).join("");
    const clean = _rcCleanName(nameInput.value);
    _recapState.pilotName = clean;
    _rcSaveName(clean);
    nameCount.textContent = Array.from(clean).length + "/" + RC_NAME_MAX;
    if (_rcNeedsViFont(clean)) _rcLoadFonts("vi").then(queueRedraw);
    queueRedraw();
  };
  if (nameInput && nameCount && shareCanvas) {
    let composing = false;
    nameInput.value = _recapState.pilotName;
    nameCount.textContent = Array.from(_recapState.pilotName).length + "/" + RC_NAME_MAX;
    nameInput.addEventListener("compositionstart", function() { composing = true; });
    nameInput.addEventListener("compositionend", function() { composing = false; applyName(); });
    nameInput.addEventListener("input", function() { if (!composing) applyName(); });
    // Typing here must not reach the game's hotkeys.
    nameInput.addEventListener("keydown", function(e) {
      e.stopPropagation();
      if (e.key === "Enter") nameInput.blur();
    });
    nameInput.addEventListener("keyup", function(e) { e.stopPropagation(); });
    _recapState.cleanupFns.push(function() { cancelAnimationFrame(nameRaf); });
  }

  const btnDownloadCard = container.querySelector("#rcBtnDownloadCard");
  if (btnDownloadCard && shareCanvas) {
    btnDownloadCard.addEventListener("click", function() {
      withCardBlob(function(blob) {
        if (!blob) { showToast(t("rcSaveFailed", useLang)); return; }
        const name = cardFileName();
        // iPhone downloads land in Files, and Save Image in its share sheet
        // reloads a home screen app, so the long press view is the way into Photos.
        if (isIOS) { openSaveView(blob); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.download = name;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(function() { URL.revokeObjectURL(url); }, 60000);
        // A download can fail silently on phones, so they also get the long press way.
        if (isTouch) showToast(t("rcSaveStarted", useLang), 4200);
        else showToast(t("rcShareSaved", useLang));
      });
    });
  }

  const btnNativeShare = container.querySelector("#rcBtnNativeShare");
  if (btnNativeShare && shareCanvas) {
    btnNativeShare.addEventListener("click", function() {
      withCardBlob(function(blob) {
        if (!blob) { showToast(t("rcSaveFailed", useLang)); return; }
        const file = new File([blob], cardFileName(), { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({
            title: "Pisces: Space Journey",
            text: t("rcTitle", useLang) + ": " + formatNumber(useData.score || 0),
            files: [file]
          }).catch(function() {});
        }
      });
    });
  }

  // Real-time Animation Loop (ms-driven, 120Hz smooth, stops on closeRecap)
  const bgCanvas = container.querySelector("#rcBgCanvas");
  const sigilCanvas = container.querySelector("#rcSigilCanvas");
  const timelineCanvas = container.querySelector("#rcTimelineCanvas");
  const elScore = container.querySelector("#rcCountScore");
  const elWave = container.querySelector("#rcCountWave");
  const elTime = container.querySelector("#rcCountTime");
  const elKills = container.querySelector("#rcCountKills");

  let lastChartProg = -1;

  function stepRecap(nowMs) {
    if (!_recapState.active) return;
    const elapsed = Math.max(0, nowMs - _recapState.startMs);

    // 1. Background Astrolabe & Stardust
    if (bgCanvas) {
      const rect = bgCanvas.getBoundingClientRect();
      const w = Math.max(300, Math.floor(rect.width));
      const h = Math.max(300, Math.floor(rect.height));
      if (bgCanvas.width !== w || bgCanvas.height !== h) {
        bgCanvas.width = w;
        bgCanvas.height = h;
      }
      renderCelestialBackground(
        bgCanvas.getContext("2d"),
        w,
        h,
        nowMs,
        Math.round((window._bgBrightness || 1) * 100),
        (window._fxOpts && window._fxOpts.fxBrightness != null) ? window._fxOpts.fxBrightness : 100
      );
    }

    // 2. Number Count-up (starts at 164ms, duration 1000ms)
    const countProg = Math.max(0, Math.min(1, (elapsed - 164) / 1000));
    const easeOut = 1 - Math.pow(1 - countProg, 3);
    if (elScore) elScore.textContent = formatNumber((useData.score || 0) * easeOut);
    if (elWave) elWave.textContent = String(Math.round((useData.wave || 0) * easeOut));
    if (elTime) elTime.textContent = formatTimeMs((useData.timeMs || 0) * easeOut);
    if (elKills) elKills.textContent = formatNumber(((useData.kills && useData.kills.total) || 0) * easeOut);

    // 3. Charts progressive draw (starts at 327ms, duration 864ms)
    const chartProg = Math.max(0, Math.min(1, (elapsed - 327) / 864));
    const chartEase = 1 - Math.pow(1 - chartProg, 3);

    drawSigilConstellationCanvas(sigilCanvas, sigils, useLang, chartEase, nowMs);

    if (chartProg !== lastChartProg) {
      const activeStats = (useData.matchStats && useData.matchStats[_recapState.activeTab]) || {};
      drawDonutChart(donutCanvas, activeStats, _recapState.activeTab, useLang, chartEase);
      drawTimelineCanvas(timelineCanvas, metrics, useLang, chartEase);
      lastChartProg = chartProg;
    }

    _recapState.rafId = requestAnimationFrame(stepRecap);
  }

  const onResize = function() {
    lastChartProg = -1;
  };
  window.addEventListener("resize", onResize);
  _recapState.cleanupFns.push(function() {
    window.removeEventListener("resize", onResize);
  });

  _recapState.rafId = requestAnimationFrame(stepRecap);
}

function closeRecap() {
  _recapState.active = false;
  if (_recapState.rafId) {
    cancelAnimationFrame(_recapState.rafId);
    _recapState.rafId = 0;
  }
  for (let i = 0; i < _recapState.cleanupFns.length; i++) {
    try { _recapState.cleanupFns[i](); } catch (e) {}
  }
  _recapState.cleanupFns = [];
}

// Everything the recap shows, gathered from the run that just ended.
function _buildRecapData() {
  const ms = window._matchStats || {};
  const viNames = typeof SIGIL_I18N_VI !== "undefined" ? SIGIL_I18N_VI : {};
  const defs = typeof SIGIL_DEFS !== "undefined" ? SIGIL_DEFS : {};
  const sigils = (window._playerSigils || []).map(function(p) {
    const d = defs[p.sigilId] || {}, v = viNames[p.sigilId] || {};
    return { id: p.sigilId, name: d.name || p.sigilId, vi: v.name || d.name || p.sigilId, color: d.color || "#00E5FF", atWave: p.atWave || 0 };
  });
  const lost = ms.livesLost || 0;
  return {
    score: Math.round(typeof score === "number" ? score : 0),
    wave: typeof _waveNumber === "number" ? _waveNumber : 0,
    timeMs: typeof _gameOverPlayTime === "number" ? _gameOverPlayTime : 0,
    livesStart: lost,
    livesLost: lost,
    cause: ms.lastCause || "Unknown",
    quit: !!ms.quit,
    sigils: sigils,
    kills: { total: ms.killsTotal || 0, byType: ms.kills || {} },
    matchStats: { allyDamage: ms.allyDamage || {}, enemyDamage: ms.enemyDamage || {}, lifeLoss: ms.lifeLoss || {} },
    timeline: ms.timeline || []
  };
}

let _rcOverlay = null;
// data defaults to the run that just ended; the debug console passes its own.
function _openVoyageRecap(data) {
  if (!_rcOverlay) {
    _rcOverlay = document.createElement("div");
    _rcOverlay.id = "recapOverlay";
    document.body.appendChild(_rcOverlay);
  }
  _rcOverlay.style.display = "block";
  const lang = window._lang === "vi" ? "vi" : "en";
  openRecap(_rcOverlay, data || _buildRecapData(), lang, function() {
    _closeVoyageRecap();
    if (typeof startGame === "function") startGame();
  }, function() {
    // The run is already over, so no confirm here.
    if (typeof window._goToMenuImmediate === "function") window._goToMenuImmediate();
  });
}
function _closeVoyageRecap() {
  closeRecap();
  if (_rcOverlay) { _rcOverlay.style.display = "none"; _rcOverlay.innerHTML = ""; }
}

window._openVoyageRecap = _openVoyageRecap;
window._closeVoyageRecap = _closeVoyageRecap;
window._buildRecapData = _buildRecapData;
window.drawShareCard = drawShareCard;
})();
