---
slug: fdw-pushdown
title: "Postgres_fdw Optimization: GUC Parameter Control for Join Pushdown"
authors: [Nickyoung]
category: IvorySQL
image: img/blog/covers/fdw-pushdown-en.png
tags: [PostgreSQL, Postgres_fdw, Pushdown, Optimization, HOW2026]
---

> Based on Yang Xiangbo's (PostgreSQL ACE) presentation at HOW 2026.

## 1. The Problem: SQL Performance Gap

A real production case: a SQL query executes in **17 milliseconds** on a local PostgreSQL instance, but when accessing the same data through Postgres_fdw, it takes **200 seconds** — over 10,000x slower.

Initial suspicion falls on network latency. But an `EXPLAIN ANALYZE` reveals the real issue: the original Join condition (`A.sid = B.id`) was not correctly pushed down. Instead, the local `WHERE` filter was incorrectly treated as the Join condition and pushed to the remote side. The result: massive intermediate data shipped back, with the actual Join performed locally.

## 2. Root Cause: How Type Conversion Breaks Pushdown

When the remote table's column type doesn't exactly match the local foreign table definition, PostgreSQL introduces implicit type casts. These casts appear in the query plan and prevent Postgres_fdw from recognizing that a join condition can be safely pushed to the remote server.

## 3. Solution: GUC-Controlled Type Casting

The solution involves a GUC parameter that controls how type casts are handled during query planning for foreign tables. By configuring this parameter appropriately, the unnecessary type casts are eliminated from the execution path, allowing Postgres_fdw to properly recognize and push down join conditions.

## 4. Performance Impact

After applying the fix, the previously 200-second query returns to sub-second performance. The key metrics: remote data transfer drops from gigabytes to kilobytes, and local CPU usage normalizes as the heavy lifting is performed on the remote server where the data resides.

## 5. Summary

Postgres_fdw join pushdown is sensitive to type compatibility. When performance degrades dramatically, check the execution plan for implicit casts. The GUC parameter approach provides a clean solution without requiring schema changes on either side.
