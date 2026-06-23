"use client";

type ExcelRow = Record<string, string | number>;

type ExcelExportOptions = {
  titleRows?: string[][];
  wideColumns?: string[];
};

function centerAlignment(wrapText = false) {
  return {
    vertical: "middle" as const,
    horizontal: "center" as const,
    wrapText,
  };
}

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

function lineCount(value: string): number {
  return value.split("\n").filter((line) => line.length > 0).length || 1;
}

function longestLineLength(value: string): number {
  return value
    .split("\n")
    .reduce((max, line) => Math.max(max, line.length), 0);
}

function columnWidth(
  header: string,
  values: string[],
  isWide: boolean
): number {
  let maxLen = header.length;
  for (const value of values) {
    maxLen = Math.max(maxLen, longestLineLength(value));
  }

  if (isWide) {
    return Math.min(Math.max(Math.ceil(maxLen * 1.15) + 2, 40), 80);
  }

  return Math.min(Math.max(maxLen + 1, 6), 16);
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

  const ExcelJS = (await import("exceljs")).default;
  const headers = Object.keys(rows[0]);
  const wideColumns = new Set(options?.wideColumns ?? []);
  const titleRows = options?.titleRows ?? [];

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ rightToLeft: true }],
  });

  for (const titleRow of titleRows) {
    const row = worksheet.addRow(titleRow);
    row.font = { bold: true };
    worksheet.mergeCells(row.number, 1, row.number, headers.length);
    row.getCell(1).alignment = centerAlignment();
  }

  if (titleRows.length > 0) {
    worksheet.addRow([]);
  }

  const headerRow = worksheet.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true };
    cell.alignment = centerAlignment();
  });

  for (const row of rows) {
    const values = headers.map((header) => row[header] ?? "");
    const dataRow = worksheet.addRow(values);

    let maxLines = 1;
    headers.forEach((header, colIndex) => {
      const cell = dataRow.getCell(colIndex + 1);
      const text = String(values[colIndex] ?? "");
      const isWide = wideColumns.has(header);

      cell.alignment = centerAlignment(isWide);
      if (isWide) {
        maxLines = Math.max(maxLines, lineCount(text));
      }
    });

    if (maxLines > 1) {
      dataRow.height = Math.max(18, maxLines * 15);
    }
  }

  headers.forEach((header, colIndex) => {
    const values = rows.map((row) => String(row[header] ?? ""));
    worksheet.getColumn(colIndex + 1).width = columnWidth(
      header,
      values,
      wideColumns.has(header)
    );
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  downloadBlob(blob, filename);
}
