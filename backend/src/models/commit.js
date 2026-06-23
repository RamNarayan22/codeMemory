import mongoose from 'mongoose';

const commitModel= new mongoose.Schema({
  repoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Repo', required: true },
  hash: { type: String, required: true },
  message: String,
  author: String,
  date: Date,
  filesChanged: [String],
  embedding: { type: [Number], default: undefined },
});

const commitSchema = new mongoose.model('commit',commitModel)
export  default commitSchema