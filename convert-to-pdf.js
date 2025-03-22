import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

async function convertHtmlToPdf() {
  try {
    const browser = await puppeteer.launch({
      headless: "new", // Use the new headless mode
      args: ['--no-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Get the HTML content
    const htmlPath = path.resolve('./architecture-diagram.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Set the content and wait for the diagrams to render
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Wait for Mermaid diagrams to render fully
    await page.waitForFunction(() => {
      const diagrams = document.querySelectorAll('.mermaid');
      let allRendered = true;
      
      diagrams.forEach(diagram => {
        if (!diagram.querySelector('svg')) {
          allRendered = false;
        }
      });
      
      return allRendered;
    }, { timeout: 10000 });
    
    // Additional delay to ensure everything renders correctly
    await page.waitForTimeout(2000);
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });
    
    // Save PDF
    fs.writeFileSync('architecture-diagram.pdf', pdfBuffer);
    
    console.log('PDF generated successfully: architecture-diagram.pdf');
    
    await browser.close();
  } catch (error) {
    console.error('Error generating PDF:', error);
  }
}

convertHtmlToPdf();