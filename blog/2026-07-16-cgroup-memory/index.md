---
slug: cgroup-memory
title: "PostgreSQL Cgroup Memory Management in Cloud Environments"
authors: [刘智龙]
category: IvorySQL
image: img/blog/covers/cgroup-memory-en.png
tags: [PostgreSQL, Cgroup, Memory, Cloud, Linux, HOW2026]
---

> Based on Liu Zhilong's presentation at HOW 2026. Liu is a PG database expert at Ping An Technology.

## 1. Cgroup Memory Management Overview

### 1.1 Cgroup Basics

Cgroup (Control Group) is a Linux kernel mechanism for process group resource management — quota limits, isolation, and usage statistics for CPU, physical memory, I/O, and network. In cloud environments, multiple PG instances run on the same physical host, each managed via Cgroup — standard practice across cloud providers. Container technologies also rely on Cgroup for resource constraints.

### 1.2 The Fundamental Difference: CPU vs Memory Management

Cgroup's CPU and memory management logic is fundamentally different:

- **CPU**: Core mechanism is time allocation via timeslice rotation. Even at the CPU limit, tasks just run slower — they still execute.

- **Memory**: Core mechanism is page counting. Memory must be immediately available; working memory occupied by one task cannot be reused by another (except shared memory). When memory hits the limit, there's no "slow down" option — only reclamation or death.

The critical difference: hitting the CPU cap means slower execution. Hitting the memory cap means reclamation or termination.

### 1.3 Overselling in Cloud Environments

On shared cloud hosts, multiple Cgroup instances run concurrently. Sum all Cgroup limits and they may far exceed physical memory — "overselling." But for PG, overselling doesn't necessarily mean actual memory shortage — because Cache is reclaimable.

Actual memory usage falls into three categories: **private memory** (non-reclaimable), **shared memory** (PG Shared Buffers, shared by multiple processes, non-reclaimable), and **Cache** (file cache, reclaimable). When multiple instances have significant idle or reclaimable Cache space, real usage may not exceed limits even if the sum of quotas exceeds physical memory.

But scaling up or adding instances can push OS memory watermark thresholds, triggering aggressive Cache reclamation. Whose Cache gets reclaimed becomes a "luck of the draw" — potentially impacting critical instances and causing performance jitter.

### 1.4 PG Memory Layers on OS

PG process memory decomposes into three layers:
- **RSS (Resident Set Size)**: Divided into private and shared memory, generally non-reclaimable
- **Page Cache**: File cache, reclaimable
- **Kernel**: Kernel's own memory overhead

At the Cgroup level, each instance has an independent LRU list; reclamation only affects the local Cgroup, achieving resource isolation.

## 2. Page Counting & Statistical Pitfalls

### 2.1 Key Interface Files

Core files in Cgroup memory management:
- **memory.stat**: Detailed statistics for all memory categories — the primary observation entry point
- **memory.usage_in_bytes**: Not recommended for direct use; accurate usage requires manual calculation
- **cgroup.procs**: Must include all PG processes (postmaster, checkpointer, bgwriter, walwriter, backend, etc.)
- **memory.limit_in_bytes**: Defines the Cgroup memory cap

### 2.2 Core memory.stat Metrics

Using a real example: PG instance with `shared_buffers=64GB`, `shared_memory_type=mmap`, ~800 clients. Key metrics in memory.stat:

- `cache`: Page Cache size
- `rss`: Anonymous pages and Swap memory — **different from OS process RSS!**
- `mapped_file`: File shared memory size — **PG shared memory is counted here**
- `pgpgin / pgpgout`: Charged/uncharged page counts for RSS+Cache
- `inactive_anon / active_anon`: LRU distribution for anonymous pages and swap cache
- `inactive_file / active_file`: LRU distribution for file cache

### 2.3 Core Statistical Deviations

Manual calculation reveals Cgroup v1's statistical confusion:

