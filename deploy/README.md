# Deploying MedBook with Docker

Runs the whole app on one Linux server with a permanent https address:

| Container | What it does |
|---|---|
| `api` | MedBook.Api (.NET) and its SQLite database, kept on the `medbook-data` volume |
| `web` | The Angular frontend (Node server) |
| `caddy` | The public entry point: gets the https certificate, sends `/api/*` to `api` and everything else to `web` |

The other ways of running MedBook are unchanged: `ng serve` + `dotnet run` for development,
and `demo/start-demo.ps1` for a quick demo from your own PC through a tunnel.

## What you need

- A small Linux server (Ubuntu 24.04), e.g. Hetzner CX22 or DigitalOcean 2 GB - about €5/month.
- A domain or subdomain, e.g. `demo.medbook.mk`, with an **A record pointing to the server's IP**.
- Ports **80 and 443** open on the server (Caddy needs both for the certificate).

## First deployment

On the server:

```bash
# 1. Docker
curl -fsSL https://get.docker.com | sh

# 2. Both repos, side by side
git clone <MedBook repo url> MedBook
git clone <MedBook.Api repo url> MedBook.Api

# 3. Settings
cd MedBook/deploy
cp .env.example .env
openssl rand -base64 64 | tr -d '\n'     # paste the output as JWT_KEY
nano .env                                # set DOMAIN, JWT_KEY, PLATFORM_ADMIN_*

# 4. Build and start
docker compose up -d --build
```

The first build takes a few minutes. Then open `https://<your domain>`. The first visit can
take up to a minute while Caddy gets the certificate.

An empty database is seeded with the demo clinic (logins on the login page) and the super
admin from `.env`, who signs in at `/admin`.

## Updating to a new version

```bash
cd ~/MedBook && git pull
cd ~/MedBook.Api && git pull
cd ~/MedBook/deploy && docker compose up -d --build
```

The database is on a volume, so it survives updates. Database migrations run automatically
when the API starts.

## Backups

```bash
docker compose run --rm backup           # writes deploy/backups/medbook-<date>.db
```

Run it every night with cron (`crontab -e`):

```
0 3 * * * cd ~/MedBook/deploy && docker compose run --rm backup >/dev/null 2>&1
```

Also copy `deploy/backups/` off the server now and then (or use the hosting provider's
snapshot backups) - a backup on the same disk doesn't help if the server is lost.

To restore: `docker compose stop api`, copy the backup file into the volume as
`medbook.db` (e.g. with `docker compose cp`), then `docker compose start api`.

## Useful commands

```bash
docker compose ps                 # what's running
docker compose logs -f api        # API log (errors, migrations, seeding)
docker compose restart api        # restart one part
docker compose down               # stop everything (data is kept)
docker compose down -v            # stop AND DELETE the database and certificates
```

## Trying it on your own PC first

Install Docker Desktop, put both repos side by side, set `DOMAIN=localhost` in `.env` and run
`docker compose up -d --build`. Open `https://localhost` and accept the certificate warning
(Caddy uses a locally made certificate for `localhost`).

## Troubleshooting

- **Site doesn't load / certificate error:** check the DNS A record points at this server
  (`ping <domain>`), that ports 80 and 443 are open, and `docker compose logs caddy`.
- **API won't start:** `docker compose logs api`. Most often `JWT_KEY` is missing or too short.
- **"Set JWT_KEY / DOMAIN in deploy/.env":** the `.env` file is missing or a value is empty.
