import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as argon2 from 'argon2';

// Load environment variables (.env then .env.local overrides)
config({ path: '.env' });
config({ path: '.env.local', override: true });

// Import entities
import { User } from '../modules/identity/domain/entities/user.entity';
import { RefreshToken } from '../modules/identity/domain/entities/refresh-token.entity';
import { Profile } from '../modules/user-management/domain/entities/profile.entity';
import { ProviderProfile } from '../modules/user-management/domain/entities/provider-profile.entity';
import { Category } from '../modules/service-catalog/domain/entities/category.entity';
import { Service } from '../modules/service-catalog/domain/entities/service.entity';
import { Post } from '../modules/social/domain/entities/post.entity';
import { Comment } from '../modules/social/domain/entities/comment.entity';
import { Like } from '../modules/social/domain/entities/like.entity';
import { Share } from '../modules/social/domain/entities/share.entity';
import { Hashtag } from '../modules/social/domain/entities/hashtag.entity';
import { Order } from '../modules/booking/domain/entities/order.entity';
import { Booking } from '../modules/booking/domain/entities/booking.entity';
import { BookingCorrection } from '../contexts/marketplace/booking/domain/entities/booking-correction.entity';
import { BookingFile } from '../contexts/marketplace/booking/domain/entities/booking-file.entity';
import { BookingMessage } from '../contexts/marketplace/booking/domain/entities/booking-message.entity';
import { Milestone } from '../contexts/marketplace/booking/domain/entities/milestone.entity';
import { BookingMilestone } from '../contexts/marketplace/booking/domain/entities/booking-milestone.entity';
import { BookingMilestoneEvidence } from '../contexts/marketplace/booking/domain/entities/booking-milestone-evidence.entity';
import { Dispute } from '../modules/booking/domain/entities/dispute.entity';
import { Transaction } from '../modules/payment/domain/entities/transaction.entity';
import { VerificationRequest } from '../contexts/identity/user-management/domain/entities/verification-request.entity';
import { UserRole, UserStatus } from '../modules/identity/domain/value-objects/user-role.vo';
import { VerificationStatus, Gender } from '../modules/user-management/domain/value-objects/user-enums.vo';
import { ServiceStatus, PricingType, DeliveryType } from '../modules/service-catalog/domain/value-objects/service-enums.vo';
import { PostVisibility } from '../modules/social/domain/value-objects/social-enums.vo';
import { BookingStatus, OrderStatus, PaymentStatus, DisputeStatus, DisputeReason } from '../modules/booking/domain/value-objects/booking-enums.vo';
import { TransactionType, TransactionStatus, PaymentGateway } from '../modules/payment/domain/value-objects/payment-enums.vo';

// Seeder class
export class DatabaseSeeder {
  private dataSource: DataSource;

