// news-image-20261123 — "The World Today, Monday 23 November 2026"
// Fresh renderer written from scratch for this bounty only.
// Node 24, PURE stdlib (fs + zlib only). No network at runtime.
// Deterministic: fixed date string, fixed palette, fixed geometry.
// Writes a 1024x1024 PNG to /output/entry.png (PNG built by hand:
// raw RGB scanlines -> zlib deflate -> IHDR/IDAT/IEND chunks with CRC32).
import * as fs from "node:fs";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;
const OUT = "/output/entry.png";

// ---------------------------------------------------------------- palette
const PAPER = [247, 243, 232];
const INK = [16, 32, 46];
const NAVY = [14, 42, 58];
const TEAL = [18, 92, 102];
const GOLD = [212, 160, 44];
const RED = [178, 44, 36];
const ORANGE = [224, 110, 44];
const BLUE = [52, 110, 168];
const GREEN = [46, 125, 78];
const WHITE = [255, 255, 255];
const LIGHT = [232, 226, 208];
const GREY = [96, 104, 110];

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);
function setPix(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: number[]): void {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) { px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; i += 3; }
  }
}
function hline(x: number, y: number, w: number, c: number[]): void { rect(x, y, w, 2, c); }
function circle(cx: number, cy: number, r: number, c: number[]): void {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (x * x + y * y <= r * r) setPix(cx + x, cy + y, c);
  }
}
function ring(cx: number, cy: number, r: number, t: number, c: number[]): void {
  for (let y = -r - t; y <= r + t; y++) for (let x = -r - t; x <= r + t; x++) {
    const d = Math.sqrt(x * x + y * y);
    if (d >= r - t && d <= r + t) setPix(cx + x, cy + y, c);
  }
}
function line(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(Math.abs(dx), Math.abs(dy), 1);
  for (let i = 0; i <= n; i++) setPix(Math.round(x0 + dx * i / n), Math.round(y0 + dy * i / n), c);
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]): void {
  const minX = Math.min(x0, x1, x2), maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2), maxY = Math.max(y0, y1, y2);
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
    const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
    const cc = 1 - a - b;
    if (a >= 0 && b >= 0 && cc >= 0) setPix(x, y, c);
  }
}
// vertical gradient band
function vgrad(x: number, y: number, w: number, h: number, top: number[], bot: number[]): void {
  for (let yy = 0; yy < h; yy++) {
    const t = yy / Math.max(1, h - 1);
    const c = [0, 1, 2].map((k) => Math.round(top[k] + (bot[k] - top[k]) * t));
    rect(x, y + yy, w, 1, c);
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows, 5 bits (bit 4 = leftmost column).
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11], B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e], D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f], F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f], H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e], J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11], L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11], N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d], R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e], T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e], V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11], X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04], Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e], "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f], "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02], "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e], "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e], "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0], ".": [0, 0, 0, 0, 0, 0x0c, 0x0c], ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "-": [0, 0, 0, 0x0e, 0, 0, 0], "'": [0x04, 0x04, 0x08, 0, 0, 0, 0], "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08], "/": [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  "%": [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13], "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0], "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04], "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  "*": [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
};
function textWidth(s: string, sc: number): number {
  return s.length * 6 * sc - sc;
}
function drawText(x: number, y: number, s: string, sc: number, c: number[]): number {
  const up = s.toUpperCase();
  let cx = x;
  for (const ch of up) {
    const g = FONT[ch] || FONT["?"];
    for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++) {
      if ((g[r] >> (4 - col)) & 1) rect(cx + col * sc, y + r * sc, sc, sc, c);
    }
    cx += 6 * sc;
  }
  return cx;
}
function textCenter(cx: number, y: number, s: string, sc: number, c: number[]): void {
  drawText(cx - Math.floor(textWidth(s, sc) / 2), y, s, sc, c);
}
// Word-wrap paragraph; returns y after last line.
function para(x: number, y: number, maxW: number, s: string, sc: number, lh: number, c: number[]): number {
  const words = s.split(" ");
  let line = "";
  let cy = y;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (textWidth(test, sc) > maxW && line) {
      drawText(x, cy, line, sc, c);
      cy += lh;
      line = w;
    } else line = test;
  }
  if (line) { drawText(x, cy, line, sc, c); cy += lh; }
  return cy;
}
function kicker(x: number, y: number, s: string, c: number[]): void {
  drawText(x, y, s, 2, c);
}

// ---------------------------------------------------------------- PNG writer
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function writePng(): void {
  const raw = Buffer.alloc(H * (1 + W * 3));
  const pxBuf = Buffer.from(px.buffer, px.byteOffset, px.byteLength);
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    pxBuf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.mkdirSync("/output", { recursive: true });
  fs.writeFileSync(OUT, png);
}

// ---------------------------------------------------------------- compose
function panel(x: number, y: number, w: number, h: number, bg: number[]): void {
  rect(x, y, w, h, bg);
  rect(x, y, w, 3, GOLD);
  rect(x, y, 3, h, INK);
  rect(x + w - 3, y, 3, h, INK);
  rect(x, y + h - 3, w, 3, INK);
}

