import JsBarcode from 'jsbarcode';

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function printBarcode(product: any) {
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  JsBarcode(svg, product.barcode, {
    format: 'CODE128',
    width: 2,
    height: 60,
    displayValue: true,
    fontSize: 14,
    margin: 8,
  });

  const svgMarkup = new XMLSerializer().serializeToString(svg);

  const win = window.open('', '_blank', 'width=420,height=320');
  if (!win) return; // pop-up blocked
  win.document.write(`
    <html>
      <head>
        <title>Barcode — ${esc(product.product_name)}</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 24px; }
          .label { border: 1px dashed #94A3B8; border-radius: 8px; padding: 16px; display: inline-block; }
          h3 { margin: 0 0 6px; font-size: 14px; }
          p { margin: 0 0 10px; font-size: 12px; color: #475569; }
          button { margin-top: 16px; padding: 8px 16px; border: none; background: #0F766E; color: white; border-radius: 8px; cursor: pointer; font-size: 13px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="label">
          <h3>${esc(product.product_name)}</h3>
          <p>Rs ${Number(product.selling_price).toFixed(2)} · SKU: ${esc(product.sku)}</p>
          ${svgMarkup}
        </div>
        <div><button onclick="window.print()">Print</button></div>
      </body>
    </html>
  `);
  win.document.close();
}
