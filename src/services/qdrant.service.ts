// src/services/qdrant.service.ts
import { QdrantClient } from "@qdrant/js-client-rest";

const COLLECTION_NAME = "knowledge_base";
const VECTOR_SIZE = 768;

class QdrantService {
  private client: QdrantClient;

  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || "http://localhost:6333",
    });
  }

  public async initializeCollection(): Promise<void> {
    try {
      const { collections } = await this.client.getCollections();
      const collectionExists = collections.some(
        (c) => c.name === COLLECTION_NAME
      );
      if (!collectionExists) {
        console.log(`Creating Qdrant collection: '${COLLECTION_NAME}'...`);
        await this.client.createCollection(COLLECTION_NAME, {
          vectors: { size: VECTOR_SIZE, distance: "Cosine" },
        });
        console.log("✅ Qdrant collection created.");
      } else {
        console.log("✅ Qdrant collection already exists.");
      }
    } catch (error) {
      console.error("Error initializing Qdrant collection:", error);
    }
  }

  // --- THIS IS THE FIX ---
  // We added the return type: Promise<any[]>
  public async search(queryVector: number[]): Promise<any[]> {
    try {
      console.log("🧠 Searching Qdrant for relevant context...");
      const results = await this.client.search(COLLECTION_NAME, {
        vector: queryVector,
        limit: 3,
      });
      console.log(`✅ Found ${results.length} context documents.`);
      return results;
    } catch (error) {
      console.error("Error searching Qdrant:", error);
      return []; // Return an empty array on error
    }
  }

  public async upsertPoint(vector: number[], text: string): Promise<void> {
    try {
      await this.client.upsert(COLLECTION_NAME, {
        wait: true,
        points: [
          {
            id: crypto.randomUUID(),
            vector: vector,
            payload: { text },
          },
        ],
      });
    } catch (error) {
      console.error("Error upserting point to Qdrant:", error);
    }
  }
}

export const qdrantService = new QdrantService();
