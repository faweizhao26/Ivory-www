---
slug: fdw-pushdown
title: "Postgres_fdw Optimization: GUC Parameter Control for Join Pushdown"
authors: [Nickyoung]
category: IvorySQL
image: img/blog/covers/fdw-pushdown-en.png
tags: [PostgreSQL, Postgres_fdw, Pushdown, Optimization, GUC, HOW2026]
---

> Based on Yang Xiangbo's (PostgreSQL ACE) presentation at HOW 2026.

## 1. The Problem: A Local vs Remote SQL Performance Gap

A real production case: a SQL query executes in **17 milliseconds** on a local PostgreSQL instance, but through Postgres_fdw accessing a remote database, it takes **200 seconds** — over 10,000x slower.

Initial investigation naturally suspects network issues. But examining the execution plan via `EXPLAIN ANALYZE` reveals the true root cause.

On the remote side, the actual SQL executed had the original Join condition (e.g., `A.sid = B.id`) **not** correctly pushed down. Instead, the local `WHERE` filter (e.g., `xt = 1`) was incorrectly treated as the Join condition and pushed to the remote side. The result: the remote end returned massive intermediate data, while the actual Join was performed locally — performance naturally degraded catastrophically.

## 2. Root Cause: How Type Conversion Breaks Pushdown Logic

### 2.1 Postgres_fdw's Join Pushdown Mechanism

Postgres_fdw doesn't unconditionally push Join operations to the remote side. The optimizer comprehensively evaluates cost across four Join paths (Nestloop, Hash Join, Merge Join, and Foreign Join), selecting the optimal plan. Even with Foreign Join, pushdown isn't guaranteed — it still requires cost model comparison.

The core validation for pushdown conditions happens in the `is_foreign_expr` function, requiring:

- **Join type support**: Only Inner Join, Left Join, and specific types
- **Foreign table safety flag**: Must be marked as `safety`
- **Expression restrictions**: Join conditions across local and foreign tables cannot contain non-pushdown ops or functions
- **Final verification**: `is_foreign_expr` must return True

### 2.2 The Fault Chain in This Case

The SQL in question had a seemingly harmless pattern: both `A.sid` and `B.id` were explicitly cast to `text`. This type conversion node triggered a cascade:

1. `is_foreign_expr` detected the type conversion node, classified it in the "unknown or unsafe expression" branch (default branch), returning `False`
2. The originally valid Join condition (`A.sid = B.id`) was rejected for pushdown
3. In FDW's optimization logic, to avoid subquery issues, it attempts to merge other valid conditions into the Join clause
4. The only remaining valid condition was the local `WHERE xt = 1`, which was forcibly "disguised" as a Join condition and pushed to the remote end
5. The remote end executed with `xt = 1` as the Join condition, returning massive intermediate rows, while the actual table association was left to local execution

This is the root cause of the performance avalanche.

## 3. Solution: Using GUC Parameters to "Catch" Performance

### 3.1 Why a GUC Solution

Directly modifying SQL to remove type conversions is clearly the most thorough solution. But in practice, such patterns often involve legacy systems or third-party closed-source software — the SQL is outside the application owner's control. Modifying SQL isn't feasible.

This calls for a solution at the FDW kernel level.

### 3.2 Intervention Point & Implementation

The key optimization point: **intervene during the optimizer's Foreign Join Path generation phase**. Specifically, embed a GUC parameter switch within the path generation logic related to `add_foreign_join_paths`.

Implementation logic:

1. Add a new GUC parameter (e.g., `enable_fdw_join_pushdown`), defaulting to `on` (allow Join pushdown)
2. Before `is_foreign_expr` validation, check this parameter's state
3. If set to `off`, directly prevent Foreign Join path generation, forcing Joins to execute locally
4. The parameter can be dynamically modified at session level without database restart

### 3.3 Optimization Results

When the GUC parameter disables Join pushdown, the same SQL execution time drops from **200 seconds** to **79 milliseconds**. The execution plan shows: the remote end only performs base table filtered scans (`SELECT ... WHERE xt = 1`), pulling data back locally for Join — though abandoning the remote Join optimization opportunity, in this specific scenario, network transmission volume is far smaller than the intermediate result set from erroneous pushdown, dramatically improving overall performance.

**Performance improvement: ~3,000x.**

## 4. Lessons Learned

**First, when troubleshooting FDW performance issues, the primary step is to check the SQL actually executed on the remote side.** Local execution plans alone are insufficient. Use `EXPLAIN (VERBOSE, ANALYZE)` or check remote logs to confirm whether pushed-down SQL matches expectations.

**Second, type conversions on Join keys are a common FDW pushdown trap.** Type conversion nodes are judged as unsafe expressions by `is_foreign_expr`, causing otherwise valid Join conditions to be rejected for pushdown. When writing cross-database SQL, avoid explicit type conversions on Join keys whenever possible.

**Third, GUC parameters are effective rapid remediation tools.** When SQL-level changes are impossible, using kernel parameters to control optimizer behavior solves problems without application code changes. For cloud services or DBA operations teams, this "safety net" capability is especially valuable — recovering business first, then planning long-term solutions at leisure.

The GUC parameter added in this case is just a simple switch, but the underlying approach is worth promoting: many FDW-related performance issues can be addressed through similar "intervention point" designs, giving users more runtime control rather than baking all optimization decisions into hard-coded logic.
