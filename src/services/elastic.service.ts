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
            folder: { type: "keyword" },
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
  public async searchEmails(query: string, accountId: string, folder?: string) {
    try {
      // 1. Change the function signature to accept 'folder'
      const esQuery: any = {
        bool: {
          must: [
            {
              multi_match: {
                query,
                fields: ["subject", "body", "from"],
              },
            },
          ],
          filter: [
            {
              match: {
                accountId: accountId,
              },
            },
          ],
        },
      };

      // 2. If a folder is provided, add it to the filter array
      if (folder) {
        esQuery.bool.filter.push({ term: { folder: folder } });
      }

      const response = await this.client.search({
        index: this.indexName,
        query: esQuery, // 3. The query object is now updated
      });

      return response.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      console.error({ err: error }, "Elasticsearch search error:");
      return [];
    }
  }
  public async getAllEmails(accountId: string, folder?: string) {
    try {
      // 1. Build a flexible query object
      const query: any = {
        bool: {
          filter: [
            { match: { accountId: accountId } }, // The accountId filter is always active
          ],
        },
      };

      // 2. If a folder is provided, add it to the filter
      if (folder) {
        query.bool.filter.push({ term: { folder: folder } });
      }

      const response = await this.client.search({
        index: this.indexName,
        sort: [{ date: { order: "desc" } }],
        query: query, // 3. Use the new flexible query
      });

      return response.hits.hits.map((hit: any) => hit._source);
    } catch (error) {
      console.error({ err: error }, "Elasticsearch getAllEmails error:");
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
