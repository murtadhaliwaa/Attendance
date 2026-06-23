"use client";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

type PdfExportOptions = {
  filename: string;
  titleLines: string[];
  headers: readonly string[];
  rows: (string | number)[][];
  landscape?: boolean;
  wideColumnIndexes?: number[];
};

let arabicFontBase64: string | null = null;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function ensureArabicFont(doc: jsPDF) {
  if (!arabicFontBase64) {
    const response = await fetch("/fonts/Amiri-Regular.ttf");
    if (!response.ok) {
      throw new Error("تعذر تحميل خط التقرير");
    }
    arabicFontBase64 = arrayBufferToBase64(await response.arrayBuffer());
  }

  doc.addFileToVFS("Amiri-Regular.ttf", arabicFontBase64);
  doc.addFont("Amiri-Regular.ttf", "Amiri", "normal");
  doc.setFont("Amiri");
}

export async function exportTableToPdf(options: PdfExportOptions) {
  if (options.rows.length === 0) {
    throw new Error("لا توجد بيانات للتصدير");
  }

  const doc = new jsPDF({
    orientation: options.landscape ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });

  await ensureArabicFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 36;

  doc.setFontSize(15);
  for (const line of options.titleLines) {
    doc.text(line, pageWidth / 2, y, { align: "center" });
    y += 22;
  }

  const rtlHeaders = [...options.headers].reverse();
  const rtlRows = options.rows.map((row) => [...row].reverse());
  const rtlWideIndexes = options.wideColumnIndexes?.map(
    (index) => options.headers.length - 1 - index
  );

  const columnStyles: Record<number, { cellWidth: number | "auto" }> = {};
  rtlWideIndexes?.forEach((index) => {
    columnStyles[index] = { cellWidth: "auto" };
  });

  autoTable(doc, {
    startY: y + 8,
    head: [rtlHeaders.map(String)],
    body: rtlRows.map((row) => row.map(String)),
    styles: {
      font: "Amiri",
      halign: "center",
      valign: "middle",
      fontSize: 9,
      overflow: "linebreak",
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: "normal",
    },
    columnStyles,
    margin: { top: 28, right: 24, bottom: 28, left: 24 },
  });

  doc.save(options.filename);
}
