import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';

const app = express();
const upload = multer();

// Enable CORS with environment-aware settings
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://displater.vercel.app', 'https://displater.netlify.app'] // Update these with your actual frontend URLs
    : 'http://localhost:5173',
  credentials: true
}));

// Add OPTIONS handling for preflight requests
app.options('*', cors());

// Add logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  // Add CORS headers explicitly
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// Basic error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Add a test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Server is running' });
});

app.post('/process-image', upload.single('image'), async (req, res) => {
  try {
    console.log('Received image processing request');
    
    if (!req.file) {
      console.log('No file received');
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Get center point coordinates
    const centerX = parseFloat(req.body.centerX) || 0.5;
    const centerY = parseFloat(req.body.centerY) || 0.5;
    console.log('Center point:', { centerX, centerY });

    console.log('File received:', req.file.originalname, 'Size:', req.file.size);

    const buffer = req.file.buffer;
    const metadata = await sharp(buffer).metadata();
    console.log('Image metadata:', metadata);
    
    // Determine image orientation
    const isVertical = metadata.height > metadata.width;
    
    // Calculate final target dimensions based on orientation
    let finalWidth, finalHeight;
    if (isVertical) {
      finalWidth = 2900;
      finalHeight = Math.round(finalWidth * 1.4);
    } else {
      finalHeight = 2900;
      finalWidth = Math.round(finalHeight * 1.4);
    }

    // Calculate crop dimensions to maintain proper aspect ratio
    let cropWidth, cropHeight;
    if (isVertical) {
      if (metadata.width * 1.4 <= metadata.height) {
        cropWidth = metadata.width;
        cropHeight = Math.round(cropWidth * 1.4);
      } else {
        cropHeight = metadata.height;
        cropWidth = Math.round(cropHeight / 1.4);
      }
    } else {
      if (metadata.height * 1.4 <= metadata.width) {
        cropHeight = metadata.height;
        cropWidth = Math.round(cropHeight * 1.4);
      } else {
        cropWidth = metadata.width;
        cropHeight = Math.round(cropWidth / 1.4);
      }
    }

    // Calculate crop offset based on center point
    const maxLeft = metadata.width - cropWidth;
    const maxTop = metadata.height - cropHeight;
    const left = Math.round(Math.max(0, Math.min(maxLeft, metadata.width * centerX - cropWidth / 2)));
    const top = Math.round(Math.max(0, Math.min(maxTop, metadata.height * centerY - cropHeight / 2)));

    console.log('Crop parameters:', { left, top, cropWidth, cropHeight });

    // Process the image with the new center point
    const processedBuffer = await sharp(buffer)
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize(finalWidth, finalHeight, {
        fit: 'fill',
        withoutEnlargement: false,
        kernel: 'lanczos3',
      })
      .jpeg({ quality: 100, mozjpeg: true })
      .toBuffer();

    console.log('Image processed successfully');
    res.set('Content-Type', 'image/jpeg');
    res.set('Access-Control-Allow-Origin', '*');
    res.send(processedBuffer);
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image: ' + error.message });
  }
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log(`CORS enabled for ${process.env.NODE_ENV === 'production' ? 'production' : 'development'} environment`);
}).on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please kill the process using that port and try again.`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Performing graceful shutdown...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Performing graceful shutdown...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
}); 