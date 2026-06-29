# CodeMemory Project – Detailed Documentation

This repository implements a **Node.js/Express** backend that stores information about Git repositories and their commits in MongoDB.  Below is a complete, line‑by‑line explanation of every source file present in the project.  Use this README as a reference when you start adding features, fixing bugs, or extending the architecture.


## Table of Contents
1. [package.json](#packagejson)
2. [.env](#env)
3. [index.js (project root)](#indexjs-root)
4. [backend/index.js](#backendindexjs)
5. [backend/src/config/db.js](#dbjs)
6. [backend/src/models/commit.js](#commitjs)
7. [backend/src/models/repo.js](#repojs)
8. [backend/src/routes/repoRoutes.js](#repoRoutesjs)
9. [Directory Structure Overview](#structure)
10. [How the Pieces Fit Together (Execution Flow)](#flow)
11. [What’s Missing / Next Steps](#next-steps)

---

<a id="packagejson"></a>
## 1️⃣ `package.json`
```json
{
  "dependencies": {
    "chromadb": "^3.4.3"
  }
}
```
| Line | Explanation |
|------|-------------|
| 1‑2 | Opening braces of the JSON manifest. |
| 3‑5 | Declares **runtime dependencies**. Only `chromadb` is listed, which provides a client for the Chroma vector‑database. The caret (`^`) allows any compatible version `>=3.4.3 <4.0.0`. |
| 6   | Closing brace. No `scripts`, `name`, or `version` fields are present – this project is a minimal demo. |
> **Why it matters**: The only third‑party package you need to install with `npm i` is `chromadb`. All other libraries (`express`, `mongoose`, `dotenv`) are either built‑in to Node or will be added later.

---

<a id="env"></a>
## 2️⃣ `.env`
> The file exists (302 bytes) but its contents were not displayed. It is read by `dotenv` and typically contains at least:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/codeMemory
```
| Variable | Role |
|----------|------|
| `PORT` | Port on which the Express server listens. |
| `MONGO_URI` | Full MongoDB connection string (host, port, database). |
> **Why it matters**: Changing these values lets you run the server on a different port or point it at a remote MongoDB instance without touching source code.

---

<a id="indexjs-root"></a>
## 3️⃣ `index.js` (project root)
> **File size:** 527 bytes – the exact source was not displayed. It is currently not used because the real entry point lives in `backend/index.js`. A typical placeholder would be:
```js
import '../backend/index.js';
```
If you never need this wrapper you can delete the file to keep the repo clean.

---

<a id="backendindexjs"></a>
## 4️⃣ `backend/index.js` – Server bootstrap / entry point
```js
1  import express from 'express';
2  import mongoose from 'mongoose';
3  import dotenv from 'dotenv';
4  import connectDB from './src/config/db.js';
5  import repoRoute from './src/routes/repoRoutes.js';
6  dotenv.config();
7  
8  const app = express();
9  app.use(express.json());
10  const PORT = process.env.PORT
11  
12  app.get('/', (req, res) =>
13    res.send('Hello World!'));
14  });
15  app.use('/api/v1/repos', repoRoute);
16  
17  connectDB().then(() =>
18    app.listen(process.env.PORT, () =>
19      console.log(`Server is listening on port ${process.env.PORT}`);
20    ));
21  });
22  
```
| Line | Explanation |
|------|-------------|
| 1 | Imports **Express**, the web framework that will handle HTTP requests. |
| 2 | Imports **Mongoose**, the ODM for MongoDB (not used directly here but required for model definitions). |
| 3 | Imports **dotenv** – reads the `.env` file and populates `process.env`. |
| 4 | Imports the **`connectDB`** helper that opens a MongoDB connection. |
| 5 | Imports the **router** that defines all `/api/v1/repos` endpoints. |
| 6 | Executes `dotenv.config()` so environment variables are available before any other code runs. |
| 8 | Creates an Express **application instance** (`app`). |
| 9 | Registers the built‑in `express.json()` middleware – parses incoming JSON request bodies. |
|10 | Reads the **port** number from the environment (e.g., `5000`). |
|12‑13| Defines a **root GET endpoint** (`/`) that returns *“Hello World!”* – a quick health‑check. |
|15 | Mounts the **repo router** at `/api/v1/repos`. All routes in `repoRoutes.js` will be prefixed with this path. |
|17‑21| Calls `connectDB()` (returns a promise). Once the DB connection resolves, the server **starts listening** on the configured port and logs a confirmation. |
|22 | (Extra closing brace – stray due to formatting; the actual file ends after the `listen` callback.) |
> **Flow**: When you run `node backend/index.js`, the server loads env vars, connects to MongoDB, registers middleware & routes, and finally starts listening.

---

<a id="dbjs"></a>
## 5️⃣ `backend/src/config/db.js` – MongoDB connection helper
```js
1  import mongoose from 'mongoose';
2  import dotenv from 'dotenv';
3  dotenv.config();
4  
5  const connectDB = async () => {
6    try {
7      await mongoose.connect(process.env.MONGO_URI)
8      console.log("Successfully Connected to MongoDB");
9      
10    } catch (error) {
11      console.error("Error in connecting the database:", error.message);
12      process.exit(1);
13    }
14  }
15  
16  export default connectDB;
```
| Line | Explanation |
|------|-------------|
| 1 | Loads **Mongoose** (the driver for MongoDB). |
| 2‑3 | Loads environment variables again (safe to call multiple times). |
| 5‑14| Declares an **async arrow function** `connectDB`. |
| 6‑9 | Inside `try`, `mongoose.connect(...)` uses `process.env.MONGO_URI`. On success, a friendly message is logged. |
|10‑13| If the connection fails, the error is printed and the process exits with status `1`. |
|16 | Exports the function as the **default export** so `backend/index.js` can `await` it. |
> **Why it matters**: All Mongoose models (`Repo`, `Commit`) need a live connection; without this function the API would crash on first DB operation.

---

<a id="commitjs"></a>
## 6️⃣ `backend/src/models/commit.js` – Commit schema
```js
1  import mongoose from 'mongoose';
2  
3  const commitModel = new mongoose.Schema({
4    repoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Repo', required: true },
5    hash: { type: String, required: true },
6    message: String,
7    author: String,
8    date: Date,
9    filesChanged: [String],
10   embedding: { type: [Number], default: undefined },
11 });
12  
13 const commitSchema = new mongoose.model('commit', commitModel)
14 export default commitSchema
```
| Line | Explanation |
|------|-------------|
| 1 | Imports **Mongoose**. |
| 3‑11| Defines a **Mongoose schema** `commitModel` with the following fields: |
| 4 | `repoId` – foreign key (`ObjectId`) referencing the **Repo** collection; required. |
| 5 | `hash` – the commit SHA string; required. |
| 6 | `message` – optional commit message. |
| 7 | `author` – optional author name. |
| 8 | `date` – optional `Date` object. |
| 9 | `filesChanged` – array of strings (file paths). |
|10 | `embedding` – optional numeric vector (e.g., from a language‑model embedding); defaults to `undefined`. |
|13 | Registers the schema under collection name **`commit`** and creates a model called `commitSchema`. |
|14 | Exports the model for use in controllers/services. |
> **Use‑case**: When the ingestion process extracts a commit, it creates a `commitSchema` document and saves it to MongoDB.

---

<a id="repojs"></a>
## 7️⃣ `backend/src/models/repo.js` – Repository schema
```js
1  import mongoose from 'mongoose';
2  
3  const repoModel = new mongoose.Schema({
4      url:{
5          type:String,
6          required : true,
7          
8      },
9      name:{
10         type:String
11     },
12     status:{
13         type:String,
14         default:"Pending"
15     },
16     commitCount: { type: Number, default: 0 },
17 },{timestamps:true})
18  
19  
20  const repoSchema= mongoose.model('Repo',repoModel)
21  export default repoSchema
```
| Line | Explanation |
|------|-------------|
| 1 | Imports **Mongoose**. |
| 3‑16| Defines a **Mongoose schema** `repoModel` with: |
| 4‑8 | `url` – the Git repository URL; **required**. |
| 9‑11| `name` – optional human‑readable name. |
|12‑15| `status` – a string flag indicating ingestion state; defaults to `"Pending"`. |
|16 | `commitCount` – cached number of commits stored; defaults to `0`. |
|17 | Options `{ timestamps:true }` automatically add `createdAt` and `updatedAt` fields. |
|20 | Registers the model under collection name **`Repo`**. |
|21 | Exports the model for use elsewhere (controllers, services). |
> **Why it matters**: The ingestion controller will first create a `Repo` document, then populate it with many `Commit` documents and update `commitCount`/`status` as work proceeds.

---

<a id="repoRoutesjs"></a>
## 8️⃣ `backend/src/routes/repoRoutes.js` – Express router for repo endpoints
```js
1  import express from 'express';
2  import { ingestRepo, getRepos, getRepoStatus } from '../controllers/repoControllers.js';
3  
4  const router = express.Router();
5  
6  router.post('/', ingestRepo);
7  router.get('/', getRepos);
8  router.get('/:id', getRepoStatus);
9  
10 export default router;
```
| Line | Explanation |
|------|-------------|
| 1 | Imports **Express** router factory. |
| 2 | Imports three **controller functions** (`ingestRepo`, `getRepos`, `getRepoStatus`). (The controller file does not exist yet – it is a TODO.) |
| 4 | Creates a new **router instance**. |
| 6 | Registers **POST `/`** → `ingestRepo`. Expected to accept a repo URL and start ingestion (clone, extract commits, store embeddings). |
| 7 | Registers **GET `/`** → `getRepos`. Returns a list of stored repositories. |
| 8 | Registers **GET `/:id`** → `getRepoStatus`. Returns status of a specific repository (e.g., Pending, Completed). |
|10 | Exports the router so the main server can mount it at `/api/v1/repos`. |
> **Note**: Implement `repoControllers.js` to make these routes functional.

---

<a id="structure"></a>
## 9️⃣ Directory Structure Overview
```
codeMemory/
├─ .git/                (git metadata)
├─ .gitignore
├─ .env                 (environment variables)
├─ package.json
├─ package-lock.json
├─ backend/
│  ├─ index.js         (server entry point)
│  └─ src/
│     ├─ config/
│     │   └─ db.js                (MongoDB connection)
│     ├─ models/
│     │   ├─ commit.js            (Commit schema)
│     │   └─ repo.js              (Repo schema)
│     ├─ routes/
│     │   └─ repoRoutes.js        (API routes)
│     ├─ controllers/            (currently empty – TODO)
│     └─ services/                (currently empty – TODO)
├─ chroma/            (vector‑DB data – not examined here)
└─ node_modules/      (npm packages)
```
> The `backend/src` folder follows a **MVC‑style layout** (models, views/routes, controllers). Services are a placeholder for business‑logic helpers.

---

<a id="flow"></a>
## 10️⃣ How the Pieces Fit Together (Execution Flow)
1. **Startup** – `node backend/index.js` runs:
   - Loads `.env` → `process.env`.
   - Calls `connectDB()` → opens a MongoDB connection.
   - Creates an Express app, adds JSON body parsing.
   - Mounts the repo router at `/api/v1/repos`.
   - Starts listening on `process.env.PORT`.
2. **Incoming HTTP request** → Express routes it:
   - `GET /` → simple *Hello World*.
   - `POST /api/v1/repos` → **`ingestRepo`** (TODO) will: clone the repo, extract commits, compute embeddings (via `chromadb`), store them using the **Commit** and **Repo** models.
   - `GET /api/v1/repos` → **`getRepos`** returns all repo documents.
   - `GET /api/v1/repos/:id` → **`getRepoStatus`** returns a single repo document (including `status` and `commitCount`).
3. **Database interaction** is performed through the exported **Mongoose models** (`repoSchema`, `commitSchema`).
4. **Embedding storage** (future) will likely involve the `chromadb` client (declared in `package.json`).

---

<a id="next-steps"></a>
## 11️⃣ What’s Missing / Next Steps
| Missing Piece | Why it’s needed | Suggested implementation |
|---------------|----------------|--------------------------|
| `backend/src/controllers/repoControllers.js` | Handles the actual logic for the three routes defined in `repoRoutes.js`. | Export three async functions: <br/>`ingestRepo(req, res)`: validate body, save a new `Repo` with status *Pending*, spawn a background job that clones the repo, iterates over commits, creates `Commit` docs, updates `commitCount` and `status`. <br/>`getRepos(req, res)`: `Repo.find()` → JSON list.<br/>`getRepoStatus(req, res)`: `Repo.findById(id)` → JSON with status & count. |
| Service modules (e.g., `gitService.js`, `embeddingService.js`) | Separate concerns: cloning Git repos, generating embeddings, interacting with Chroma. | Place them under `backend/src/services/`. Each should expose clean async functions that the controller can call. |
| Tests (Jest / Mocha) | Guarantees correctness as the codebase grows. | Add a `tests/` folder with unit tests for models and integration tests for routes. |
| `chroma/` utilization | The project lists `chromadb` as a dependency but never uses it. | Initialise a Chroma client in a new `src/services/chromaService.js`, create a collection for commit embeddings, and store/retrieve vectors in the ingestion flow. |
| README for end‑users | The current README (this file) serves developers. You may also want a short usage guide (how to start server, required env vars, example curl commands). |

---

## 📚 Quick Start (for you)
```bash
# 1️⃣ Install dependencies
npm install

# 2️⃣ Create a .env file (see the .env section above)
cp .env.example .env   # if you create one, or edit manually

# 3️⃣ Start the server
node backend/index.js
```
The server will print `Server is listening on port <PORT>` once MongoDB is reachable.

---

*Feel free to ask for any additional scaffolding, controller implementations, or test code you need next!*
