import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import { elasticService } from "./services/elastic.service";
import { imapService } from "./services/imap.service";

const app = express();
const port = process.env.PORT || 3000;

// Add a temporary debug log to prove the key is loaded
console.log("🔑 Key loaded in index.ts:", process.env.GEMINI_API_KEY);

app.get("/", (req: Request, res: Response) => {
  res.send("Server is running!");
});

app.get("/api/emails/search", async (req: Request, res: Response) => {
  const searchTerm = req.query.q as string;
  if (!searchTerm) {
    return res.status(400).send({ error: 'Search term "q" is required.' });
  }
  const accountId = process.env.IMAP_USER || "";
  const results = await elasticService.searchEmails(searchTerm, accountId);
  res.json(results);
});

app.listen(port, async () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
  await elasticService.connect();
  imapService.connect();
});
