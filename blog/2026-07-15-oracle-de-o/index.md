---
slug: oracle-de-o
title: "A Deep Dive into IvorySQL's Oracle De-O Solutions"
authors: [矫顺田]
category: IvorySQL
image: img/blog/covers/oracle-de-o-en.png
tags: [IvorySQL, Oracle, Migration, Compatibility, PL/iSQL]
---

> Based on Jiao Shuntian's presentation at HOW 2026.

## 1. Background & Overview

### 1.1 The Challenge of De-O (De-Oracle)

Oracle has long served as the database foundation for enterprise core systems, especially in energy, telecom, and manufacturing. De-O migration faces four key challenges: syntax incompatibility, semantic behavior differences, difficulty reusing PL/SQL assets, and complex operations across diverse tools.

## 2. IvorySQL's Oracle Compatibility Framework

### 2.1 Dual Parser Architecture

IvorySQL implements a dual parser approach: a PG Parser for native PostgreSQL syntax, and an Oracle Parser for Oracle-compatible SQL. At session start, the system selects the appropriate parser based on `ivorysql.compatible_mode`. This avoids the complexity of mixing Oracle and PG grammar in a single parser while keeping both modes cleanly separated.

### 2.2 Compatibility Layers

The framework spans multiple levels:
- **Syntax**: Oracle SQL syntax recognized by the Oracle parser
- **Types**: NUMBER, VARCHAR2, RAW, ROWID, and other Oracle native types implemented as first-class PG types
- **Functions**: SYSDATE, NVL, DECODE, ADD_MONTHS, and hundreds more
- **PL/iSQL**: Full Oracle PL/SQL block, procedure, function, and package support
- **Data Dictionary**: Oracle-style views (DBA_PROCEDURES, ALL_TAB_COLUMNS, etc.)
- **Session Semantics**: NLS parameters, empty string = NULL, identifier case rules

### 2.3 PL/iSQL & Package Support

IvorySQL's PL/iSQL is a complete Oracle PL/SQL-compatible language engine. Oracle packages are stored in dedicated system catalogs (`pg_package`, `pg_package_body`), integrating with PG's object system for dependency tracking, permission checks, and cache invalidation.

## 3. Evolution Path

The compatibility framework has evolved through multiple versions, from basic type and function support (v1-3) to PL/iSQL and packages (v4), to comprehensive Oracle compatibility with 21 new features in v5+. Each iteration deepens Oracle compatibility while maintaining PG ecosystem integration.

## 4. Migration Practice

IvorySQL's approach reduces the migration tax: rather than rewriting application code, the database itself adapts to Oracle-expected behavior. This means stored procedures, implicit conversions, data dictionary queries, and session semantics work closer to what Oracle-experienced systems expect.

## 5. Summary

IvorySQL's Oracle compatibility isn't a surface-level SQL mapper — it's a kernel-level framework that addresses the real pain points of enterprise Oracle migration: syntax, semantics, stored logic, and data dictionary dependencies. The dual parser architecture keeps PG mode clean while enabling deep Oracle compatibility when needed.
