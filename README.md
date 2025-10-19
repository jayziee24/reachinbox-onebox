# ReachInbox Assignment - AI Email Onebox

This is an implementation of the Associate Backend Engineer assignment for ReachInbox. The project is a real-time, AI-powered email aggregator that syncs multiple IMAP accounts, makes them searchable, and uses AI for categorization and replies.

---

## Features Implemented

- [x] **Phase 1: Real-Time Email Synchronization (IMAP IDLE)**
- [x] **Phase 2: Searchable Storage using Elasticsearch**
- [x] **Phase 3: AI-Based Email Categorization**
- [ ] **Phase 4: Slack & Webhook Integration**
- [ ] **Phase 5: Frontend Interface**
- [ ] **Phase 6: AI-Powered Suggested Replies (RAG)**

---

## Architecture Overview

- **Backend API:** Node.js, Express, TypeScript
- **Real-Time Sync:** `node-imap` library using the IMAP IDLE protocol for real-time, push-based email notifications.
- **Persistence:**
  - **Elasticsearch:** Dockerized instance for full-text search and filtering.
  - **Qdrant:** Dockerized instance for vector storage to support RAG.

---

## 🚀 Setup and Run Instructions

### Prerequisites

- Node.js (v18 or higher)
- Docker and Docker Compose
- Git

### 1. Clone the Repository

```bash
git clone [https://github.com/jayziee24/reachinbox-onebox.git](https://github.com/jayziee24/reachinbox-onebox.git)
cd reachinbox-onebox

```
