require('dotenv').config();
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory session tokens
const activeSessions = new Set();

// In-memory gallery data (loaded from Cloudinary on startup, falls back to local file)
let galleryData = [];

// --- Cloudinary config ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer: temp storage (files go to Cloudinary, then temp is deleted)
const upload = multer({
  dest: path.join(__dirname, 'tmp-uploads'),
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/i;
    const ext = path.extname(file.originalname);
    if (allowed.test(ext) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB max
});

// CORS — allow requests from GitHub Pages
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json());

// Serve static files
app.use(express.static(__dirname));

// --- Helper functions ---

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function requireAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || !activeSessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Save gallery layout to Cloudinary as a raw JSON file (+ local backup)
async function saveGalleryToCloud() {
  const jsonStr = JSON.stringify(galleryData, null, 2);

  // Save locally as backup
  fs.writeFileSync(path.join(__dirname, 'gallery.json'), jsonStr);

  // Upload to Cloudinary as raw file
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    const tmpPath = path.join(__dirname, 'tmp-gallery.json');
    fs.writeFileSync(tmpPath, jsonStr);
    try {
      await cloudinary.uploader.upload(tmpPath, {
        resource_type: 'raw',
        public_id: 'lily-gallery/gallery',
        overwrite: true,
        invalidate: true
      });
    } catch (err) {
      console.error('Failed to save gallery to Cloudinary:', err.message);
    }
    try { fs.unlinkSync(tmpPath); } catch (e) { /* ignore */ }
  }
}

// Load gallery from Cloudinary, fall back to local file
async function loadGalleryFromCloud() {
  if (process.env.CLOUDINARY_CLOUD_NAME) {
    try {
      const result = await cloudinary.api.resource('lily-gallery/gallery', {
        resource_type: 'raw'
      });
      const response = await fetch(result.secure_url);
      if (response.ok) {
        galleryData = await response.json();
        console.log(`Loaded gallery from Cloudinary (${galleryData.length} rows)`);
        return;
      }
    } catch (err) {
      console.log('Cloudinary gallery not found, using local file');
    }
  }

  // Fall back to local gallery.json
  try {
    galleryData = JSON.parse(fs.readFileSync(path.join(__dirname, 'gallery.json'), 'utf8'));
    console.log(`Loaded gallery from local file (${galleryData.length} rows)`);
  } catch (err) {
    console.error('No gallery data found!');
    galleryData = [];
  }
}

// --- API Routes ---

// Login
app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }
  const hash = hashPassword(password);
  if (hash === process.env.ADMIN_PASSWORD_HASH) {
    const token = generateToken();
    activeSessions.add(token);
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

// Logout
app.post('/api/logout', requireAuth, (req, res) => {
  const token = req.headers['x-admin-token'];
  activeSessions.delete(token);
  res.json({ ok: true });
});

// Get gallery data (public)
app.get('/api/gallery', (req, res) => {
  res.json(galleryData);
});

// Update gallery layout (reorder)
app.put('/api/gallery', requireAuth, async (req, res) => {
  try {
    const newLayout = req.body;
    if (!Array.isArray(newLayout)) {
      return res.status(400).json({ error: 'Gallery must be an array of rows' });
    }
    galleryData = newLayout;
    await saveGalleryToCloud();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save gallery' });
  }
});

// Upload photos
app.post('/api/upload', requireAuth, upload.array('photos', 20), async (req, res) => {
  try {
    const newPhotos = [];

    for (const file of req.files) {
      // Upload to Cloudinary
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'lily-gallery',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
      });

      newPhotos.push({
        src: result.secure_url,
        alt: '',
        cloudinary_id: result.public_id
      });

      // Delete temp file
      try { fs.unlinkSync(file.path); } catch (e) { /* ignore */ }
    }

    // Add as a new row
    galleryData.push(newPhotos);
    await saveGalleryToCloud();

    res.json({ ok: true, photos: newPhotos });
  } catch (err) {
    console.error('Upload error:', err);
    if (req.files) {
      req.files.forEach(f => {
        try { fs.unlinkSync(f.path); } catch (e) { /* ignore */ }
      });
    }
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Delete a photo
app.delete('/api/photo', requireAuth, async (req, res) => {
  try {
    const { src } = req.body;
    if (!src) return res.status(400).json({ error: 'Photo src required' });

    let found = false;
    let cloudinaryId = null;

    // Remove from gallery
    for (let i = galleryData.length - 1; i >= 0; i--) {
      const row = galleryData[i];
      const idx = row.findIndex(p => p.src === src);
      if (idx !== -1) {
        cloudinaryId = row[idx].cloudinary_id;
        row.splice(idx, 1);
        found = true;
        if (row.length === 0) {
          galleryData.splice(i, 1);
        }
        break;
      }
    }

    if (!found) return res.status(404).json({ error: 'Photo not found in gallery' });

    // Delete from Cloudinary if it has a cloudinary_id
    if (cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(cloudinaryId);
      } catch (err) {
        console.error('Cloudinary delete failed:', err.message);
      }
    }

    await saveGalleryToCloud();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
});

// --- Start server ---

async function start() {
  const tmpDir = path.join(__dirname, 'tmp-uploads');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  await loadGalleryFromCloud();

  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start();