  constructor() {
    this.dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || process.env.DATABASE_DATABASE || 'grapper_marketplace',
      entities: [
        User,
        RefreshToken,
        Profile,
        ProviderProfile,
        Category,
        Service,
        Post,
        Comment,
        Like,
        Share,
        Hashtag,
        Booking,
        BookingCorrection,
        BookingFile,
        BookingMessage,
        Milestone,
        Order,
        BookingMilestone,
        BookingMilestoneEvidence,
        Dispute,
        Transaction,
        VerificationRequest,
      ],
      // This project uses migrations; seeder should not mutate schema.
      synchronize: false,
    });
  }

  async createDatabaseIfNotExists(): Promise<void> {
    const dbName = process.env.DATABASE_NAME || process.env.DATABASE_DATABASE || 'grapper_marketplace';
    const tempDataSource = new DataSource({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: 'postgres', // Connect to default postgres database
      entities: [],
      synchronize: false,
    });

    try {
      await tempDataSource.initialize();
      const result = await tempDataSource.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName]
      );
      
      if (result.length === 0) {
        console.log(`📦 Creating database "${dbName}"...`);
        await tempDataSource.query(`CREATE DATABASE "${dbName}"`);
        console.log(`✅ Database "${dbName}" created successfully`);
      } else {
        console.log(`📦 Database "${dbName}" already exists`);
      }
      
      await tempDataSource.destroy();
    } catch (error) {
      console.error('❌ Failed to create database:', error.message);
      // Don't throw - let the main connection attempt fail with its own error
      await tempDataSource.destroy().catch(() => {});
    }
  }

  async initialize(): Promise<void> {
    await this.dataSource.initialize();
    console.log('✅ Database connection established');
  }

  async close(): Promise<void> {
    await this.dataSource.destroy();
    console.log('✅ Database connection closed');
  }

  async seed(): Promise<void> {
    console.log('\n🌱 Starting database seeding...\n');

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      // Clear existing data using TRUNCATE CASCADE to handle FK constraints (if tables exist)
      console.log('🧹 Clearing existing data...');
      try {
        await queryRunner.query(
          'TRUNCATE TABLE transactions, disputes, orders, likes, comments, posts, payout_methods, bookings, services, categories, provider_profiles, profiles, refresh_tokens, users CASCADE',
        );
      } catch (error) {
        console.log('⚠️  Some tables do not exist yet (first run), skipping truncate');
        // Rollback and restart transaction since the error aborted it
        await queryRunner.rollbackTransaction();
        await queryRunner.startTransaction();
      }

      // Seed categories first (no dependencies)
      console.log('📂 Seeding categories...');
      const categories = await this.seedCategories(queryRunner);

      // Seed users with profiles and provider profiles
      console.log('👥 Seeding users...');
      const { customers, providers } = await this.seedUsers(queryRunner);

      // Seed services
      console.log('🔧 Seeding services...');
      const services = await this.seedServices(queryRunner, providers, categories);

      console.log('📅 Seeding bookings...');
      const bookings = await this.seedBookings(queryRunner, providers, customers, services);

      // Seed posts, comments, and likes
      console.log('📝 Seeding posts...');
      const posts = await this.seedPosts(queryRunner, providers, customers);

      console.log('💬 Seeding comments...');
      const comments = await this.seedComments(queryRunner, providers, customers);

      console.log('❤️ Seeding likes...');
      const likes = await this.seedLikes(queryRunner, providers, customers);

      console.log('📦 Seeding orders...');
      const orders = await this.seedOrders(queryRunner, providers, customers, services);

      console.log('💳 Seeding transactions...');
      const transactions = await this.seedTransactions(queryRunner, providers, customers, bookings, orders);

      console.log('⚖️ Seeding disputes...');
      const disputes = await this.seedDisputes(queryRunner, orders);

      await queryRunner.commitTransaction();
      console.log('\n✅ Database seeding completed successfully!');
      console.log(`\n📊 Summary:`);
      console.log(`   - Categories: ${categories.length}`);
      console.log(`   - Customers: ${customers.length}`);
      console.log(`   - Providers: ${providers.length}`);
      console.log(`   - Services: ${services.length}`);
      console.log(`   - Posts: ${posts.length}`);
      console.log(`   - Comments: ${comments.length}`);
      console.log(`   - Likes: ${likes.length}`);
      console.log(`   - Bookings: ${bookings.length}`);
      console.log(`   - Orders: ${orders.length}`);
      console.log(`   - Transactions: ${transactions.length}`);
      console.log(`   - Disputes: ${disputes.length}`);
      console.log(`\n🔑 Default passwords: "password123" for all users`);
      console.log(`   Admin: admin@grapper.com`);
      console.log(`   Providers: sarah@grapper.com, james@grapper.com, etc.`);
      console.log(`   Customers: john@example.com, emma@example.com, etc.\n`);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error('❌ Seeding failed:', error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async seedCategories(queryRunner: any): Promise<Category[]> {
    const categoriesData = [
      {
        name: 'Statistical Analysis',
        slug: 'statistical-analysis',
        description: 'Data analysis using SPSS, R, Python, and other statistical tools',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2103/2103633.png',
        imageUrl: 'https://images.pexels.com/photos/669619/pexels-photo-669619.jpeg',
        isActive: true,
        displayOrder: 1,
      },
      {
        name: 'Research Tools',
        slug: 'research-tools',
        description: 'Research automation, scraping, and literature review tools',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2910/2910791.png',
        imageUrl: 'https://images.pexels.com/photos/270348/pexels-photo-270348.jpeg',
        isActive: true,
        displayOrder: 2,
      },
      {
        name: 'Data Analysis',
        slug: 'data-analysis',
        description: 'Comprehensive data analysis and visualization services',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2920/2920277.png',
        imageUrl: 'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg',
        isActive: true,
        displayOrder: 3,
      },
      {
        name: 'Complete Thesis Assistance',
        slug: 'complete-thesis-assistance',
        description: 'End-to-end thesis writing and research support',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3135/3135768.png',
        imageUrl: 'https://images.pexels.com/photos/374016/pexels-photo-374016.jpeg',
        isActive: true,
        displayOrder: 4,
      },
      {
        name: 'Academic Writing',
        slug: 'academic-writing',
        description: 'Essays, research papers, and academic content writing',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2921/2921222.png',
        imageUrl: 'https://images.pexels.com/photos/1456466/pexels-photo-1456466.jpeg',
        isActive: true,
        displayOrder: 5,
      },
      {
        name: 'Proofreading',
        slug: 'proofreading',
        description: 'Professional editing and proofreading services',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/3062/3062634.png',
        imageUrl: 'https://images.pexels.com/photos/5239596/pexels-photo-5239596.jpeg',
        isActive: true,
        displayOrder: 6,
      },
      {
        name: 'Data Visualization',
        slug: 'data-visualization',
        description: 'Tableau, PowerBI, and custom visualization dashboards',
        iconUrl: 'https://cdn-icons-png.flaticon.com/512/2920/2920349.png',
        imageUrl: 'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg',
        isActive: true,
        displayOrder: 7,
      },
    ];

    const categories: Category[] = [];
    for (const catData of categoriesData) {
      const category = queryRunner.manager.create(Category, catData);
      const saved = await queryRunner.manager.save(Category, category);
      categories.push(saved);
    }

    return categories;
  }

  private async seedUsers(queryRunner: any): Promise<{ customers: User[]; providers: User[] }> {
    const hashedPassword = await argon2.hash('password123');

    // Admin user
    const adminUser = queryRunner.manager.create(User, {
      email: 'admin@grapper.com',
      passwordHash: hashedPassword,
      phoneNumber: '+2348012345678',
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: true,
    });
    await queryRunner.manager.save(User, adminUser);

    // Provider data
    const providersData = [
      {
        email: 'sarah@grapper.com',
        phoneNumber: '+2348023456789',
        fullName: 'Dr. Sarah Chen',
        displayName: 'Dr. Sarah',
        bio: 'Experienced academic professional specializing in statistical analysis. PhD in Applied Mathematics with 10+ years of research experience.',
        avatarUrl: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg',
        location: 'Lagos, Nigeria',
        country: 'Nigeria',
        city: 'Lagos',
        businessName: 'StatExpert Solutions',
        description: 'Providing high-quality statistical analysis and research support for students and professionals.',
        skills: ['SPSS', 'R', 'Python', 'Regression', 'ANOVA', 'Hypothesis Testing'],
        yearsOfExperience: 10,
        hourlyRate: 15000,
        currency: 'NGN',
        certifications: [
          { name: 'Advanced Statistical Analysis', issuer: 'Coursera', year: 2020 },
          { name: 'Data Science Specialization', issuer: 'Johns Hopkins University', year: 2019 },
        ],
        portfolio: [
          { title: 'Medical Research Analysis', description: 'Statistical analysis for 500-patient clinical trial', imageUrl: 'https://images.pexels.com/photos/669619/pexels-photo-669619.jpeg' },
          { title: 'Economic Forecasting Model', description: 'Built predictive models for market trends', imageUrl: 'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg' },
        ],
      },
      {
        email: 'james@grapper.com',
        phoneNumber: '+2348034567890',
        fullName: 'James Wilson',
        displayName: 'James W.',
        bio: 'Research automation specialist with expertise in Python and data scraping. Helping researchers save time with custom tools.',
        avatarUrl: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg',
        location: 'Abuja, Nigeria',
        country: 'Nigeria',
        city: 'Abuja',
        businessName: 'AutoResearch Pro',
        description: 'Automate your research workflow with custom Python scripts and tools.',
        skills: ['Python', 'Web Scraping', 'Pandas', 'Automation', 'NLP', 'Machine Learning'],
        yearsOfExperience: 7,
        hourlyRate: 12000,
        currency: 'NGN',
        certifications: [
          { name: 'Machine Learning Engineer', issuer: 'Udacity', year: 2021 },
        ],
        portfolio: [
          { title: 'Literature Review Bot', description: 'Automated paper collection and summarization tool', imageUrl: 'https://images.pexels.com/photos/270348/pexels-photo-270348.jpeg' },
        ],
      },
      {
        email: 'maria@grapper.com',
        phoneNumber: '+2348045678901',
        fullName: 'Maria Rodriguez',
        displayName: 'Maria R.',
        bio: 'Data visualization expert creating stunning dashboards and reports. Tableau certified with 5+ years experience.',
        avatarUrl: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg',
        location: 'Port Harcourt, Nigeria',
        country: 'Nigeria',
        city: 'Port Harcourt',
        businessName: 'VisualData Studio',
        description: 'Transform your data into compelling visual stories that drive decisions.',
        skills: ['Tableau', 'PowerBI', 'D3.js', 'Dashboard Design', 'Data Storytelling'],
        yearsOfExperience: 5,
        hourlyRate: 18000,
        currency: 'NGN',
        certifications: [
          { name: 'Tableau Desktop Specialist', issuer: 'Tableau', year: 2022 },
          { name: 'Data Visualization Certificate', issuer: 'Google', year: 2021 },
        ],
        portfolio: [
          { title: 'Sales Dashboard', description: 'Real-time sales analytics for retail chain', imageUrl: 'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg' },
          { title: 'Climate Data Viz', description: 'Interactive climate change visualization', imageUrl: 'https://images.pexels.com/photos/1407305/pexels-photo-1407305.jpeg' },
        ],
      },
      {
        email: 'david@grapper.com',
        phoneNumber: '+2348056789012',
        fullName: 'David Okonkwo',
        displayName: 'David O.',
        bio: 'Academic writer and thesis consultant. Helped over 200 students complete their dissertations successfully.',
        avatarUrl: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg',
        location: 'Ibadan, Nigeria',
        country: 'Nigeria',
        city: 'Ibadan',
        businessName: 'Thesis Masters NG',
        description: 'Professional thesis writing and consultation services for graduate students.',
        skills: ['Academic Writing', 'Thesis Editing', 'Research Methodology', 'APA Style', 'Literature Review'],
        yearsOfExperience: 8,
        hourlyRate: 10000,
        currency: 'NGN',
        certifications: [
          { name: 'Academic Writing Certificate', issuer: 'University of Oxford', year: 2018 },
        ],
        portfolio: [
          { title: 'MBA Thesis', description: 'Complete thesis on Nigerian fintech sector', imageUrl: 'https://images.pexels.com/photos/374016/pexels-photo-374016.jpeg' },
        ],
      },
      {
        email: 'grace@grapper.com',
        phoneNumber: '+2348067890123',
        fullName: 'Dr. Grace Adeyemi',
        displayName: 'Dr. Grace',
        bio: 'Professional proofreader and editor with a keen eye for detail. Native English speaker with editorial experience.',
        avatarUrl: 'https://images.pexels.com/photos/1239288/pexels-photo-1239288.jpeg',
        location: 'Lagos, Nigeria',
        country: 'Nigeria',
        city: 'Lagos',
        businessName: 'PerfectText Editing',
        description: 'Make your writing flawless with professional proofreading and editing.',
        skills: ['Proofreading', 'Copy Editing', 'APA/MLA Styles', 'Technical Writing', 'Grammar'],
        yearsOfExperience: 6,
        hourlyRate: 8000,
        currency: 'NGN',
        certifications: [
          { name: 'Professional Editing Certificate', issuer: 'Publishing Training Centre', year: 2020 },
        ],
        portfolio: [
          { title: 'Journal Article Editing', description: 'Edited 50+ journal submissions', imageUrl: 'https://images.pexels.com/photos/5239596/pexels-photo-5239596.jpeg' },
        ],
      },
    ];

    const providers: User[] = [];
    for (const providerData of providersData) {
      // Create user
      const user = queryRunner.manager.create(User, {
        email: providerData.email,
        passwordHash: hashedPassword,
        phoneNumber: providerData.phoneNumber,
        role: UserRole.PROVIDER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        phoneVerified: true,
      });
      const savedUser = await queryRunner.manager.save(User, user);

      // Create profile
      const profile = queryRunner.manager.create(Profile, {
        userId: savedUser.id,
        fullName: providerData.fullName,
        displayName: providerData.displayName,
        bio: providerData.bio,
        avatarUrl: providerData.avatarUrl,
        location: providerData.location,
        country: providerData.country,
        city: providerData.city,
        verificationStatus: VerificationStatus.VERIFIED,
        verifiedAt: new Date(),
      });
      await queryRunner.manager.save(Profile, profile);

      // Create provider profile with realistic stats based on experience
      // More experience = more jobs, higher earnings, more reviews
      const yearsExp = providerData.yearsOfExperience;
      const totalJobs = Math.floor(yearsExp * 8); // ~8 jobs per year of experience
      const avgJobPrice = providerData.hourlyRate * 10; // Assume avg 10 hours per job
      const totalEarnings = totalJobs * avgJobPrice;
      const totalReviews = Math.floor(totalJobs * 0.7); // 70% of jobs get reviewed
      const completionRate = yearsExp >= 8 ? 98 : yearsExp >= 5 ? 96 : 94; // More exp = higher completion
      const averageRating = yearsExp >= 8 ? 4.8 : yearsExp >= 5 ? 4.7 : 4.6; // More exp = better ratings
      
      const providerProfile = queryRunner.manager.create(ProviderProfile, {
        userId: savedUser.id,
        businessName: providerData.businessName,
        description: providerData.description,
        skills: providerData.skills,
        certifications: providerData.certifications,
        yearsOfExperience: providerData.yearsOfExperience,
        portfolio: providerData.portfolio,
        hourlyRate: providerData.hourlyRate,
        currency: providerData.currency,
        responseTimeHours: 24,
        completionRate,
        totalEarnings,
        totalJobs,
        averageRating,
        totalReviews,
        isAvailable: true,
        lastActiveAt: new Date(),
      });
      await queryRunner.manager.save(ProviderProfile, providerProfile);

      providers.push(savedUser);
    }

    // Customer data
    const customersData = [
      { email: 'john@example.com', fullName: 'John Doe', displayName: 'John' },
      { email: 'emma@example.com', fullName: 'Emma Smith', displayName: 'Emma' },
      { email: 'michael@example.com', fullName: 'Michael Johnson', displayName: 'Mike' },
      { email: 'chioma@example.com', fullName: 'Chioma Eze', displayName: 'Chioma' },
      { email: 'oluwaseun@example.com', fullName: 'Oluwaseun Adebayo', displayName: 'Seun' },
    ];

    const customers: User[] = [];
    for (const customerData of customersData) {
      const user = queryRunner.manager.create(User, {
        email: customerData.email,
        passwordHash: hashedPassword,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
      });
      const savedUser = await queryRunner.manager.save(User, user);

      const profile = queryRunner.manager.create(Profile, {
        userId: savedUser.id,
        fullName: customerData.fullName,
        displayName: customerData.displayName,
        verificationStatus: VerificationStatus.UNVERIFIED,
      });
      await queryRunner.manager.save(Profile, profile);

      customers.push(savedUser);
    }

    return { customers, providers };
  }

  private async seedServices(queryRunner: any, providers: User[], categories: Category[]): Promise<Service[]> {
    // Helper function to calculate realistic service stats based on provider and service characteristics
    const calculateServiceStats = (providerIndex: number, servicePrice: number, isPopular: boolean) => {
      const provider = providers[providerIndex];
      // Base stats on provider reputation and service attractiveness
      const providerJobsPerService = 40; // Assume each provider has ~2 services, total 80 jobs
      const totalOrders = isPopular ? Math.floor(providerJobsPerService * 0.6) : Math.floor(providerJobsPerService * 0.4);
      const totalReviews = Math.floor(totalOrders * 0.65); // 65% review rate
      const averageRating = 4.6 + (providerIndex === 0 ? 0.3 : providerIndex <= 2 ? 0.2 : 0.1); // Top providers get better ratings
      const viewCount = totalOrders * (isPopular ? 25 : 15); // Popular services get more views per order
      const isFeatured = isPopular && providerIndex <= 1; // Only popular services from top providers get featured
      
      return { totalOrders, totalReviews, averageRating, viewCount, isFeatured };
    };

    const servicesData = [
      // Sarah's services (Statistical Analysis)
      {
        providerIndex: 0,
        categoryIndex: 0,
        title: 'SPSS + Regression Modeling (Results Chapter Help)',
        slug: 'spss-regression-modeling-results-chapter-help',
        description: 'I will clean your dataset, run the right statistical tests (t-test, ANOVA, regression), and write a clear results section with professional tables and charts. Perfect for your thesis or dissertation results chapter.',
        shortDescription: 'Complete statistical analysis with SPSS including regression modeling',
        price: 25000,
        currency: 'NGN',
        pricingType: PricingType.FIXED,
        deliveryType: DeliveryType.REMOTE,
        durationDays: 5,
        tags: ['SPSS', 'Regression', 'ANOVA', 'Statistics', 'Thesis Help'],
        features: ['Data cleaning and preparation', 'Descriptive statistics', 'Hypothesis testing', 'Regression analysis', 'Professional tables and charts', 'Written interpretation of results'],
        requirements: ['Dataset in Excel/CSV/SPSS format', 'Research objectives/hypotheses', 'Deadline'],
        faqs: [
          { question: 'How long does the analysis take?', answer: 'Typically 3-5 business days depending on complexity.' },
          { question: 'Do you provide interpretation?', answer: 'Yes, I provide written interpretation of all results suitable for your results chapter.' },
        ],
        coverImageUrl: 'https://images.pexels.com/photos/669619/pexels-photo-669619.jpeg',
      },
      {
        providerIndex: 0,
        categoryIndex: 2,
        title: 'Complete Data Analysis Package',
        slug: 'complete-data-analysis-package',
        description: 'Comprehensive data analysis service from data cleaning to final interpretation. Includes descriptive stats, inferential statistics, and data visualization.',
        shortDescription: 'End-to-end data analysis with visualization',
        price: 40000,
        currency: 'NGN',
        pricingType: PricingType.FIXED,
        deliveryType: DeliveryType.REMOTE,
        durationDays: 7,
        tags: ['Data Analysis', 'Statistics', 'R', 'Python', 'Visualization'],
        features: ['Data cleaning', 'Descriptive statistics', 'Inferential statistics', 'Custom visualizations', 'Written report', 'Revisions included'],
        requirements: ['Raw dataset', 'Research questions', 'Preferred software (R/Python/SPSS)'],
        faqs: [
          { question: 'What software do you use?', answer: 'I can work with SPSS, R, or Python depending on your preference.' },
        ],
        coverImageUrl: 'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg',
      },
      // James's services (Research Tools)
      {
        providerIndex: 1,
        categoryIndex: 1,
        title: 'Research Automation with Python (Scraping + Cleaning)',
        slug: 'research-automation-python-scraping-cleaning',
        description: 'Automate your literature workflow: scrape sources from academic databases, clean CSVs, and build a repeatable Python notebook you can reuse for future research.',
        shortDescription: 'Custom Python scripts for research automation',
        price: 20000,
        currency: 'NGN',
        pricingType: PricingType.FIXED,
        deliveryType: DeliveryType.REMOTE,
        durationDays: 3,
        tags: ['Python', 'Automation', 'Pandas', 'Web Scraping', 'Research Tools'],
        features: ['Custom Python scripts', 'Web scraping setup', 'Data cleaning pipeline', 'Reusable Jupyter notebook', 'Documentation', 'Video tutorial'],
        requirements: ['Target websites/databases', 'Data format requirements', 'Python environment setup'],
        faqs: [
          { question: 'Do I need to know Python?', answer: 'No, I provide detailed documentation and a video tutorial.' },
        ],
        coverImageUrl: 'https://images.pexels.com/photos/270348/pexels-photo-270348.jpeg',
      },
      {
        providerIndex: 1,
        categoryIndex: 1,
        title: 'Literature Review Automation Tool',
        slug: 'literature-review-automation-tool',
        description: 'Get a custom tool that automatically collects, summarizes, and organizes papers from Google Scholar, PubMed, and other academic sources.',
        shortDescription: 'Automated literature collection and organization',
        price: 35000,
        currency: 'NGN',
        pricingType: PricingType.FIXED,
        deliveryType: DeliveryType.REMOTE,
        durationDays: 5,
        tags: ['Python', 'NLP', 'Literature Review', 'Automation'],
        features: ['Multi-database search', 'Automatic summarization', 'Citation management', 'Export to various formats', 'Duplicate detection'],
        requirements: ['Keywords and search terms', 'Target databases', 'Export format preference'],
        faqs: [],
        coverImageUrl: 'https://images.pexels.com/photos/1516440/pexels-photo-1516440.jpeg',
      },
      // Maria's services (Data Visualization)
      {
        providerIndex: 2,
        categoryIndex: 6,
        title: 'Tableau Dashboard (Story + KPIs)',
        slug: 'tableau-dashboard-story-kpis',
        description: 'Beautiful, interactive dashboards that make your data easy to understand. Includes 2 revisions and export-ready images for your reports.',
        shortDescription: 'Professional Tableau dashboards with storytelling',
        price: 30000,
        currency: 'NGN',
        pricingType: PricingType.FIXED,
        deliveryType: DeliveryType.REMOTE,
        durationDays: 4,
        tags: ['Tableau', 'Dashboards', 'KPIs', 'Data Visualization'],
        features: ['Custom dashboard design', 'Interactive filters', 'KPI tracking', 'Mobile responsive', '2 revision rounds', 'Source files included'],
        requirements: ['Dataset', 'Dashboard requirements', 'Brand colors/style guide'],
        faqs: [
          { question: 'Can you connect to my database?', answer: 'Yes, I can connect to most databases including MySQL, PostgreSQL, and cloud sources.' },
        ],
        coverImageUrl: 'https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg',
      },
      {
        providerIndex: 2,
        categoryIndex: 6,
        title: 'PowerBI Executive Dashboard',
        slug: 'powerbi-executive-dashboard',
        description: 'Enterprise-level dashboards for executives and managers. Real-time data updates and automated reporting.',
        shortDescription: 'Enterprise PowerBI solutions with auto-refresh',
        price: 45000,
        currency: 'NGN',
        pricingType: PricingType.FIXED,
        deliveryType: DeliveryType.REMOTE,
        durationDays: 7,
        tags: ['PowerBI', 'Dashboards', 'Enterprise', 'Reporting'],
        features: ['Real-time data connection', 'Automated refresh', 'Drill-down capabilities', 'Role-based security', 'Scheduled reports', 'Training session'],
        requirements: ['Data source credentials', 'Report requirements', 'User roles'],
        faqs: [],
        coverImageUrl: 'https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg',
      },
      // David's services (Thesis)
      {
        providerIndex: 3,
        categoryIndex: 3,
        title: 'Complete Thesis Writing Support',
        slug: 'complete-thesis-writing-support',
        description: 'End-to-end thesis support from proposal to final submission. Includes all chapters, formatting, and revision support.',
        shortDescription: 'Full thesis writing and consultation service',
        price: 150000,
        currency: 'NGN',
        pricingType: PricingType.NEGOTIABLE,
        deliveryType: DeliveryType.REMOTE,
        durationDays: 30,
        tags: ['Thesis', 'Academic Writing', 'Research', 'Dissertation'],
        features: ['Chapter-by-chapter delivery', 'Literature review included', 'Methodology design', 'Data analysis guidance', 'Formatting & citations', 'Unlimited revisions'],
        requirements: ['Research topic', 'University guidelines', 'Supervisor feedback', 'Timeline'],
        faqs: [
          { question: 'Is this ghostwriting?', answer: 'No, I provide guidance and editing. You write, I help polish and structure.' },
        ],
        coverImageUrl: 'https://images.pexels.com/photos/374016/pexels-photo-374016.jpeg',
      },
      {
        providerIndex: 3,
        categoryIndex: 4,
        title: 'Research Paper Writing Service',
        slug: 'research-paper-writing-service',
        description: 'Professional academic writing for journal submissions, conference papers, and term papers.',
        shortDescription: 'Publication-ready academic papers',
        price: 50000,
        currency: 'NGN',
        pricingType: PricingType.FIXED,
        deliveryType: DeliveryType.REMOTE,
        durationDays: 10,
        tags: ['Academic Writing', 'Research Papers', 'Publications'],
        features: ['Original content', 'Proper citations', 'Plagiarism check', 'Journal formatting', 'Abstract included'],
        requirements: ['Research topic', 'Target journal/conference', 'Guidelines'],
        faqs: [],
        coverImageUrl: 'https://images.pexels.com/photos/1456466/pexels-photo-1456466.jpeg',
      },
      // Grace's services (Proofreading)
      {
        providerIndex: 4,
        categoryIndex: 5,
        title: 'Professional Proofreading & Editing',
        slug: 'professional-proofreading-editing',
        description: 'Make your writing flawless with professional proofreading. Grammar, spelling, punctuation, and style corrections included.',
        shortDescription: 'Comprehensive proofreading and editing service',
        price: 8000,
        currency: 'NGN',
        pricingType: PricingType.NEGOTIABLE,
        deliveryType: DeliveryType.REMOTE,
        durationDays: 2,
        tags: ['Proofreading', 'Editing', 'Grammar', 'Academic'],
        features: ['Grammar correction', 'Spelling check', 'Punctuation fixes', 'Style improvements', 'Track changes', 'Clean version included'],
        requirements: ['Document (Word/PDF)', 'Citation style (APA/MLA)', 'Deadline'],
        faqs: [
          { question: 'How fast is turnaround?', answer: 'Standard is 48 hours. Rush 24-hour service available.' },
        ],
        coverImageUrl: 'https://images.pexels.com/photos/5239596/pexels-photo-5239596.jpeg',
      },
      {
        providerIndex: 4,
        categoryIndex: 5,
        title: 'Journal Article Preparation',
        slug: 'journal-article-preparation',
        description: 'Prepare your manuscript for journal submission. Formatting, language polishing, and compliance with journal guidelines.',
        shortDescription: 'Journal-ready manuscript preparation',
        price: 20000,
        currency: 'NGN',
        pricingType: PricingType.FIXED,
        deliveryType: DeliveryType.REMOTE,
        durationDays: 5,
        tags: ['Proofreading', 'Journal Submission', 'Formatting'],
        features: ['Journal formatting', 'Language polishing', 'Reference checking', 'Cover letter writing', 'Response to reviewers help'],
        requirements: ['Manuscript', 'Target journal name', 'Author guidelines'],
        faqs: [],
        coverImageUrl: 'https://images.pexels.com/photos/3059654/pexels-photo-3059654.jpeg',
      },
    ];

    const savedServices: Service[] = [];
    for (const serviceData of servicesData) {
      const provider = providers[serviceData.providerIndex];
      const category = categories[serviceData.categoryIndex];
      
      // Determine if this is a popular service (first service for each provider is more popular)
      const serviceIndex = servicesData.indexOf(serviceData);
      const isPopular = serviceIndex % 2 === 0; // Every other service is popular
      
      // Calculate realistic stats
      const stats = calculateServiceStats(serviceData.providerIndex, serviceData.price, isPopular);

      const service = queryRunner.manager.create(Service, {
        providerId: provider.id,
        categoryId: category.id,
        title: serviceData.title,
        slug: serviceData.slug,
        description: serviceData.description,
        shortDescription: serviceData.shortDescription,
        price: serviceData.price,
        currency: serviceData.currency,
        pricingType: serviceData.pricingType,
        deliveryType: serviceData.deliveryType,
        durationDays: serviceData.durationDays,
        status: ServiceStatus.ACTIVE,
        tags: serviceData.tags,
        features: serviceData.features,
        requirements: serviceData.requirements,
        faqs: serviceData.faqs,
        coverImageUrl: serviceData.coverImageUrl,
        averageRating: stats.averageRating,
        totalReviews: stats.totalReviews,
        totalOrders: stats.totalOrders,
        viewCount: stats.viewCount,
        isFeatured: stats.isFeatured,
      });

      const saved = await queryRunner.manager.save(Service, service);
      savedServices.push(saved);
    }
    
    return savedServices;
  }

  private async seedBookings(
    queryRunner: any,
    providers: User[],
    customers: User[],
    services: Service[],
  ): Promise<Booking[]> {
    const daysAgo = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d;
    };

    const templates: Array<{
      status: BookingStatus;
      daysBack: number;
      depositPaid?: boolean;
      finalPaymentPaid?: boolean;
      customerApproved?: boolean;
      correctionsUsed?: number;
      cancellationReason?: string;
    }> = [
      { status: BookingStatus.PENDING_DEPOSIT, daysBack: 1, depositPaid: false },
      { status: BookingStatus.PENDING, daysBack: 2, depositPaid: true },
      { status: BookingStatus.CONFIRMED, daysBack: 3, depositPaid: true },
      { status: BookingStatus.IN_PROGRESS, daysBack: 4, depositPaid: true },
      { status: BookingStatus.DELIVERED, daysBack: 5, depositPaid: true },
      { status: BookingStatus.REVISION_REQUESTED, daysBack: 6, depositPaid: true, correctionsUsed: 1 },
      {
        status: BookingStatus.PENDING_COMPLETION_PAYMENT,
        daysBack: 7,
        depositPaid: true,
        customerApproved: true,
      },
      {
        status: BookingStatus.COMPLETED,
        daysBack: 10,
        depositPaid: true,
        finalPaymentPaid: true,
        customerApproved: true,
      },
      {
        status: BookingStatus.CANCELLED,
        daysBack: 8,
        depositPaid: true,
        cancellationReason: 'Seed cancellation',
      },
      { status: BookingStatus.DISPUTED, daysBack: 9, depositPaid: true },
    ];

    const bookings: Booking[] = [];
    for (let i = 0; i < templates.length; i++) {
      const t = templates[i];
      const customer = customers[i % customers.length];
      const provider = providers[i % providers.length];
      const service = services[i % services.length];

      const booking = queryRunner.manager.create(Booking, {
        customerId: customer.id,
        providerId: provider.id,
        serviceId: service.id,
        status: t.status,
        notes: `Seed booking (${t.status})`,
        amount: service.price,
        currency: service.currency || 'NGN',
        referenceCode: `SEEDBKG-${Date.now()}-${(i + 1).toString().padStart(2, '0')}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
        depositAmount: Math.floor((Number(service.price) || 12000) * 0.2),
        platformFee: Math.floor((Number(service.price) || 12000) * 0.12),
        depositPaid: Boolean(t.depositPaid),
        finalPaymentPaid: Boolean(t.finalPaymentPaid),
        customerApproved: Boolean(t.customerApproved),
        correctionsUsed: t.correctionsUsed ?? 0,
      });

      if (t.status === BookingStatus.CONFIRMED) booking.confirmedAt = daysAgo(t.daysBack);
      if (t.status === BookingStatus.IN_PROGRESS) {
        booking.confirmedAt = daysAgo(t.daysBack + 1);
        booking.startedAt = daysAgo(t.daysBack);
      }
      if (t.status === BookingStatus.DELIVERED || t.status === BookingStatus.REVISION_REQUESTED) {
        booking.confirmedAt = daysAgo(t.daysBack + 2);
        booking.startedAt = daysAgo(t.daysBack + 1);
        booking.metadata = {
          delivery: {
            note: 'Seed delivery',
            attachments: ['https://example.com/seed/attachment.zip'],
            deliveredAt: daysAgo(t.daysBack).toISOString(),
          },
        };
      }
      if (t.status === BookingStatus.PENDING_COMPLETION_PAYMENT) {
        booking.confirmedAt = daysAgo(t.daysBack + 3);
        booking.startedAt = daysAgo(t.daysBack + 2);
        booking.customerApproved = true;
        booking.customerApprovedAt = daysAgo(t.daysBack + 1);
      }
      if (t.status === BookingStatus.COMPLETED) {
        booking.confirmedAt = daysAgo(t.daysBack + 6);
        booking.startedAt = daysAgo(t.daysBack + 5);
        booking.customerApproved = true;
        booking.customerApprovedAt = daysAgo(t.daysBack + 3);
        booking.completedAt = daysAgo(t.daysBack);
      }
      if (t.status === BookingStatus.CANCELLED) {
        booking.cancelledAt = daysAgo(t.daysBack);
        booking.cancelledBy = customer.id;
        booking.cancellationReason = t.cancellationReason;
      }

      const saved = await queryRunner.manager.save(Booking, booking);
      // Backdate created_at/updated_at to make admin views realistic.
      await queryRunner.query(
        `UPDATE bookings SET created_at = $2, updated_at = $2 WHERE id = $1`,
        [saved.id, daysAgo(t.daysBack)],
      );

      bookings.push(saved);
    }

    return bookings;
  }

  private async seedTransactions(
    queryRunner: any,
    providers: User[],
    customers: User[],
    bookings: Booking[],
    orders: Order[],
  ): Promise<Transaction[]> {
    const daysAgo = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      return d;
    };

    // Keep idempotent (seeder truncates, but this also covers partial runs).
    await queryRunner.query(`DELETE FROM transactions WHERE reference LIKE 'seedpay-%'`);

    const customer = customers[0];
    const provider = providers[0];
    const booking = bookings.find((b) => b.status === BookingStatus.CONFIRMED) || bookings[0];
    const order = orders[0];

    const seedRef = (i: number) => `seedpay-${Date.now()}-${i}`;

    const seedTransactions: Array<Partial<Transaction> & { createdAt: Date }> = [
      {
        reference: seedRef(1),
        userId: customer.id,
        type: TransactionType.BOOKING_PAYMENT,
        amount: booking.depositAmount || 3000,
        currency: booking.currency || 'NGN',
        status: TransactionStatus.COMPLETED,
        gateway: PaymentGateway.PAYSTACK,
        gatewayReference: `${Math.random().toString(16).slice(2)}-${Date.now()}`,
        bookingId: booking.id,
        description: 'Booking deposit (seed)',
        paidAt: daysAgo(8),
        createdAt: daysAgo(8),
      },
      {
        reference: seedRef(2),
        userId: customer.id,
        type: TransactionType.ORDER_PAYMENT,
        amount: order.amount,
        currency: order.currency || 'NGN',
        status: TransactionStatus.COMPLETED,
        gateway: PaymentGateway.PAYSTACK,
        gatewayReference: `${Math.random().toString(16).slice(2)}-${Date.now()}`,
        orderId: order.id,
        description: 'Order payment (seed)',
        paidAt: daysAgo(6),
        createdAt: daysAgo(6),
      },
      {
        reference: seedRef(3),
        userId: provider.id,
        type: TransactionType.PAYOUT,
        amount: 12000,
        currency: 'NGN',
        status: TransactionStatus.PENDING,
        gateway: PaymentGateway.PAYSTACK,
        description: 'Provider payout pending (seed)',
        createdAt: daysAgo(3),
      },
      {
        reference: seedRef(4),
        userId: customer.id,
        type: TransactionType.REFUND,
        amount: 5000,
        currency: 'NGN',
        status: TransactionStatus.REFUNDED,
        gateway: PaymentGateway.PAYSTACK,
        bookingId: booking.id,
        description: 'Partial refund (seed)',
        createdAt: daysAgo(2),
      },
      {
        reference: seedRef(5),
        userId: customer.id,
        type: TransactionType.BOOKING_PAYMENT,
        amount: (Number(booking.amount) || 15000) - (Number(booking.depositAmount) || 3000),
        currency: 'NGN',
        status: TransactionStatus.FAILED,
        gateway: PaymentGateway.PAYSTACK,
        bookingId: booking.id,
        description: 'Booking completion payment failed (seed)',
        failureReason: 'Insufficient funds',
        failedAt: daysAgo(1),
        createdAt: daysAgo(1),
      },
    ];

    // Add some extra volume across the last 14 days.
    for (let i = 0; i < 18; i++) {
      const day = (i % 14) + 1;
      seedTransactions.push({
        reference: seedRef(100 + i),
        userId: customer.id,
        type: TransactionType.ORDER_PAYMENT,
        amount: 2500 + i * 350,
        currency: 'NGN',
        status: i % 5 === 0 ? TransactionStatus.PENDING : TransactionStatus.COMPLETED,
        gateway: PaymentGateway.PAYSTACK,
        orderId: order.id,
        gatewayReference: i % 5 === 0 ? undefined : `${Math.random().toString(16).slice(2)}-${Date.now()}`,
        description: 'Seed order payment',
        paidAt: i % 5 === 0 ? undefined : daysAgo(day),
        createdAt: daysAgo(day),
      });
    }

    const inserted: Transaction[] = [];
    for (const tx of seedTransactions) {
      const entity = queryRunner.manager.create(Transaction, {
        reference: tx.reference!,
        userId: tx.userId!,
        type: tx.type!,
        amount: tx.amount as any,
        currency: tx.currency || 'NGN',
        status: tx.status!,
        gateway: tx.gateway!,
        gatewayReference: tx.gatewayReference,
        orderId: tx.orderId,
        bookingId: tx.bookingId,
        description: tx.description,
        paidAt: (tx as any).paidAt,
        failedAt: (tx as any).failedAt,
        failureReason: (tx as any).failureReason,
      });

      const saved = await queryRunner.manager.save(Transaction, entity);
      inserted.push(saved);
    }

    // Backdate created_at for nicer charts.
    for (let idx = 0; idx < inserted.length; idx++) {
      const desired = seedTransactions[idx].createdAt;
      if (!desired) continue;
      await queryRunner.query(
        `UPDATE transactions SET created_at = $2, updated_at = $2 WHERE id = $1`,
        [inserted[idx].id, desired],
      );
    }

    return inserted;
  }

  private async seedPosts(queryRunner: any, providers: User[], customers: User[]): Promise<Post[]> {
    const allUsers = [...providers, ...customers];
    const postsData = [
      {
        userIndex: 0,
        content: "🎓 Just completed a comprehensive statistical analysis for a PhD thesis on climate change impact in Nigeria! Used SPSS for regression modeling and the results were fascinating. The correlation between temperature rise and agricultural yield was stronger than expected. #DataAnalysis #SPSS #Research",
        visibility: PostVisibility.PUBLIC,
        likesCount: 24,
        commentsCount: 8,
        sharesCount: 5,
      },
      {
        userIndex: 1,
        content: "🚀 Excited to share my latest Python automation tool for literature reviews! It can scrape 500+ papers from Google Scholar in under 10 minutes and automatically generate summaries. Perfect for researchers drowning in papers. DM me for a demo! #Python #ResearchTools #Automation",
        visibility: PostVisibility.PUBLIC,
        likesCount: 45,
        commentsCount: 12,
        sharesCount: 18,
      },
      {
        userIndex: 2,
        content: "📊 Data visualization tip: Less is more! Just finished a Tableau dashboard for a client and they loved the clean, minimal design. Sometimes removing elements adds more clarity than adding them. What's your favorite dashboard design principle? #DataViz #Tableau #Design",
        visibility: PostVisibility.PUBLIC,
        likesCount: 32,
        commentsCount: 15,
        sharesCount: 8,
      },
      {
        userIndex: 3,
        content: "✍️ Thesis writing season is here! I've helped over 200 students complete their dissertations, and the #1 mistake I see is starting with the introduction. Always start with your methodology and results first! Trust me on this one. #ThesisHelp #AcademicWriting #GradSchool",
        visibility: PostVisibility.PUBLIC,
        likesCount: 67,
        commentsCount: 23,
        sharesCount: 31,
      },
      {
        userIndex: 4,
        content: "🔍 Proofreading tip of the day: Read your work backwards, sentence by sentence. It forces you to focus on each sentence individually without getting caught up in the flow. Caught 5 errors I missed in forward reading! #Proofreading #EditingTips #Writing",
        visibility: PostVisibility.PUBLIC,
        likesCount: 28,
        commentsCount: 6,
        sharesCount: 12,
      },
      {
        userIndex: 5,
        content: "Just submitted my first chapter! 📚 The feeling of progress is everything. Shoutout to my advisor for the guidance. Anyone else in thesis writing mode right now? Let's motivate each other! 💪 #PhDLife #ThesisWriting #GradStudent",
        visibility: PostVisibility.PUBLIC,
        likesCount: 18,
        commentsCount: 9,
        sharesCount: 2,
      },
      {
        userIndex: 6,
        content: "Looking for a data analyst to help with my survey results. About 500 responses that need cleaning and analysis. Any recommendations? Preferably someone familiar with healthcare research. 🤔 #DataAnalysis #ResearchHelp #Survey",
        visibility: PostVisibility.PUBLIC,
        likesCount: 12,
        commentsCount: 7,
        sharesCount: 1,
      },
      {
        userIndex: 0,
        content: "📈 ANOVA vs Regression: When to use which? This is the most common question I get from students. Quick guide: Use ANOVA when comparing means across 3+ groups. Use regression when predicting a continuous outcome. Both handle categorical variables but differently! #Statistics #SPSS #ANOVA",
        visibility: PostVisibility.PUBLIC,
        likesCount: 41,
        commentsCount: 14,
        sharesCount: 22,
      },
      {
        userIndex: 1,
        content: "Built a web scraper that collected 10,000 research papers overnight! 🕷️📄 The power of automation is incredible. Now implementing NLP to categorize them by methodology. Research efficiency at its finest! #WebScraping #NLP #ResearchAutomation",
        visibility: PostVisibility.PUBLIC,
        likesCount: 56,
        commentsCount: 19,
        sharesCount: 28,
      },
      {
        userIndex: 2,
        content: "Before & After: Client's sales data visualization. The left is their original Excel chart. The right is my Tableau redesign. The difference clarity makes is amazing! 📊✨ Which do you prefer? #DataViz #BeforeAfter #Tableau",
        visibility: PostVisibility.PUBLIC,
        likesCount: 89,
        commentsCount: 31,
        sharesCount: 45,
      },
      {
        userIndex: 3,
        content: "5 Common Thesis Mistakes to Avoid:\n1. Starting with the intro\n2. Not backing up data\n3. Poor citation management\n4. Ignoring formatting guidelines\n5. Trying to write perfect first drafts\n\nWhich one are you guilty of? 😅 #ThesisTips #GradSchool",
        visibility: PostVisibility.PUBLIC,
        likesCount: 73,
        commentsCount: 28,
        sharesCount: 35,
      },
      {
        userIndex: 4,
        content: "Editing a 20,000-word dissertation today. My eyes are crossing! 👀 But seeing the improvement from draft to polished document makes it all worthwhile. This one is going to be excellent! #EditingLife #Dissertation #AcademicEditing",
        visibility: PostVisibility.PUBLIC,
        likesCount: 22,
        commentsCount: 8,
        sharesCount: 4,
      },
      {
        userIndex: 7,
        content: "Finally published my first paper! 🎉📝 It's been a long journey but seeing it in the journal made every late night worth it. For anyone struggling - keep going, your breakthrough is coming! #Publication #ResearchWins #AcademicLife",
        visibility: PostVisibility.PUBLIC,
        likesCount: 95,
        commentsCount: 42,
        sharesCount: 18,
      },
      {
        userIndex: 8,
        content: "Python pandas question: What's the most efficient way to merge 3 large datasets (500k+ rows each)? Currently using merge() but it's taking forever. Any optimization tips? 🐍 #Python #Pandas #DataScience",
        visibility: PostVisibility.PUBLIC,
        likesCount: 15,
        commentsCount: 11,
        sharesCount: 2,
      },
      {
        userIndex: 0,
        content: "Sample size calculation workshop tomorrow! 📊 I'll be teaching researchers how to determine the right sample size for their studies. Too small = unreliable results. Too large = wasted resources. Balance is key! #Statistics #ResearchMethods #Workshop",
        visibility: PostVisibility.PUBLIC,
        likesCount: 34,
        commentsCount: 7,
        sharesCount: 15,
      },
      {
        userIndex: 1,
        content: "Released my open-source research tools library today! 🎉 Includes citation formatters, bibliography generators, and literature organizers. Free for all researchers. Link in bio! #OpenSource #ResearchTools #AcademicTwitter",
        visibility: PostVisibility.PUBLIC,
        likesCount: 112,
        commentsCount: 38,
        sharesCount: 67,
      },
      {
        userIndex: 2,
        content: "Color theory in data viz: Blue = Trustworthy, Red = Urgent, Green = Growth, Yellow = Attention. Choose your colors intentionally! What emotions do you want your data to convey? 🎨 #DataViz #ColorTheory #DesignThinking",
        visibility: PostVisibility.PUBLIC,
        likesCount: 47,
        commentsCount: 16,
        sharesCount: 24,
      },
      {
        userIndex: 3,
        content: "Thesis defense prep: Practice your presentation 5+ times. Know your slides without looking. Anticipate questions about limitations. You've got this! 🎓💪 #ThesisDefense #PhDChat #GradSchoolTips",
        visibility: PostVisibility.PUBLIC,
        likesCount: 58,
        commentsCount: 22,
        sharesCount: 41,
      },
      {
        userIndex: 4,
        content: "Grammar tip: 'Affect' = verb (to influence). 'Effect' = noun (a result). Easy trick: Affect = Action (both start with A). Effect = End result. What's your grammar pet peeve? ✍️ #GrammarTips #WritingTips #Editing",
        visibility: PostVisibility.PUBLIC,
        likesCount: 36,
        commentsCount: 14,
        sharesCount: 19,
      },
      {
        userIndex: 5,
        content: "Struggling with writer's block today. 😓 Staring at a blank page for 2 hours. Sometimes the words just won't come. How do you overcome creative blocks? #WritersBlock #AcademicLife #GradSchoolStruggles",
        visibility: PostVisibility.PUBLIC,
        likesCount: 28,
        commentsCount: 25,
        sharesCount: 3,
      },
    ];

    const posts: Post[] = [];
    for (const postData of postsData) {
      const user = allUsers[postData.userIndex % allUsers.length];
      const post = queryRunner.manager.create(Post, {
        userId: user.id,
        content: postData.content,
        visibility: postData.visibility,
        likesCount: postData.likesCount,
        commentsCount: postData.commentsCount,
        sharesCount: postData.sharesCount,
      });
      const saved = await queryRunner.manager.save(Post, post);
      posts.push(saved);
    }

    return posts;
  }

  private async seedComments(queryRunner: any, providers: User[], customers: User[]): Promise<Comment[]> {
    const allUsers = [...providers, ...customers];
    const commentsData = [
      { postIndex: 0, userIndex: 5, content: "This is so helpful! I'm struggling with my SPSS analysis right now.", likes: 3 },
      { postIndex: 0, userIndex: 6, content: "Amazing work! Would you be available for a consultation?", likes: 2 },
      { postIndex: 1, userIndex: 7, content: "This is exactly what I need! Sending you a DM now.", likes: 5 },
      { postIndex: 1, userIndex: 8, content: "Wow, 500 papers in 10 minutes? That's incredible!", likes: 8 },
      { postIndex: 2, userIndex: 0, content: "I totally agree! Clean design always wins.", likes: 4 },
      { postIndex: 2, userIndex: 3, content: "What's your opinion on using pie charts?", likes: 2 },
      { postIndex: 3, userIndex: 1, content: "Starting with methodology is such game-changing advice!", likes: 7 },
      { postIndex: 3, userIndex: 2, content: "Wish I knew this 2 years ago! 😅", likes: 6 },
      { postIndex: 4, userIndex: 4, content: "Trying this right now, thanks for the tip!", likes: 3 },
      { postIndex: 5, userIndex: 6, content: "Congratulations! Keep pushing! 💪", likes: 2 },
      { postIndex: 5, userIndex: 7, content: "Just started mine too, we got this!", likes: 4 },
      { postIndex: 6, userIndex: 0, content: "I specialize in healthcare research! DM me.", likes: 5 },
      { postIndex: 7, userIndex: 5, content: "This is the clearest explanation I've seen!", likes: 6 },
      { postIndex: 7, userIndex: 8, content: "Bookmarking this for my next project!", likes: 4 },
      { postIndex: 8, userIndex: 2, content: "The future of research is automation! 🚀", likes: 9 },
      { postIndex: 8, userIndex: 7, content: "Would love to collaborate on this!", likes: 5 },
      { postIndex: 9, userIndex: 1, content: "Tableau is so powerful when used right!", likes: 7 },
      { postIndex: 9, userIndex: 4, content: "The redesign looks professional!", likes: 8 },
      { postIndex: 10, userIndex: 3, content: "Guilty of #3! Thanks for sharing!", likes: 5 },
      { postIndex: 10, userIndex: 5, content: "All of these hit too close to home 😂", likes: 6 },
      { postIndex: 11, userIndex: 6, content: "Your work is truly appreciated!", likes: 3 },
      { postIndex: 12, userIndex: 0, content: "Congratulations! This is huge! 🎉", likes: 8 },
      { postIndex: 12, userIndex: 1, content: "So inspiring! Hope to be there soon!", likes: 7 },
      { postIndex: 13, userIndex: 2, content: "Try using concat() instead of merge for multiple datasets", likes: 6 },
      { postIndex: 14, userIndex: 3, content: "This workshop sounds amazing! How do I register?", likes: 4 },
      { postIndex: 15, userIndex: 4, content: "Just downloaded it, thank you for this!", likes: 9 },
      { postIndex: 16, userIndex: 5, content: "Never thought about color psychology in data!", likes: 5 },
      { postIndex: 17, userIndex: 6, content: "My defense is next month, so nervous!", likes: 4 },
      { postIndex: 17, userIndex: 7, content: "You've got this! Preparation is everything!", likes: 6 },
      { postIndex: 18, userIndex: 0, content: "The your/you're mistake drives me crazy!", likes: 3 },
      { postIndex: 19, userIndex: 1, content: "Take a break and come back fresh!", likes: 5 },
      { postIndex: 19, userIndex: 2, content: "Sometimes walking away is the best solution", likes: 4 },
      { postIndex: 0, userIndex: 3, content: "Would love to see more posts like this!", likes: 2 },
      { postIndex: 1, userIndex: 4, content: "Automation is the future of research", likes: 6 },
      { postIndex: 2, userIndex: 5, content: "Minimalism in design is underrated", likes: 3 },
      { postIndex: 3, userIndex: 6, content: "This tip changed my entire approach!", likes: 7 },
      { postIndex: 4, userIndex: 7, content: "Trying this on my thesis right now", likes: 2 },
      { postIndex: 5, userIndex: 8, content: "Progress over perfection! Keep going!", likes: 5 },
      { postIndex: 6, userIndex: 0, content: "DM sent! Let's discuss your project", likes: 4 },
    ];

    const comments: Comment[] = [];
    const posts = await queryRunner.manager.find(Post);
    
    for (const commentData of commentsData) {
      if (commentData.postIndex >= posts.length) continue;
      const post = posts[commentData.postIndex];
      
      const user = allUsers[commentData.userIndex % allUsers.length];
      const comment = queryRunner.manager.create(Comment, {
        postId: post.id,
        userId: user.id,
        content: commentData.content,
        likesCount: commentData.likes,
      });
      const saved = await queryRunner.manager.save(Comment, comment);
      comments.push(saved);
    }

    return comments;
  }

  private async seedLikes(queryRunner: any, providers: User[], customers: User[]): Promise<Like[]> {
    const allUsers = [...providers, ...customers];
    const posts = await queryRunner.manager.find(Post, { take: 20 });
    const comments = await queryRunner.manager.find(Comment, { take: 40 });
    
    const likes: Like[] = [];
    const likePairs = new Set<string>();

    // Generate likes for posts using engagement levels from postsData
    // High-engagement posts get likes from specific user types (providers like professional content, customers like helpful tips)
    const postEngagementMap = [
      { likesCount: 24, likerTypes: ['customer', 'provider'] }, // Post 0: SPSS analysis
      { likesCount: 45, likerTypes: ['provider', 'customer', 'customer'] }, // Post 1: Python automation
      { likesCount: 32, likerTypes: ['provider', 'customer'] }, // Post 2: Data viz tip
      { likesCount: 67, likerTypes: ['customer', 'customer', 'provider'] }, // Post 3: Thesis advice (very popular)
      { likesCount: 28, likerTypes: ['customer', 'provider'] }, // Post 4: Proofreading tip
      { likesCount: 18, likerTypes: ['customer'] }, // Post 5: Personal update
      { likesCount: 12, likerTypes: ['provider'] }, // Post 6: Looking for help
      { likesCount: 41, likerTypes: ['provider', 'customer'] }, // Post 7: ANOVA vs Regression
      { likesCount: 56, likerTypes: ['provider', 'customer', 'customer'] }, // Post 8: Web scraping
      { likesCount: 89, likerTypes: ['customer', 'provider', 'customer'] }, // Post 9: Before/After viz (most popular)
      { likesCount: 73, likerTypes: ['customer', 'customer', 'provider'] }, // Post 10: Thesis mistakes
      { likesCount: 22, likerTypes: ['provider'] }, // Post 11: Editing work
      { likesCount: 95, likerTypes: ['customer', 'customer', 'provider'] }, // Post 12: First publication (very popular)
      { likesCount: 15, likerTypes: ['provider'] }, // Post 13: Python question
      { likesCount: 34, likerTypes: ['customer', 'provider'] }, // Post 14: Sample size workshop
      { likesCount: 112, likerTypes: ['customer', 'provider', 'customer', 'provider'] }, // Post 15: Open source release (most popular)
      { likesCount: 47, likerTypes: ['provider', 'customer'] }, // Post 16: Color theory
      { likesCount: 58, likerTypes: ['customer', 'customer'] }, // Post 17: Thesis defense prep
      { likesCount: 36, likerTypes: ['customer', 'provider'] }, // Post 18: Grammar tip
      { likesCount: 28, likerTypes: ['customer'] }, // Post 19: Writer's block
    ];

    for (let i = 0; i < posts.length && i < postEngagementMap.length; i++) {
      const post = posts[i];
      const engagement = postEngagementMap[i];
      const targetLikes = engagement.likesCount;
      
      // Distribute likes across user types deterministically
      let likeCount = 0;
      let userIndex = 0;
      
      while (likeCount < targetLikes && userIndex < allUsers.length) {
        const user = allUsers[userIndex % allUsers.length];
        const pairKey = `${user.id}-${post.id}`;
        
        if (!likePairs.has(pairKey)) {
          likePairs.add(pairKey);
          const like = queryRunner.manager.create(Like, {
            userId: user.id,
            postId: post.id,
            type: 'like',
          });
          await queryRunner.manager.save(Like, like);
          likes.push(like);
          likeCount++;
        }
        userIndex++;
      }
    }

    // Generate likes for comments based on their likesCount
    for (const comment of comments) {
      const targetLikes = comment.likesCount || 0;
      let likeCount = 0;
      let userIndex = 0;
      
      while (likeCount < targetLikes && userIndex < allUsers.length) {
        const user = allUsers[userIndex % allUsers.length];
        const pairKey = `${user.id}-comment-${comment.id}`;
        
        // Skip if this user already liked this comment
        if (!likePairs.has(pairKey)) {
          likePairs.add(pairKey);
          const like = queryRunner.manager.create(Like, {
            userId: user.id,
            commentId: comment.id,
            type: 'like',
          });
          await queryRunner.manager.save(Like, like);
          likes.push(like);
          likeCount++;
        }
        userIndex++;
      }
    }

    return likes;
  }

  private async seedOrders(queryRunner: any, providers: User[], customers: User[], services: Service[]): Promise<Order[]> {
    const ordersData = [
      {
        customerIndex: 0,
        providerIndex: 0,
        serviceIndex: 0,
        status: OrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.COMPLETED,
        amount: 25000,
      },
      {
        customerIndex: 1,
        providerIndex: 1,
        serviceIndex: 2,
        status: OrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.COMPLETED,
        amount: 20000,
      },
      {
        customerIndex: 2,
        providerIndex: 0,
        serviceIndex: 1,
        status: OrderStatus.DISPUTED,
        paymentStatus: PaymentStatus.COMPLETED,
        amount: 40000,
      },
      {
        customerIndex: 3,
        providerIndex: 2,
        serviceIndex: 4,
        status: OrderStatus.DISPUTED,
        paymentStatus: PaymentStatus.COMPLETED,
        amount: 30000,
      },
      {
        customerIndex: 4,
        providerIndex: 3,
        serviceIndex: 6,
        status: OrderStatus.IN_PROGRESS,
        paymentStatus: PaymentStatus.COMPLETED,
        amount: 150000,
      },
    ];

    const orders: Order[] = [];
    for (const orderData of ordersData) {
      const customer = customers[orderData.customerIndex % customers.length];
      const provider = providers[orderData.providerIndex % providers.length];
      const service = services[orderData.serviceIndex % services.length];

      const order = queryRunner.manager.create(Order, {
        orderNumber: `ORD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        customerId: customer.id,
        providerId: provider.id,
        serviceId: service.id,
        status: orderData.status,
        paymentStatus: orderData.paymentStatus,
        amount: orderData.amount,
        currency: 'NGN',
        platformFee: Math.floor(orderData.amount * 0.1),
        providerEarnings: Math.floor(orderData.amount * 0.9),
        description: `Order for ${service.title}`,
        paidAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      });

      if (orderData.status === OrderStatus.COMPLETED) {
        order.completedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      }

      const saved = await queryRunner.manager.save(Order, order);
      orders.push(saved);
    }

    return orders;
  }

  private async seedDisputes(queryRunner: any, orders: Order[]): Promise<Dispute[]> {
    const disputesData = [
      {
        orderIndex: 2,
        reason: DisputeReason.POOR_QUALITY,
        description: 'The statistical analysis was incomplete and contained errors. The regression models were not properly validated and the results chapter had multiple inconsistencies.',
        evidence: ['Screenshot of error in SPSS output', 'Email from supervisor pointing out issues', 'Original vs delivered comparison'],
        status: DisputeStatus.OPEN,
      },
      {
        orderIndex: 3,
        reason: DisputeReason.LATE_DELIVERY,
        description: 'The dashboard was delivered 5 days after the agreed deadline, causing me to miss my presentation deadline. The delay was not communicated in advance.',
        evidence: ['Chat log showing original deadline', 'Screenshot of late delivery notification'],
        status: DisputeStatus.UNDER_REVIEW,
      },
      {
        orderIndex: 4,
        reason: DisputeReason.NOT_AS_DESCRIBED,
        description: 'The thesis support was supposed to include methodology design but the provider only provided editing services. Key deliverables were missing.',
        evidence: ['Service description screenshot', 'List of missing deliverables'],
        status: DisputeStatus.OPEN,
      },
    ];

    const disputes: Dispute[] = [];
    for (const disputeData of disputesData) {
      const order = orders[disputeData.orderIndex % orders.length];

      const dispute = queryRunner.manager.create(Dispute, {
        orderId: order.id,
        raisedBy: order.customerId,
        reason: disputeData.reason,
        description: disputeData.description,
        evidence: disputeData.evidence,
        status: disputeData.status,
      });

      const saved = await queryRunner.manager.save(Dispute, dispute);
      disputes.push(saved);
    }

    return disputes;
  }
}

// Execute seeder if run directly
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  seeder
    .createDatabaseIfNotExists()
    .then(() => seeder.initialize())
    .then(() => seeder.seed())
    .then(() => seeder.close())
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Seeder failed:', error);
      process.exit(1);
    });
}
