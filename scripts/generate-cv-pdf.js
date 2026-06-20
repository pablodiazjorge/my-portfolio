const puppeteer = require('puppeteer');
const path = require('path');

const docsDir = path.join(__dirname, '..', 'public', 'assets', 'docs');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  
  // Spanish
  const pageES = await browser.newPage();
  await pageES.goto('file://' + path.join(docsDir, 'cv-es.html'), { waitUntil: 'networkidle0' });
  await pageES.pdf({
    path: path.join(docsDir, 'Pablo Díaz-Jorge García_CV_ES.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
  });
  console.log('PDF ES generated');
  
  // English
  const pageEN = await browser.newPage();
  await pageEN.goto('file://' + path.join(docsDir, 'cv-en.html'), { waitUntil: 'networkidle0' });
  await pageEN.pdf({
    path: path.join(docsDir, 'Pablo Díaz-Jorge García_CV_EN.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: '14mm', bottom: '14mm', left: '14mm', right: '14mm' },
  });
  console.log('PDF EN generated');
  
  await browser.close();
})();
