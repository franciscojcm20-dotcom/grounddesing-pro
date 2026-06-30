import PDFDocument from 'pdfkit';
import { Writable } from 'node:stream';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface ReportMeta {
  projectName: string;
  projectCode?: string;
  company?: string;
  engineer?: string;
  location?: string;
  date?: string;          // ISO string; defaults to today
}

export interface ReportSection {
  title: string;
  norm?: string;
  inputs: Array<{ label: string; value: string | number; unit?: string }>;
  results: Array<{ label: string; value: string | number; unit?: string; highlight?: boolean }>;
  pass?: boolean;          // compliance result
  passLabel?: string;
  observations?: string[];
}

export interface ReportOptions {
  meta: ReportMeta;
  sections: ReportSection[];
  stream: Writable;        // caller-provided write target (file, HTTP response…)
}

// ─── Colours & fonts ──────────────────────────────────────────────────────────

const C = {
  bg:      '#0f1117',
  panel:   '#181c24',
  copper:  '#E07A23',
  text:    '#f2f4f7',
  dim:     '#9aa3b0',
  faint:   '#4b5563',
  safe:    '#22c55e',
  danger:  '#ef4444',
  line:    '#2a2f3e',
  white:   '#ffffff',
  black:   '#000000',
} as const;

// PDFKit uses RGB 0-1 from hex
function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255];
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const PAGE    = { width: 595.28, height: 841.89 };  // A4 pt
const MARGIN  = 40;
const CONTENT = PAGE.width - MARGIN * 2;
const COL_W   = CONTENT / 2 - 6;

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function fillRect(doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, color: string) {
  doc.save().rect(x, y, w, h).fill(hex(color)).restore();
}

function hRule(doc: PDFKit.PDFDocument, y: number, color = C.line) {
  doc.save().moveTo(MARGIN, y).lineTo(PAGE.width - MARGIN, y).lineWidth(0.5).strokeColor(hex(color)).stroke().restore();
}

function label(doc: PDFKit.PDFDocument, x: number, y: number, text: string, size = 7, color = C.dim) {
  doc.fontSize(size).fillColor(hex(color)).text(text, x, y, { lineBreak: false });
}

function value(doc: PDFKit.PDFDocument, x: number, y: number, text: string, size = 9, color = C.text) {
  doc.fontSize(size).fillColor(hex(color)).text(text, x, y, { lineBreak: false });
}

// ─── Header block ─────────────────────────────────────────────────────────────

function drawHeader(doc: PDFKit.PDFDocument, meta: ReportMeta, pageNum: number, totalPages: number) {
  // Dark header band
  fillRect(doc, 0, 0, PAGE.width, 58, C.bg);

  // Ground symbol — simplified SVG path via PDFKit
  const sx = MARGIN, sy = 14;
  doc.save()
    .strokeColor(hex(C.copper)).lineWidth(1.5)
    .moveTo(sx + 8, sy).lineTo(sx + 8, sy + 10)          // vertical rod
    .moveTo(sx + 2, sy + 10).lineTo(sx + 14, sy + 10)    // wide bar
    .moveTo(sx + 4, sy + 14).lineTo(sx + 12, sy + 14)    // mid bar
    .moveTo(sx + 6, sy + 18).lineTo(sx + 10, sy + 18)    // narrow bar
    .stroke()
    .restore();

  doc.fontSize(14).fillColor(hex(C.white)).font('Helvetica-Bold')
    .text('GroundDesing', MARGIN + 20, 16, { lineBreak: false })
    .fillColor(hex(C.copper))
    .text('Pro', MARGIN + 111, 16, { lineBreak: false });

  doc.fontSize(7).fillColor(hex(C.dim)).font('Helvetica')
    .text('Diseño de sistemas de puesta a tierra · IEEE Std 80/81', MARGIN + 20, 33, { lineBreak: false });

  // Right — page number
  doc.fontSize(7).fillColor(hex(C.dim))
    .text(`Pág. ${pageNum} / ${totalPages}`, PAGE.width - MARGIN - 60, 24, { lineBreak: false });

  // Copper accent line below header
  fillRect(doc, 0, 58, PAGE.width, 2, C.copper);
}

