---
slug: pg18-mirror
title: "Surprise! IvorySQL Now Syncs Native PG 18.4 Images"
authors: [ShunWah]
category: IvorySQL
image: img/blog/covers/pg18-mirror-en.png
tags: [IvorySQL, PostgreSQL, Docker, Mirror, PG18, openEuler]
---

A while ago, I published an IvorySQL China mirror hands-on guide. Many readers asked: **Can I pull native PostgreSQL from the registry?**

Today, I'm testing PostgreSQL 18.4-bookworm on a real openEuler machine, covering every step, every pitfall in detail.

Previously, pulling PG images from Docker Hub was painful: hundreds of KB/s at peak hours, disconnections at 90% progress, and completely blocked in data centers without external internet access. Now, the IvorySQL community's `registry.highgo.com` mirrors official PG images — no need to switch registries. One registry for both IvorySQL and native PG, perfect for migration comparison and compatibility testing.

No fluff, all real-machine copy-paste-ready commands. Version tag pitfalls, disk-full disasters, missing host clients, command paste errors — all dissected. Even beginners can deploy successfully by following along.

> This article is based on actual openEuler machine testing. All screenshots are real operation records, not simulated demos.

## 1. Environment Setup

| Item | Version/Info |
|------|-------------|
| OS | openEuler |
| Docker | 20.10.24 |
| Docker Compose | v2.20.0 |
| Registry | registry.highgo.com |
| Test Image | registry.highgo.com/postgres/postgres:18.4-bookworm |

```bash
[root@openeuler-server ~]# docker --version
Docker version 20.10.24, build 297e128
[root@openeuler-server ~]# docker-compose --version
Docker Compose version v2.2.0.0
[root@openeuler-server ~]#
```

### 1.1 Critical Tag Pitfall

Many people will directly execute this command — and it will **100% fail**:

```bash
# Wrong — bare version tag, registry path is also incorrect (missing postgres/postgres)
docker pull registry.highgo.com/postgres:18.4
```

**Error output:**

```bash
[root@openeuler-server ~]# docker pull registry.highgo.com/postgres:18.4
Error response from daemon: unknown: bad request: invalid repository name: postgres
[root@openeuler-server ~]#
```

> **Root cause**: PG images in this registry must carry a distribution suffix like `-bookworm` or `-trixie`. Pure numeric version tags don't work.
> Additionally, the correct path is `postgres/postgres`, not `postgres`.

**Correct pull command:**

```bash
[root@openeuler-server ~]# docker pull registry.highgo.com/postgres/postgres:18.4-bookworm
18.4-bookworm: Pulling from postgres/postgres
dc4bf025fa70: Pull complete
07800c4658aa: Pull complete
d3b29a572ab1: Pull complete
9c32480c36e2: Pull complete
ab0222f6080d: Pull complete
26068876c106: Pull complete
204ea99b8184: Pull complete
b9b7e4c43bc2: Pull complete
d626a1ee2499: Pull complete
df093a451bde: Pull complete
4551c7621254: Pull complete
b7cc028a2062: Pull complete
4ea1c3550cc2: Pull complete
Digest: sha256:d323ae4f611b8c41e2488693785b770d2797c10e859b259e4e7706246debb069
Status: Downloaded newer image for registry.highgo.com/postgres/postgres:18.4-bookworm
registry.highgo.com/postgres/postgres:18.4-bookworm
[root@openeuler-server ~]#
```

## 2. Lightning-Fast Pull: From 20 Minutes to 30 Seconds

### 2.1 Execute Pull

```bash
[root@openeuler-server ~]# docker pull registry.highgo.com/postgres/postgres:18.4-bookworm
18.4-bookworm: Pulling from postgres/postgres
67cf8384fcca: Pull complete
047252d203fc: Pull complete
285c515ff12e: Pull complete
c04bac481cf9: Pull complete
4d2f8983bdeb: Pull complete
928cbc530e9b: Pull complete
b7d7c0b1553c: Pull complete
ef11daf91965: Pull complete
5dab6177213d: Pull complete
b73f5647695f: Pull complete
9c1186127d05: Pull complete
c73bb36f2399: Pull complete
142af709c9ab: Pull complete
Digest: sha256:1fa4bccc8246ee2ba9592895d804dcf767119e632999ef22d2b3355a93b627c3
Status: Downloaded newer image for registry.highgo.com/postgres/postgres:18.4-bookworm
registry.highgo.com/postgres/postgres:18.4-bookworm
```

