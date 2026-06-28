const express = require('express');
const cors = require('cors');
const apiRouter = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Configure CORS
app.use(cors({
  origin: '*', // Allow all origins for development, can be configured for specific domains
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple Request Logging Middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// Root check route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Marine ERP API Service is operational.',
    version: '1.0.0'
  });
});

// Register API Router
app.use('/api', apiRouter);

// Register Global Error Handler
app.use(errorHandler);

module.exports = app;