// ─── Project meta block ───────────────────────────────────────────────────────

function drawMeta(doc: PDFKit.PDFDocument, meta: ReportMeta): number {
  let y = 76;
  fillRect(doc, MARGIN, y, CONTENT, 52, C.panel);

  const date = meta.date ? new Date(meta.date).toLocaleDateString('es-CL') : new Date().toLocaleDateString('es-CL');

  // Row 1
  label(doc, MARGIN + 10, y + 8,  'PROYECTO');
  value(doc, MARGIN + 10, y + 18, meta.projectName, 11, C.white);
  doc.font('Helvetica-Bold');

  label(doc, MARGIN + 320, y + 8,  'CÓDIGO');
  value(doc, MARGIN + 320, y + 18, meta.projectCode ?? '—', 9, C.copper);

  // Row 2
  label(doc, MARGIN + 10, y + 34,  'EMPRESA / CONSULTOR');
  value(doc, MARGIN + 10, y + 44,  meta.company ?? '—', 8, C.dim);

  label(doc, MARGIN + 200, y + 34, 'INGENIERO');
  value(doc, MARGIN + 200, y + 44, meta.engineer ?? '—', 8, C.dim);

  label(doc, MARGIN + 360, y + 34, 'FECHA');
  value(doc, MARGIN + 360, y + 44, date, 8, C.dim);

  doc.font('Helvetica');
  return y + 52 + 12;
}

// ─── Section ──────────────────────────────────────────────────────────────────

