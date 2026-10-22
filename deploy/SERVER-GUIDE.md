# MedBook server guide

Everything for running and changing the live MedBook server. For the first-time setup of a
new server, see [README.md](README.md).

> **No secrets in this file or anywhere in the repo.** Passwords, the JWT key and the GitHub
> token live only in `~/MedBook/deploy/.env` on the server (and in your password manager).

---

## 1. Quick facts

| | |
|---|---|
| Live site | https://med-book.duckdns.org |
| Super admin panel | https://med-book.duckdns.org/admin |
| Server | Oracle Cloud, Germany Central (Frankfurt), Ubuntu 24.04 (ARM) |
| Server IP | `141.147.30.34` |
| SSH user | `ubuntu` |
| SSH key (on your PC) | `C:\Users\Bojan\.ssh\oracle-medbook.key` |
| Code on the server | `~/MedBook` and `~/MedBook.Api` |
| Branch that is deployed | `Development` (both repos) |
| Settings / secrets | `~/MedBook/deploy/.env` |
| Database | Docker volume `medbook_medbook-data` (file `medbook.db`) |
| Backups | `~/MedBook/deploy/backups/` - every night at 03:00 UTC |
| Address (DNS) | duckdns.org - `med-book` points to `141.147.30.34` |

**Your PC does not need to be on.** The site runs on the server around the clock and starts
again by itself after a server restart.

What runs on the server (3 containers, all started by `docker compose`):

| Container | What it is |
|---|---|
| `api` | MedBook.Api (.NET) + the SQLite database |
| `web` | The Angular frontend |
| `caddy` | Public entry point: https certificate, sends `/api/*` to `api` and the rest to `web` |

---

## 2. Connecting to the server

From PowerShell on your PC:

```powershell
ssh -i "$env:USERPROFILE\.ssh\oracle-medbook.key" ubuntu@141.147.30.34
```

Check where you are by the start of the line:

| Prompt | You are on |
|---|---|
| `PS C:\Users\Bojan>` | your **PC** |
| `ubuntu@medbook-vcn:~$` | the **server** |

Type `exit` to go back to your PC.

Almost every command below starts in the deploy folder:

```bash
cd ~/MedBook/deploy
```

---

## 3. Everyday checks

```bash
cd ~/MedBook/deploy
docker compose ps                    # all three should be "Up"
docker compose logs --tail 50 api    # last 50 lines of the API log
docker compose logs -f api           # follow the log live (Ctrl+C to stop following)
docker compose logs --tail 50 caddy  # https / certificate / routing
df -h /                              # free disk space
free -h                              # memory
```

## 4. Start, stop, restart

```bash
cd ~/MedBook/deploy
docker compose up -d            # start everything (or apply changed settings)
docker compose restart api      # restart one part: api, web or caddy
docker compose stop             # stop everything - the site goes offline, data is kept
docker compose down             # stop and remove the containers - data is kept
```

> ⚠️ **Never run `docker compose down -v`** unless you really want to delete the database and
> the https certificates. The `-v` deletes the volumes.

---

## 5. Deploying a change (new version of the app)

### On your PC
1. Make the change, build and test it as usual.
2. Commit and push to the **`Development`** branch - in whichever repo changed
   (`MedBook` for the frontend, `MedBook.Api` for the backend, or both).

### On the server
```bash
cd ~/MedBook && git pull
cd ~/MedBook.Api && git pull
cd ~/MedBook/deploy && docker compose up -d --build
```

- The build takes a few minutes. The site stays up while it builds and switches over at the end.
- Database changes (migrations) run by themselves when the new API starts.
- Check afterwards: `docker compose ps` and open the site.

Same thing as one line:

```bash
cd ~/MedBook && git pull && cd ~/MedBook.Api && git pull && cd ~/MedBook/deploy && docker compose up -d --build
```

