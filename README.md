# RAGBook

RAGBook is a document assistant built with React, Express, MongoDB, Qdrant, and Groq. Users create notes, upload PDF or TXT documents, and ask questions grounded in those documents. It can also create a structured summary through a LangGraph workflow.

## Features

- Account registration and login using JWT cookies.
- Notes for organizing documents.
- PDF and TXT uploads (up to 20 MB per file).
- Text extraction, overlapping chunking, and local vector embeddings.
- Qdrant vector search for question answering over a note's documents.
- Document summarization using Analyzer, Generator, and Reviewer LangGraph nodes, with one possible regeneration.

## Architecture

```text
Browser (React/Vite, served by Nginx on :3000)
        │ /api requests
        ▼
Express API (:5000) ─── MongoDB (:27017)
        │
        ├── Groq API: chat and summary language model
        ├── Local Transformers model: embeddings
        └── Qdrant (:6333): vectors and document chunks
```

MongoDB stores users, notes, and document metadata. Uploaded files are stored in `uploads/`. During ingestion, the backend extracts document text, splits it into chunks of about 1,000 characters with 200 characters of overlap, and embeds each chunk with `Xenova/all-MiniLM-L6-v2` (384-dimensional vectors). Chunks and metadata are stored in a Qdrant collection associated with the note.

Chat embeds a user's question, retrieves up to five matching chunks from Qdrant, and sends those excerpts plus the conversation history to Groq. The prompt instructs the model to answer from the excerpts. Summary generation loads the note's stored chunks and runs them through LangGraph's Analyzer → Generator → Reviewer workflow. If the reviewer requests changes, the Generator gets one retry with the feedback.

## Requirements

- Docker Desktop with Docker Compose, running on Windows, macOS, or Linux.
- A Groq API key with access to the model configured in `backend/src/services/langgraph/llm.ts` and `backend/src/routes/chat.ts`.
- Internet access on the first build so Docker can download images and dependencies. The embedding model may also be downloaded the first time document ingestion runs.

## Quick start with Docker

Run these commands from the repository root.

1. Create the local environment file:

   **PowerShell**
   ```powershell
   Copy-Item .env.example .env
   ```

   **macOS/Linux**
   ```bash
   cp .env.example .env
   ```

2. Edit `.env`. Set `GROQ_API_KEY` to your own valid key and replace the development `JWT_SECRET` with a random secret. Keep the Docker service addresses for MongoDB and Qdrant as shown in the example.

3. Build and start the app:

   ```bash
   docker compose up --build
   ```

