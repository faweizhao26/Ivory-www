---
slug: oracle-de-o
title: "深度拆解 IvorySQL 去 O 核心解决方案"
authors: [矫顺田]
category: IvorySQL
image: img/blog/covers/oracle-de-o-zh.png
tags: [IvorySQL, Oracle, Migration, Compatibility, PL/iSQL]
---

<!-- truncate -->

# 深度拆解 IvorySQL 去 O 核心解决方案

> 本文整理于 HOW 2026 矫顺田演讲内容。

## 1. 背景与项目概况

### 1.1 Oracle去O的需求与挑战

Oracle长期作为企业核心业务系统的数据库基座，尤其在能源、电信、制造等行业占据主导地位。在“去O”迁移过程中，主要面临以下四类阻力，直接决定迁移项目的成败：

- **语法不兼容**：导致应用代码需大量改动。
- **语义行为差异**：导致程序虽能运行但结果错误。
- **资产难以复用**：PL/SQL业务逻辑迁移成本高。
- **运维复杂度高**：驱动、工具不统一增加协同难度。

### 1.2 IvorySQL项目概况

IvorySQL于2021年由浪潮软件集团瀚高股份发起，2025年正式捐献给开放原子开源基金会，遵循Apache 2.0开源协议。其核心定位与特点包括：

- **定位**：并非独立DBMS，而是基于PostgreSQL内核深度演进，避免重复造轮子。
- **使命**：用开源连接世界，提供Oracle替代的开放方案。
- **目标**：降低迁移门槛，保留PG生态与可持续升级路径。
- **版本节奏**：紧跟PG内核发布，约40天跟随PG最新版本发版；小版本修复Bug，大版本发布重大兼容特性。
- **最新版本**：IvorySQL 5.3（基于PostgreSQL 18.3）。

