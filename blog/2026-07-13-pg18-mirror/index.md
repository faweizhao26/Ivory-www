---
slug: pg18-mirror
title: "Surprise! IvorySQL Now Syncs Native PG 18.4 Images"
authors: [ShunWah]
category: IvorySQL
image: img/blog/covers/pg18-mirror-en.png
tags: [IvorySQL, PostgreSQL, Docker, Mirror, PG18, openEuler]
---

After publishing the IvorySQL China mirror guide, many readers asked: **Can I pull native PostgreSQL from the registry?**

Today I'm testing PostgreSQL 18.4-bookworm on a real openEuler machine, covering every step and pitfall in detail.

Previously, pulling PG images from Docker Hub was painful: hundreds of KB/s at peak, disconnections at 90%, or completely blocked in data centers without internet proxies. Now the IvorySQL community's `registry.highgo.com` mirrors official PG images — one registry for both IvorySQL and native PG, perfect for migration comparison and compatibility testing.

This article contains real, copy-paste-ready commands, breaking down tag issues, disk full errors, missing clients, and command paste errors — even beginners can deploy successfully by following along.

## 1. Environment Setup

Test machine configuration: openEuler OS, Docker 20.10.24, Docker Compose v2.20.0, registry.highgo.com, testing PG 18.4-bookworm.

### 1.1 Critical Tag Pitfall

```bash
# Wrong — bare version tag doesn't work
docker pull registry.highgo.com/postgres:18.4
```

Error: `bad request: invalid repository name`

**Root cause**: PG images in this registry require:
1. Full path: `postgres/postgres`, not `postgres`
2. Distribution suffix: must carry `-bookworm` or `-trixie`

```bash
# Correct
docker pull registry.highgo.com/postgres/postgres:18.4-bookworm
```

## 2. Lightning-Fast Pull: 30 Seconds

```bash
docker pull registry.highgo.com/postgres/postgres:18.4-bookworm
```

**Real result**: ~30 seconds total. Docker Hub was crawling at hundreds of KB/s. Now tens of MB/s. A night-and-day difference.

```bash
docker images | grep postgres
# registry.highgo.com/postgres/postgres  18.4-bookworm  440MB
```

## 3. Container Launch: A Trail of Pitfalls

### Pitfall 1: Shell `!!` Expansion

```bash
docker run --name pg184 -p 5432:5432 -e POSTGRES_PASSWORD=StrongPass456!! ...
# Fails with "Unable to find image 'run:latest'"
```

**Root cause**: `!!` in Bash means "repeat last command". Shell expands it before execution.

**Fix**: Wrap password in single quotes: `'StrongPass456!!'`

### Pitfall 2: Port 5432 Already Taken

```bash
# Error: port is already allocated
```

IvorySQL container occupies 5432. **Fix**: map 5433→5432.

### Pitfall 3: PG18+ Data Path Breaking Change

```bash
docker logs pg184
# Error: unused mount/volume — /var/lib/postgresql/data
```

From PG18+, the official Docker image stores data at `/var/lib/postgresql/18/` subdirectories, not `/var/lib/postgresql/data`.

**Fix**: Mount `/var/lib/postgresql` instead.

### Finally Working

```bash
docker run --name pg184 -p 5433:5432 \
  -e POSTGRES_PASSWORD='StrongPass456!!' \
  -v pgdata:/var/lib/postgresql \
  -d registry.highgo.com/postgres/postgres:18.4-bookworm
```

`docker logs pg184 | grep "ready to accept"` → Success!

## 4. Docker Compose for Production

```yaml
version: '3.8'
services:
  pg18:
    image: registry.highgo.com/postgres/postgres:18.4-bookworm
    restart: always
    ports: ["5435:5432"]
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: PGtest@2026
      POSTGRES_DB: testdb
    volumes: ["./pgdata:/var/lib/postgresql"]
```

## 5. CRUD Verification

```sql
CREATE TABLE test_user (id BIGSERIAL PRIMARY KEY, username VARCHAR(50), age INT, create_time TIMESTAMP DEFAULT now());
INSERT INTO test_user (username,age) VALUES ('zhangsan',24),('lisi',28),('wangwu',32);
SELECT * FROM test_user;
UPDATE test_user SET age=29 WHERE username='lisi';
DELETE FROM test_user WHERE username='wangwu';
```

All operations verified. Version: PostgreSQL 18.4.

## 6. Pitfall Summary

| # | Issue | Fix |
|---|-------|-----|
| 1 | Bare version tag fails | Use `postgres/postgres:18.4-bookworm` |
| 2 | `!!` in password | Wrap in single quotes |
| 3 | Port 5432 occupied | Use different host port |
| 4 | PG18+ data path changed | Mount `/var/lib/postgresql` |
| 5 | No `psql` on host | Use `docker exec -it pg18 psql` |

## Verdict

The IvorySQL `registry.highgo.com` now reliably mirrors native PG images alongside IvorySQL — one registry, two databases, zero switching. Production-ready for enterprises and compliance-friendly for regulated environments.

> Author: ShunWah, "shunwah星辰数智社". Holds OceanBase, MySQL, OpenGauss, KingBase, KaiwuDB, TiDB certifications. Multiple MVP awards, 1st/2nd/3rd prizes in database tech writing competitions.
