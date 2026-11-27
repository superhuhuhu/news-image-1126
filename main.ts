// news-image-20261126 — final render.
// Renders one 1024x1024 PNG summing up 26 November 2026 world news.
// Node standard library only. No network. Deterministic output:
// running twice produces byte-identical bytes.
// All story text verified 27 November 2026 against primary and wire
// sources (ONS, Reuters, AP, AFP reporting).

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const W = 1024;
const H = 1024;

// Palette.
const INK: RGB = [16, 21, 29];
const PANEL: RGB = [26, 34, 48];
const CREAM: RGB = [243, 238, 226];
const GOLD: RGB = [198, 158, 74];
const MUTED: RGB = [154, 167, 184];
const RULE: RGB = [198, 158, 74];

type RGB = [number, number, number];

// ---------------------------------------------------------------- font --
// Hand-drawn 5x7 bitmap glyphs, one row per string, '#' = on.
// Uppercase letters, digits and common punctuation. Anything else
// renders blank. Text is uppercased before drawing.

const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00010", "00100", "00000", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
  _: ["00000", "00000", "00000", "00000", "00000", "00000", "11111"],
  "[": ["01110", "01000", "01000", "01000", "01000", "01000", "01110"],
  "]": ["01110", "00010", "00010", "00010", "00010", "00010", "01110"],
  "<": ["00010", "00100", "01000", "10000", "01000", "00100", "00010"],
  ">": ["01000", "00100", "00010", "00001", "00010", "00100", "01000"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
};

const CHAR_W = 6; // 5 px glyph + 1 px gap, before scaling
const CHAR_H = 8; // 7 px glyph + 1 px gap, before scaling

function textWidth(text: string, scale: number): number {
  return text.length * CHAR_W * scale - scale;
}

function wrapText(text: string, scale: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line === "" ? word : line + " " + word;
    if (textWidth(next, scale) <= maxWidth || line === "") {
      line = next;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

// --------------------------------------------------------------- canvas --

class Canvas {
  pixels: Buffer;
  constructor() {
    this.pixels = Buffer.alloc(W * H * 3);
  }
  fill(color: RGB): void {
    for (let i = 0; i < W * H; i++) {
      this.pixels[i * 3] = color[0];
      this.pixels[i * 3 + 1] = color[1];
      this.pixels[i * 3 + 2] = color[2];
    }
  }
  rect(x: number, y: number, w: number, h: number, color: RGB): void {
    for (let yy = y; yy < y + h; yy++) {
      if (yy < 0 || yy >= H) continue;
      for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || xx >= W) continue;
        const i = (yy * W + xx) * 3;
        this.pixels[i] = color[0];
        this.pixels[i + 1] = color[1];
        this.pixels[i + 2] = color[2];
      }
    }
  }
  hline(x: number, y: number, w: number, thickness: number, color: RGB): void {
    this.rect(x, y, w, thickness, color);
  }
  drawChar(ch: string, x: number, y: number, scale: number, color: RGB): void {
    const glyph = GLYPHS[ch] ?? GLYPHS[" "];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] === "1") {
          this.rect(x + col * scale, y + row * scale, scale, scale, color);
        }
      }
    }
  }
  drawText(
    text: string,
    x: number,
    y: number,
    scale: number,
    color: RGB,
  ): void {
    const upper = text.toUpperCase();
    for (let i = 0; i < upper.length; i++) {
      this.drawChar(upper[i], x + i * CHAR_W * scale, y, scale, color);
    }
  }
  drawCentered(
    text: string,
    cx: number,
    y: number,
    scale: number,
    color: RGB,
  ): void {
    const w = textWidth(text.toUpperCase(), scale);
    this.drawText(text, cx - Math.floor(w / 2), y, scale, color);
  }
}

// ------------------------------------------------------------------ png --

const CRC_TABLE: number[] = (() => {
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type, "ascii"), data]));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function encodePng(canvas: Canvas): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    canvas.pixels.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --------------------------------------------------------------- layout --

