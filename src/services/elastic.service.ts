// src/services/elastic.service.ts
import { Client } from "@elastic/elasticsearch";
import { EmailDocument } from "../types/email.types";
import { EmailCategory } from "./ai.service";

class ElasticService {
  private client: Client;
  private readonly indexName = "emails";

  constructor() {
    this.client = new Client({
      node: process.env.ELASTICSEARCH_HOST || "http://localhost:9200",
    });
  }
  public async updateEmailCategory(
    id: string,
    category: EmailCategory
  ): Promise<void> {
    try {
      await this.client.update({
        index: this.indexName,
        id: id,
        doc: {
          aiCategory: category,
        },
      });
      console.log(`✅ Updated category for email ${id} to ${category}.`);
    } catch (error) {
      console.error(`Error updating email category for ${id}:`, error);
    }
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
  public async searchEmails(query: string, accountId: string) {
    try {
      const esQuery = {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ["subject", "body", "from"],
              },
            },
          ],
          // --- THIS IS THE FIX ---
          // We are changing the filter from "term" to "match"
          filter: [
            {
              match: {
                // Use "match" for more robust text field filtering
                accountId: accountId,
              },
            },
          ],
        },
      };

      const response = await this.client.search({
        index: this.indexName,
        query: esQuery,
      });

      return response.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      console.error("Elasticsearch search error:", error);
      return [];
    }
  }
  public async getAllEmails(accountId: string) {
    try {
      const response = await this.client.search({
        index: this.indexName,
        // Sort by date, newest first
        sort: [{ date: { order: "desc" } }],
        query: {
          match: {
            accountId: accountId,
          },
        },
      });
      return response.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      console.error("Elasticsearch getAllEmails error:", error);
      return [];
    }
  }
  // In elastic.service.ts, replace the getEmailById function

  // In elastic.service.ts, replace the getEmailById function

  public async getEmailById(id: string): Promise<EmailDocument | null> {
    try {
      const response = await this.client.get<EmailDocument>({
        index: "emails",
        id,
      });

      // --- THIS IS THE SLEDGEHAMMER FIX ---
      // 1. Cast 'response' to 'any' to stop all complaints.
      // 2. Access the '_source' property.
      // 3. Cast the result back to 'EmailDocument' to satisfy the return type.
      return (response as any)._source as EmailDocument;
    } catch (error) {
      console.error(`Error fetching email by ID ${id}:`, error);
      return null;
    }
  }
}

export const elasticService = new ElasticService();
