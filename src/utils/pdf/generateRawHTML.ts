import { PdfItem, formatQuantity } from './itemUtils';
import { PatrickHand_Regular } from './fontAssets';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const css = `
  <style>
    @font-face {
      font-family: 'PatrickHand';
      src: url(data:font/truetype;charset=utf-8;base64,${PatrickHand_Regular}) format('truetype');
      font-weight: 400;
      font-style: normal;
    }
    @page {
      margin: 24mm;
    }
    body {
      margin: 0;
      padding: 32px;
      font-family: 'PatrickHand', 'Comic Sans MS', cursive;
      background-color: #fafafa;
      color: #0b3d91;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
    }
    .title {
      font-size: 32px;
      margin-bottom: 6px;
      color: #0b3d91;
    }
    .subhead {
      font-size: 16px;
      color: #1e40ff;
      margin-bottom: 20px;
    }
    .item-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .item-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px dashed #d1d5db;
      padding-bottom: 8px;
      font-size: 52px;
      letter-spacing: 0.18px;
      transform: rotate(-0.06deg);
    }
    .item-row:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    .item-name {
      flex: 1;
      margin-right: 6px;
    }
    .item-meta {
      font-size: 52px;
      color: #0b3d91;
      white-space: nowrap;
    }
    .empty {
      padding: 24px;
      font-size: 20px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
`;

export const generateRawHTML = (items: PdfItem[]): string => {
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
          .map(item => {
            return `
              <div class="item-row">
                <span class="item-name">${escapeHtml(item.name)}</span>
                <span class="item-meta">
                  ${formatQuantity(item.quantity)} ${escapeHtml(item.unit)}
                </span>
              </div>
            `;
          })
          .join('');

  const listSection =
    items.length === 0
      ? `<div class="empty">No shopping items found.</div>`
      : `<div class="item-list">${rows}</div>`;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <title>Handwritten Shopping List</title>
        ${css}
      </head>
      <body>
        <div class="container">
          <div class="title">Handwritten List</div>
          <div class="subhead">Created on ${dateString} at ${timeString}</div>
          ${listSection}
        </div>
      </body>
    </html>
  `;
};
