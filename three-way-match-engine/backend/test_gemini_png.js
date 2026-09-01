const fs = require('fs');
const geminiService = require('./src/services/geminiService');

async function run() {
  try {
    // Create a 1x1 transparent PNG for testing
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync('test.png', png);
    
    console.log('Sending PNG request to Gemini...');
    await geminiService.parsePO(png, 'image/png');
    console.log('PNG Success!');
  } catch (err) {
    console.error('ERROR OCCURRED:', err.message);
  }
}
run();
