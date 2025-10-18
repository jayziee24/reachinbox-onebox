// src/index.ts
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { imapService } from "./services/imap.service"; // Import the service

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  res.send("Server is running and connected to IMAP!");
});

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
  // Connect to the IMAP server on startup
  imapService.connect();
});
