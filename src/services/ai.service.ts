// src/services/ai.service.ts
import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  SchemaType,
} from "@google/generative-ai";

export type EmailCategory =
  | "Interested"
  | "Not Interested"
  | "Meeting Booked"
  | "Spam"
  | "Out of Office"
  | "Uncategorized";

class AiService {
  private genAI: GoogleGenerativeAI;
  private model;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

    // --- THIS IS THE UPGRADED PROMPT ---
    const systemInstruction = `You are a powerful email classification AI. Your task is to analyze the content of the email (subject and body) and classify it into one of the following exact categories: 

    - **Interested**: The sender is showing clear interest in a product, service, or job application. They are asking positive questions or want to move forward.
    - **Meeting Booked**: The email's primary purpose is to confirm a meeting, interview, or call that has been scheduled. Look for calendar links, specific times, or phrases like "meeting confirmed".
    - **Not Interested**: The sender is explicitly stating they are not interested, declining an offer, or unsubscribing.
    - **Spam**: This is an unsolicited promotional email, phishing attempt, or irrelevant junk mail.
    - **Out of Office**: The email is an automated reply indicating the person is away from work.

    Analyze the text and provide only the corresponding category.`;

    this.model = this.genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Let's stick with the stable model for better results
      systemInstruction,
    });
  }

  public async categorizeEmail(
    subject: string,
    body: string
  ): Promise<EmailCategory> {
    // ... (the rest of the file is unchanged)
    console.log(`🧠 Categorizing email with subject: "${subject}"`);
    try {
      const chat = this.model.startChat({
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
}

export const aiService = new AiService();
