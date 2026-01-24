/**
 * CSV Builder Utility
 * Simple CSV generation without external dependencies
 */

/**
 * Escape CSV field (handles commas, quotes, newlines)
 */
function escapeCsvField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) {
    return '';
  }

  const str = String(field);
  
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Build CSV row from array of values
 */
export function buildCsvRow(values: Array<string | number | null | undefined>): string {
  return values.map(escapeCsvField).join(',');
}

/**
 * Build CSV from array of objects
 */
export function buildCsv<T extends Record<string, any>>(
  data: T[],
  headers: Array<{ key: keyof T; label: string }>
): string {
  const rows: string[] = [];

  // Header row
  rows.push(buildCsvRow(headers.map(h => h.label)));

  // Data rows
  for (const item of data) {
    rows.push(buildCsvRow(headers.map(h => item[h.key])));
  }

  return rows.join('\n');
}

