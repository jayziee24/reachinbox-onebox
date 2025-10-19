export interface EmailDocument {
  id: string;
  accountId: string;
  folder: string;
  subject: string;
  from: string;
  to: string[];
  date: Date;
  body: string;
  aiCategory:
    | "Interested"
    | "Not Interested"
    | "Meeting Booked"
    | "Spam"
    | "Out of Office"
    | "Uncategorized";
  indexedAt: Date;
}
