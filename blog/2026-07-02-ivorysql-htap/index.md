---
slug: ivorysql-htap
title: "IvorySQL HTAP Real-Time Lakehouse Access Engine"
authors: [陶郑]
category: IvorySQL
image: img/blog/covers/ivorysql-htap.png
tags: [IvorySQL, HTAP, DuckDB, PostgreSQL, Lakehouse, Mooncake]
---

> This article is based on Tao Zheng's (IvorySQL Core Contributor) presentation at HOW 2026.
> Video replay: https://www.youtube.com/watch?v=n2GZRLCiabg

## 1. The Evolution of Data Architecture

### 1.1 Limitations of Traditional Architecture

Business data must flow through multiple systems before analysis. Two main architectures dominate:

- **Linear Architecture**: data enters transactional databases → ETL → data lake → data warehouse → AI query. Long pipeline, many processing steps.
- **Variant Architecture**: data is written simultaneously to transactional and analytical databases, but AI queries still cross multiple systems.

Both face common challenges: complex processing pipelines creating minutes-to-hours latency; data fragmentation between queries; high multi-system operational costs.

### 1.2 Three Generations of Evolution

- **Gen 1 (2000s — Data Warehouse)**: Designed for specific business needs, but costly to restructure when new analysis requirements emerge.
- **Gen 2 (2010s — Data Lake)**: Reduced storage costs by storing raw data in cheap lakes, but increased pipeline complexity.
- **Gen 3 (circa 2020 — Lakehouse)**: Merged warehouse and lake benefits, but fundamentally still a two-system combination.

### 1.3 Native HTAP: The Next-Generation Architecture

The latest trend is moving from "lakehouse" to "native HTAP"—storing transactional and analytical data in a single database, eliminating ETL entirely.

| Dimension | Lakehouse | Native HTAP |
|-----------|----------|-------------|
| Storage base | Object storage | Unified high-performance storage engine |
| Data freshness | Minutes/hours | Seconds/milliseconds |
| Core capability | Lake + warehouse features | Database with warehouse capacity |

A single database, single API for AI, no cross-database queries, lower operational costs, real-time data.

## 2. Three Pain Points of Traditional Architecture in the AI Era

- **Pain Point 1: Unpredictable query patterns** — Agent-generated queries are random; traditional architectures can't efficiently handle both point queries and aggregations simultaneously.
- **Pain Point 2: Data freshness sensitivity** — ETL latency means data may change between queries, unacceptable in risk control, recommendation, and finance.
- **Pain Point 3: Cross-system latency stacking** — When a single task requires both point queries and aggregations, cross-system latency compounds.

## 3. Native HTAP: Industry Trends & IvorySQL's Positioning

### 3.1 Industry Signals: Databricks' Two Key Acquisitions

- **May 2025 — Acquired Neon**: Serverless PostgreSQL provider, signaling OLAP giants entering OLTP.
- **October 2025 — Acquired Mooncake Labs**: Core project pg_mooncake embeds DuckDB's columnar engine into PostgreSQL, enabling HTAP without ETL. IvorySQL's solution is built on pg_mooncake.

### 3.2 Two Gaps Left by pg_mooncake

- **Gap 1: Open-source maintenance void** — Updates slowed significantly after acquisition. The community needs a vendor-independent implementation.
- **Gap 2: Oracle migration capability gap** — pg_mooncake never considered Oracle compatibility, yet many Chinese enterprises still run core data on Oracle.

### 3.3 IvorySQL's Position

IvorySQL is an open-source PostgreSQL fork, community-maintained, fully PostgreSQL-compatible, with Oracle syntax, data type, and function support. Its HTAP engine:
- Fills Gap 1: Independently maintained pg_mooncake evolution, community-driven roadmap
- Fills Gap 2: Full HTAP capabilities in Oracle migration scenarios
- Real-time lakehouse access engine: one dataset, two query paths, real-time availability

## 4. Technical Architecture

### 4.1 Row vs. Column Storage

PostgreSQL uses row storage — ideal for transactions. Column storage organizes data by column — ideal for large-scale aggregation. HTAP combines both, automatically selecting the optimal execution path based on query characteristics.

### 4.2 Core Architecture

**Smart routing**: Embedded via PostgreSQL hooks (non-invasive), the Planner identifies query patterns and routes to row store (OLTP) or column store (OLAP).

**Dual storage engines**: Row store uses PG Heap files (OLTP); column store uses DuckDB + Parquet format (OLAP).

**In-memory sharing & auto-sync**: The same data is accessible through both row and column paths. Columnar data persists in Parquet format; synchronization between stores is automatic and real-time, completely transparent to the application layer.

### 4.3 Why ETL is Eliminated

Traditional: Database → ETL → Warehouse (minutes-to-hours delay). Native HTAP: one copy of data, two access paths — no ETL, no delay.

### 4.4 Write Path & Query Routing

1. Application SQL: standard SQL, no modifications needed
2. PostgreSQL query layer: Parser → Planner → Executor, pg_mooncake embedded via hooks
3. Auto routing: Planner identifies query type, auto-selects optimal path
4. Dual engine execution: row → PG Heap; column → DuckDB + Parquet
5. Auto sync: data remains unified across both stores

## 5. Application Scenarios

### Scenario 1: Oracle Data Warehouse Migration

Oracle types, syntax, and function behaviors are fully compatible. HTAP capabilities arrive with migration — no need to rebuild the analytics pipeline.

### Scenario 2: AI Agent Mixed Queries

Point queries go through row store, aggregations through column store — one connection for everything. Real-time consistent data, improved Agent response and decision quality.

### Scenario 3: Real-Time Risk Control

Transactions written while column store queries simultaneously. Risk rules trigger in real time, dropping from minutes to sub-second latency.

## 6. Open Source Release Plan

- **Release**: Planned alongside IvorySQL 6.0
- **Components**: Three core modules — ivy_mooncake, ivy_duckdb, ivy_moonlink

> Note: A preview version [1.0 beta1](https://github.com/IvorySQL/ivy_mooncake/releases/tag/IvorySQL_1.0_beta1) is already available.

## 7. Summary

The IvorySQL HTAP Real-Time Lakehouse Access Engine is a strategic move by the IvorySQL community in database architecture evolution. Built on pg_mooncake and validated by industry leaders like Databricks, it fills the twin gaps of independent open-source maintenance and Oracle migration capabilities. Through row-column store fusion, smart routing, and automatic synchronization, it achieves real-time unification of transactions and analytics in a single database — delivering practical solutions for AI Agent queries, real-time risk control, and Oracle migration. With the open-source release of version 6.0, the IvorySQL community will provide enterprises with a truly open, independently evolvable, Oracle-compatible HTAP infrastructure.
