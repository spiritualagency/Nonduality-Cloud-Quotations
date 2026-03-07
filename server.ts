import express from 'express';
import { createServer as createViteServer } from 'vite';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import multer from 'multer';
import Papa from 'papaparse';
import * as xlsx from 'xlsx';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

// Fix for Prisma: If DATABASE_URL is wrapped in quotes in the environment, remove them.
let dbUrl = process.env.DATABASE_URL;
if (dbUrl && dbUrl.startsWith('"') && dbUrl.endsWith('"')) {
  dbUrl = dbUrl.slice(1, -1);
  process.env.DATABASE_URL = dbUrl;
}

const app = express();
const PORT = 3000;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}
const prisma = new PrismaClient();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Reset Admin Password
app.post('/api/admin/reset-password', async (req, res) => {
  console.log('Reset password route hit');
  const { newPassword } = req.body;
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.admin.update({
    where: { username: 'admin' },
    data: { password: hashedPassword },
  });
  res.json({ success: true });
});

// Temporary route to check admin
app.get('/api/admin/check', async (req, res) => {
  const admin = await prisma.admin.findFirst({ where: { username: 'admin' } });
  res.json({ exists: !!admin });
});

// Temporary route to check quotes
app.get('/api/quotes/count', async (req, res) => {
  const count = await prisma.quote.count();
  res.json({ count });
});

// Admin authentication middleware
const authenticateAdmin = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Initialize Admin
async function initAdmin() {
  try {
    console.log('Checking for admin user...');
    const adminExists = await prisma.admin.findFirst();
    if (!adminExists) {
      console.log('Admin user not found, creating...');
      const hashedPassword = await bcrypt.hash('admin', 10);
      await prisma.admin.create({
        data: { username: 'admin', password: hashedPassword },
      });
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists');
    }
  } catch (error) {
    console.error('Error initializing admin:', error);
  }
}
initAdmin();