> 注：目前已发布 [IvorySQL 5.4](https://github.com/IvorySQL/IvorySQL/releases/tag/IvorySQL_5.4)（基于 PostgreSQL 18.4）

### 1.3 核心特性与社区进展

IvorySQL提供全面灵活的Oracle兼容功能，覆盖常见数据类型、字符/时间函数、NLS参数等内置能力。社区自2021年12月发布1.0版本以来，已持续更新至5.4版本。项目提供全平台介质包，支持x86、ARM、MIPS、LoongArch等主流环境，并通过Docker镜像、K8s Operator及浏览器在线体验等方式降低用户评估门槛。


## 2. 核心架构与设计理念

### 2.1 双模式设计

IvorySQL采用“双模式”架构，初始化时通过`initdb -m pg/oracle`指定两种模式：

- **PG模式**：保持与原生PostgreSQL完全兼容。
- **Oracle模式**（默认）：提供Oracle兼容语法及增强功能。
- **动态切换**：可通过 `SET ivorysql.compatible_mode` 语句实时动态切换模式，互不牺牲稳定性。

### 2.2 双端口与双解析器设计

IvorySQL提供双端口协同解析架构：

- **5432端口**：原生PostgreSQL兼容，保障业务无缝迁移。
- **1521端口**（Oracle模式默认端口）：企业级Oracle语法支持，开箱即用。

在此基础上，采用专利级隔离的双语法解析核心，通过新增Parser模块处理Oracle语法，最大限度降低PostgreSQL与Oracle语法间的相互干扰。

### 2.3 PL/iSQL的实现思路

IvorySQL在系统表`pg_language`中新增`plisql`语言，用于承接Oracle风格过程语言。其设计思路是复用并演进PostgreSQL的`plpgsql`机制，而不是完全重写。Oracle模式初始化时自动注册相关插件与语言能力，通过插件式架构降低对主线内核的侵入度。

### 2.4 五层兼容体系

IvorySQL的兼容体系分为五个层次，前两层解决“能否跑起来”，后三层解决“跑得对不对、好不好”：

1. **SQL语法兼容**：覆盖高频DDL/DML，如表创建、修改、查询及MERGE、q转义、LIKE等Oracle语法表达。
2. **对象与存储过程兼容**：支持Package、系统视图及对象访问习惯。
3. **执行语义兼容**：对齐NULL处理、空串转NULL、函数细节与关键边界条件。
4. **过程语言兼容**：适配Oracle执行模型，支持Procedure、Function、Cursor、匿名块等核心能力，与PL/pgSQL共存。
5. **迁移与运维工具**：工具生态的完整闭环。


## 3. 关键兼容特性详解

### 3.1 SQL语法与对象兼容

- **基础DDL/DML**：覆盖建表、修改、查询、写入等典型迁移语句。
- **Package兼容**：支持Oracle自定义包的功能，包括包和包体的创建、修改和描述，并通过`\dk`等增强命令提升包管理体验。
- **View等对象语法**：降低对象层改造成本。

### 3.2 语义与行为兼容——真正的难点

语义行为差异是迁移中最隐蔽的风险。Oracle与PostgreSQL在以下方面存在关键差异：

| 差异点 | Oracle习惯 | IvorySQL处理 |
|--------|-----------|--------------|
| NULL处理 | 空字符串按NULL处理 | 兼容模式下对齐Oracle行为 |
| 空串 vs NULL | 空串视为NULL | 通过兼容逻辑减少行为偏移 |
| 函数一致性 | 同名函数细节不同 | 优先覆盖高频函数并持续验证 |
| 日期/数值 | 格式、精度影响业务结果 | 重点保障核心口径稳定 |

> 语句能解析，只是迁移的开始；结果是否一致，才决定业务是否敢切换。

### 3.3 高级功能兼容

- **序列与系统视图**：支持CACHE/NOCACHE、SCALE、SESSION、GLOBAL等选项，兼容NEXTVAL和CURRVAL伪列使用习惯，提供ALL_SEQUENCES、DBA_SEQUENCES、USER_SEQUENCES视图。
- **Invisible Column（不可见列）** ：默认不出现在`SELECT *`结果中，需显式引用，适合应用升级过程中平滑增加列。
- **XML函数**：新增11个XML函数，覆盖APPENDCHILDXML、UPDATEXML、EXISTSNODE等高频函数，增强企业对XML数据的处理能力。
- **系统视图与元数据**：路线规划中包含ALL_TAB_COLUMNS、ALL_CONSTRAINTS、ALL_INDEXES等常用视图，兼容DBA_/USER_体系。

### 3.4 未来高级特性规划

IvorySQL计划持续补齐以下高级特性：

- 自治事务（Autonomous Transaction）
- ROWNUM伪列
- Outer Join（+）语法
- Synonym（同义词）
- Reverse Key Index、CREATE INDEX ONLINE
- Pivot/Unpivot、Trigger语法、Bitmap Index、IOT等

### 3.5 测试框架与质量保障

IvorySQL建立了双框架协同的测试体系：

- **Oracle test framework**：用Oracle侧测试保障关键兼容点行为对齐。
- **pg test framework**：复用PG侧成熟验证体系，保持内核稳定性。
- 通过工程化测试减少“能跑但不一致”的风险。


## 4. 迁移实践与方法论

### 4.1 迁移工具链闭环

IvorySQL将迁移过程划分为四个阶段：

1. **评估阶段**：识别对象差异、风险点与改造范围。
2. **转换阶段**：完成SQL、对象与过程逻辑的自动或半自动转换。
3. **接入阶段**：适配JDBC、ODBC、libpq等驱动，验证PostGIS、FDW、pg_stat_statements等生态组件，适配Kylin、UOS、Anolis等国产环境。
4. **运维阶段**：完成监控、备份、管理与日常交付闭环。

### 4.2 全平台交付与云原生能力

IvorySQL提供开箱即用的全平台安装包，降低部署摩擦。在云原生方面，通过Docker镜像、K8s Operator等方式适配现代交付模式。同时提供完善的文档、迁移指南、FAQ及最佳实践，支撑规模化推广。

### 4.3 案例：金融核心系统迁移实践

某金融系统涉及总账等多个核心系统的Oracle替换需求。项目中深度兼容Oracle Package、集合数据类型、系统视图和分区索引。经过严格测试，新平台性能指标与稳定性指标达到预期要求。实践证明，兼容能力能够直接转化为核心业务迁移成功率。


## 5. 社区治理与未来路线

### 5.1 社区治理与开放协作

IvorySQL于2025年捐赠给开放原子开源基金会，治理结构更公开透明。社区欢迎代码、测试、文档、Issue、PR等多类型贡献，GitHub Project与公开协作流程提升了全球开发者协同效率。文档、论坛、FAQ、最佳实践共同构成社区支撑体系。

### 5.2 生态合作与国际化

IvorySQL与法国Data Bene签署为期两年的MOU（合作备忘录）。Data Bene看重的是PG高兼容接入能力以及Oracle兼容与云原生优势，将在Oracle迁移项目中推广IvorySQL并参与社区能力建设。这说明兼容体系正在从国内项目走向国际生态合作。

### 5.3 IvorySQL 6.0预览与版本规划

2026年版本规划如下：

- 2026年3月：IvorySQL v5.3（PG 18.3）
- 2026年6月：IvorySQL v5.4（PG 18.4）
- 2026年9月：IvorySQL v5.5（PG 18.5）
- 2026年11月：IvorySQL v6.0（PG 19.0）
- 2026年12月：IvorySQL v6.1（PG 19.1）

IvorySQL 6.0重点功能包括：
- **自治事务**：在主事务中独立开启的子事务，可独立提交或回滚。
- **ROWNUM**：Oracle伪列，用于返回查询结果集中每一行的行号。
- **Rebuild index**：重建索引以消除碎片、释放空间。
- **DBMS_OUTPUT**：用于在程序中输出调试信息。
- 组件适配：wal2json、pgbouncer、pg_ai_query、pg_textsearch等。

### 5.4 2026年产品与生态重点

- **AI生态打造**：推动数据库能力与AI/Agent场景融合。
- **新增国产平台适配**：继续扩展认证与适配覆盖面。
- **云及容器化完整生态**：各版本持续提供云原生适配能力。
- **文档与解决方案**：建设迁移指南、调优指南、最佳实践与行业方案。

### 5.5 IvorySQL创新试验田

IvorySQL面向真实业务需求的功能孵化平台，汇聚国内客户痛点与前沿实践，将社区暂未接纳的优秀方案快速落地：

- **逻辑复制新增表无主键**：自动添加identity属性，避免报错中断。
- **创建视图后修改表结构**：允许在视图语义仍有效的前提下安全变更。
- **全局唯一索引**：在分区表上创建跨所有分区的唯一约束。