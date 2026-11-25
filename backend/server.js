const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const mongoose = require('mongoose');
const { PORT, MONGO_URI, SESSION_SECRET, CLIENT_ORIGINS } = require('./src/config/env');
const { ApiError } = require('./src/utils/response');

const app = express();

app.use(cors({ origin: CLIENT_ORIGINS, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log(`MongoDB connected: ${mongoose.connection.name}`);

  // Session cookie (browser-session lifetime, SameSite=Lax) - same behaviour as PHP sessions
  app.use(session({
    name: 'connect.sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ client: mongoose.connection.getClient(), dbName: mongoose.connection.name, collectionName: 'sessions' }),
    cookie: { httpOnly: true, sameSite: 'lax', secure: false },
  }));

  // Product images
  fs.mkdirSync(path.join(__dirname, 'uploads', 'products'), { recursive: true });
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  app.get('/', (req, res) => res.json({ status: true, message: 'Mart Management API is running.' }));

  app.use('/api/auth', require('./src/routes/auth'));
  app.use('/api/dashboard', require('./src/routes/dashboard'));
  app.use('/api/products', require('./src/routes/products'));
  app.use('/api/categories', require('./src/routes/categories'));
  app.use('/api/suppliers', require('./src/routes/suppliers'));
  app.use('/api/customers', require('./src/routes/customers'));
  app.use('/api/employees', require('./src/routes/employees'));
  app.use('/api/inventory', require('./src/routes/inventory'));
  app.use('/api/pos', require('./src/routes/pos'));
  app.use('/api/sales', require('./src/routes/sales'));
  app.use('/api/purchases', require('./src/routes/purchases'));
  app.use('/api/reports', require('./src/routes/reports'));
  app.use('/api/notifications', require('./src/routes/notifications'));
  app.use('/api/settings', require('./src/routes/settings'));

  app.use((req, res) => res.status(404).json({ status: false, message: 'Endpoint not found.' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) return res.status(err.code).json({ status: false, message: err.message });
    if (err && err.code === 11000) {
      return res.status(400).json({ status: false, message: 'A record with the same unique value already exists.' });
    }
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ status: false, message: 'Invalid JSON body.' });
    }
    if (err && err.name === 'MulterError') {
      return res.status(400).json({ status: false, message: err.code === 'LIMIT_FILE_SIZE' ? 'Image size must be under 3MB.' : err.message });
    }
    console.error(err);
    res.status(500).json({ status: false, message: 'Something went wrong on the server.' });
  });

  app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
}

main().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
