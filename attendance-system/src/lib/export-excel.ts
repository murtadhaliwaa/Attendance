"use client";

type ExcelRow = Record<string, string | number>;

type ExcelExportOptions = {
  titleRows?: string[][];
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function exportRowsToExcel(
  rows: ExcelRow[],
  filename: string,
  sheetName = "Report",
  options?: ExcelExportOptions
) {
  if (rows.length === 0) {
    throw new Error("لا توجد بيانات للتصدير");
  }

  const XLSX = await import("xlsx");

  const headers = Object.keys(rows[0]);
  const dataRows = rows.map((row) =>
    headers.map((header) => row[header] ?? "")
  );
  const titleRows = options?.titleRows ?? [];
  const sheetRows = [...titleRows, [], headers, ...dataRows];
  const sheet = XLSX.utils.aoa_to_sheet(sheetRows);

  if (titleRows.length > 0) {
    const lastColumn = Math.max(headers.length - 1, 0);
    sheet["!merges"] = titleRows.map((_, index) => ({
      s: { r: index, c: 0 },
      e: { r: index, c: lastColumn },
    }));
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName.slice(0, 31));

  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as Uint8Array | number[];

  const blob = new Blob([buffer as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  downloadBlob(blob, filename);
}
