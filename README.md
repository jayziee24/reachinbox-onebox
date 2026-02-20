# AI Email Onebox
 
The project is a **real-time, AI-powered email aggregator** that syncs an IMAP account, makes emails searchable, and uses AI for categorization and reply suggestions.

---

## ✅ Features Implemented

- [x] **Phase 1:** Real-Time Email Synchronization (IMAP IDLE)  
- [x] **Phase 2:** Searchable Storage using Elasticsearch  
- [x] **Phase 3:** AI-Based Email Categorization  
- [x] **Phase 4:** Slack & Webhook Integration  
- [x] **Phase 5:** Frontend Interface  
- [x] **Phase 6:** AI-Powered Suggested Replies (RAG) — *Direct Interview Feature*  
- [x] **Enhancement:** Professional Logging & Resilient Connections  
- [x] **Enhancement:** Filtering by Folder  

---

## 🏛️ Architecture Details

- **Backend API:**  
  A robust Node.js and Express server written in **TypeScript**, structured with a **service-oriented architecture** to separate concerns for IMAP, Elasticsearch, AI, and Notifications.

- **Real-Time Sync:**  
  Uses the `node-imap` library with the IMAP `IDLE` protocol for efficient, push-based email notifications.  
  A watchdog and automatic reconnect logic ensure a **persistent, resilient connection**.

- **Persistence & Search:**  
  - **Elasticsearch:**  
    A Dockerized instance serves as the primary data store, providing **powerful full-text search** and filtering capabilities.  
  - **Qdrant:**  
    A Dockerized **vector database** used to store text embeddings for the **RAG pipeline**.

- **AI & Machine Learning:**  
  - **Google Gemini API:**  
    Leveraged for both **email classification** (using `gemini-1.5-flash` with JSON mode for reliable output) and for **text embeddings** (`text-embedding-004`) and **reply generation**.  
  - **RAG Pipeline:**  
    A full **Retrieval-Augmented Generation (RAG)** pipeline is implemented to provide **context-aware reply suggestions**.

- **Frontend:**  
  A simple, fast, single-file **vanilla HTML, CSS, and JavaScript** interface to demonstrate all backend functionalities.

---

## 🚀 Setup and Run Instructions

### Prerequisites

- Node.js (v18 or higher)  
- Docker and Docker Compose  
- Git  

---

### 1. Clone the Repository

```bash
git clone https://github.com/jayziee24/reachinbox-onebox.git
cd reachinbox-onebox
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root of the project. You can copy the example file:

```bash
cp .env.example .env
```

Open the `.env` file and add your credentials:

- `IMAP_PASSWORD`: A 16-character Google App Password.
- `GEMINI_API_KEY`: Your API key from Google AI Studio.
- `SLACK_WEBHOOK_URL` and `WEBHOOK_SITE_URL`.

### 4. Start the Databases

Run the Docker containers for Elasticsearch and Qdrant in the background.

```bash
docker compose up -d
```

### 5. Seed the Vector Database (For Phase 6)

Run this one-time script to populate the Qdrant database with the knowledge base for RAG.

```bash
npx ts-node src/seed.ts
```

### 6. Run the Application

Start the development server.

```bash
npm run dev
```

The server will be running at `http://localhost:3000`. It will connect to IMAP, perform an initial sync of the last 30 days, and then begin listening for new emails in real-time.

---

## 🛠️ Feature Implementation Breakdown

### Real-Time Sync
The `ImapService` establishes a persistent connection. An initial sync fetches the last 30 days of emails. After this, the `mail` event listener and a robust manual `\Seen` flag system ensure that only new emails are processed in real-time without duplicates.

### Elasticsearch Indexing
As emails are parsed, they are immediately indexed into Elasticsearch. The index mapping is optimized with `text` for full-text search and `keyword` for fast filtering on fields like `accountId` and `folder`.

### AI Categorization
For each new email, the `AiService` sends the subject and body to the Gemini API with a detailed system prompt and a strict JSON schema. The AI's response is used to update the email document in Elasticsearch.

### Notifications
If an email is categorized as "Interested," the `NotificationService` is triggered to send asynchronous POST requests to both Slack and a generic webhook endpoint.

### RAG Pipeline
When "Suggest Reply" is clicked, the backend fetches the email by ID, creates a vector embedding of its body, and searches the Qdrant database for the most relevant context. This context and the original email are then fed into the Gemini generative model to produce a high-quality, context-aware reply.

### Code Quality
Professional logging is implemented using `pino`. The IMAP service is resilient, with automatic reconnection logic to handle network drops gracefully.

---

## 📚 API Endpoints

### `GET /api/emails`
Retrieve emails with optional filtering and search.

**Query Parameters:**
- `q` - Full-text search query
- `folder` - Filter by folder name
- `category` - Filter by AI category
- `size` - Number of results (default: 50)

### `GET /api/emails/:id`
Retrieve a specific email by ID.

### `POST /api/emails/:id/suggest-reply`
Generate an AI-powered reply suggestion using RAG.

---

## 🐳 Docker Services

The project uses Docker Compose to run the following services:

- **Elasticsearch** (port 9200): Document storage and search engine
- **Qdrant** (port 6333): Vector database for RAG embeddings

---

## 🔧 Technologies Used

- **Backend:** Node.js, Express, TypeScript
- **Email:** node-imap, mailparser
- **Search:** Elasticsearch
- **Vector DB:** Qdrant
- **AI:** Google Gemini API
- **Logging:** Pino
- **Frontend:** Vanilla HTML/CSS/JavaScript

---

## 📝 Project Structure

```
reachinbox-onebox/
├── src/
│   ├── services/
│   │   ├── ImapService.ts       # IMAP connection and email sync
│   │   ├── ElasticsearchService.ts  # Email indexing and search
│   │   ├── AiService.ts         # AI categorization and RAG
│   │   └── NotificationService.ts   # Slack and webhook notifications
│   ├── routes/
│   │   └── emailRoutes.ts       # API endpoints
│   ├── seed.ts                  # Qdrant knowledge base seeder
│   └── index.ts                 # Application entry point
├── public/
│   └── index.html               # Frontend interface
├── docker-compose.yml           # Docker services configuration
├── .env.example                 # Environment variables template
└── package.json
```

---

## 🚨 Troubleshooting

### IMAP Connection Issues
- Ensure you're using a Google App Password (16 characters), not your regular password
- Check that IMAP is enabled in your Gmail settings

### Elasticsearch Connection Failed
- Verify Docker containers are running: `docker compose ps`
- Check Elasticsearch logs: `docker compose logs elasticsearch`

### Gemini API Errors
- Verify your API key is valid at [Google AI Studio](https://makersuite.google.com/app/apikey)
- Check API quota limits

---

## 📄 License

This project is created as an assignment for ReachInbox.

---

## 👤 Author

**Jayziee**  
GitHub: [@jayziee24](https://github.com/jayziee24)

---

## 🙏 Acknowledgments

- ReachInbox for the interesting assignment
- Google Gemini API for AI capabilities
- Elasticsearch and Qdrant for robust data storage