```
shared_mem_mapped = inactive_anon + active_anon - rss
cache - shared_mem_mapped = inactive_file + active_file
rss + mapped_file = inactive_anon + active_anon
inactive_file + active_file + rss + mapped_file = rss + cache
```

- Cgroup v1's RSS **does not include file map shared memory**
- PG shared memory (whether mmap or sysv) is classified under `mapped_file`
- With huge pages, shared memory doesn't appear in ANY statistical metric (including `rss_huge`)

### 2.4 Process RSS vs Cgroup RSS

Sort PG processes by RSS: checkpointer and bgwriter typically have the largest RSS (60GB+ range) — because they frequently operate on Shared Buffers and occupy significant shared memory. Postmaster's RSS is much smaller since it only needs to create the shared memory virtual address space for child processes.

Examining `/proc/[pid]/smaps` reveals: checkpointer, bgwriter, and postmaster have identical shared memory virtual addresses, but different RSS. Forked child processes inherit the same virtual address mapping, but RSS only grows for processes that actually access corresponding physical pages.

### 2.5 How to Correctly Reproduce Cgroup OOM

Due to PG's Double Buffer architecture (Shared Buffers + Page Cache), with `shared_buffers = 1/4 × cg_mem` as typical config, Page Cache can occupy up to 3/4 of Cgroup memory. Normal business operations don't consume much private memory, so even at Cgroup memory saturation, the system can reclaim from Page Cache — the instance may not OOM.

**To effectively trigger Cgroup OOM, simply create many sessions consuming private memory (large sorts, Hash Joins, etc.), rather than flooding Page Cache with writes.** The latter only triggers Cache reclamation, not actual memory exhaustion.

## 3. Cgroup OOM Behavior & Impact

### 3.1 OOM Trigger Mechanism

Two scenarios:

**OOM Killer On**: Kernel selects the highest OOM Score process (typically a Backend user process) and sends SIGKILL. PG's postmaster detects abnormal child termination, and if shared memory is intact, auto-restarts a new process. Brief service interruption but instance-wide recovery possible. Logged in dmesg and PG logs.

**OOM Killer Off**: No kernel kill, but PG processes may hang due to memory allocation failure (state D, wait event `mem_cgroup_oom`). Critical processes like walwriter, if unable to obtain memory, can crash the entire instance. Even with OOM Killer off, the instance may still fail — not killed, but dead by resource starvation.

### 3.2 Key Distinctions

- Cgroup OOM ≠ System VM OOM. System-level VM OOM is independently judged by `vm.overcommit`
- With Cgroup v1's `memory.oom_control` off, OOM Killer doesn't start, but processes may still hang or crash due to memory shortage

## 4. Cgroup v1 Deficiencies & v2 Improvements

### 4.1 v1's Monitoring Blind Spots

- **No Page Table statistics**: High process counts can consume tens of GB in Page Tables, invisible in v1
- **No Slab statistics**: Kernel Slab memory overhead not tracked
- **No HugePage statistics**: Huge pages are a complete statistical black hole
- **Cannot distinguish async/sync reclamation**: `pgscan_kswapd` vs `pgscan_direct` indistinguishable at Cgroup granularity
- **Shared memory statistical chaos**: shmem and file_mapped mixed together
- **RSS statistical inconsistency**: Cgroup RSS ≠ process RSS

### 4.2 v2 Improvements

Cgroup v2 (Linux 4.5+) provides significant memory management enhancements:

**Management layer**: Clearer hierarchy, more intuitive configuration; new `memory.min/low/high` watermarks for fine-grained reclamation control; better spike handling; removes direct OOM Killer disable, replaced with gentler control; adds `memory_hugetlb_accounting` — finally tracking huge pages.

**Observation layer**: Adds Slab, Page Table, `pgscan_kswapd/direct`, `pgsteal_kswapd` metrics; new Socket, Vmalloc, Transparent Huge Pages, Zswap, zero-page swap dedicated statistics; **shmem and file_mapped indicators now separated**; huge page info finally observable.

## 5. Huge Pages: Management & Challenges

### 5.1 Advantages

