import { useState } from 'react';
import { Box, Typography, Paper, Container, Alert, Button, CircularProgress, ThemeProvider, createTheme } from '@mui/material';

// Create a custom theme inspired by Displate
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // Displate-like blue
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    h4: {
      fontWeight: 700,
      letterSpacing: '0.02em',
      marginBottom: '1.5rem',
    },
    h6: {
      fontWeight: 600,
      letterSpacing: '0.01em',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          padding: '10px 24px',
          fontSize: '1rem',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        },
      },
    },
  },
});

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
      console.log('Starting image processing...');
      
      // Convert base64 to blob
      const response = await fetch(image);
      const blob = await response.blob();
      console.log('Image converted to blob');
      
      // Create form data
      const formData = new FormData();
      formData.append('image', blob);
      console.log('FormData created');

      // Log the URL we're sending to
      console.log('Sending request to:', 'https://displatecustom.onrender.com/process-image');

      // Send to server
      const processedResponse = await fetch('https://displatecustom.onrender.com/process-image', {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Accept': 'image/jpeg',
        },
        body: formData
      });

      console.log('Response status:', processedResponse.status);
      
      if (!processedResponse.ok) {
        const errorText = await processedResponse.text();
        console.error('Server response:', errorText);
        throw new Error(`Failed to process image: ${processedResponse.status} ${errorText}`);
      }

      const processedBlob = await processedResponse.blob();
      const processedUrl = URL.createObjectURL(processedBlob);
      setProcessedImage(processedUrl);
      console.log('Image processed successfully');
    } catch (error) {
      console.error('Failed to process image:', error);
      alert('Error processing image: ' + error.message);
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
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: 6
      }}>
        <Container maxWidth="lg">
          <Typography variant="h4" component="h1" align="center" sx={{ mb: 4 }}>
            Displate Image Processor
          </Typography>

          <Box sx={{ 
            display: 'grid',
            gap: 4,
            gridTemplateColumns: { md: '1fr 1fr' },
            alignItems: 'start'
          }}>
            {/* Left Column */}
            <Box>
              <Paper sx={{ p: 4, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Image Requirements
                </Typography>
                <Box component="ul" sx={{ 
                  pl: 2,
                  '& li': { 
                    mb: 1,
                    color: 'text.secondary',
                    fontSize: '0.95rem'
                  }
                }}>
                  <li>High-quality images in JPG, PNG, WEBp, or AVIF format</li>
                  <li>File size should be at least 2900 x 4060 px in a 1.4:1 ratio</li>
                  <li>300 DPI (or more) in RGB mode</li>
                </Box>
              </Paper>

              <Paper
                sx={{
                  p: 4,
                  textAlign: 'center',
                  border: '2px dashed rgba(25, 118, 210, 0.2)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'rgba(25, 118, 210, 0.04)'
                  }
                }}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={handleClick}
              >
                <Typography sx={{ color: 'text.secondary' }}>
                  Drag and drop an image here, or click to select one
                </Typography>
              </Paper>

              {validation && validation.length > 0 && (
                <Alert severity="info" sx={{ mt: 3 }}>
                  <Typography gutterBottom>The image will be adjusted:</Typography>
                  <Box component="ul" sx={{ pl: 2, mb: 0 }}>
                    {validation.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </Box>
                </Alert>
              )}
            </Box>

            {/* Right Column */}
            <Box>
              {image && (
                <Paper sx={{ p: 4, mb: 3 }}>
                  <Typography variant="h6" gutterBottom align="center">
                    Original Image
                  </Typography>
                  <Box sx={{
                    position: 'relative',
                    width: '100%',
                    pt: '75%', // 4:3 Aspect Ratio
                    mb: 2
                  }}>
                    <img 
                      src={image} 
                      alt="Original" 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </Box>
                  {!processedImage && (
                    <Box sx={{ textAlign: 'center' }}>
                      <Button 
                        variant="contained" 
                        color="primary"
                        onClick={handleProcess}
                        disabled={processing}
                        size="large"
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
                    </Box>
                  )}
                </Paper>
              )}

              {processedImage && (
                <Paper sx={{ p: 4 }}>
                  <Typography variant="h6" gutterBottom align="center">
                    Processed Image
                  </Typography>
                  <Box sx={{
                    position: 'relative',
                    width: '100%',
                    pt: '75%', // 4:3 Aspect Ratio
                    mb: 2
                  }}>
                    <img 
                      src={processedImage} 
                      alt="Processed" 
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={handleDownload}
                      size="large"
                    >
                      Download
                    </Button>
                  </Box>
                </Paper>
              )}
            </Box>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
