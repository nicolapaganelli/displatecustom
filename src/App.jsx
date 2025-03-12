import { useState } from 'react';
import { Box, Typography, Paper, Container, Alert, Button, CircularProgress } from '@mui/material';

function App() {
  const [image, setImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [validation, setValidation] = useState(null);
  const [processing, setProcessing] = useState(false);

  const validateImage = (file) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const warnings = [];
        
        if (img.width < 2900 || img.height < 4060) {
          warnings.push(`Image dimensions (${img.width}x${img.height}) are below 2900x4060 - will be upscaled`);
        }

        const ratio = img.height / img.width;
        if (Math.abs(ratio - 1.4) > 0.1) {
          warnings.push(`Image ratio (${ratio.toFixed(2)}:1) doesn't match 1.4:1 - will be cropped`);
        }

        resolve(warnings);
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFile = async (file) => {
    if (file && file.type.startsWith('image/')) {
      const warnings = await validateImage(file);
      setValidation(warnings);

      const reader = new FileReader();
      reader.onload = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      handleFile(e.target.files[0]);
    };
    input.click();
  };

  const handleProcess = async () => {
    if (!image) return;
    
    try {
      setProcessing(true);
      
      // Convert base64 to blob
      const response = await fetch(image);
      const blob = await response.blob();
      
      // Create form data
      const formData = new FormData();
      formData.append('image', blob);

      // Send to server
      const processedResponse = await fetch('http://localhost:3001/process-image', {
        method: 'POST',
        body: formData
      });

      if (!processedResponse.ok) {
        throw new Error('Failed to process image');
      }

      const processedBlob = await processedResponse.blob();
      const processedUrl = URL.createObjectURL(processedBlob);
      setProcessedImage(processedUrl);
    } catch (error) {
      console.error('Failed to process image:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (processedImage) {
      const link = document.createElement('a');
      link.href = processedImage;
      link.download = 'processed-image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        Image Processor
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Image Requirements
        </Typography>
        <ul>
          <li>High-quality images in JPG, PNG, WEBp, or AVIF format</li>
          <li>File size should be at least 2900 x 4060 px in a 1.4:1 ratio</li>
          <li>300 DPI (or more) in RGB mode</li>
        </ul>
      </Paper>

      <Paper
        sx={{
          p: 4,
          mb: 3,
          textAlign: 'center',
          border: '2px dashed #ccc',
          cursor: 'pointer'
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={handleClick}
      >
        <Typography>
          Drag and drop an image here, or click to select one
        </Typography>
      </Paper>

      {validation && validation.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography gutterBottom>The image will be adjusted:</Typography>
          <ul>
            {validation.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </Alert>
      )}

      {image && (
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Original Image
          </Typography>
          <img 
            src={image} 
            alt="Original" 
            style={{ maxWidth: '100%', maxHeight: '300px', marginBottom: '20px' }} 
          />
          {!processedImage && (
            <Button 
              variant="contained" 
              color="primary"
              onClick={handleProcess}
              disabled={processing}
              sx={{ mt: 2 }}
            >
              {processing ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                  Processing...
                </>
              ) : (
                'Process Image'
              )}
            </Button>
          )}
        </Box>
      )}

      {processedImage && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Processed Image
          </Typography>
          <img 
            src={processedImage} 
            alt="Processed" 
            style={{ maxWidth: '100%', maxHeight: '300px', marginBottom: '20px' }} 
          />
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleDownload}
            sx={{ mt: 2 }}
          >
            Download
          </Button>
        </Box>
      )}
    </Container>
  );
}

export default App;