Huge pages benefit PG stability and performance:
- Slightly improved TPS
- Reduced TLB (Translation Lookaside Buffer) refresh pressure, lower CPU cache contention
- **Significantly reduces Page Table size in main memory** — saves memory and accelerates virtual-to-physical address translation during reclamation
- Physical contiguity improves memory access locality
- Non-huge shared memory is theoretically OS-reclaimable; huge pages are not

### 5.2 Shared Buffers & Huge Pages Configuration

Setting `shared_buffers` to 1/4 of Cgroup memory is industry standard, but reality is more complex. Smaller `shared_buffers` slightly increases Page Cache (larger total cache); larger `shared_buffers` slightly reduces total cache but improves Shared Buffers hit rate. Both directions have trade-offs.

Based on actual stress testing and production experience, a more reliable recommendation:

- **Without huge pages**: `shared_buffers = min(1/4 × total_memory, 20GB)`
- **With huge pages**: `shared_buffers = min(1/4 × total_memory, 60GB)`

Read-heavy scenarios can increase, but must synchronously adjust bgwriter parameters (`bgwriter_delay`, `bgwriter_lru_maxpages`).

### 5.3 Management Challenges

**Statistical black hole**: In Cgroup v1, huge pages completely escape all metrics. An instance's Cgroup limit set to 20GB may actually occupy 30GB physical memory — monitoring shows everything normal. RDS monitoring memory metrics may be completely unreliable with huge pages.

**Resource planning difficulty**: Huge pages must be pre-allocated at boot, can't dynamically scale. Problems: mixed PG/MySQL deployments on same host have different huge page strategies; unknown instance count and specs; over-allocation means resources can't meet new instances' needs; under-allocation wastes memory.

## 6. Memory Fault Models & Troubleshooting

### 6.1 Fault Classification

Four layers of memory issues:

**OS layer**: Memory fragmentation, high Swap-in. Note: huge pages reduce fragmentation but may slightly worsen Swap-in.

**PG kernel layer**: Metadata bloat, version bugs.

**Cgroup layer**: Performance jitter from intra-Cgroup memory reclamation. Huge pages significantly improve this.

**Private memory layer**: Individual backend processes consuming excessive private memory (large result set sorts, Hash Joins), straining the overall Cgroup.

### 6.2 Monitoring Essentials

- **System layer**: `/proc/buddyinfo` for fragmentation; `/proc/meminfo` `si/so` for swap pressure; `/proc/vmstat` `pgscan_kswapd/pgscan_direct` for async/sync reclamation
- **Cgroup layer**: `memory.stat` metrics, noting v1/v2 differences
- **Process layer**: `ps` for per-process RSS/PSS; process wait events (`mem_cgroup_oom`)
- **Database layer**: `pg_stat_bgwriter` checkpoints and buffer allocation; IPC wait events

**For buffer hit rate, Read count matters more than Hit Rate.** High Hit Rate with high Read count means massive buffer read operations (probably due to large scan range) — this is ineffective cache competition; hit rate alone is misleading.

### 6.3 Leading Indicators

Common precursors: `page allocation failure`, prolonged high-CPU `kswapd`, frequent `direct reclaim`, process state D (uninterruptible sleep), increasing `malloc`-related wait events. OOM is the end result, always accompanied by process disappearance and log records.

## Summary

Cloud PG Cgroup memory management is far more complex than single-machine scenarios. Core conclusions:

1. **Migrate to Cgroup v2** to resolve shared memory stats, huge page stats, and reclamation observation blind spots
2. **Huge pages improve stability and performance**, but must pair with v2, otherwise create statistical black holes
3. **Cgroup OOM on/off both have risks**: ON — Backend killed but instance recovers; OFF — critical process may hang, instance unavailable
4. **Shared Buffers should not exceed 60GB** (with huge pages), beyond which flush pressure and non-huge page management costs escalate sharply
5. **Memory monitoring is about mastering real usage** — especially understanding the Cgroup RSS vs process RSS difference and shared memory statistical attribution
