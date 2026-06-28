require('dotenv').config();
const app = require('./app');
const prisma = require('./utils/prisma');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Test database connection
    logger.info('Testing database connection...');
    await prisma.$connect();
    logger.info('Database connection established successfully.');

    app.listen(PORT, () => {
      logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server due to database connection error: %o', error);
    process.exit(1);
  }
}

startServer();