> **Real result**: From hitting Enter to download completion, about **30 seconds**. Docker Hub was crawling at hundreds of KB/s. Now tens of MB/s. A night-and-day difference.

### 2.2 Image Integrity Verification

```bash
[root@openeuler-server ~]# docker images | grep postgres
registry.highgo.com/postgres/postgres  18.4-bookworm  dda003c01642  2 weeks ago  440MB
registry.highgo.com/postgres/postgres  18.3-bookworm  3c67953c3a90  7 weeks ago  440MB
[root@openeuler-server ~]#
```

## 3. Container Launch: A Trail of Pitfalls

Image pulled, time to start. **Important warning**: PostgreSQL Docker images differ from MySQL/IvorySQL — they don't expose port 1521 by default, and environment variable handling is stricter.

### 3.1 Pitfall 1: Shell History Expansion `!!` Causes Chaos

```bash
[root@openeuler-server ~]# docker run --name pg184 -p 5432:5432 -e POSTGRES_PASSWORD=StrongPass456!! -v pgdata:/var/lib/postgresql/data -d registry.highgo.com/postgres/postgres:18.4-bookworm
Unable to find image 'run:latest' locally
docker: Error response from daemon: Get "https://registry-1.docker.io/v2/": dial tcp 202.160.130.66:443: connect: connection timed out.
See 'docker run --help'.
[root@openeuler-server ~]#
```

> **Root cause**: Notice the password `StrongPass456!!`. In Bash, `!!` means "repeat the last command". Shell expands `!!` before executing, resulting in a mangled command.

**Fix**: Wrap password in single or double quotes.

```bash
[root@openeuler-server ~]# docker run --name pg184 -p 5432:5432 -e POSTGRES_PASSWORD='StrongPass456!!' -v pgdata:/var/lib/postgresql/data -d registry.highgo.com/postgres/postgres:18.4-bookworm
5867e8daa44e925e7818598013a1da62ad7dbdd685e6aa0fae68a94d590edbce
docker: Error response from daemon: driver failed programming external connectivity on endpoint pg184: Bind for 0.0.0.0:5432 failed: port is already allocated.
[root@openeuler-server ~]#
```

### 3.2 Pitfall 2: Port 5432 Already Occupied by IvorySQL

Error: `Bind for 0.0.0.0:5432 failed: port is already allocated`.

Check `docker ps -a`:

```bash
[root@openeuler-server ~]# docker ps -a
CONTAINER ID  IMAGE                                            COMMAND                 STATUS    PORTS                              NAMES
5867e8daa44e  registry.highgo.com/postgres/postgres:18.4-...   "docker-entrypoint.…"   Created                                        pg184
90f5945502a0  registry.highgo.com/ivorysql/ivorysql:5.3-ubi8   "docker-entrypoint.…"   Up 9 days 0.0.0.0:1521->1521/tcp, 0.0.0.0:5432->5432/tcp  ivorysql
```

The `ivorysql` container already occupies 5432. One port serves one process at a time.

**Fix**: Change the port mapping. Map host 5433 to container 5432:

```bash
[root@openeuler-server ~]# docker stop pg184 && docker rm pg184
[root@openeuler-server ~]# docker run --name pg184 -p 5433:5432 -e POSTGRES_PASSWORD='StrongPass456!!' -v pgdata:/var/lib/postgresql/data -d registry.highgo.com/postgres/postgres:18.4-bookworm
aa42ab39ec930934befb825efa15e7b646af0cd3b84560c3ff5aba73818af60b
[root@openeuler-server ~]#
```