const STORIES: { headline: string; body: string }[] = [
  {
    headline: "UK NET MIGRATION FALLS TO 77,000",
    body: "Britain's net migration fell to 77,000 in the year to June 2026, official data showed, more than halved from 204,000 and the lowest since 1997 outside the pandemic.",
  },
  {
    headline: "DE COS CHOSEN TO LEAD EUROPE'S ECB",
    body: "Eurozone leaders agreed to recommend Pablo Hernandez de Cos, the BIS chief and a former Bank of Spain governor, to succeed Christine Lagarde in February. Formal approval is due in December.",
  },
  {
    headline: "US PROPOSES 10% DUTY ON BRAZIL JETS",
    body: "Washington proposed a 10% duty on finished Brazilian aircraft. Embraer shares fell over 3% and Brazil called the plan unacceptable, not ruling out reciprocal measures.",
  },
  {
    headline: "BLAST AT BANGKOK OIL SITE HURTS NINE",
    body: "An explosion and fire at Bangchak's Phra Khanong oil facility in Bangkok injured at least nine people, three critically, and forced nearby residents to briefly evacuate. The cause is under investigation.",
  },
  {
    headline: "TWO ITALIANS KILLED IN KUWAIT STRIKE",
    body: "Two Italian technicians were killed when drones struck an air-defence site in Kuwait, Italy and Kuwait said, blaming Iran. Tehran denied any involvement. Two other people were wounded by falling debris.",
  },
];

const BRIEFS: string[] = [
  "HOUTHIS CLAIM STRIKES ON SAUDI PORTS; RIYADH INTERCEPTS MISSILES.",
  "TRUMP URGES PUTIN TO HALT MILITARY AGGRESSION ACROSS EUROPE.",
  "KIM JONG UN INSPECTS NUCLEAR WARHEADS, VOWS TO EXPAND ARSENAL.",
];

function render(): Buffer {
  const cv = new Canvas();
  cv.fill(INK);

  // Outer frame.
  cv.rect(24, 24, W - 48, 3, RULE);
  cv.rect(24, H - 27, W - 48, 3, RULE);
  cv.rect(24, 24, 3, H - 48, RULE);
  cv.rect(W - 27, 24, 3, H - 48, RULE);

  // Kicker + title.
  cv.drawCentered(
    "26 NOVEMBER 2026 - THE WORLD IN ONE IMAGE",
    W / 2,
    62,
    2,
    GOLD,
  );
  cv.drawCentered("ONE DAY,", W / 2, 104, 6, CREAM);
  cv.drawCentered("ONE IMAGE.", W / 2, 164, 6, CREAM);
  cv.hline(412, 238, 200, 3, GOLD);

  // Five stories.
  let y = 268;
  const blockH = 112;
  const textX = 132;
  const textW = W - 48 - textX;
  for (let i = 0; i < STORIES.length; i++) {
    const story = STORIES[i];
    // Number plate.
    cv.rect(48, y, 56, 56, PANEL);
    cv.rect(48, y, 56, 3, GOLD);
    cv.drawCentered(String(i + 1), 48 + 28, y + 14, 4, GOLD);
    // Headline + body.
    cv.drawText(story.headline, textX, y + 2, 3, CREAM);
    const lines = wrapText(story.body, 2, textW);
    for (let li = 0; li < lines.length; li++) {
      cv.drawText(lines[li], textX, y + 34 + li * 18, 2, MUTED);
    }
    y += blockH;
  }

  // In brief.
  cv.hline(48, y + 2, W - 96, 2, PANEL);
  cv.drawText("IN BRIEF", 48, y + 18, 2, GOLD);
  for (let i = 0; i < BRIEFS.length; i++) {
    cv.drawText("- " + BRIEFS[i], 48, y + 44 + i * 20, 2, CREAM);
  }

  // Footer.
  cv.drawCentered(
    "26 NOVEMBER 2026 - REPORTING FROM ONS, REUTERS, AP AND AFP",
    W / 2,
    H - 56,
    2,
    MUTED,
  );

  return encodePng(cv);
}

function main(): void {
  const out = process.env["OUTPUT_PATH"] ?? "/output/entry.png";
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, render());
}

main();