function drawSection(doc: PDFKit.PDFDocument, sec: ReportSection, startY: number): number {
  let y = startY;

  // Section title bar
  fillRect(doc, MARGIN, y, CONTENT, 20, C.panel);
  doc.font('Helvetica-Bold').fontSize(9).fillColor(hex(C.copper))
    .text(sec.title.toUpperCase(), MARGIN + 10, y + 6, { lineBreak: false });
  if (sec.norm) {
    doc.font('Helvetica').fontSize(7).fillColor(hex(C.faint))
      .text(sec.norm, MARGIN + 10 + doc.widthOfString(sec.title.toUpperCase()) + 10, y + 7, { lineBreak: false });
  }
  y += 22;

  // Two-column: inputs left, results right
  const inputsY  = y;
  const resultsY = y;

  // ── Inputs column ─────────────────────────────────────────────────────────
  label(doc, MARGIN, inputsY, 'PARÁMETROS DE ENTRADA', 6.5, C.faint);
  let iy = inputsY + 12;

  for (const inp of sec.inputs) {
    fillRect(doc, MARGIN, iy, COL_W, 16, '#12151e');
    doc.font('Helvetica').fontSize(7.5).fillColor(hex(C.dim))
      .text(inp.label, MARGIN + 6, iy + 5, { lineBreak: false, width: COL_W - 60 });
    const val = `${inp.value}${inp.unit ? ' ' + inp.unit : ''}`;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(hex(C.text))
      .text(val, MARGIN + COL_W - 60, iy + 4, { lineBreak: false, width: 55, align: 'right' });
    doc.font('Helvetica');
    iy += 18;
  }

  // ── Results column ────────────────────────────────────────────────────────
  const rx = MARGIN + COL_W + 12;
  label(doc, rx, resultsY, 'RESULTADOS', 6.5, C.faint);
  let ry = resultsY + 12;

  for (const res of sec.results) {
    const bg    = res.highlight ? '#1e1508' : '#12151e';
    const vColor = res.highlight ? C.copper : C.text;
    fillRect(doc, rx, ry, COL_W, 16, bg);
    doc.font('Helvetica').fontSize(7.5).fillColor(hex(C.dim))
      .text(res.label, rx + 6, ry + 5, { lineBreak: false, width: COL_W - 60 });
    const val = `${res.value}${res.unit ? ' ' + res.unit : ''}`;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(hex(vColor))
      .text(val, rx + COL_W - 60, ry + 4, { lineBreak: false, width: 55, align: 'right' });
    doc.font('Helvetica');
    ry += 18;
  }

  y = Math.max(iy, ry) + 6;

  // ── Compliance banner ─────────────────────────────────────────────────────
  if (sec.pass !== undefined) {
    const bColor = sec.pass ? C.safe : C.danger;
    const bBg    = sec.pass ? '#0d1a0d' : '#1a0d0d';
    fillRect(doc, MARGIN, y, CONTENT, 18, bBg);
    doc.save().rect(MARGIN, y, 2, 18).fill(hex(bColor)).restore();
    const mark  = sec.pass ? '✓' : '✗';
    const txt   = sec.passLabel ?? (sec.pass ? 'CUMPLE' : 'NO CUMPLE');
    doc.font('Helvetica-Bold').fontSize(8).fillColor(hex(bColor))
      .text(`${mark}  ${txt}`, MARGIN + 10, y + 5, { lineBreak: false });
    y += 22;
  }

  // ── Observations ──────────────────────────────────────────────────────────
  if (sec.observations?.length) {
    for (const obs of sec.observations) {
      fillRect(doc, MARGIN, y, CONTENT, 14, '#0d1220');
      doc.save().rect(MARGIN, y, 2, 14).fill(hex('#3b82f6')).restore();
      doc.font('Helvetica').fontSize(7).fillColor(hex(C.dim))
        .text(`•  ${obs}`, MARGIN + 10, y + 4, { lineBreak: false, width: CONTENT - 16 });
      y += 16;
    }
  }

  return y + 10;
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function drawFooter(doc: PDFKit.PDFDocument, meta: ReportMeta) {
  const y = PAGE.height - 38;
  hRule(doc, y, C.line);

  doc.font('Helvetica').fontSize(6.5).fillColor(hex(C.faint))
    .text('GroundDesing Pro · Software de diseño de puesta a tierra · IEEE Std 80-2013 / 81-2012', MARGIN, y + 6, { lineBreak: false });

  if (meta.engineer) {
    doc.text(`Elaborado por: ${meta.engineer}`, MARGIN, y + 16, { lineBreak: false });
  }

  // Signature block right
  doc.rect(PAGE.width - MARGIN - 100, y + 4, 100, 24)
    .lineWidth(0.5).strokeColor(hex(C.line)).stroke();
  doc.fontSize(6).fillColor(hex(C.faint))
    .text('Firma / Sello P.E.', PAGE.width - MARGIN - 95, y + 8, { lineBreak: false })
    .text('Registro:', PAGE.width - MARGIN - 95, y + 18, { lineBreak: false });
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateReport(opts: ReportOptions): void {
  const { meta, sections, stream } = opts;

  // Estimate pages (rough: 1 section ≈ 140pt + meta 80pt + header 80pt + footer 40pt)
  const bodyHeight   = PAGE.height - 80 - 60 - 40; // usable per page
  const sectionHeight = (sec: ReportSection) =>
    22 + Math.max(sec.inputs.length, sec.results.length) * 18 + 22 +
    (sec.observations?.length ?? 0) * 16 + 10;

  let used = 140; // meta block
  let totalPages = 1;
  for (const sec of sections) {
    const h = sectionHeight(sec);
    if (used + h > bodyHeight) { totalPages++; used = 0; }
    used += h;
  }

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
  doc.pipe(stream);

  let pageNum = 0;
  let y       = 0;

  function newPage() {
    pageNum++;
    doc.addPage();
    drawHeader(doc, meta, pageNum, totalPages);
    y = pageNum === 1 ? drawMeta(doc, meta) : 76;
  }

  newPage();

  for (const sec of sections) {
    const h = sectionHeight(sec);
    if (y + h > PAGE.height - 50) newPage();
    y = drawSection(doc, sec, y);
  }

  drawFooter(doc, meta);
  doc.end();
}

// ─── Convenience: buffer ──────────────────────────────────────────────────────

export function generateReportBuffer(opts: Omit<ReportOptions, 'stream'>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const sink = new Writable({
      write(chunk: Buffer, _enc: string, cb: () => void) { chunks.push(chunk); cb(); },
      final(cb: () => void) { resolve(Buffer.concat(chunks)); cb(); },
    });
    sink.on('error', reject);
    generateReport({ ...opts, stream: sink });
  });
}
