// src/services/ai.service.ts
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SchemaType,
} from "@google/generative-ai";
import { qdrantService } from "./qdrant.service";

// THIS IS THE LINE THAT WAS MISSING OR INCORRECT
export type EmailCategory =
  | "Interested"
  | "Not Interested"
  | "Meeting Booked"
  | "Spam"
  | "Out of Office"
  | "Uncategorized";

class AiService {
  private genAI: GoogleGenerativeAI;
  private classificationModel;
  private embeddingModel;
  private generativeModel;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    const systemInstruction = `You are a powerful email classification AI. Your task is to analyze the content of the email (subject and body) and classify it into one of the following exact categories: \n\n- **Interested**: The sender is showing clear interest in a product, service, or job application. They are asking positive questions or want to move forward.\n- **Meeting Booked**: The email's primary purpose is to confirm a meeting, interview, or call that has been scheduled. Look for calendar links, specific times, or phrases like "meeting confirmed".\n- **Not Interested**: The sender is explicitly stating they are not interested, declining an offer, or unsubscribing.\n- **Spam**: This is an unsolicited promotional email, phishing attempt, or irrelevant junk mail.\n- **Out of Office**: The email is an automated reply indicating the person is away from work.\n\nAnalyze the text and provide only the corresponding category.`;
    this.classificationModel = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction,
    });
    this.embeddingModel = this.genAI.getGenerativeModel({
      model: "text-embedding-004",
    });
    this.generativeModel = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });
  }

  public async categorizeEmail(
    subject: string,
    body: string
  ): Promise<EmailCategory> {
    console.log(`🧠 Categorizing email with subject: "${subject}"`);
    try {
      const chat = this.classificationModel.startChat({
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              category: {
                type: SchemaType.STRING,
                format: "enum",
                enum: [
                  "Interested",
                  "Meeting Booked",
                  "Not Interested",
                  "Spam",
                  "Out of Office",
                ],
              },
            },
            required: ["category"],
          },
        },
      });
      const prompt = `Subject: ${subject}\n\nBody: ${body}`;
      const result = await chat.sendMessage(prompt);
      const responseText = result.response.text();
      const responseObject = JSON.parse(responseText);
      console.log(`🤖 AI categorized as: ${responseObject.category}`);
      return responseObject.category as EmailCategory;
    } catch (error) {
      console.error("Error categorizing email with AI:", error);
      return "Uncategorized";
    }
  }

  public async embedAndStore(text: string): Promise<void> {
    console.log(`Embedding text: "${text.substring(0, 30)}..."`);
    const result = await this.embeddingModel.embedContent(text);
    const embedding = result.embedding.values;
    await qdrantService.upsertPoint(Array.from(embedding), text);
    console.log("✅ Stored in Qdrant.");
  }

  // In ai.service.ts, replace the suggestReply function

  public async suggestReply(originalEmailBody: string): Promise<string> {
    try {
      const queryEmbedding = await this.embeddingModel.embedContent(
        originalEmailBody
      );
      const contextResults = await qdrantService.search(
        Array.from(queryEmbedding.embedding.values)
      );
      const retrievedContext = contextResults
        .map((result: any) => result.payload?.text)
        .filter(Boolean)
        .join("\n---\n");

      const finalPrompt = `You are a helpful assistant writing a professional email reply.\n\n**Retrieved Context (Use this information to draft the reply):**\n${retrievedContext}\n\n**Original Email Received:**\n${originalEmailBody}\n\n**Your Task:**\nBased ONLY on the context provided and the original email, draft a professional and helpful reply. Be concise and do not make up information. If the context contains a link, include it in the reply.`;

      const result = await this.generativeModel.generateContent(finalPrompt);
      const response = result.response;

      // --- THIS IS THE FIX ---
      // Check if the response or text is empty before returning.
      const suggestionText = response.text();
      if (!suggestionText) {
        console.error("AI returned an empty suggestion.");
        return "Sorry, the AI could not generate a suggestion for this email.";
      }

      return suggestionText;
    } catch (error) {
      console.error("Error suggesting reply:", error);
      return "Sorry, I couldn't generate a reply at this time.";
    }
  }
}

export const aiService = new AiService();