function main(): void {
  rect(0, 0, W, H, PAPER);

  // ---- masthead
  rect(0, 0, W, 118, NAVY);
  rect(0, 118, W, 6, GOLD);
  textCenter(512, 18, "THE WORLD TODAY", 6, WHITE);
  textCenter(512, 62, "MONDAY 23 NOVEMBER 2026  *  ONE IMAGE  *  SEVEN STORIES", 2, GOLD);
  drawText(28, 88, "CLIMATE  *  WAR  *  POLITICS  *  MARKETS  *  SPORT", 2, [190, 205, 215]);
  drawText(1024 - 28 - textWidth("NEWS-IMAGE-20261123", 2), 88, "NEWS-IMAGE-20261123", 2, [190, 205, 215]);

  // ---- HERO: COP31 collapses (Antalya, Turkey)
  panel(24, 136, 976, 296, WHITE);
  vgrad(40, 152, 560, 264, [250, 214, 150], [238, 150, 90]);
  // cracked earth globe
  circle(820, 284, 108, BLUE);
  circle(790, 250, 26, GREEN); circle(850, 310, 30, GREEN); circle(830, 240, 16, GREEN);
  line(740, 200, 800, 250, [20, 30, 40]); line(800, 250, 780, 300, [20, 30, 40]);
  line(780, 300, 830, 330, [20, 30, 40]); line(830, 330, 900, 360, [20, 30, 40]);
  line(800, 250, 860, 270, [20, 30, 40]); line(860, 270, 900, 250, [20, 30, 40]);
  ring(820, 284, 108, 3, INK);
  // sun
  circle(700, 190, 26, GOLD); ring(700, 190, 26, 2, ORANGE);
  // NO DEAL stamp
  rect(668, 356, 300, 44, RED);
  textCenter(818, 366, "NO DEAL", 4, WHITE);
  // hero text
  kicker(56, 168, "1  CLIMATE  -  ANTALYA, TURKEY", RED);
  drawText(56, 196, "COP31", 7, INK);
  drawText(56, 252, "COLLAPSES", 7, INK);
  para(56, 312, 560, "Nearly 200 nations end the longest climate summit ever with no deal. The final text dropped every mention of fossil fuels, so the EU and others walked away.", 2, 20, INK);
  drawText(56, 392, "FIRST COP FAILURE SINCE 2009", 2, TEAL);

  // ---- ROW 2: two panels
  // Democrats win the House
  panel(24, 444, 480, 222, WHITE);
  rect(40, 460, 448, 66, NAVY);
  // capitol dome pictogram
  circle(88, 498, 18, WHITE); rect(70, 498, 36, 18, WHITE); rect(60, 516, 56, 6, WHITE);
  drawText(140, 478, "258 SEATS", 4, WHITE);
  drawText(140, 512, "LARGEST SINCE 1992", 2, GOLD);
  kicker(40, 542, "2  POLITICS  -  WASHINGTON", TEAL);
  drawText(40, 568, "DEMOCRATS TAKE", 3, INK);
  drawText(40, 592, "THE HOUSE", 3, INK);
  para(40, 624, 448, "Democrats clinch 258 House seats, the largest majority in 30+ years.", 2, 19, GREY);

  // Ukraine sinks Russian corvette off Libya
  panel(520, 444, 480, 222, WHITE);
  rect(536, 460, 448, 66, [18, 62, 96]);
  // sea + sinking ship + drone
  rect(536, 500, 448, 26, [52, 110, 168]);
  tri(640, 500, 700, 500, 672, 470, [120, 130, 140]);
  line(672, 470, 672, 446, [120, 130, 140]);
  circle(880, 472, 8, RED); line(880, 472, 700, 500, RED);
  drawText(548, 478, "SUNK OFF LIBYA", 3, WHITE);
  kicker(536, 542, "3  WAR AT SEA  -  MEDITERRANEAN", TEAL);
  drawText(536, 568, "UKRAINE SINKS", 3, INK);
  drawText(536, 592, "RUSSIAN WARSHIP", 3, INK);
  para(536, 624, 448, "Naval drones sank the corvette Merkury and hit cargo ship MV Angara.", 2, 19, GREY);

  // ---- ROW 3: three panels
  // Kyiv strikes
  panel(24, 678, 316, 206, WHITE);
  rect(24, 678, 316, 10, RED);
  kicker(40, 700, "4  UKRAINE", RED);
  drawText(40, 726, "11 KILLED", 4, INK);
  drawText(40, 758, "IN KYIV REGION", 3, INK);
  para(40, 790, 284, "Russian strikes on Dymer kill 11, including a teenager.", 2, 18, GREY);

  // Indonesia factory fire
  panel(354, 678, 316, 206, WHITE);
  rect(354, 678, 316, 10, ORANGE);
  kicker(370, 700, "5  DISASTER  -  INDONESIA", ORANGE);
  drawText(370, 726, "24 DEAD", 4, INK);
  drawText(370, 758, "FACTORY FIRE", 3, INK);
  para(370, 790, 284, "A blaze at a candy factory in Banten kills 24, about 30 still missing.", 2, 18, GREY);

  // AI market rout
  panel(684, 678, 316, 206, WHITE);
  rect(684, 678, 316, 10, TEAL);
  kicker(700, 700, "6  MARKETS  -  AI ROUT", TEAL);
  drawText(700, 726, "KOSPI -5%", 4, INK);
  drawText(700, 758, "AI SELLOFF", 3, INK);
  // falling chart
  line(700, 796, 740, 792, RED); line(740, 792, 780, 806, RED); line(780, 806, 820, 800, RED);
  line(820, 800, 860, 822, RED); line(860, 822, 900, 816, RED); line(900, 816, 960, 838, RED);
  drawText(700, 856, "ASIA SINKS, US REBOUNDS", 2, GREY);

  // ---- bottom sport ticker
  rect(24, 896, 976, 84, NAVY);
  rect(24, 896, 976, 4, GOLD);
  drawText(40, 912, "SPORT", 3, GOLD);
  drawText(40, 940, "LIVERPOOL 4-0 MAN UTD  *  POCHETTINO DEBUT IS A NIGHTMARE", 2, WHITE);
  textCenter(512, 992, "SOURCES: REUTERS  *  AP  *  CNN  *  23 NOVEMBER 2026  *  SEVEN STORIES, ONE DAY", 2, GREY);

  writePng();
}

main();
