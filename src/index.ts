// src/index.ts
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { elasticService } from "./services/elastic.service";
import { imapService } from "./services/imap.service";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Server is running!");
});
// src/index.ts
// ... (other imports are unchanged)

// ... (app and port setup is unchanged)

app.get("/", (req: Request, res: Response) => {
  res.send("Server is running!");
});

// --- ADD THIS NEW ENDPOINT ---
app.get("/api/emails/search", async (req: Request, res: Response) => {
  // Get search term from query parameters (e.g., ?q=test)
  const searchTerm = req.query.q as string;

  if (!searchTerm) {
    return res.status(400).send({ error: 'Search term "q" is required.' });
  }

  // We'll use your email from .env as the accountId for now
  const accountId = process.env.IMAP_USER || "";

  const results = await elasticService.searchEmails(searchTerm, accountId);
  res.json(results);
});

app.listen(port, async () => {
  // ... (listen logic is unchanged)
});

app.listen(port, async () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
  await elasticService.connect();
  console.log("--> NOW ATTEMPTING TO CONNECT IMAP <--");
  imapService.connect();
});
