require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/three-way-match',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  geminiMockMode: process.env.GEMINI_MOCK_MODE === 'true',
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10,
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin123',
};
