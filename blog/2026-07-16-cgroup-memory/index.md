---
slug: cgroup-memory
title: "PostgreSQL Cgroup Memory Management in Cloud Environments"
authors: [刘智龙]
category: IvorySQL
image: img/blog/covers/cgroup-memory-en.png
tags: [PostgreSQL, Cgroup, Memory, Cloud, HOW2026]
---

> Based on Liu Zhilong's presentation at HOW 2026. Liu is a PG database expert at Ping An Technology.

## 1. Cgroup Memory Management Overview

### 1.1 Cgroup Basics

Cgroup (Control Group) is a Linux kernel mechanism for managing process group resources — CPU time, physical memory, I/O, and network — through quota limits, isolation, and usage statistics. In cloud environments, multiple PG instances on a single host each use Cgroup for resource management, and container technologies also rely on Cgroup for resource constraints.

### 1.2 CPU vs Memory Management

CPU management is straightforward: if a PG instance exceeds its CPU quota, it simply runs slower. But memory management is fundamentally different — when memory limits are exceeded, the OOM killer directly terminates processes. This makes memory Cgroup configuration critical for PG stability in cloud environments.

## 2. PG Memory Architecture & Cgroup Integration

PostgreSQL's memory architecture includes shared buffers, work_mem for sort operations, maintenance_work_mem for VACUUM, and process-local memory. In a Cgroup-constrained environment, these must be carefully configured to stay within the allocated memory budget.

## 3. Practical Approaches

Key strategies for Cgroup memory management with PostgreSQL:
- Calculate total memory budget based on Cgroup limits rather than system memory
- Reserve headroom for unexpected allocations and kernel overhead
- Monitor memory usage with `pg_stat_memory_usage` and Cgroup statistics
- Implement graceful degradation when approaching memory limits rather than letting OOM kill
- Use `memory.oom.group` and `memory.high` / `memory.max` for fine-grained control

## 4. Production Learnings

In Ping An's production environment, hundreds of PG instances run on shared physical hosts. Proper Cgroup configuration has proven essential for multi-tenant stability. Key lessons include: always allocate per-instance limits below the host total, monitor both PG-internal and system-level metrics, and set up alerting on memory pressure before OOM occurs.

## 5. Summary

Cgroup memory management is essential for stable PostgreSQL operations in cloud environments. Unlike CPU, memory overshoot is catastrophic — proper configuration, monitoring, and headroom are critical for production reliability.
