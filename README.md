# Displater - Image Processing App

A web application for processing images according to Displate specifications.

## Development

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. In a separate terminal, start the backend server:
```bash
npm run server
```

## Production Deployment

### Frontend Deployment (Vercel/Netlify)

1. Build the frontend:
```bash
npm run build
```

2. Deploy the `dist` folder to your preferred hosting platform:
- For Vercel: Connect your GitHub repository and it will automatically detect the Vite configuration
- For Netlify: Deploy the `dist` folder or connect your GitHub repository

### Backend Deployment (Heroku)

1. Create a Heroku account and install the Heroku CLI
2. Login to Heroku:
```bash
heroku login
```

3. Create a new Heroku app:
```bash
heroku create your-app-name
```

4. Deploy to Heroku:
```bash
git push heroku main
```

### Environment Variables

Make sure to set these environment variables in your production environment:

- `NODE_ENV`: Set to 'production'
- `PORT`: Will be set automatically by the hosting platform
- Frontend URL in the CORS configuration in `server.js`

## Features

- Image upload and validation
- Center point selection for image processing
- Automatic cropping and resizing
- Production-ready configuration
