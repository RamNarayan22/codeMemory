import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './src/config/db.js';
import repoRoute from './src/routes/repoRoutes.js';
dotenv.config();

const app = express();
app.use(express.json());
const PORT = process.env.PORT

app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.use('/api/v1/repos', repoRoute);

connectDB().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`Server is listening on port ${process.env.PORT}`);
  });
});
