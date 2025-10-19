// This is the complete and final code for this file.
import dotenv from "dotenv";
import { simpleParser } from "mailparser";
import Imap, { ImapMessage } from "node-imap";
import { Readable } from "stream";
import { EmailDocument } from "../types/email.types";
import { aiService } from "./ai.service";
import { elasticService } from "./elastic.service";

dotenv.config();

class ImapService {
  private imap: Imap;
  private isSyncing = false;
  private isInitialSyncComplete = false;

  constructor() {
    this.imap = new Imap({
      user: process.env.IMAP_USER || "",
      password: process.env.IMAP_PASSWORD || "",
      host: process.env.IMAP_HOST || "",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });
    this.handleEvents();
  }

  private handleEvents(): void {
    this.imap.once("ready", () => {
      console.log("✅ IMAP connection successful!");
      this.startWatchdog();
      this.openInbox();
    });

    this.imap.on("mail", () => {
      console.log("📬 New mail event received!");
      if (this.isInitialSyncComplete) {
        this.syncEmails();
      }
    });

    this.imap.once("error", (err: Error) =>
      console.error("IMAP connection error:", err)
    );
    this.imap.once("end", () => console.log("IMAP connection ended."));
  }

  private openInbox(): void {
    this.imap.openBox("INBOX", false, (err, box) => {
      if (err) {
        console.error("Error opening inbox:", err);
        return;
      }
      console.log("📬 Inbox opened successfully.");
      this.syncEmails();
    });
  }

  // Replace the entire syncEmails function
  private syncEmails(): void {
    if (this.isSyncing) return;
    this.isSyncing = true;

    let searchCriteria: any[];
    if (!this.isInitialSyncComplete) {
      console.log("🚀 Performing initial sync (last 24 hours)...");
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // THIS IS THE FIX: Pass the Date object directly
      searchCriteria = [["SINCE", yesterday]];
    } else {
      console.log("👂 Checking for new unseen emails...");
      searchCriteria = ["UNSEEN"];
    }

    const fetchOptions: Imap.FetchOptions = { bodies: "", markSeen: false };

    this.imap.search(searchCriteria, (err, uids) => {
      if (err || uids.length === 0) {
        if (err) console.error("IMAP search error:", err);
        else console.log("No emails to fetch for the given criteria.");
        this.isSyncing = false;
        if (!this.isInitialSyncComplete) {
          this.isInitialSyncComplete = true;
          console.log("✅ Initial sync complete. Now listening for new mail.");
        }
        return;
      }

      console.log(`Found ${uids.length} emails to fetch.`);
      const f = this.imap.fetch(uids, fetchOptions);

      f.on("message", (msg: ImapMessage, seqno: number) => {
        let messageUid: number;
        msg.once("attributes", (attrs) => {
          messageUid = attrs.uid;
        });

        (msg as any).on("body", (stream: Readable) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) {
              console.error("Error parsing email:", err);
              return;
            }

            const emailDocument: EmailDocument = {
              id: parsed.messageId || new Date().getTime().toString(),
              accountId: process.env.IMAP_USER || "",
              subject: parsed.subject || "",
              from: parsed.from?.text || "",
              to: Array.isArray(parsed.to)
                ? parsed.to.map((t) => t.text)
                : [parsed.to?.text || ""],
              date: parsed.date || new Date(),
              body: parsed.text || "",
              aiCategory: "Uncategorized", // Start with the default
              indexedAt: new Date(),
            };

            // Step 1: Index the email immediately
            await elasticService.indexEmail(emailDocument);

            // --- NEW INTEGRATION LOGIC ---
            // Step 2: Call the AI to get the category
            const category = await aiService.categorizeEmail(
              emailDocument.subject,
              emailDocument.body
            );

            // Step 3: Update the document in Elasticsearch with the new category
            await elasticService.updateEmailCategory(
              emailDocument.id,
              category
            );
            // --- END OF NEW LOGIC ---

            if (messageUid) {
              this.imap.addFlags(messageUid, "\\Seen", (flagErr) => {
                if (flagErr) {
                  console.error(
                    `Error marking email UID ${messageUid} as seen:`,
                    flagErr
                  );
                }
              });
            }
          });
        });
      });

      f.once("error", (err) => {
        console.log("Fetch error: " + err);
        this.isSyncing = false;
      });

      f.once("end", () => {
        console.log("✅ Done fetching messages!");
        this.isSyncing = false;
        if (!this.isInitialSyncComplete) {
          this.isInitialSyncComplete = true;
          console.log("✅ Initial sync complete. Now listening for new mail.");
        }
      });
    });
  }

  private startWatchdog(): void {
    const twentyNineMinutes = 29 * 60 * 1000;
    setInterval(() => {
      console.log(
        "🏃‍♂️ Watchdog: Pinging server with STATUS to keep connection alive."
      );
      this.imap.status("INBOX", (err, box) => {
        if (err) console.error("Watchdog STATUS error:", err);
      });
    }, twentyNineMinutes);
  }

  public connect(): void {
    console.log("Attempting to connect to IMAP server...");
    this.imap.connect();
  }
}

export const imapService = new ImapService();
