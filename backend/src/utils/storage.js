const path = require('path');
const fs = require('fs/promises');
const { Readable } = require('stream');
const express = require('express');
const { put, get } = require('@vercel/blob');

const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');

// Deployed functions have a read-only, ephemeral filesystem, so uploads go to a private
// Vercel Blob store when one is connected. Without a token they fall back to local disk.
const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const CONTENT_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** Saves a file under a relative path such as "uploads/products/prod_x.png". */
async function saveUpload(relPath, buffer) {
  const ext = path.extname(relPath).slice(1).toLowerCase();
  if (useBlob()) {
    await put(relPath, buffer, {
      access: 'private',
      contentType: CONTENT_TYPES[ext],
      addRandomSuffix: false,
    });
    return;
  }
  const target = path.join(UPLOADS_ROOT, path.relative('uploads', relPath));
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, buffer);
}

const staticUploads = express.static(UPLOADS_ROOT);

/** Serves "/uploads/*" from Blob or local disk, keeping stored image paths unchanged. */
async function serveUploads(req, res, next) {
  if (!useBlob()) return staticUploads(req, res, next);
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();

  const pathname = `uploads${decodeURIComponent(req.path)}`;
  if (pathname.includes('..')) return res.status(400).end();

  try {
    const result = await get(pathname, {
      access: 'private',
      ifNoneMatch: req.headers['if-none-match'],
    });
    if (!result) return res.status(404).json({ status: false, message: 'File not found.' });

    res.set({ ETag: result.blob.etag, 'Cache-Control': 'private, no-cache' });
    if (result.statusCode === 304) return res.status(304).end();

    res.set('Content-Type', result.blob.contentType);
    if (req.method === 'HEAD') return res.end();
    Readable.fromWeb(result.stream).pipe(res);
  } catch (err) {
    if (err && err.name === 'BlobNotFoundError') {
      return res.status(404).json({ status: false, message: 'File not found.' });
    }
    next(err);
  }
}

module.exports = { saveUpload, serveUploads };
