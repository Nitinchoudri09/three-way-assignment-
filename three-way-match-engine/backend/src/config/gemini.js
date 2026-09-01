const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key');
const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

module.exports = {
  genAI,
  model,
  mockMode: process.env.GEMINI_MOCK_MODE === 'true'
};
