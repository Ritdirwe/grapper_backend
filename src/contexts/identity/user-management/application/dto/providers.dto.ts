import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsBoolean, IsArray, IsDateString } from 'class-validator';

export class SkillDto {
  @ApiProperty({ example: 'UI Design' })
  name: string;

  @ApiProperty({ example: 234 })
  endorsements: number;
}

export class PortfolioItemResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'E-commerce Mobile App' })
  title: string;

  @ApiProperty({ example: 'A complete e-commerce solution built with React Native' })
  description: string;

  @ApiProperty({ example: 'https://example.com/project.jpg' })
  image: string;

  @ApiProperty({ example: 'Mobile App' })
  category: string;
}

export class ProviderReviewDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'John Doe' })
  author: string;

  @ApiProperty({ example: 5 })
  rating: number;

  @ApiProperty({ example: 'Excellent work, highly recommend!' })
  text: string;

  @ApiProperty({ example: '2024-12-15' })
  date: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  avatar?: string;
}

export class AvailabilityDto {
  @ApiProperty({ example: true })
  available: boolean;

  @ApiProperty({ example: 'Immediately' })
  nextAvailable: string;

  @ApiProperty({ example: 40 })
  hoursPerWeek: number;
}

export class CertificationResponseDto {
  @ApiProperty({ example: 'Google UX Design Certificate' })
  name: string;

  @ApiProperty({ example: 'Google' })
  issuer: string;

  @ApiProperty({ example: '2022' })
  date: string;
}

export class ProviderProfileResponseDto {
  @ApiProperty({ example: 'provider-1' })
  id: string;

  @ApiProperty({ example: 'Sarah Johnson' })
  display_name: string;

  @ApiProperty({ example: 'UI/UX Designer' })
  professional_title: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  avatar_url?: string;

  @ApiProperty({ example: 'Experienced designer with 5+ years...', required: false })
  bio?: string;

  @ApiProperty({ example: 4.9 })
  rating: number;

  @ApiProperty({ example: 127 })
  total_reviews: number;

  @ApiProperty({ example: 89 })
  total_projects: number;

  @ApiProperty({ example: '< 1 hour' })
  response_time: string;

  @ApiProperty({ example: 75 })
  hourly_rate: number;

  @ApiProperty({ example: 'Lagos, Nigeria' })
  location: string;

  @ApiProperty({ example: true })
  verified: boolean;

  @ApiProperty({ type: [SkillDto] })
  skills: SkillDto[];

  @ApiProperty({ type: [PortfolioItemResponseDto] })
  portfolio: PortfolioItemResponseDto[];

  @ApiProperty({ type: [ProviderReviewDto] })
  reviews: ProviderReviewDto[];

  @ApiProperty({ type: AvailabilityDto })
  availability: AvailabilityDto;

  @ApiProperty({ type: [CertificationResponseDto] })
  certifications: CertificationResponseDto[];
}

export class ProviderCardResponseDto {
  @ApiProperty({ example: 'provider-1' })
  id: string;

  @ApiProperty({ example: 'Sarah Johnson' })
  display_name: string;

  @ApiProperty({ example: 'UI/UX Designer' })
  professional_title: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  avatar_url?: string;

  @ApiProperty({ example: 4.9 })
  rating: number;

  @ApiProperty({ example: 127 })
  total_reviews: number;

  @ApiProperty({ example: 75 })
  hourly_rate: number;

  @ApiProperty({ example: 'Lagos, Nigeria' })
  location: string;

  @ApiProperty({ example: true })
  verified: boolean;

  @ApiProperty({ type: [String], example: ['UI Design', 'UX Design', 'Figma'] })
  skills: string[];

  @ApiProperty({ example: 'Available' })
  availability: string;
}

export class ProvidersListResponseDto {
  @ApiProperty({ type: [ProviderCardResponseDto] })
  data: ProviderCardResponseDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;
}

export class ProviderAvailabilityResponseDto {
  @ApiProperty({ example: 'provider-1' })
  providerId: string;

  @ApiProperty({ type: AvailabilityDto })
  availability: AvailabilityDto;

  @ApiProperty({ 
    example: {
      monday: { start: '09:00', end: '17:00' },
      tuesday: { start: '09:00', end: '17:00' }
    },
    required: false 
  })
  schedule?: Record<string, { start: string; end: string }>;

  @ApiProperty({ 
    type: [String], 
    example: ['2024-02-01T09:00:00Z', '2024-02-01T10:00:00Z'],
    description: 'Booked time slots'
  })
  bookedSlots: string[];
}

export class ProviderPortfolioResponseDto {
  @ApiProperty({ example: 'provider-1' })
  providerId: string;

  @ApiProperty({ type: [PortfolioItemResponseDto] })
  items: PortfolioItemResponseDto[];
}

export class ProviderReviewsResponseDto {
  @ApiProperty({ example: 'provider-1' })
  providerId: string;

  @ApiProperty({ type: [ProviderReviewDto] })
  reviews: ProviderReviewDto[];

  @ApiProperty({ example: 4.9 })
  averageRating: number;

  @ApiProperty({ example: 127 })
  totalReviews: number;
}

export class SearchProvidersQueryDto {
  @ApiProperty({ required: false, description: 'Search query' })
  @IsString()
  @IsOptional()
  q?: string;

  @ApiProperty({ required: false, description: 'Comma-separated skills' })
  @IsString()
  @IsOptional()
  skills?: string;

  @ApiProperty({ required: false, description: 'Minimum rating (0-5)' })
  @IsNumber()
  @IsOptional()
  minRating?: number;

  @ApiProperty({ required: false, description: 'Maximum hourly rate' })
  @IsNumber()
  @IsOptional()
  maxHourlyRate?: number;

  @ApiProperty({ required: false, description: 'Location filter' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false, description: 'Only available providers' })
  @IsBoolean()
  @IsOptional()
  available?: boolean;

  @ApiProperty({ required: false, default: 1 })
  @IsNumber()
  @IsOptional()
  page?: number;

  @ApiProperty({ required: false, default: 20 })
  @IsNumber()
  @IsOptional()
  limit?: number;

  @ApiProperty({ required: false, enum: ['rating', 'price', 'reviews'], default: 'rating' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiProperty({ required: false, enum: ['asc', 'desc'], default: 'desc' })
  @IsString()
  @IsOptional()
  sortOrder?: string;
}

export class BookTimeSlotDto {
  @ApiProperty({ example: '2024-02-01' })
  @IsDateString()
  date: string;

  @ApiProperty({ example: '09:00' })
  @IsString()
  startTime: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  endTime: string;

  @ApiProperty({ example: 'Discuss project requirements', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class BookTimeSlotResponseDto {
  @ApiProperty({ example: 'booking-123' })
  bookingId: string;

  @ApiProperty({ example: 'confirmed' })
  status: string;

  @ApiProperty({ example: '2024-02-01T09:00:00Z' })
  startTime: string;

  @ApiProperty({ example: '2024-02-01T10:00:00Z' })
  endTime: string;
}

export class SaveProviderResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Provider saved successfully' })
  message: string;
}