4. Open [http://localhost:3000](http://localhost:3000), register an account, create a note, upload a PDF or TXT document, and wait for its status to become ready before using chat or summary.

Keep this terminal open to see logs. Press **Ctrl+C** to stop the foreground services. To start them in the background, use `docker compose up --build -d`; later inspect them with `docker compose logs -f` and stop the containers with `docker compose down`.

The Compose services and host ports are:

| Service | Host port | Purpose |
| --- | ---: | --- |
| Frontend | 3000 | React app served by Nginx |
| Backend | 5000 | Express API |
| MongoDB | 27017 | Users, notes, and document metadata |
| Qdrant | 6333 (and 6334) | Vector storage/search; dashboard at `http://localhost:6333/dashboard` |

MongoDB and Qdrant data use named Docker volumes, so `docker compose down` preserves them. `docker compose down -v` removes those volumes and permanently deletes the local database and vector data.

## Deploying a free personal demo on Render

The repository includes a `render.yaml` Blueprint for a Render static frontend and Docker backend. Both are configured for Render's free plan, which can sleep when idle and has limited resources. This is intended for a personal demo, not an always-on production service. Uploaded source files live on the backend's local filesystem; on free hosting that storage is ephemeral, so files can disappear after a restart or redeploy. The app's database and Qdrant data are hosted separately.

1. Push the project to a GitHub repository that Render can access. Keep `.env` private; `.gitignore` excludes it.
2. Create a MongoDB Atlas database and a Qdrant Cloud cluster. Copy their connection strings/URLs. Configure Atlas network access so the Render backend can connect; for a demo, review Atlas's IP allow-list options.
3. In Render, choose **New → Blueprint**, connect the repository, and let Render read `render.yaml`. It defines `ragbook-api` and `ragbook-web`.
4. When prompted, provide `MONGO_URI`, `QDRANT_URL`, and `GROQ_API_KEY`. Render generates `JWT_SECRET`. Do not paste secrets into Git or chat.
5. Wait for both services to deploy. The static frontend receives the API URL from the backend service; the backend receives the frontend URL for CORS.
6. Open the `ragbook-web` URL, register a new account, upload a small text-based PDF or TXT file, wait for ingestion to finish, and try chat and summary.

The backend health check is `/api/health`. If a deployment fails, inspect the backend and frontend service logs in Render. Verify that MongoDB and Qdrant URLs are correct and that the Groq key is active. For durable uploaded files or an always-on backend, configure persistent/object storage and a paid compute plan before relying on this deployment.

## Environment variables

| Variable | Purpose | Docker default/example |
| --- | --- | --- |
| `MONGO_URI` | MongoDB connection string | `mongodb://mongo:27017/ragbook` |
| `QDRANT_URL` | Qdrant endpoint | `http://qdrant:6333` |
| `JWT_SECRET` | Signs authentication tokens | Replace the sample value with a long random secret |
| `GROQ_API_KEY` | Groq API authentication for chat, summaries, and ingestion validation | Your Groq API key |
| `CLIENT_URL` | Allowed browser origin for API CORS | `http://localhost:3000` |

Do not commit `.env` or share its API key. The backend uses `GROQ_API_KEY`; the README's configuration should match this variable.

## API overview

All routes are prefixed with `/api`. Note, document, chat, and summary endpoints require authentication. Authentication uses an HTTP-only cookie.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Backend health check |
| `POST` | `/api/auth/register` | Create an account (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | Sign in (`email`, `password`) |
| `POST` | `/api/auth/logout` | Clear the login cookie |
| `GET` | `/api/auth/me` | Get the current user |
| `GET` | `/api/notes` | List the current user's notes |
| `POST` | `/api/notes` | Create a note (`title`) |
| `GET`, `PUT`, `DELETE` | `/api/notes/:id` | Read, rename, or delete a note |
| `POST` | `/api/docs/upload` | Upload a PDF/TXT multipart file with `noteId` |
| `GET` | `/api/docs?noteId=:id` | List documents for a note |
| `POST` | `/api/chat/:noteId` | Ask a question (`question`, optional `history`) |
| `POST` | `/api/ai/:noteId/summary` | Generate a summary for a note |

## Local development without Docker

Docker Compose is the simplest way to run the complete stack. For separate frontend/backend development, MongoDB and Qdrant must still be running and reachable, and environment values must use host-accessible URLs (for example, local MongoDB/Qdrant addresses rather than Compose-only names such as `mongo` and `qdrant`).

Install dependencies in `backend/` and `frontend/` with `npm install`. Start the API with `npm run dev` from `backend/`, and start Vite with `npm run dev` from `frontend/`. Check `frontend/vite.config.ts` for the development API proxy. For production builds, run `npm run build` in each package; the backend can be launched with `npm start` after building.

## Project layout

```text
backend/
  src/
    config/          MongoDB connection
    middleware/      Authentication, async handling, errors
    models/          User, Note, Document schemas
    routes/          Auth, notes, docs, chat, AI endpoints
    services/
      rag/           Upload ingestion, chunking, embeddings, retrieval
      ai/            Summary orchestration
      langgraph/     Summary graph, state, LLM setup, nodes
frontend/
  src/
    components/      Upload, chat, note UI components
    pages/           Login, registration, notes, note detail
    lib/             API client
docker-compose.yml   Frontend, backend, MongoDB, and Qdrant services
uploads/             Persisted uploaded files (mounted into backend)
```

## Troubleshooting

- **The site does not open:** confirm Docker Desktop is running and check `docker compose ps`; the frontend should publish port 3000.
- **Chat or summary returns an error:** check that `.env` contains a valid `GROQ_API_KEY`, and that the model ID configured in both the chat route and summary LLM service is currently available to your Groq account. Rebuild after changing code with `docker compose up --build`.
- **Document is stuck or shows an ingestion error:** inspect `docker compose logs --tail=100 backend`. Check that the file is a text-based PDF or TXT, is under 20 MB, the key is set, and Qdrant is running. Scanned PDFs without embedded text may need OCR, which this app does not currently provide.
- **Login/register fails:** inspect backend logs and verify MongoDB is healthy. A `401` from `/api/auth/me` before login is expected.
- **Qdrant client/server compatibility warning:** the warning may appear when the JavaScript client and Qdrant server versions differ. If requests fail, align the Qdrant client dependency and server image versions, then rebuild.
- **Changes do not appear:** rebuild/recreate the relevant container with `docker compose up --build`; a browser refresh alone does not rebuild container images.

## Notes and limitations

- Upload accepts `.pdf` and `.txt` only, up to 20 MB per file.
- Embeddings run locally using Transformers; Groq is used for language generation.
- Chat and summaries require an available Groq model and valid API key.
- Summary generation currently loads up to 200 stored chunks for the note.
- This project is intended for local development/demo use. Review authentication, cookie security, upload validation, and deployment settings before exposing it publicly.
