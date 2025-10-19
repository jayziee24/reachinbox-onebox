// src/index.ts
import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import { aiService } from "./services/ai.service"; // <-- THE MISSING IMPORT
import { elasticService } from "./services/elastic.service";
import { imapService } from "./services/imap.service";

const app = express();
app.use(express.static("."));
const port = process.env.PORT || 3000;

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

app.get("/api/emails", async (req: Request, res: Response) => {
  const accountId = process.env.IMAP_USER || "";
  const emails = await elasticService.getAllEmails(accountId);
  res.json(emails);
});

app.get("/api/accounts", (req: Request, res: Response) => {
  res.json([{ id: process.env.IMAP_USER, name: "Main Account" }]);
});

app.post(
  "/api/emails/:id/suggest-reply",
  async (req: Request, res: Response) => {
    const emailId = req.params.id;
    const email = await elasticService.getEmailById(emailId);

    if (!email) {
      return res.status(404).send({ error: "Email not found." });
    }

    const suggestion = await aiService.suggestReply(email.body);
    res.json({ suggestion });
  }
);

app.listen(port, async () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
  await elasticService.connect();
  imapService.connect();
});
