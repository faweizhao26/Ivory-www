---
slug: oracle-de-o
title: "A Deep Dive into IvorySQL's Oracle De-O Core Solutions"
authors: [矫顺田]
category: IvorySQL
image: img/blog/covers/oracle-de-o-en.png
tags: [IvorySQL, Oracle, Migration, Compatibility, PL/iSQL, De-O]
---

> Based on Jiao Shuntian's presentation at HOW 2026.

## 1. Background & Project Overview

### 1.1 The Challenge of De-O (De-Oracle)

Oracle has long served as the database foundation for enterprise core systems, especially in energy, telecom, and manufacturing industries. De-O migration faces four key challenges that directly determine project success:

- **Syntax incompatibility**: Requires massive application code changes.
- **Semantic behavior differences**: Programs run but produce incorrect results.
- **Asset reuse difficulty**: High cost of migrating PL/SQL business logic.
- **High operational complexity**: Inconsistent drivers and tools increase coordination overhead.

### 1.2 IvorySQL Project Overview

IvorySQL was initiated in 2021 by Inspur Software Group's HighGo, and donated to the OpenAtom Open Source Foundation in 2025 under the Apache 2.0 license. Its core positioning:

- **Positioning**: Not a standalone DBMS, but deep evolution based on PostgreSQL kernel, avoiding reinventing the wheel.
- **Mission**: Connect the world through open source, providing an open alternative to Oracle.
- **Goal**: Lower migration barriers while preserving PG ecosystem and sustainable upgrade paths.
- **Release rhythm**: Follows PG kernel releases, approximately 40 days; minor versions fix bugs, major versions deliver significant compatibility features.
- **Latest**: IvorySQL 5.3 (based on PostgreSQL 18.3). Note: [IvorySQL 5.4](https://github.com/IvorySQL/IvorySQL/releases/tag/IvorySQL_5.4) (PG 18.4) has been released.

### 1.3 Core Features & Community Progress

IvorySQL provides comprehensive Oracle compatibility covering common data types, character/time functions, NLS parameters, and built-in capabilities. Since v1.0 in December 2021, continuous updates now reach v5.4. The project offers full-platform packages for x86, ARM, MIPS, and LoongArch, plus Docker, K8s Operator, and browser-based online trials to lower evaluation barriers.

## 2. Core Architecture & Design Philosophy

### 2.1 Dual-Mode Design

IvorySQL uses a "dual-mode" architecture, specified at initialization via `initdb -m pg/oracle`:

- **PG Mode**: Fully compatible with native PostgreSQL.
- **Oracle Mode** (default): Provides Oracle-compatible syntax and enhanced features.
- **Dynamic switching**: Use `SET ivorysql.compatible_mode` to toggle modes in real-time without sacrificing stability on either side.

### 2.2 Dual Port & Dual Parser Design

- **Port 5432**: Native PostgreSQL compatibility.
- **Port 1521** (Oracle mode default): Enterprise Oracle syntax support, ready out of the box.

A patented isolation-level dual syntax parsing core adds an independent Oracle parser module, minimizing interference between PostgreSQL and Oracle syntax.

### 2.3 PL/iSQL Implementation

IvorySQL adds a `plisql` language entry in the `pg_language` system catalog to handle Oracle-style procedural language. The design reuses and evolves PostgreSQL's `plpgsql` mechanism rather than rewriting from scratch. Oracle mode initialization auto-registers related plugins and language capabilities through a plugin architecture that minimizes intrusion into the mainline kernel.

### 2.4 Five-Layer Compatibility Framework

1. **SQL Syntax Compatibility**: High-frequency DDL/DML, MERGE, q-quoting, LIKE, etc.
2. **Object & Stored Procedure Compatibility**: Packages, system views, object access patterns.
3. **Execution Semantics Compatibility**: NULL handling, empty-string-to-NULL, function details, boundary conditions.
4. **Procedural Language Compatibility**: Procedures, Functions, Cursors, anonymous blocks.
5. **Migration & Operations Tools**: Complete tool ecosystem.

## 3. Key Compatibility Features

### 3.1 SQL Syntax & Object Compatibility

- **Basic DDL/DML**: Table creation, modification, queries, and writes.
- **Package Compatibility**: Oracle-style custom packages, package bodies, enhanced management via `\dk`.
- **View syntax**: Reduced object-layer modification costs.

### 3.2 Semantic & Behavioral Compatibility — The Real Challenge

| Difference | Oracle Behavior | IvorySQL Handling |
|-----------|----------------|-------------------|
| NULL handling | Empty string = NULL | Aligns in compatible mode |
| Empty string vs NULL | Empty string treated as NULL | Reduces behavior drift |
| Function consistency | Same-named functions differ | Prioritizes high-frequency coverage |
| Date/Numeric | Format and precision affect results | Ensures core metric stability |

### 3.3 Advanced Feature Compatibility

- **Sequences & System Views**: CACHE/NOCACHE, SCALE, SESSION, GLOBAL options; NEXTVAL and CURRVAL; ALL_SEQUENCES, DBA_SEQUENCES, USER_SEQUENCES views.
- **Invisible Column**: Not shown in `SELECT *` by default; must be explicitly referenced.
- **XML Functions**: 11 new XML functions covering APPENDCHILDXML, UPDATEXML, EXISTSNODE.
- **System Views**: ALL_TAB_COLUMNS, ALL_CONSTRAINTS, ALL_INDEXES, DBA_/USER_ system views.

### 3.4 Future Feature Roadmap

- Autonomous Transaction
- ROWNUM pseudocolumn
- Outer Join (+) syntax
- Synonym
- Reverse Key Index, CREATE INDEX ONLINE
- Pivot/Unpivot, Trigger syntax, Bitmap Index, IOT

### 3.5 Testing & Quality Assurance

Dual-framework testing: Oracle test framework validates compatibility behavior alignment; PG test framework maintains kernel stability through mature verification.

## 4. Migration Practice & Methodology

### 4.1 Migration Toolchain

1. **Assessment**: Identify object differences, risks, and scope.
2. **Conversion**: Auto/semi-auto conversion of SQL, objects, and procedural logic.
3. **Integration**: JDBC, ODBC, libpq adaptation; PostGIS, FDW, pg_stat_statements verification; Kylin, UOS, Anolis compatibility.
4. **Operations**: Monitoring, backup, management, and daily delivery.

### 4.2 Full-Platform Delivery & Cloud-Native

Ready-to-use installation packages for all platforms. Docker images, K8s Operator for modern delivery. Comprehensive documentation, migration guides, FAQs, and best practices.

### 4.3 Case Study: Financial Core System Migration

A financial system involving general ledger and other core Oracle systems underwent deep compatibility with Oracle Packages, collection data types, system views, and partition indexes. After rigorous testing, performance and stability met requirements — proving compatibility capabilities directly translate to core business migration success.

## 5. Community Governance & Future Roadmap

### 5.1 Open Governance

Donated to the OpenAtom Open Source Foundation in 2025 for transparent governance. Code, testing, documentation, Issues, and PRs are all welcome contributions.

### 5.2 International Ecosystem Cooperation

A two-year MOU with France's Data Bene, which values PG compatibility, Oracle compatibility, and cloud-native advantages for Oracle migration projects.

### 5.3 IvorySQL 6.0 Preview

- Mar 2026: v5.3 (PG 18.3)
- Jun 2026: v5.4 (PG 18.4)
- Sep 2026: v5.5 (PG 18.5)
- Nov 2026: v6.0 (PG 19.0)
- Dec 2026: v6.1 (PG 19.1)

v6.0 highlights: Autonomous Transaction, ROWNUM, Rebuild Index, DBMS_OUTPUT, component adaptation.

### 5.4 2026 Product & Ecosystem Focus

- AI ecosystem integration
- New domestic platform certifications
- Cloud and containerized ecosystem
- Migration guides, tuning guides, industry solutions

### 5.5 Innovation Sandbox

Real-world feature incubation: logical replication with auto-identity for no-PK tables, safe DDL after view creation, global unique indexes on partitioned tables.
