const fs = require('fs');
const geminiService = require('./src/services/geminiService');

async function run() {
  try {
    // Create a 1-page dummy PDF for testing
    const pdf = Buffer.from('%PDF-1.4\n%EOF\n');
    fs.writeFileSync('test.pdf', pdf);
    
    console.log('Sending request to Gemini...');
    await geminiService.parsePO(pdf, 'application/pdf');
    console.log('Success!');
  } catch (err) {
    console.error('ERROR OCCURRED:', err.message);
  }
}
run();
