import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { WaitlistRegisterDto, WaitlistRegisterResponseDto } from '../dto/waitlist.dto';
import { WaitlistRole } from '../dto/waitlist.dto';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntry, 'waitlist')
    private readonly waitlistRepository: Repository<WaitlistEntry>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async register(dto: WaitlistRegisterDto): Promise<WaitlistRegisterResponseDto> {
    const existingLiveUser = await this.userRepository.findOne({ where: { email: dto.email } });
    if (existingLiveUser) {
      throw new ConflictException('User with this email already exists');
    }

    if (dto.phoneNumber) {
      const livePhone = await this.userRepository.findOne({ where: { phoneNumber: dto.phoneNumber } });
      if (livePhone) {
        throw new ConflictException('User with this phone number already exists');
      }
    }

    const existingWaitlistEntry = await this.waitlistRepository.findOne({ where: { email: dto.email } });
    if (existingWaitlistEntry) {
      throw new ConflictException('User is already on the waitlist');
    }

    if (dto.phoneNumber) {
      const waitlistPhone = await this.waitlistRepository.findOne({ where: { phoneNumber: dto.phoneNumber } });
      if (waitlistPhone) {
        throw new ConflictException('User with this phone number already exists on the waitlist');
      }
    }

    const tempPassword = randomBytes(24).toString('hex');
    const passwordHash = await argon2.hash(tempPassword);

    const entry = this.waitlistRepository.create({
      email: dto.email,
      phoneNumber: dto.phoneNumber,
      role: dto.role,
      passwordHash,
      fullName: dto.fullName,
      displayName: dto.displayName,
      bio: dto.bio,
      avatarUrl: dto.avatarUrl,
      coverImageUrl: dto.coverImageUrl,
      birthdate: dto.birthdate ? new Date(dto.birthdate) : undefined,
      gender: dto.gender,
      location: dto.location,
      country: dto.country,
      city: dto.city,
      website: dto.website,
      university: dto.university,
      socialLinks: dto.socialLinks,
      businessName: dto.businessName,
      description: dto.description,
      skills: dto.skills,
      certifications: dto.certifications,
      yearsOfExperience: dto.yearsOfExperience,
      portfolio: dto.portfolio,
      hourlyRate: dto.hourlyRate,
      currency: dto.currency,
      responseTimeHours: dto.responseTimeHours,
      availabilityHours: dto.availabilityHours,
    });

    const saved = await this.waitlistRepository.save(entry);

    return {
      id: saved.id,
      email: saved.email,
      role: dto.role,
      isPromoted: saved.isPromoted,
      createdAt: saved.createdAt,
    };
  }
}
