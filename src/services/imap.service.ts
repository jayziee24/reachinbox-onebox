// src/services/imap.service.ts
import dotenv from "dotenv";
import Imap from "node-imap";
import { inspect } from "util";

dotenv.config();

class ImapService {
  private imap: Imap;
  private isSyncing = false; // A lock to prevent multiple fetches at once

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
      // We call the initialSync function again, but it will only fetch UNSEEN.
      this.initialSync();
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
      this.initialSync(); // Perform the first sync
    });
  }

  private initialSync(): void {
    // If a sync is already in progress, don't start another one.
    if (this.isSyncing) {
      console.log("Sync already in progress, skipping new mail check for now.");
      return;
    }
    this.isSyncing = true;
    console.log("Checking for unseen emails...");

    const fetchOptions = {
      bodies: ["HEADER.FIELDS (FROM TO SUBJECT DATE)"],
      struct: true,
    };

    // We only search for UNSEEN emails now. On first run, this gets all recent unread.
    // On subsequent runs (triggered by 'mail' event), it gets only the new ones.
    this.imap.search(["UNSEEN"], (err, uids) => {
      if (err) {
        console.error("IMAP search error:", err);
        this.isSyncing = false;
        return;
      }

      if (uids.length === 0) {
        console.log("No new emails to fetch.");
        this.isSyncing = false;
        return;
      }

      console.log(`Found ${uids.length} new emails to fetch.`);
      const f = this.imap.fetch(uids, fetchOptions);

      f.on("message", (msg, seqno) => {
        console.log("--- Processing message #%d ---", seqno);
        msg.on("body", (stream, info) => {
          let buffer = "";
          stream.on("data", (chunk) => {
            buffer += chunk.toString("utf8");
          });
          stream.once("end", () => {
            console.log(`#${seqno} Header:`, inspect(Imap.parseHeader(buffer)));
          });
        });
      });

      f.once("error", (err) => {
        console.log("Fetch error: " + err);
      });

      f.once("end", () => {
        console.log("✅ Done fetching messages!");
        this.isSyncing = false; // Release the lock
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
