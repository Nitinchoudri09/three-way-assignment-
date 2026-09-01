const FormData = require('form-data');
const fs = require('fs');
const http = require('http');

async function run() {
  const tokenRes = await fetch("http://localhost:5000/api/auth/login", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({username: "admin", password: "admin123"})
  });
  const tokenData = await tokenRes.json();
  const token = tokenData.data.token;

  const form = new FormData();
  // We'll upload our small test PNG again as a real request to the upload endpoint
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync('test_upload.png', png);
  
  form.append('file', fs.createReadStream('test_upload.png'));
  form.append('documentType', 'purchase_order');

  console.log('Sending upload request...');
  const res = await fetch("http://localhost:5000/api/documents/upload", {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: form
  });
  
  const text = await res.text();
  console.log('Response:', res.status, text);
}
run();
