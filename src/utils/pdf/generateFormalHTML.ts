import { PdfItem, formatQuantity } from './itemUtils';
import { Inter_Regular } from './fontAssets';
import { shoppingCategories } from '../../constants/shoppingCategories';

const categoryLookup = new Map<string, string>(
  shoppingCategories.map(category => [category.id, category.name]),
);

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getCategoryLabel = (categoryId?: string): string =>
  categoryLookup.get(categoryId ?? '') ?? categoryLookup.get('Other') ?? 'Other';

const css = `
  <style>
    @font-face {
      font-family: 'Inter';
      src: url(data:font/truetype;charset=utf-8;base64,${Inter_Regular}) format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @page {
      margin: 20mm;
    }
    body {
      margin: 0;
      padding: 24px;
      font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
      background-color: #ffffff;
      color: #111827;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 6px;
      color: #111827;
    }
    .meta {
      font-size: 13px;
      color: #475569;
      margin-bottom: 18px;
    }
    .meta strong {
      color: #0f172a;
    }
    .table-wrapper {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th,
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      text-align: left;
      vertical-align: middle;
    }
    th {
      background: #e0f2fe;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      font-size: 12px;
      color: #0f172a;
      font-weight: 600;
    }
    tr:last-child td {
      border-bottom: none;
    }
    .empty {
      padding: 24px;
      font-style: italic;
      color: #94a3b8;
      text-align: center;
    }
  </style>
`;

export const generateFormalHTML = (items: PdfItem[]): string => {
  const now = new Date();
  const dateString = now.toLocaleDateString();
  const timeString = now.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const rows =
    items.length === 0
      ? ''
      : items
          .map((item, index) => {
            const categoryLabel = getCategoryLabel(item.categoryId);
            return `
              <tr>
                <td>${index + 1}</td>
                <td>${escapeHtml(item.name)}</td>
                <td>${escapeHtml(categoryLabel)}</td>
                <td>${formatQuantity(item.quantity)}</td>
                <td>${escapeHtml(item.unit)}</td>
              </tr>
            `;
          })
          .join('');

  const tableSection =
    items.length === 0
      ? `<div class="empty">No shopping items were detected.</div>`
      : `
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Item</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Unit</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Shopping Bag</title>
        ${css}
      </head>
      <body>
        <h1>Current Bag Items</h1>
        <div class="meta">
          Generated on ${dateString} at ${timeString} • ${items.length} line${items.length === 1 ? '' : 's'}
        </div>
        ${tableSection}
      </body>
    </html>
  `;
};
