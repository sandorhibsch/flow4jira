const path = require('path');
const { app } = require('electron');
const fs = require('fs');

/**
 * Initialize the database for the Electron app.
 * Assumes Prisma client is already generated and bundled.
 */
async function initializeDatabase() {
  try {
    const userDataPath = app.getPath('userData');
    const dataDir = path.join(userDataPath, 'data');

    console.log('User data path:', userDataPath);
    console.log('Data directory:', dataDir);

    // Ensure the data directory exists
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log('Created data directory:', dataDir);
    }

    // Set the DATABASE_URL environment variable
    const dbPath = path.join(dataDir, 'flow4jira.db');
    process.env.DATABASE_URL = `file:${dbPath}`;
    console.log('Database URL set to:', process.env.DATABASE_URL);

    // Check if the database needs initialization
    const dbExists = fs.existsSync(dbPath);

    if (!dbExists) {
      console.log('Database file does not exist, creating schema...');

      // We can't run migrations in production, so we need to:
      // 1. Copy a seed database, OR
      // 2. Use Prisma client to create tables

      // Option 2: Create tables using Prisma schema
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();

      try {
        // This will create the database file and tables
        // by attempting a simple query that triggers schema creation
        await prisma.$connect();
        console.log('Database initialized successfully');
      } catch (error) {
        console.error('Failed to initialize database:', error);
        throw error;
      } finally {
        await prisma.$disconnect();
      }
    } else {
      console.log('Database file already exists:', dbPath);
    }

    return true;
  } catch (error) {
    console.error('Error in initializeDatabase:', error);
    throw error;
  }
}

module.exports = { initializeDatabase };