import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';

const app = express();
const upload = multer();

// Enable CORS with more permissive settings
app.use(cors());  // Allow all origins by default

// Add OPTIONS handling for preflight requests
app.options('*', cors());  // Enable pre-flight for all routes

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

    console.log('File received:', req.file.originalname, 'Size:', req.file.size);

    const buffer = req.file.buffer;
    const metadata = await sharp(buffer).metadata();
    console.log('Image metadata:', metadata);
    
    // Determine image orientation
    const isVertical = metadata.height > metadata.width;
    
    // Calculate final target dimensions based on orientation
    let finalWidth, finalHeight;
    if (isVertical) {
      // For vertical images: height should be 1.4 times the width
      finalWidth = 2900;
      finalHeight = Math.round(finalWidth * 1.4); // This will be ~4060
    } else {
      // For horizontal images: width should be 1.4 times the height
      finalHeight = 2900;
      finalWidth = Math.round(finalHeight * 1.4); // This will be ~4060
    }

    // Calculate crop dimensions to maintain proper aspect ratio
    let cropWidth, cropHeight;
    if (isVertical) {
      // For vertical images, maintain 1:1.4 ratio (height = 1.4 * width)
      if (metadata.width * 1.4 <= metadata.height) {
        // Can use full width
        cropWidth = metadata.width;
        cropHeight = Math.round(cropWidth * 1.4);
      } else {
        // Use full height and calculate width
        cropHeight = metadata.height;
        cropWidth = Math.round(cropHeight / 1.4);
      }
    } else {
      // For horizontal images, maintain 1.4:1 ratio (width = 1.4 * height)
      if (metadata.height * 1.4 <= metadata.width) {
        // Can use full height
        cropHeight = metadata.height;
        cropWidth = Math.round(cropHeight * 1.4);
      } else {
        // Use full width and calculate height
        cropWidth = metadata.width;
        cropHeight = Math.round(cropWidth / 1.4);
      }
    }

    // Calculate crop offset to center the image
    const left = Math.round((metadata.width - cropWidth) / 2);
    const top = Math.round((metadata.height - cropHeight) / 2);

    // Process the image:
    // 1. First crop to correct aspect ratio
    // 2. Then resize to final dimensions with high-quality settings
    const processedBuffer = await sharp(buffer)
      // Step 1: Crop to correct aspect ratio
      .extract({ left, top, width: cropWidth, height: cropHeight })
      // Step 2: Resize to final dimensions with high-quality settings
      .resize(finalWidth, finalHeight, {
        fit: 'fill',
        withoutEnlargement: false,
        kernel: 'lanczos3',  // High-quality resampling
      })
      .jpeg({ quality: 100, mozjpeg: true }) // Using mozjpeg for better compression while maintaining quality
      .toBuffer();

    console.log('Image processed successfully');
    res.set('Content-Type', 'image/jpeg');
    res.set('Access-Control-Allow-Origin', '*');  // Ensure CORS headers are set for the response
    res.send(processedBuffer);
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).json({ error: 'Failed to process image: ' + error.message });
  }
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
  console.log('CORS enabled for all origins');
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