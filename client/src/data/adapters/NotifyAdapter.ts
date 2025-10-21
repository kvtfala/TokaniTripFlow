export interface Notification {
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}

export interface INotifyAdapter {
  send(to: string, subject: string, body: string): Promise<void>;
  getNotifications(userId: string): Promise<Notification[]>;
}

// Stub implementation - logs to console
// Replace with actual email/SMS/push notification service
export const NotifyAdapter: INotifyAdapter = {
  send: async (to: string, subject: string, body: string) => {
    const timestamp = new Date().toISOString();
    console.log("📧 [NOTIFICATION]", {
      to,
      subject,
      body,
      timestamp,
    });
    
    // In production, this would call an email service, SMS gateway, or push notification API
    // For now, we just log it
  },
  
  getNotifications: async (userId: string) => {
    // Mock notification history
    return [];
  },
};
