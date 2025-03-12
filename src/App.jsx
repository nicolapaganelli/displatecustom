import { useState, useRef } from 'react';
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
  const [centerPoint, setCenterPoint] = useState(null);
  const [selectingCenter, setSelectingCenter] = useState(false);
  const imageRef = useRef(null);
  const [previewRect, setPreviewRect] = useState(null);
  const containerRef = useRef(null);

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

  const calculateCropPreview = (image, mouseX, mouseY) => {
    if (!image || !containerRef.current) return null;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const imageAspect = image.naturalHeight / image.naturalWidth;
    const containerAspect = rect.height / rect.width;

    let imageDisplayWidth, imageDisplayHeight;
    let imageLeft = 0, imageTop = 0;

    // Calculate displayed image dimensions
    if (imageAspect > containerAspect) {
      imageDisplayHeight = rect.height;
      imageDisplayWidth = rect.height / imageAspect;
      imageLeft = (rect.width - imageDisplayWidth) / 2;
    } else {
      imageDisplayWidth = rect.width;
      imageDisplayHeight = rect.width * imageAspect;
      imageTop = (rect.height - imageDisplayHeight) / 2;
    }

    // Determine if the image should be treated as vertical or horizontal for Displate
    const isVertical = image.naturalHeight > image.naturalWidth * 1.4;
    let cropWidth, cropHeight;

    if (isVertical) {
      // For vertical images, maintain 1.4:1 (height:width) ratio
      cropWidth = Math.min(imageDisplayWidth, imageDisplayHeight / 1.4);
      cropHeight = cropWidth * 1.4;
    } else {
      // For horizontal images, maintain 1:1.4 (height:width) ratio
      cropHeight = Math.min(imageDisplayHeight, imageDisplayWidth / 1.4);
      cropWidth = cropHeight * 1.4;
    }

    // Calculate crop position based on mouse position
    const cropLeft = Math.max(
      imageLeft,
      Math.min(
        imageLeft + imageDisplayWidth - cropWidth,
        mouseX - cropWidth / 2
      )
    );
    const cropTop = Math.max(
      imageTop,
      Math.min(
        imageTop + imageDisplayHeight - cropHeight,
        mouseY - cropHeight / 2
      )
    );

    return {
      left: cropLeft,
      top: cropTop,
      width: cropWidth,
      height: cropHeight
    };
  };

  const handleMouseMove = (e) => {
    if (!selectingCenter || !imageRef.current || centerPoint) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const preview = calculateCropPreview(
      imageRef.current,
      e.clientX - rect.left,
      e.clientY - rect.top
    );
    setPreviewRect(preview);
  };

  const handleImageClick = (e) => {
    if (!selectingCenter || !imageRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const normalizedX = (e.clientX - rect.left) / rect.width;
    const normalizedY = (e.clientY - rect.top) / rect.height;
    
    setCenterPoint({ 
      x: normalizedX,
      y: normalizedY
    });
    
    const preview = calculateCropPreview(
      imageRef.current,
      e.clientX - rect.left,
      e.clientY - rect.top
    );
    setPreviewRect(preview);
  };

  const handleImageLoad = () => {
    if (imageRef.current && centerPoint) {
      const rect = containerRef.current.getBoundingClientRect();
      const preview = calculateCropPreview(
        imageRef.current,
        centerPoint.x * rect.width,
        centerPoint.y * rect.height
      );
      setPreviewRect(preview);
    }
  };

  const startCentering = () => {
    setSelectingCenter(true);
    setCenterPoint(null);
    setPreviewRect(null);
  };

  const confirmCentering = () => {
    setSelectingCenter(false);
  };

  const cancelCentering = () => {
    setSelectingCenter(false);
    setCenterPoint(null);
    setPreviewRect(null);
  };

  const handleProcess = async () => {
    if (!image || !centerPoint) return;
    
    try {
      setProcessing(true);
      console.log('Starting image processing...');
      
      // Convert base64 to blob
      const response = await fetch(image);
      const blob = await response.blob();
      console.log('Image converted to blob');
      
      // Create form data with center point information
      const formData = new FormData();
      formData.append('image', blob);
      formData.append('centerX', centerPoint.x.toString());
      formData.append('centerY', centerPoint.y.toString());
      console.log('FormData created with center point:', centerPoint);

      // Log the URL we're sending to
      const apiUrl = process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3001/process-image'
        : 'https://displatecustom.onrender.com/process-image';
      console.log('Sending request to:', apiUrl);

      // Send to server
      const processedResponse = await fetch(apiUrl, {
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
                    {selectingCenter ? 'Click to Set Center Point' : 'Original Image'}
                  </Typography>
                  <Box sx={{
                    position: 'relative',
                    width: '100%',
                    pt: '75%',
                    mb: 2,
                    cursor: selectingCenter ? 'crosshair' : 'default',
                    overflow: 'hidden',
                    bgcolor: '#000',
                    borderRadius: 1
                  }} ref={containerRef}>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        overflow: 'hidden'
                      }}
                      onMouseMove={handleMouseMove}
                    >
                      <img 
                        ref={imageRef}
                        src={image} 
                        alt="Original" 
                        onClick={handleImageClick}
                        onLoad={handleImageLoad}
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          width: '100%',
                          height: '100%',
                          transform: 'translate(-50%, -50%)',
                          objectFit: 'contain'
                        }}
                      />
                      {selectingCenter && previewRect && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${previewRect.left}px`,
                            top: `${previewRect.top}px`,
                            width: `${previewRect.width}px`,
                            height: `${previewRect.height}px`,
                            border: '2px solid rgba(255, 255, 255, 0.8)',
                            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                            pointerEvents: 'none'
                          }}
                        />
                      )}
                      {centerPoint && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${centerPoint.x * 100}%`,
                            top: `${centerPoint.y * 100}%`,
                            width: '20px',
                            height: '20px',
                            transform: 'translate(-50%, -50%)',
                            border: '2px solid red',
                            borderRadius: '50%',
                            pointerEvents: 'none',
                            '&::before, &::after': {
                              content: '""',
                              position: 'absolute',
                              backgroundColor: 'red',
                            },
                            '&::before': {
                              left: '50%',
                              width: '2px',
                              height: '100%',
                              transform: 'translateX(-50%)',
                            },
                            '&::after': {
                              top: '50%',
                              width: '100%',
                              height: '2px',
                              transform: 'translateY(-50%)',
                            },
                            zIndex: 2,
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                  <Box sx={{ 
                    textAlign: 'center', 
                    '& > button': { 
                      mx: 1,
                      minWidth: { xs: '120px', sm: '140px' } 
                    } 
                  }}>
                    {!selectingCenter && !processedImage && !centerPoint && (
                      <Button 
                        variant="contained" 
                        color="primary"
                        onClick={startCentering}
                        size="large"
                      >
                        Set Center Point
                      </Button>
                    )}
                    {selectingCenter && (
                      <>
                        <Button 
                          variant="contained" 
                          color="error"
                          onClick={cancelCentering}
                          size="large"
                        >
                          Cancel
                        </Button>
                        {centerPoint && (
                          <Button 
                            variant="contained" 
                            color="primary"
                            onClick={confirmCentering}
                            size="large"
                          >
                            Confirm
                          </Button>
                        )}
                      </>
                    )}
                    {!selectingCenter && centerPoint && !processedImage && (
                      <>
                        <Button 
                          variant="outlined" 
                          color="primary"
                          onClick={startCentering}
                          size="large"
                        >
                          Adjust Center
                        </Button>
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
                      </>
                    )}
                  </Box>
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
