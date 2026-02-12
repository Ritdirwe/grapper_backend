export interface ProfileSummary {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
}

export interface ProfileReadContract {
  getProfileByUserId(userId: string): Promise<ProfileSummary | undefined>;
  getProfilesByUserIds(userIds: string[]): Promise<ProfileSummary[]>;
}

export const PROFILE_READ_CONTRACT = 'PROFILE_READ_CONTRACT';
