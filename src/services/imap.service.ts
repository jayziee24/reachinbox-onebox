// src/services/imap.service.ts
import { simpleParser } from "mailparser";
import Imap, { ImapMessage } from "node-imap";
import { Readable } from "stream";
import logger from "../config/logger";
import { EmailDocument } from "../types/email.types";
import { aiService } from "./ai.service";
import { elasticService } from "./elastic.service";
import { notificationService } from "./notification.service";

class ImapService {
  private imap: Imap;
  private currentBox: string = "";
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
      logger.info("✅ IMAP connection successful!");
      this.startWatchdog();
      this.openInbox();
    });

    this.imap.once("end", () => {
      logger.warn(
        "IMAP connection ended. Attempting to reconnect in 10 seconds..."
      );
      setTimeout(() => this.connect(), 10000);
    });

    this.imap.once("error", (err: Error) => {
      logger.error({ err }, "IMAP connection error");
    });

    this.imap.on("mail", () => {
      logger.info("📬 New mail event received!");
      if (this.isInitialSyncComplete) {
        this.syncEmails();
      }
    });
  }

  private openInbox(): void {
    const boxName = "INBOX";
    this.imap.openBox("INBOX", false, (err, box) => {
      if (err) {
        logger.error({ err }, "Error opening inbox");
        return;
      }
      logger.info("📬 Inbox opened successfully.");
      this.currentBox = boxName;
      this.syncEmails();
    });
  }

  private syncEmails(): void {
    if (this.isSyncing) return;
    this.isSyncing = true;

    let searchCriteria: any[];
    if (!this.isInitialSyncComplete) {
      logger.info("🚀 Performing initial sync (last 30 days)...");
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 1);
      searchCriteria = [["SINCE", thirtyDaysAgo]];
    } else {
      logger.info("👂 Checking for new unseen emails...");
      searchCriteria = ["UNSEEN"];
    }

    const fetchOptions: Imap.FetchOptions = { bodies: "", markSeen: false };
    this.imap.search(searchCriteria, (err, uids) => {
      if (err || uids.length === 0) {
        if (err) {
          logger.error({ err }, "IMAP search error");
        } else {
          logger.info("No emails to fetch for the given criteria.");
        }
        this.isSyncing = false;
        if (!this.isInitialSyncComplete) {
          this.isInitialSyncComplete = true;
          logger.info("✅ Initial sync complete. Now listening for new mail.");
        }
        return;
      }

      logger.info(`Found ${uids.length} emails to fetch.`);
      const f = this.imap.fetch(uids, fetchOptions);
      f.on("message", (msg: ImapMessage, seqno: number) => {
        let messageUid: number;
        msg.once("attributes", (attrs) => {
          messageUid = attrs.uid;
        });
        (msg as any).on("body", (stream: Readable) => {
          simpleParser(stream, async (err, parsed) => {
            if (err) {
              logger.error({ err }, "Error parsing email");
              return;
            }
            const emailDocument: EmailDocument = {
              id: parsed.messageId || new Date().getTime().toString(),
              accountId: process.env.IMAP_USER || "",
              folder: this.currentBox,
              subject: parsed.subject || "",
              from: parsed.from?.text || "",
              to: Array.isArray(parsed.to)
                ? parsed.to.map((t) => t.text)
                : [parsed.to?.text || ""],
              date: parsed.date || new Date(),
              body: parsed.text || "",
              aiCategory: "Uncategorized",
              indexedAt: new Date(),
            };
            await elasticService.indexEmail(emailDocument);
            const category = await aiService.categorizeEmail(
              emailDocument.subject,
              emailDocument.body
            );
            await elasticService.updateEmailCategory(
              emailDocument.id,
              category
            );
            if (category === "Interested") {
              notificationService
                .sendInterestNotification(emailDocument)
                .catch((e) =>
                  logger.error({ err: e }, "Error in notification service:")
                );
            }
            if (messageUid) {
              this.imap.addFlags(messageUid, "\\Seen", (flagErr) => {
                if (flagErr) {
                  logger.error(
                    { err: flagErr },
                    `Error marking email UID ${messageUid} as seen:`
                  );
                }
              });
            }
          });
        });
      });

      f.once("error", (err) => {
        logger.error({ err }, "Fetch error");
        this.isSyncing = false;
      });

      f.once("end", () => {
        logger.info("✅ Done fetching messages!");
        this.isSyncing = false;
        if (!this.isInitialSyncComplete) {
          this.isInitialSyncComplete = true;
          logger.info("✅ Initial sync complete. Now listening for new mail.");
        }
      });
    });
  }

  private startWatchdog(): void {
    setInterval(() => {
      logger.info(
        "🏃‍♂️ Watchdog: Pinging server with STATUS to keep connection alive."
      );
      this.imap.status("INBOX", (err, box) => {
        if (err) logger.error({ err }, "Watchdog STATUS error:");
      });
    }, 29 * 60 * 1000);
  }

  public connect(): void {
    logger.info("Attempting to connect to IMAP server...");
    this.imap.connect();
  }
}

export const imapService = new ImapService();
