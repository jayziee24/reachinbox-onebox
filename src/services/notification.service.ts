// src/services/notification.service.ts
import axios from "axios";
import { EmailDocument } from "../types/email.types";

class NotificationService {
  public async sendInterestNotification(email: EmailDocument): Promise<void> {
    const slackUrl = process.env.SLACK_WEBHOOK_URL;
    const webhookSiteUrl = process.env.WEBHOOK_SITE_URL;

    if (!slackUrl || !webhookSiteUrl) {
      console.warn(
        "⚠️ Slack or Webhook.site URL not found in .env. Skipping notifications."
      );
      return;
    }

    console.log(
      `🚀 Sending 'Interested' notification for email from ${email.from}`
    );

    // 1. Slack Notification Payload
    try {
      // Slack uses a specific 'text' field for its simplest webhook message
      const slackPayload = {
        text: `*New Interested Lead!* 🎉\n*From:* ${email.from}\n*Subject:* ${email.subject}`,
      };
      await axios.post(slackUrl, slackPayload);
      console.log("✅ Slack notification sent successfully.");
    } catch (error: any) {
      console.error("Error sending Slack notification:", error.message);
    }

    // 2. Generic Webhook Payload
    try {
      const webhookPayload = {
        event: "InterestedLead",
        emailData: email,
      };
      await axios.post(webhookSiteUrl, webhookPayload);
      console.log("✅ Webhook.site notification sent successfully.");
    } catch (error: any) {
      console.error("Error sending to Webhook.site:", error.message);
    }
  }
}

export const notificationService = new NotificationService();
