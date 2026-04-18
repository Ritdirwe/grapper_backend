import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity';
import { User } from '@contexts/identity/domain/entities/user.entity';
import { Profile } from '@contexts/identity/user-management/domain/entities/profile.entity';
import { ProviderProfile } from '@contexts/identity/user-management/domain/entities/provider-profile.entity';
import { UserRole, UserStatus } from '@contexts/identity/domain/value-objects/user-role.vo';
import { VerificationStatus } from '@contexts/identity/user-management/domain/value-objects/user-enums.vo';
import { AuthService } from '@contexts/identity/application/services/auth.service';
import { WaitlistRole } from '../dto/waitlist.dto';

@Injectable()
export class WaitlistPromotionService {
  private readonly logger = new Logger(WaitlistPromotionService.name);

  constructor(
    @InjectRepository(WaitlistEntry, 'waitlist')
    private readonly waitlistRepository: Repository<WaitlistEntry>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(ProviderProfile)
    private readonly providerProfileRepository: Repository<ProviderProfile>,
    private readonly authService: AuthService,
  ) {}

  async promoteAll(limit = 100): Promise<{ promoted: number; skipped: number; failed: number }> {
    const entries = await this.waitlistRepository.find({
      where: { isPromoted: false },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    let promoted = 0;
    let skipped = 0;
    let failed = 0;

    for (const entry of entries) {
      try {
        const result = await this.promoteOne(entry.id);
        if (result === 'promoted') {
          promoted += 1;
        } else {
          skipped += 1;
        }
      } catch (error) {
        failed += 1;
        this.logger.error(`Failed to promote waitlist entry ${entry.email}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return { promoted, skipped, failed };
  }

  async promoteOne(entryId: string): Promise<'promoted' | 'skipped'> {
    const entry = await this.waitlistRepository.findOne({ where: { id: entryId } });
    if (!entry || entry.isPromoted) {
      return 'skipped';
    }

    const existingUser = await this.userRepository.findOne({ where: { email: entry.email } });
    const user = existingUser || this.userRepository.create({ email: entry.email });

    user.phoneNumber = entry.phoneNumber ?? user.phoneNumber;
    if (!existingUser) {
      user.passwordHash = entry.passwordHash;
    }
    user.role = entry.role === WaitlistRole.PROVIDER ? UserRole.PROVIDER : UserRole.USER;
    user.status = UserStatus.ACTIVE;
    user.emailVerified = false;
    user.phoneVerified = false;
    user.mustResetPassword = true;

    const savedUser = await this.userRepository.save(user);

    const profile =
      (await this.profileRepository.findOne({ where: { userId: savedUser.id } })) ||
      this.profileRepository.create({ userId: savedUser.id });

    profile.fullName = entry.fullName ?? profile.fullName;
    profile.displayName = entry.displayName ?? profile.displayName;
    profile.bio = entry.bio ?? profile.bio;
    profile.avatarUrl = entry.avatarUrl ?? profile.avatarUrl;
    profile.coverImageUrl = entry.coverImageUrl ?? profile.coverImageUrl;
    profile.birthdate = entry.birthdate ?? profile.birthdate;
    profile.gender = entry.gender ?? profile.gender;
    profile.location = entry.location ?? profile.location;
    profile.country = entry.country ?? profile.country;
    profile.city = entry.city ?? profile.city;
    profile.website = entry.website ?? profile.website;
    profile.university = entry.university ?? profile.university;
    profile.socialLinks = entry.socialLinks ?? profile.socialLinks;
    profile.verificationStatus = VerificationStatus.UNVERIFIED;
    profile.verificationDocumentUrl = entry.verificationDocumentUrl ?? profile.verificationDocumentUrl;

    await this.profileRepository.save(profile);

    if (savedUser.role === UserRole.PROVIDER) {
      const providerProfile =
        (await this.providerProfileRepository.findOne({ where: { userId: savedUser.id } })) ||
        this.providerProfileRepository.create({ userId: savedUser.id });

      providerProfile.businessName = entry.businessName ?? providerProfile.businessName;
      providerProfile.description = entry.description ?? providerProfile.description;
      providerProfile.skills = entry.skills ?? providerProfile.skills;
      providerProfile.certifications = entry.certifications ?? providerProfile.certifications;
      providerProfile.yearsOfExperience = entry.yearsOfExperience ?? providerProfile.yearsOfExperience;
      providerProfile.portfolio = entry.portfolio ?? providerProfile.portfolio;
      providerProfile.hourlyRate = entry.hourlyRate ?? providerProfile.hourlyRate;
      providerProfile.currency = entry.currency ?? providerProfile.currency;
      providerProfile.responseTimeHours = entry.responseTimeHours ?? providerProfile.responseTimeHours;
      providerProfile.availabilityHours = entry.availabilityHours ?? providerProfile.availabilityHours;

      await this.providerProfileRepository.save(providerProfile);
    }

    entry.isPromoted = true;
    entry.promotedUserId = savedUser.id;
    entry.promotedAt = new Date();
    await this.waitlistRepository.save(entry);

    await this.authService.requestPasswordReset({ email: savedUser.email });

    return 'promoted';
  }
}