### If the new version is broken - go back
```bash
cd ~/MedBook && git log --oneline -5       # find the last good commit, e.g. a1b2c3d
git checkout a1b2c3d                       # (same in ~/MedBook.Api if the API changed)
cd ~/MedBook/deploy && docker compose up -d --build
```
When the fix is pushed, return to the branch with `git checkout Development && git pull`.

> If the broken version already changed the database (a new migration), going back can fail -
> restore the backup from before the update (section 7).

### Clean up old images now and then
Each build leaves old images behind. Free the disk space with:
```bash
docker image prune -f
```

---

## 6. Changing settings (`.env`)

```bash
cd ~/MedBook/deploy
nano .env                 # edit; save with Ctrl+O, Enter, exit with Ctrl+X
docker compose up -d      # apply - restarts only what's affected
```

| Setting | What it does | Notes |
|---|---|---|
| `DOMAIN` | The site's address | See "Moving to your own domain" below |
| `JWT_KEY` | Signs logins | Changing it logs everyone out. New one: `openssl rand -base64 64 \| tr -d '\n'; echo` |
| `PLATFORM_ADMIN_EMAIL` / `_PASSWORD` | Super admin account | **Only used when no super admin exists yet.** Changing them later does nothing - change the password inside the app |
| `CLINIC_TIME_ZONE` | Time zone of the demo clinic | Only used when the database is empty |

### Moving to your own domain
1. At your domain's DNS settings add an **A record**, e.g. `app` → `141.147.30.34`.
2. Wait until `nslookup app.yourdomain.com` (on your PC) shows `141.147.30.34`.
3. On the server: set `DOMAIN=app.yourdomain.com` in `.env`, then `docker compose up -d`.
4. Caddy gets the new certificate by itself within a minute (`docker compose logs caddy`).

Logins are tied to the address, so everyone has to log in once on the new one.

