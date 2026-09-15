import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from "pdf-lib";

// Matches the template's own background (sampled from the source PDF: rgb 255,253,247)
// so masked-out placeholder blanks blend in seamlessly.
const BG = rgb(255 / 255, 253 / 255, 247 / 255);
const FONT_SIZE = 8.06;
const MIN_FONT_SIZE = 5.5;

// The template's blanks were sized for its own (narrower) embedded font. Helvetica renders the
// same string wider, so long values (a full name, a date + trailing period) can overflow into
// whatever text follows the blank. Shrinking just enough to fit avoids that without touching layout.
function fitSize(font: PDFFont, text: string, maxWidth: number): number {
  let size = FONT_SIZE;
  while (size > MIN_FONT_SIZE && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 0.2;
  }
  return size;
}

export type OfferFillData = {
  candidateFullName: string;
  startDate: string;
  employerDate: string;
  candidateDate?: string | null;
};

export function dataUrlToPngBytes(dataUrl: string): Buffer {
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
  return Buffer.from(base64, "base64");
}

export async function fillOfferLetterTemplate({
  templateBytes,
  data,
  employerSignaturePng,
  candidateSignaturePng,
}: {
  templateBytes: Uint8Array;
  data: OfferFillData;
  employerSignaturePng: Uint8Array;
  candidateSignaturePng?: Uint8Array | null;
}): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();
  const [page1, page2] = pages;

  function drawMasked(page: PDFPage, x: number, y: number, text: string, maxWidth: number) {
    // Mask the full original blank regardless of how long the text is, so no dash/underscore
    // tail is ever left exposed — only the font size adapts, to avoid overflowing past maxWidth.
    const size = fitSize(font, text, maxWidth);
    page.drawRectangle({ x: x - 1, y: y - 2, width: maxWidth + 2, height: 11, color: BG });
    page.drawText(text, { x, y, size, font, color: rgb(0, 0, 0) });
  }

  async function drawSignature(page: PDFPage, x: number, y: number, pngBytes: Uint8Array, maxWidth: number) {
    page.drawRectangle({ x: x - 1, y: y - 3, width: maxWidth + 2, height: 20, color: BG });
    const img = await pdfDoc.embedPng(pngBytes);
    const targetH = 16;
    let targetW = (img.width / img.height) * targetH;
    if (targetW > maxWidth - 4) targetW = maxWidth - 4;
    page.drawImage(img, { x, y: y - 2, width: targetW, height: targetH });
  }

  // Page 1 — salutation, start date, acknowledgement name
  // Coordinates below were calibrated by rasterizing the template and measuring the actual
  // pixel extent of each blank (dash/underscore run) — the embedded font is narrower than any
  // standard font's metrics, so estimating from text width alone was consistently too wide/misplaced.
  drawMasked(page1, 56.25, 680.62, `${data.candidateFullName.split(" ")[0]},`, 200);
  // Safe span before "Initially" begins (~x=364) — includes the trailing period the mask erases.
  drawMasked(page1, 322, 625.17, `${data.startDate}.`, 37);
  // Safe span before the acknowledgement clause's comma begins (~x=161).
  drawMasked(page1, 44, 193, data.candidateFullName, 115);

  // Page 1 — signature block
  await drawSignature(page1, 270, 148, employerSignaturePng, 88);
  drawMasked(page1, 197, 115, data.employerDate, 119);
  if (candidateSignaturePng) await drawSignature(page1, 110, 148, candidateSignaturePng, 88);
  if (data.candidateDate) drawMasked(page1, 55, 115, data.candidateDate, 122);

  // Page 2 — mirrored signature block (Annexure acceptance)
  if (page2) {
    await drawSignature(page2, 325, 221, employerSignaturePng, 95);
    drawMasked(page2, 264, 185, data.employerDate, 129);
    if (candidateSignaturePng) await drawSignature(page2, 118, 221, candidateSignaturePng, 95);
    if (data.candidateDate) drawMasked(page2, 57, 185, data.candidateDate, 132);
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
