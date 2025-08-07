import puppeteer from 'puppeteer';

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}







interface InvoiceItem {
  description: string;
  rate: number;
  quantity: number;
  amount: number;
}


interface InvoiceData {
  invoiceNumber: string
  date: string
  dueData?: string
  totalDue: string
  invoiceTo: {
    name: string
    email: string
  }
  items: InvoiceItem[]
  advanceAmount?: string
  totalAmount: string
  note?: string
  status: 'paid' | 'unpaid' | 'partial'
}


export const generateFileInvoiceData = async (invoiceData: InvoiceData) => {
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice-${invoiceData.invoiceNumber}}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="font-family: 'Inter', sans-serif; background: #f5f5f5; padding: 20px; margin: 0;">
  <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);">
    <!-- Header Section -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="flex: 1;">
        <div style="display: flex; flex-direction: column; align-items: start; margin-bottom: 30px;">
          <img src="https://oceanwraps.com/images/logo.png" alt="Oceanwraps Logo" style="width: 200px; height: auto; margin-right: 20px;">
          <div>
            <p style="font-size: 12px; letter-spacing: 1px;">Premium boat wrapping services</p>
          </div>
        </div>
        
        <div>
          <h1 style="font-size: 48px; font-weight: 700; margin-bottom: 8px; letter-spacing: 2px;">INVOICE</h1>
          <div style="font-size: 18px; opacity: 0.9; margin-bottom: 20px;">${invoiceData.invoiceNumber}</div>
        </div>
        
      </div>
      
      <div style="text-align: right; min-width: 250px;">
        <!-- Status Badge -->
        <div style="margin-bottom: 20px; display: inline-block;">
          <div style="
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            background: ${invoiceData.status === "paid" ? "#10B981" : invoiceData.status === "partial" ? "#F59E0B" : "#EF4444"};
            color: white;
            display: inline-flex;
            align-items: center;
          ">
            ${invoiceData.status === "paid" ? 
              `<svg style="width: 12px; height: 12px; margin-right: 6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
              </svg> Paid` : 
              invoiceData.status === "partial" ? 
              `<svg style="width: 12px; height: 12px; margin-right: 6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg> Partial` : 
              `<svg style="width: 12px; height: 12px; margin-right: 6px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg> Unpaid`
            }
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">Date</div>
          <div style="font-size: 14px; font-weight: 500;">${invoiceData.date?.split('T')[0]}</div>
        </div>
        
        ${invoiceData.dueData ? `
        <div style="margin-bottom: 20px;">
          <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">Due Date</div>
          <div style="font-size: 14px; font-weight: 500;">${invoiceData.dueData?.split('T')[0]}</div>
        </div>
        ` : ''}
        
        <div style="margin-bottom: 20px;">
          <div style="font-size: 12px; opacity: 0.8; margin-bottom: 4px;">INVOICE TO:</div>
          <div>
            <div style="font-size: 14px; margin-bottom: 2px;">${invoiceData.invoiceTo.name}</div>
            <div style="font-size: 14px; margin-bottom: 2px;">${invoiceData.invoiceTo.email}</div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="font-size: 16px; font-weight: 600; opacity: 1;">Total Due: $${invoiceData.totalDue}</div>
        </div>
      </div>
    </div>

    <!-- Invoice Table -->
    <div style="padding: 0;">
      <div style="display: grid; grid-template-columns: 60px 1fr 100px 80px 100px; background: #f8f9fa; padding: 20px 40px; font-weight: 600; font-size: 14px; color: #374151; border-bottom: 1px solid #e5e7eb;">
        <div>NO.</div>
        <div>Description</div>
        <div>Rate</div>
        <div>Qty.</div>
        <div>Total</div>
      </div>
      
      ${invoiceData.items.map((item, index) => `
      <div style="display: grid; grid-template-columns: 60px 1fr 100px 80px 100px; padding: 24px 40px; border-bottom: 1px solid #f3f4f6; align-items: center;">
        <div style="font-weight: 500; color: #6b7280;">${(index + 1).toString().padStart(2, '0')}.</div>
        <div>
          <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${item.description}</div>
        </div>
        <div style="text-align: right; font-weight: 500;">$${item.rate}</div>
        <div style="text-align: right; font-weight: 500;">${item.quantity}</div>
        <div style="text-align: right; font-weight: 500;">$${item.amount}</div>
      </div>
      `).join('')}
    </div>

    <!-- Totals Section -->
    <div style="padding: 20px 40px; background: #f8f9fa; display: flex; justify-content: flex-end;">
      <div style="width: 300px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px; padding-top: 12px;">
          <div style="font-weight: 700; color: #111827;">Total</div>
          <div style="font-weight: 700; color: #111827;">$${invoiceData.totalAmount}</div>
        </div>
        ${invoiceData.advanceAmount ? `
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <div style="font-weight: 500; color: #6b7280;">Advance Amount</div>
          <div style="font-weight: 600; color: #10B981;">$${invoiceData.advanceAmount}</div>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
          <div style="font-weight: 500; color: #6b7280;">Balance Due</div>
          <div style="font-weight: 600; color: ${invoiceData.status === 'paid' ? '#10B981' : '#EF4444'};">$${invoiceData.totalDue}</div>
        </div>
      </div>
    </div>

    <!-- Footer Section -->
    <div style="padding: 40px; background: #f9fafb; display: flex; justify-content: space-between; align-items: flex-start;">
      <div style="flex: 1; margin-right: 40px;">
        ${invoiceData.note ? `
        <div style="margin-bottom: 20px;">
          <div style="font-weight: 600; color: #111827; margin-bottom: 8px;">Notes</div>
          <div style="font-size: 14px; color: #fa5523; line-height: 1.5;">${invoiceData.note}</div>
        </div>
        ` : ''}
      </div>
      
      <div style="min-width: 200px;">
        <div style="text-align: center;">
          <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">Jena Hatfield</div>
          <div style="font-size: 12px; color: #6b7280; margin-bottom: 20px;">Managing Director</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const pdfBuffer = await generatePdfFromHtml(htmlContent);
  return pdfBuffer;
}
