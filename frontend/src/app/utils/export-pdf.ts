import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportInvoicePDF(invoice: any, storeName = 'Mart Management System') {
  const doc = new jsPDF({ unit: 'pt', format: [300, 500] });

  doc.setFontSize(14);
  doc.text(storeName, 20, 30);
  doc.setFontSize(9);
  doc.text(`Invoice: ${invoice.invoice_number}`, 20, 48);
  doc.text(`Date: ${new Date().toLocaleString()}`, 20, 62);

  autoTable(doc, {
    startY: 75,
    head: [['Item', 'Qty', 'Price', 'Total']],
    body: (invoice.items || []).map((it: any) => [
      it.product_name || it.name || 'Item',
      String(it.quantity),
      `Rs ${Number(it.price).toFixed(2)}`,
      `Rs ${Number(it.total ?? it.price * it.quantity).toFixed(2)}`,
    ]),
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 118, 110], textColor: 255 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(9);
  doc.text(`Subtotal: Rs ${Number(invoice.subtotal).toFixed(2)}`, 20, finalY);
  doc.text(`Discount: -Rs ${Number(invoice.discount).toFixed(2)}`, 20, finalY + 14);
  doc.text(`Tax: Rs ${Number(invoice.tax).toFixed(2)}`, 20, finalY + 28);
  doc.setFontSize(11);
  doc.text(`Grand Total: Rs ${Number(invoice.grand_total).toFixed(2)}`, 20, finalY + 46);

  doc.save(`${invoice.invoice_number}.pdf`);
}

export function exportTablePDF(title: string, columns: string[], rows: any[][]) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text(title, 14, 18);
  doc.setFontSize(9);
  doc.text(new Date().toLocaleString(), 14, 26);

  autoTable(doc, {
    startY: 34,
    head: [columns],
    body: rows,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [15, 118, 110], textColor: 255 },
    alternateRowStyles: { fillColor: [248, 250, 249] },
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
}
