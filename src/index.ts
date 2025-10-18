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

app.listen(port, async () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
  await elasticService.connect();
  console.log("--> NOW ATTEMPTING TO CONNECT IMAP <--");
  imapService.connect();
});
