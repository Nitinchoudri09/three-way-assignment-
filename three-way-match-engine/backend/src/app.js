const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const errorHandler = require('./middleware/error');

const authRoutes = require('./routes/auth');
const documentRoutes = require('./routes/documents');
const matchRoutes = require('./routes/match');
const summaryRoutes = require('./routes/summary');
const skuRoutes = require('./routes/sku');

const app = express();

app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to allow inline scripts/styles in frontend
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(morgan('dev'));

// Serve frontend static files
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/match', matchRoutes);
app.use('/api/summary', summaryRoutes);
app.use('/api/masters/sku', skuRoutes);

app.use(errorHandler);

module.exports = app;
