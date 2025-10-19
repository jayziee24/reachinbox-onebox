// src/seed.ts
import dotenv from "dotenv";
dotenv.config();

import { aiService } from "./services/ai.service";
import { qdrantService } from "./services/qdrant.service";

const knowledgeBase = [
  "I am a final year Computer Science student specializing in backend development and AI.",
  "My primary skills include TypeScript, Node.js, Python, and system design.",
  "If a lead is interested in scheduling an interview, share my meeting link: https://cal.com/rock-jason/interview",
  "I am actively looking for full-time Software Engineer or Backend Engineer roles starting in 2026.",
  "One of my key projects was a real-time collaborative code editor built with WebSockets.",
];

async function seedDatabase() {
  console.log("--- Starting Database Seeding ---");
  await qdrantService.initializeCollection();

  for (const text of knowledgeBase) {
    await aiService.embedAndStore(text);
  }

  console.log("--- Seeding Complete ---");
}

seedDatabase();