### If the server's IP ever changes
Update the IP at duckdns.org (or your domain's A record) and in section 1 of this file.

---

## 7. Backups

### Make one now
```bash
cd ~/MedBook/deploy
docker compose run --rm backup       # creates backups/medbook-<date>-<time>.db
ls -lh backups/
```
Always make one **before a big update**.

### Automatic nightly backup
Already set up with `crontab -e` (as `ubuntu`). See it with `crontab -l`. The line is:
```
0 3 * * * cd ~/MedBook/deploy && docker compose run --rm backup >/dev/null 2>&1
```

### Delete backups older than 30 days (optional, one-time setup)
The backup files belong to `root`, so this goes in root's schedule:
```bash
sudo crontab -e
```
Add at the bottom:
```
30 3 * * * find /home/ubuntu/MedBook/deploy/backups -name 'medbook-*.db' -mtime +30 -delete
```

### Copy the backups to your PC
A backup on the same server doesn't help if the server is lost - copy them off now and then.
In PowerShell **on your PC** (create the folder first):
```powershell
scp -i "$env:USERPROFILE\.ssh\oracle-medbook.key" "ubuntu@141.147.30.34:~/MedBook/deploy/backups/*" "$env:USERPROFILE\Documents\MedBook-backups\"
```

### Restore a backup
Replaces the live database - everything after the backup's time is lost.
```bash
cd ~/MedBook/deploy
ls backups/                                   # pick the file, e.g. medbook-20261022-030000.db
docker compose run --rm backup               # first back up the current state, just in case
docker compose stop api
docker compose run --rm --entrypoint sh backup -c \
  "rm -f /data/medbook.db-wal /data/medbook.db-shm && cp /backups/medbook-20261022-030000.db /data/medbook.db && chown 1654:1654 /data/medbook.db"
docker compose start api
```
(`1654` is the user the API runs as inside its container - it must own the file.)

---

## 8. Starting over with a fresh database

Deletes **all** data - clinics, patients, appointments, staff. The API then creates the demo
clinic and the super admin (from `.env`) again.

```bash
cd ~/MedBook/deploy
docker compose run --rm backup                # keep a copy, just in case
docker compose stop api
docker compose run --rm --entrypoint sh backup -c "rm -f /data/medbook.db /data/medbook.db-wal /data/medbook.db-shm"
docker compose start api
```

---

## 9. Server maintenance

### System updates (about once a month)
```bash
sudo apt update && sudo apt upgrade -y
sudo reboot                     # only if it says "System restart required"
```
After a reboot, wait a minute, reconnect, and check `docker compose ps` - everything starts by itself.

### Disk space
```bash
df -h /                         # "Use%" should stay well below 80%
docker system df                # how much Docker uses
docker image prune -f           # remove old images (safe)
```

### Oracle Cloud notes
- **Firewall:** ports 22, 80 and 443 are open in two places - Oracle's *Default Security List*
  (Networking → Virtual cloud networks → medbook-vcn → Security) and the server's own
  `iptables`. A new port must be opened in **both**.
- **Idle reclaim:** on a free-trial account Oracle may reclaim servers that are nearly idle for
  7 days. Upgrading to **Pay As You Go** prevents this (Always Free resources stay free) - set a
  budget alert under Billing → Budgets to be warned about any cost.
- **Lost SSH key:** you can't download it again. Use Oracle's *Console connection* (instance
  page → OS Management / Console connection) to get in and add a new public key to
  `~/.ssh/authorized_keys`.

---

## 10. GitHub access (private `MedBook.Api` repo)

The server pulls `MedBook.Api` with a **fine-grained personal access token** (read-only, only
that repo). When it expires or is replaced, `git pull` in `~/MedBook.Api` fails with an
authentication error. Then:

1. GitHub → Settings → Developer settings → Fine-grained tokens → **Regenerate** (or create a
   new one: *Only select repositories* → `MedBook.Api`, *Contents: Read-only*).
2. On the server (type the token **without** `< >`):
   ```bash
   git -C ~/MedBook.Api remote set-url origin https://NEW_TOKEN@github.com/petrovBojan/MedBook.Api.git
   git -C ~/MedBook.Api pull
   ```

---

## 11. Troubleshooting

| Problem | Check / fix |
|---|---|
| Site doesn't open at all | `docker compose ps` - start with `docker compose up -d`. Is the server running in the Oracle console? |
| Browser says the certificate is invalid | `docker compose logs caddy`. Does the domain still point to `141.147.30.34`? (`nslookup med-book.duckdns.org`) |
| Login page loads but logging in fails | `docker compose logs --tail 100 api`. A changed `JWT_KEY` just means everyone logs in again |
| `api` keeps restarting | `docker compose logs api` - usually a missing/short `JWT_KEY` in `.env` |
| Build fails during an update | Read the error at the end of the output; often a build error in the pushed code - fix on your PC, push, pull again |
| `git pull` asks for a password / fails in `MedBook.Api` | The GitHub token expired - section 10 |
| SSH: "Permission denied (publickey)" | Wrong key path, or the key file's permissions - run on your PC: `icacls "$env:USERPROFILE\.ssh\oracle-medbook.key" /inheritance:r /grant:r "$($env:USERNAME):R"` |
| SSH: connection times out | Server stopped (start it in the Oracle console) or the IP changed |
| Disk full | `docker image prune -f`, delete old backups |

---

## 12. Other ways to run MedBook

| Where | How | When |
|---|---|---|
| Your PC, for development | `ng serve` (MedBook) + `dotnet run` (MedBook.Api) | Day-to-day coding |
| Your PC, shared through a tunnel | `.\demo\start-demo.ps1` (`-Tunnel tailscale` for a fixed link) | A quick demo without the server; PC must stay on |
| Your PC, the server setup | Docker Desktop, `DOMAIN=localhost` in `deploy/.env`, `docker compose up -d --build`, open https://localhost | Testing Docker changes before deploying them |
| The server | This guide | The live site |
