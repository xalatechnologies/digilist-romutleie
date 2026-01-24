/**
 * CSV Export Utilities
 * Simple CSV generation for reports
 */

export function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(headers: string[], rows: any[][]): string {
  const lines: string[] = [];
  
  // Header row
  lines.push(headers.map(escapeCSV).join(','));
  
  // Data rows
  rows.forEach(row => {
    lines.push(row.map(escapeCSV).join(','));
  });
  
  return lines.join('\n');
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

