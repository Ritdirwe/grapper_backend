# PostgreSQL Setup Guide

## Quick Start with Docker (Recommended)

The easiest way to get PostgreSQL running for development:

```bash
docker run --name gripper-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=gripper_marketplace \
  -p 5432:5432 \
  -d postgres:14
```

Verify it's running:

```bash
docker ps | grep gripper-postgres
```

## Option 2: Install PostgreSQL Locally

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb gripper_marketplace

# Set password (optional)
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### macOS

```bash
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb gripper_marketplace
```

## Verify Connection

Test if PostgreSQL is accessible:

```bash
# Using psql
psql -U postgres -d gripper_marketplace -c "SELECT version();"

# Using Docker
docker exec -it gripper-postgres psql -U postgres -d gripper_marketplace -c "SELECT version();"
```

## Environment Configuration

Make sure your `backend/.env` matches your setup:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=gripper_marketplace
```

## Troubleshooting

### Connection Refused

- Check if PostgreSQL is running: `sudo systemctl status postgresql`
- Check if port 5432 is open: `sudo netstat -tlnp | grep 5432`

### Permission Denied

- Make sure the user has access: `sudo -u postgres psql`
- Grant permissions: `GRANT ALL PRIVILEGES ON DATABASE gripper_marketplace TO postgres;`

### Database Doesn't Exist

```bash
sudo -u postgres createdb gripper_marketplace
```

## Next Steps

Once PostgreSQL is running:

1. Start the backend: `cd backend && pnpm start:dev`
2. The server will auto-create tables (synchronize: true in development)
3. Test endpoints with curl
