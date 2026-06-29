import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import repoRoute from './src/routes/repoRoutes.js'; import askRoute from './src/routes/askRoutes.js';
import cors from 'cors';

dotenv.config();

const app = express();
const allowedOrigins = [
  'https://codememory.onrender.com',
  'https://codememory-frontend.onrender.com',
  'http://localhost:5173',
  process.env.FRONTEND_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
const PORT = process.env.PORT

app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.use('/api/v1/repos', repoRoute);
app.use('/api/v1/ask', askRoute);
connectDB().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Server is listening on port ${process.env.PORT}`);
  });
});
