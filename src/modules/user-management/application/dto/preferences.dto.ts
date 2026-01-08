import {
  IsString,
  IsBoolean,
  IsOptional,
  IsObject,
} from 'class-validator';

export class UpdatePreferencesDto {
  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  timezone?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsBoolean()
  @IsOptional()
  emailNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  pushNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  smsNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  marketingEmails?: boolean;

  @IsBoolean()
  @IsOptional()
  bookingReminders?: boolean;

  @IsBoolean()
  @IsOptional()
  messageNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  reviewNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  paymentNotifications?: boolean;

  @IsBoolean()
  @IsOptional()
  showOnlineStatus?: boolean;

  @IsBoolean()
  @IsOptional()
  showProfileToSearch?: boolean;

  @IsBoolean()
  @IsOptional()
  allowMessagesFromAnyone?: boolean;

  @IsObject()
  @IsOptional()
  customSettings?: Record<string, any>;
}
