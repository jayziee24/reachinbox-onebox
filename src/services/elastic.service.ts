// src/services/elastic.service.ts
import { Client } from "@elastic/elasticsearch";
import { EmailDocument } from "../types/email.types";

class ElasticService {
  private client: Client;
  private readonly indexName = "emails";

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_HOST || "http://localhost:9200",
    });
  }

  public async connect(): Promise<void> {
    try {
      await this.client.ping();
      console.log("✅ Elasticsearch client connected");
      await this.createIndexIfNotExists();
    } catch (error) {
      console.error("Elasticsearch connection error:", error);
    }
  }

  private async createIndexIfNotExists(): Promise<void> {
    const indexExists = await this.client.indices.exists({
      index: this.indexName,
    });
    if (!indexExists) {
      console.log(`Index '${this.indexName}' does not exist. Creating...`);
      await this.client.indices.create({
        index: this.indexName,
        mappings: {
          properties: {
            subject: { type: "text" },
            body: { type: "text" },
            from: { type: "text" },
            accountId: { type: "keyword" },
            aiCategory: { type: "keyword" },
            date: { type: "date" },
          },
        },
      });
      console.log(`Index '${this.indexName}' created successfully.`);
    } else {
      console.log(`Index '${this.indexName}' already exists.`);
    }
  }

  public async indexEmail(email: EmailDocument): Promise<void> {
    try {
      await this.client.index({
        index: this.indexName,
        id: email.id, // Use the unique message-id to prevent duplicates
        document: email,
      });
      console.log(`📬 Email with ID ${email.id} indexed successfully.`);
    } catch (error) {
      console.error(`Error indexing email ${email.id}:`, error);
    }
  }
}

export const elasticService = new ElasticService();