### 3.3 Pitfall 3: PG18+ Data Path Breaking Change

Port issue resolved, but the container still won't start:

```bash
[root@openeuler-server ~]# docker ps | grep pg18
[root@openeuler-server ~]#
```

Check logs:

```bash
[root@openeuler-server ~]# docker logs pg184
Error: in 18+, these Docker images are configured to store database data in a
       format which is compatible with "pg_ctlcluster" (specifically, using
       major-version-specific directory names).

       Counter to that, there appears to be PostgreSQL data in:
         /var/lib/postgresql/data (unused mount/volume)

       The suggested container configuration for 18+ is to place a single mount
       at /var/lib/postgresql which will then place PostgreSQL data in a
       subdirectory...
```

> **Root cause**: Starting from PostgreSQL 18, the official Docker image no longer stores data at `/var/lib/postgresql/data`. Instead, it uses version-specific paths like `/var/lib/postgresql/18/docker`. Your mount point is the old path, causing PG 18 to fail.

**Fix**: Change mount from `/var/lib/postgresql/data` to `/var/lib/postgresql`:

```bash
[root@openeuler-server ~]# docker stop pg184 && docker rm pg184
[root@openeuler-server ~]# docker run --name pg184 -p 5433:5432 -e POSTGRES_PASSWORD='StrongPass456!!' -v pgdata:/var/lib/postgresql -d registry.highgo.com/postgres/postgres:18.4-bookworm
0ea9e62cd3d0f19a6a791914f2b946ca417ba7247556a4b8f56b3c851118e2ba
[root@openeuler-server ~]#
```

### 3.4 Success!

```bash
[root@openeuler-server ~]# docker ps | grep pg18
0ea9e62cd3d0  registry.highgo.com/postgres/postgres:18.4-bookworm  "docker-entrypoint.s…" 2 minutes ago Up 2 minutes 0.0.0.0:5433->5432/tcp  pg184
[root@openeuler-server ~]#
```

Check logs to confirm ready:

```bash
[root@openeuler-server ~]# docker logs pg184 | tail -10
2026-06-27 09:56:43.153 UTC [1] LOG:  starting PostgreSQL 18.4 (Debian 18.4-1.pgdg12+1) on x86_64-pc-linux-gnu
2026-06-27 09:56:43.170 UTC [1] LOG:  database system is ready to accept connections
```

🎉 **Seeing** `ready to accept connections` — **success!**

## 4. Docker Compose for Production

Single `docker run` is fine for testing. For long-term testing and pre-production, use Compose for centralized config, easier scaling, and simpler migration.

### 4.1 Create Work Directory

```bash
[root@openeuler-server ~]# mkdir -p /data/pg-compose && cd /data/pg-compose
```

### 4.2 docker-compose.yml (PG 18.4 Compatible)

```yaml
version: '3.8'
services:
  pg18:
    image: registry.highgo.com/postgres/postgres:18.4-bookworm
    container_name: pg18
    restart: always
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: PGtest@2026
      POSTGRES_DB: testdb
    volumes:
      - ./pgdata:/var/lib/postgresql  # PG18+: mount root, not /data subdir
    networks:
      pg_net:
networks:
  pg_net:
    driver: bridge
```

### 4.3 Port Conflict Again

```bash
[root@openeuler-server pg-compose]# docker-compose up -d
Error response from daemon: Bind for 0.0.0.0:5432 failed: port is already allocated
```

> **Fix**: Change `5432:5432` to `5435:5432`.

### 4.4 Revised Compose File

```yaml
ports:
  - "5435:5432"  # Host port 5435, avoiding 5432/5433
```

### 4.5 Restart

```bash
[root@openeuler-server pg-compose]# docker-compose down && docker-compose up -d
[+] Running 2/2
 ✔ Network pg-compose_pg_net  Created  0.2s
 ✔ Container pg18             Started  0.4s
[root@openeuler-server pg-compose]#
```

