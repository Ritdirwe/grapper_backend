# Grapper Marketplace Backend

NestJS backend with Domain-Driven Design (DDD) architecture, Fastify adapter, TypeORM, and PostgreSQL.

## Project Structure

```
backend/
├── src/
│   ├── common/              # Shared kernel
│   │   ├── domain/          # Base entities, value objects
│   │   └── dto/             # Common DTOs (pagination, response)
│   ├── config/              # Configuration files
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── payment.config.ts
│   ├── infrastructure/      # Cross-cutting concerns
│   │   └── database/
│   │       ├── data-source.ts
│   │       ├── database.module.ts
│   │       └── migrations/
│   ├── modules/             # Domain modules (to be implemented)
│   ├── health/              # Health check endpoint
│   ├── app.module.ts
│   └── main.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- pnpm

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your database credentials
```

3. Create database:

```bash
createdb grapper_marketplace
```

### Development

Start development server:

```bash
pnpm start:dev
```

The API will be available at `http://localhost:3000/api`

### Database Migrations

Generate migration:

```bash
pnpm migration:generate src/infrastructure/database/migrations/InitialSchema
```

Run migrations:

```bash
pnpm migration:run
```

Revert migration:

```bash
pnpm migration:revert
```

## API Endpoints

### Health Check

- `GET /api/health` - Check API status

## Tech Stack

- **Framework**: NestJS 11
- **HTTP Adapter**: Fastify
- **Database**: PostgreSQL with TypeORM
- **Authentication**: JWT with Passport
- **Validation**: class-validator & class-transformer
- **Password Hashing**: Argon2
- **Payments**: Stripe & Paystack
- **Language**: TypeScript

## Next Steps

1. Implement domain modules (Identity, User, Booking, Payment, etc.)
2. Create database migrations
3. Set up authentication guards
4. Implement business logic
5. Add API documentation (Swagger)
6. Write tests

## License

ISC
