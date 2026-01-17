export enum ReportStatus {
  PENDING = 'pending',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

export enum ReportReason {
  SPAM = 'spam',
  HATE_SPEECH = 'hate_speech',
  HARASSMENT = 'harassment',
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  FRAUD = 'fraud',
  OTHER = 'other',
}

export enum ModerationAction {
  NONE = 'none',
  WARNING = 'warning',
  DELETE_CONTENT = 'delete_content',
  SUSPEND_USER = 'suspend_user',
  BAN_USER = 'ban_user',
}