// Login
app.post('/api/admin/login', async (req, res) => {
  console.log('Login attempt for:', req.body.username);
  const { username, password } = req.body;
  const admin = await prisma.admin.findUnique({ where: { username } });
  if (!admin) {
    console.log('Login failed: Admin not found');
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const match = await bcrypt.compare(password, admin.password);
  if (!match) {
    console.log('Login failed: Password mismatch');
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  console.log('Login successful');
  const token = jwt.sign({ id: admin.id }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Protect admin routes
app.use('/api/quotes', authenticateAdmin);
app.post('/api/quotes/clean', authenticateAdmin);
app.post('/api/quotes/reset-usage', authenticateAdmin);

// --- Logo Endpoints ---
app.get('/api/logo', (req, res) => {
  const logoPath = join(__dirname, 'uploads', 'logo.png');
  if (fs.existsSync(logoPath)) {
    res.json({ url: '/uploads/logo.png' });
  } else {
    res.status(404).json({ error: 'Logo not found' });
  }
});

app.post('/api/logo/upload', authenticateAdmin, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  
  const uploadDir = join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
  }
  
  fs.writeFileSync(join(uploadDir, 'logo.png'), req.file.buffer);
  res.json({ success: true });
});

// Serve uploads
app.use('/uploads', express.static('uploads'));

// --- API Routes ---

// Get all quotes (Admin)
app.get('/api/quotes', async (req, res) => {
  try {
    const quotes = await prisma.quote.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(quotes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// Add a single quote
app.post('/api/quotes', async (req, res) => {
  try {
    const { text: rawText, author, category } = req.body;
    const text = rawText.replace(/^"+|"+$/g, '');
    
    // Check for duplicates
    const existing = await prisma.quote.findFirst({ where: { text } });
    if (existing) {
      return res.status(400).json({ error: 'Quote already exists' });
    }
    
    const quote = await prisma.quote.create({
      data: { text, author, category, source: 'repository' },
    });
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add quote' });
  }
});

// Edit a quote
app.put('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author, category, used } = req.body;
    const quote = await prisma.quote.update({
      where: { id },
      data: { text, author, category, used },
    });
    res.json(quote);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// Delete a quote
app.delete('/api/quotes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.quote.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete quote' });
  }
});

// Clean quotes (remove surrounding quotes)
app.post('/api/quotes/clean', authenticateAdmin, async (req, res) => {
  try {
    const quotes = await prisma.quote.findMany();
    for (const quote of quotes) {
      if (quote.text.startsWith('"') && quote.text.endsWith('"')) {
        await prisma.quote.update({
          where: { id: quote.id },
          data: { text: quote.text.replace(/^"|"$/g, '') }
        });
      }
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clean quotes' });
  }
});

// Reset usage history
app.post('/api/quotes/reset-usage', async (req, res) => {
  try {
    await prisma.quote.updateMany({
      data: { used: false, usedDate: null },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset usage' });
  }
});

// Import quotes
app.post('/api/quotes/import', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  try {
    let importedQuotes: any[] = [];
    const fileBuffer = req.file.buffer;
    const fileName = req.file.originalname;

    if (fileName.endsWith('.csv')) {
      const csvString = fileBuffer.toString('utf-8');
      const result = Papa.parse(csvString, { header: true, skipEmptyLines: true });
      importedQuotes = result.data;
    } else if (fileName.endsWith('.xlsx')) {
      const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      importedQuotes = xlsx.utils.sheet_to_json(sheet);
    } else {
      return res.status(400).json({ error: 'Unsupported file format' });
    }

    let addedCount = 0;
    for (const row of importedQuotes) {
      const text = (row.Quote || row.text || '').replace(/^"+|"+$/g, '');
      const author = row.Author || row.author || 'Unknown';
      let category = row.Category || row.category || 'Miscellaneous';

      if (!text) continue;

      // Check for duplicates
      const existing = await prisma.quote.findFirst({ where: { text } });
      if (!existing) {
        await prisma.quote.create({
          data: { text, author, category, source: 'repository' },
        });
        addedCount++;
      }
    }

    res.json({ success: true, addedCount });
  } catch (error) {
    console.error('Import error:', error);
    res.status(500).json({ error: 'Failed to import quotes' });
  }
});

// Get daily quote
app.get('/api/quote/daily', async (req, res) => {
  try {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const isOddDay = dayOfMonth % 2 !== 0;
    
    // Check if we already have a quote for today
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    let todayQuote = await prisma.quote.findFirst({
      where: {
        usedDate: {
          gte: todayStart,
          lte: todayEnd,
        }
      }
    });

    if (todayQuote) {
      return res.json(todayQuote);
    }

    // Logic to select a new quote
    let selectedQuote = null;
    
    // Check if repository quotes are exhausted
    const unusedRepoCount = await prisma.quote.count({
      where: { source: 'repository', used: false }
    });

    const shouldFetchInternet = !isOddDay || unusedRepoCount === 0;

    if (!shouldFetchInternet) {
      // Fetch from repository
      const unusedQuotes = await prisma.quote.findMany({
        where: { source: 'repository', used: false },
      });
      if (unusedQuotes.length > 0) {
        const randomIndex = Math.floor(Math.random() * unusedQuotes.length);
        selectedQuote = unusedQuotes[randomIndex];
      }
    }

    if (!selectedQuote) {
      // Return a directive to the frontend to fetch from Gemini
      return res.json({ action: 'fetch_gemini' });
    } else {
      // Mark repo quote as used
      selectedQuote = await prisma.quote.update({
        where: { id: selectedQuote.id },
        data: { used: true, usedDate: new Date() }
      });
    }

    res.json(selectedQuote);
  } catch (error) {
    console.error('Daily quote error:', error);
    res.status(500).json({ error: 'Failed to fetch daily quote' });
  }
});

// Save internet quote to DB
app.post('/api/quote/save', async (req, res) => {
  try {
    const { text: rawText, author, category } = req.body;
    const text = rawText.replace(/^"+|"+$/g, '');
    const selectedQuote = await prisma.quote.create({
      data: {
        text,
        author,
        category: category || 'Miscellaneous',
        source: 'internet',
        used: true,
        usedDate: new Date(),
      }
    });
    res.json(selectedQuote);
  } catch (error) {
    console.error('Save quote error:', error);
    res.status(500).json({ error: 'Failed to save quote' });
  }
});

// Get random quote (for Refresh button)
app.get('/api/quote/random', async (req, res) => {
  try {
    let unusedQuotes = await prisma.quote.findMany({
      where: { used: false },
    });
    
    if (unusedQuotes.length === 0) {
      // Reset all to unused
      await prisma.quote.updateMany({
        data: { used: false, usedDate: null },
      });
      unusedQuotes = await prisma.quote.findMany();
    }
    
    if (unusedQuotes.length > 0) {
      const randomIndex = Math.floor(Math.random() * unusedQuotes.length);
      const selectedQuote = await prisma.quote.update({
        where: { id: unusedQuotes[randomIndex].id },
        data: { used: true, usedDate: new Date() }
      });
      return res.json({ ...selectedQuote, debug: { length: unusedQuotes.length, index: randomIndex } });
    }
    
    // If no quotes in DB at all, fetch from internet using Gemini API
    return res.json({ action: 'fetch_gemini' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch random quote' });
  }
});

// Fetch background image
app.get('/api/background', async (req, res) => {
  try {
    const searchTerms = ["nature light", "forest mist", "mountain dawn", "ocean calm"];
    const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    // Try Pexels first
    if (process.env.PEXELS_API_KEY) {
      try {
        const pexelsRes = await axios.get(`https://api.pexels.com/v1/search?query=${term}&per_page=15&orientation=landscape`, {
          headers: { Authorization: process.env.PEXELS_API_KEY }
        });
        if (pexelsRes.data.photos && pexelsRes.data.photos.length > 0) {
          const photo = pexelsRes.data.photos[Math.floor(Math.random() * pexelsRes.data.photos.length)];
          return res.json({ url: photo.src.large2x, source: 'pexels' });
        }
      } catch (e) {
        console.error('Pexels error:', e);
      }
    }
    
    // Try Pixabay
    if (process.env.PIXABAY_API_KEY) {
      try {
        const pixabayRes = await axios.get(`https://pixabay.com/api/?key=${process.env.PIXABAY_API_KEY}&q=${encodeURIComponent(term)}&image_type=photo&orientation=horizontal&per_page=15`);
        if (pixabayRes.data.hits && pixabayRes.data.hits.length > 0) {
          const photo = pixabayRes.data.hits[Math.floor(Math.random() * pixabayRes.data.hits.length)];
          return res.json({ url: photo.largeImageURL, source: 'pixabay' });
        }
      } catch (e) {
        console.error('Pixabay error:', e);
      }
    }
    
    // Fallback image
    const seed = Math.random().toString(36).substring(7);
    res.json({ url: `https://picsum.photos/seed/${seed}/1920/1080?blur=2`, source: 'picsum-fallback' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch background' });
  }
});

// Embed endpoints
app.get('/embed/daily-quote', async (req, res) => {
  const theme = req.query.theme === 'dark' ? 'dark' : 'light';
  const accent = req.query.accent || '#C9A84C';
  const font = req.query.font || 'inherit';
  
  const bg = theme === 'dark' ? '#1C1C1E' : '#FAF7F2';
  const text = theme === 'dark' ? '#FAF7F2' : '#1C1C1E';
  
  try {
    // Get today's quote
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    let quote = await prisma.quote.findFirst({
      where: { usedDate: { gte: todayStart, lte: todayEnd } }
    });
    
    if (!quote) {
      quote = await prisma.quote.findFirst();
    }
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          .quote-embed { text-align: center; }
        </style>
      </head>
      <body>
        <div class="quote-embed">
          <div class="quote-text">"${quote?.text || 'Loading...'}"</div>
          <div class="quote-author">— ${quote?.author || 'Unknown'}</div>
        </div>
      </body>
      </html>
    `;
    res.send(html);
  } catch (e) {
    res.status(500).send('Error loading quote');
  }
});

app.get('/embed/widget.js', async (req, res) => {
  try {
    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0));
    const todayEnd = new Date(today.setHours(23, 59, 59, 999));
    
    let quote = await prisma.quote.findFirst({
      where: { usedDate: { gte: todayStart, lte: todayEnd } }
    });
    
    if (!quote) {
      quote = await prisma.quote.findFirst();
    }
    
    const js = `
      (function() {
        const container = document.getElementById('nonduality-quote-widget');
        if (container) {
          container.innerHTML = \`
            <blockquote style="margin: 0; padding: 1em; border-left: 4px solid #C9A84C; font-style: italic;">
              "\${${JSON.stringify(quote?.text || '')}}"
              <footer style="margin-top: 0.5em; font-size: 0.85em; text-transform: uppercase; letter-spacing: 0.05em; color: #8A9E8A;">
                — \${${JSON.stringify(quote?.author || '')}}
              </footer>
            </blockquote>
          \`;
        }
      })();
    `;
    res.type('application/javascript').send(js);
  } catch (e) {
    res.status(500).send('console.error("Error loading quote widget");');
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