```bash
[root@openeuler-server pg-compose]# docker logs pg18 | grep "ready to accept"
2026-06-27 10:31:46.188 UTC [1] LOG:  database system is ready to accept connections
```

## 5. PostgreSQL 18.4 CRUD Verification

Once the container logs show `database system is ready to accept connections`, enter and verify:

### 5.1 Enter Terminal & Check Version

```bash
[root@openeuler-server pg-compose]# docker exec -it pg18 psql -U postgres
psql (18.4 (Debian 18.4-1.pgdg12+1))
Type "help" for help.

postgres=# select version();
                                                                 version
------------------------------------------------------------------------------------------------------------------------------------
 PostgreSQL 18.4 (Debian 18.4-1.pgdg12+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14+deb12u1) 12.2.0, 64-bit
(1 row)
```

### 5.2 Complete CRUD

```sql
-- Create table
CREATE TABLE test_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    age INT,
    create_time TIMESTAMP DEFAULT now()
);

-- Insert data
INSERT INTO test_user (username,age) VALUES ('zhangsan',24),('lisi',28),('wangwu',32);

-- Query all
SELECT * FROM test_user;
--  id | username | age |        create_time
-- ----+----------+-----+----------------------------
--   1 | zhangsan |  24 | 2026-06-27 12:29:53.710586
--   2 | lisi     |  28 | 2026-06-27 12:29:53.710586
--   3 | wangwu   |  32 | 2026-06-27 12:29:53.710586

-- Update
UPDATE test_user SET age=29 WHERE username='lisi';

-- Delete
DELETE FROM test_user WHERE username='wangwu';

-- Final result
SELECT * FROM test_user;
--  id | username | age
-- ----+----------+-----
--   1 | zhangsan |  24
--   2 | lisi     |  29
```

## 6. Connection Port Reference

| Method | External Port | Database |
|--------|-------------|----------|
| IvorySQL container | 5432 / 1521 | IvorySQL 5.3 |
| docker run (single) | 5433 | PostgreSQL 18.4 |
| Compose deploy | 5435 | PostgreSQL 18.4 |

## 7. High-Frequency Pitfall Summary

| # | Issue | Fix |
|---|-------|-----|
| 1 | Bare `18.4` tag fails | Use `postgres/postgres:18.4-bookworm` |
| 2 | `!!` shell expansion | Wrap password in single quotes |
| 3 | Port 5432 occupied | Use different host port |
| 4 | PG18+ data path changed | Mount `/var/lib/postgresql`, not `/data` |
| 5 | No `psql` on host | Use `docker exec -it pg18 psql` |

## 8. Honest Assessment

Many see China mirrors as just speed boosters, but the real value for PG migration scenarios is bigger:

✅ **Advantages:**
1. One registry offers both IvorySQL + native PG images — perfect for Oracle syntax comparison and migration assessment without switching registries
2. PG 18.4 syncs the latest community kernel fixes with minimal lag from Docker Hub
3. Images are completely official and unmodified — compliance-friendly for regulated and government environments

## Summary

This complete hands-on test of the `registry.highgo.com` PostgreSQL 18.4-bookworm image covers the full pipeline: pull, single-machine deployment, production Compose orchestration, and troubleshooting.

**Core advantages**: domestic high-speed pulls, official unmodified images, one-stop migration comparison with IvorySQL.

**Key reminders**: always include `-bookworm` suffix, always mount host data directories to prevent disk-full, prefer single-line commands to avoid parameter errors.

> **Author note**: All operations in this article were performed on an openEuler environment, centered around the IvorySQL community mirror `registry.highgo.com` for PostgreSQL 18.4-bookworm compatibility verification. PG images iterate quickly — please refer to the official documentation and latest tag list for production deployment. This is personal experience only, not official community guidance.

> **Author: ShunWah**, "shunwah星辰数智社" blog. Holds OceanBase, MySQL, OpenGauss, KingBase, KaiwuDB, TiDB, GBase certifications. YashanDB YVP, KaiwuDB MVP, MoTianLun MVP. Multiple 1st/2nd/3rd prizes in database tech writing competitions.
