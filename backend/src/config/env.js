require('dotenv').config({ quiet: true });

module.exports = {
  PORT: Number(process.env.PORT) || 5000,
  IS_PRODUCTION: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL),
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mart_management',
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev-only-secret-change-me',
  CLIENT_ORIGINS: (process.env.CLIENT_ORIGINS || 'http://localhost:4200,http://127.0.0.1:4200')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
