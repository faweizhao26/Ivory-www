---
slug: oracle-compat-kernel
title: "Oracle 为什么能跑在 PostgreSQL 上？答案藏在这套内核里"
authors: [ZhangChen]
category: IvorySQL
image: img/blog/covers/oracle-compat-kernel-zh.png
tags: [IvorySQL, Oracle, PostgreSQL, Kernel, PL/iSQL, Migration]
---

这几年，越来越多企业开始认真评估从 Oracle 迁移到 PostgreSQL。迁移的原因显而易见，商业数据库授权成本高，厂商绑定重，国产化和开源替代压力也在增加。PostgreSQL 本身足够成熟，生态也足够活跃，那么从 Oracle 迁移到 PG 看起来似乎是顺理成章的。但真正进到迁移项目里，大家很快会发现，难点往往不在数据迁移，而在 Oracle 长年给用户养成的数据库使用习惯。

一个老系统里，Oracle 通常不只是存表。大量业务逻辑写在存储过程、函数、触发器和 Package 里；SQL 里到处是 `ROWNUM`、`SYSDATE`、`DUAL`、`NUMBER`、`VARCHAR2`；应用和报表工具会查 `ALL_TAB_COLUMNS`、`DBA_PROCEDURES` 这类数据字典；还有空字符串等于 NULL、隐式类型转换、大小写规则、NLS 参数这些平时不显眼但十分影响结果的细节。

这就是企业从 Oracle 迁到 PG 时最痛苦的地方：如果完全按 PostgreSQL 语法进行改造，应用改造量会很大，测试周期会被拉长，业务风险也难控制；如果只在外层做 SQL 改写，又很难覆盖存储过程、包、数据字典。

IvorySQL 的出现完美解决了这个问题，它是 PG 生态中高度兼容 Oracle 的内核，并且紧跟社区最新版本，最重要的是，它开源免费。

## 一、IvorySQL 是什么

IvorySQL 是基于 PostgreSQL 的开源数据库项目，目标是在保留 PG 内核能力和生态兼容性的基础上，提供更深入的 Oracle 兼容能力。它不是重新写一个数据库，也不是在应用层做 SQL 字符串替换，而是在 PostgreSQL 内核、扩展和系统对象层面补齐 Oracle 应用迁移时经常依赖的行为。

从项目结构看，IvorySQL 的兼容范围不只在 SQL 语法。它包括 Oracle 模式入口、独立 Oracle parser、Oracle 数据类型、隐式转换、PL/iSQL、Package、内置函数、内置包、系统视图、`ROWNUM`、`ROWID`、`FORCE VIEW`、MERGE 语义、序列行为，以及 NLS、空字符串、标识符大小写等会话级差异。

这也是它和普通兼容层最大的区别。IvorySQL 更关注"你的应用能不能按原来的业务代码运行"。企业迁移 Oracle 时，表数据迁移通常不是最难的那部分，难的是数据库里那些多年积累的存储过程、包、隐式转换和数据字典依赖。IvorySQL 正是把这些问题统统归纳到数据库内核中进行处理，让业务层尽量少动刀子。

## 二、从源码看 IvorySQL 是怎么兼容 Oracle 的

IvorySQL 的兼容入口，首先在模式隔离上。

`src/include/utils/ora_compatible.h` 定义了数据库类型和 parser 类型。数据库模式有 `DB_PG` 和 `DB_ORACLE`，解析模式有 `PG_PARSER` 和 `ORA_PARSER`。Oracle 模式下还定义了专门的搜索路径：

```c
#define ORA_SEARCH_PATH "sys,\"$user\", public"
```

`sys` 放在前面，是为了让 Oracle 兼容对象优先被找到。比如 `NUMBER`、`SYSDATE`、`DBMS_OUTPUT`、`ALL_TAB_COLUMNS` 这些对象，在迁移应用里往往会直接出现。如果搜索路径不对，后面的类型、函数、包和数据字典视图就会变成零散补丁。

模式切换的核心在 `src/backend/utils/misc/ivy_guc.c`。这里有两个重要变量：

```c
int database_mode = DB_PG;
int compatible_db = PG_PARSER;
```

`ivorysql.database_mode` 记录当前数据库按 PG 还是 Oracle 使用，`ivorysql.compatible_mode` 决定当前会话用 PG parser 还是 Oracle parser。`check_compatible_mode()` 会阻止不合法切换。比如普通 PG 数据库不能随意打开 Oracle parser；进入 Oracle 模式之前，还要确认 `ivorysql_ora` 兼容库已经加载，并且能找到 `ora_raw_parser`。

真正切换 parser 的动作在 `assign_compatible_mode()`。进入 Oracle 模式时，它把 `sql_raw_parser` 指向 `ora_raw_parser`；切回 PG 模式时，再恢复到 `standard_raw_parser`。同一段逻辑还会切换 MERGE 相关 hook，并调整 search_path。

连接层也配合了这套设计。`src/backend/main/main.c` 的帮助信息里有两类端口：`-p PORT` 对应 PostgreSQL 模式，`-o PORT` 对应 Oracle 模式。`postmaster.c` 解析 `-o` 参数，`backend_startup.c` 根据连接端口设置 `connmode`，`postgres.c` 里的 `InitIvorysql()` 再根据连接模式设置 `ivorysql.compatible_mode`。同一个内核可以接 PG 客户端，也可以接 Oracle 迁移客户端，但两边从会话入口就已经分开。

第二个核心点是双 parser。`src/backend/parser/parser.c` 里有这两个指针：

```c
raw_parser_hook_type sql_raw_parser = standard_raw_parser;
raw_parser_hook_type ora_raw_parser = NULL;
```

`raw_parser()` 不再固定调用 PostgreSQL parser，而是调用 `(*sql_raw_parser)`。默认情况下，它指向 `standard_raw_parser`；进入 Oracle 模式后，指针切到 `ora_raw_parser`。Oracle parser 的注册在 `src/backend/oracle_parser/liboracle_parser.c`，模块初始化时 `_PG_init()` 会把 `ora_raw_parser` 设置为 `oracle_raw_parser`。`oracle_raw_parser()` 使用 Oracle 自己的 scanner、关键字表和 grammar。

这个选择很重要。Oracle SQL 和 PostgreSQL SQL 差别不小，尤其是匿名块、PL/SQL、Package、过程调用、类型声明这些地方。如果把 Oracle 语法全部硬塞进 PG 原来的 grammar，短期可能能快速堆功能，长期维护会非常痛苦。IvorySQL 让两套 parser 在 raw parse 阶段分流，后面再进入 PostgreSQL 的分析、重写、优化和执行框架。它没有重写一个数据库内核，而是把 Oracle 语法接到 PG 内核的后半段继续处理。

语义分析阶段，IvorySQL 开始处理那些不能只靠 parser 解决的问题。`ROWNUM` 是很典型的例子。Oracle 里的 `ROWNUM` 不是普通列，也不是 PostgreSQL 的窗口函数。它什么时候赋值，和 scan、qual、排序、limit 的时机有关。写一个 `rownum()` 函数解决不了这个问题。

IvorySQL 在 `src/backend/parser/parse_expr.c` 中处理未限定的 `rownum`。Oracle 模式下，表达式里出现 `rownum` 会生成 `RownumExpr`，而不是按普通列名解析。执行阶段则在 `src/backend/executor/execExprInterp.c` 和 `src/include/executor/execScan.h` 里配合处理：`ExecEvalRownum()` 从 executor state 读取 `es_rownum`，scan 时在合适的位置递增；如果 qual 没通过，还要回退计数。包含 rownum 的投影也要特殊处理，否则值的时机会错。

优化器也做了有限改写。`src/backend/optimizer/plan/planner.c` 会把一部分简单的 `ROWNUM <= N`、`ROWNUM = 1`、`ROWNUM < N` 转成 `LIMIT`。但代码没有把所有 rownum 条件都改掉，因为复杂查询里 Oracle `ROWNUM` 和 PostgreSQL `LIMIT` 的生效时机并不完全等价。这里的原则很实在：能保证语义一致才优化，不能保证就保留原行为。

类型系统是另一块重头戏。IvorySQL 在 `src/include/catalog/pg_type.dat` 中加入了多种 Oracle 兼容类型，主要放在 `sys` 命名空间下，例如 `number`、`binary_float`、`binary_double`、`blob`、`clob`、`raw`、`long`、`long_raw`、`rowid`、`urowid`、`yminterval`、`dsinterval`。这些类型不是只有名字。`contrib/ivorysql_ora/src/datatype/datatype--1.0.sql` 里还补了输入输出函数、typmod、cast、operator、btree/hash/brin opclass、比较函数和排序支持。

类型兼容必须做到这一层才有意义。一个类型如果不能建表、建索引、参与比较、参与排序、作为函数参数传递，在业务里很快就会露馅。Oracle 应用里大量字段和过程参数依赖 `NUMBER`、`RAW`、LOB、日期间隔类型，单纯把名字映射成 PG 类型远远不够。

隐式转换也必须处理。`contrib/ivorysql_ora/src/datatype/compatible_oracle_precedence.c` 实现了 Oracle 数据类型优先级 hook。`src/backend/parser/parse_oper.c` 在找不到合适操作符时，会在 Oracle 模式下调用这段逻辑。比如字符串参与数值运算时，Oracle 会按自己的规则尝试转成 `NUMBER`，而 PostgreSQL 原生规则更严格。IvorySQL 只在 Oracle 模式下介入，让迁移 SQL 更接近 Oracle 行为，同时不改变 PG 模式的类型解析习惯。

再往上，是空字符串、大小写和 NLS 这类看起来小但很容易改坏业务结果的差异。Oracle 把空字符串当成 `NULL`，PostgreSQL 不这么做。IvorySQL 在 `ivy_guc.c` 里提供了 `ivorysql.enable_emptystring_to_NULL`。Oracle 未引用标识符通常转大写，PG 则转小写，所以 IvorySQL 又提供 `ivorysql.identifier_case_switch`，并在 Oracle parser 和标识符引用逻辑里配合。NLS 参数也在 `ivy_guc.c` 中，包括日期语言、日期格式、时间戳格式、数值字符和长度语义。

PL/iSQL 和 Package 是 Oracle 兼容里最硬的一块。IvorySQL 在 `src/pl/plisql/src` 下实现 PL/iSQL。系统语言定义在 `src/include/catalog/pg_language.dat`，`plisql` 有自己的 call handler、inline handler 和 validator。

Package 没有被当成普通文本存起来。IvorySQL 新增了 `pg_package` 和 `pg_package_body` 两张系统 catalog。`pg_package` 记录包规格，`pg_package_body` 记录包体，它们有自己的索引和 syscache。这意味着 Package 被纳入 PostgreSQL 的系统对象体系，可以参与对象查找、权限检查、依赖记录和缓存失效。

`src/backend/parser/parse_package.c` 负责 package 里的类型、变量和函数查找。代码里会先判断当前是不是 `ORA_PARSER`，不是 Oracle 模式时，很多 package 查找不会继续跑。缓存处理在 `src/backend/utils/cache/packagecache.c`，`PackageCache` 放在 `CacheMemoryContext`，并通过 syscache callback 在 package 或 package body 变化时失效，同时联动 plan cache。

兼容对象层面，IvorySQL 通过 `ivorysql_ora` 扩展和 `sys` schema 提供了大量 Oracle 函数、包和系统视图。`contrib/ivorysql_ora/src/builtin_functions/builtin_functions--1.0.sql` 里有 `sysdate`、`systimestamp`、`add_months`、`last_day`、`months_between`、`next_day`、`to_date`、`to_timestamp`，也包括正则函数和 `substrb`、`instrb` 这类按字节处理的字符串函数。`contrib/ivorysql_ora/src/builtin_packages` 下有 `dbms_output`、`dbms_lock`、`dbms_utility`、`utl_file` 等内置包。`contrib/ivorysql_ora/src/sysview/sysview--1.0.sql` 则提供 `SYS.DBA_PROCEDURES`、`SYS.ALL_TAB_COLUMNS` 等 Oracle 风格数据字典视图。

还有一些兼容点分布在更具体的位置。`FORCE VIEW` 在 `src/backend/commands/view.c`、`parse_relation.c`、`ruleutils.c` 中配合处理，支持先创建暂时无法编译通过的视图，等依赖对象出现后再编译。MERGE 通过 `contrib/ivorysql_ora/src/ivorysql_ora.c` 注册相关 hook，只在 Oracle 模式下接管部分 transform 和执行逻辑。序列差异在 `src/backend/commands/sequence.c` 中处理。`ROWID` 和 `UROWID` 更底层，还涉及 `relhasrowid`、tuple descriptor 里的 `tdhasrowid`，以及执行器和 junk filter。

把这些点连起来看，IvorySQL 的兼容路径不是"在外面糊一层 Oracle 方言"。它把 Oracle 应用真正依赖的行为，放进 PostgreSQL 内核里相对合适的位置：语法交给 parser，类型交给 catalog 和类型推导，Package 交给系统目录和缓存，`ROWNUM` 交给执行器，数据字典交给系统视图，函数和包交给扩展对象。这种做法工作量大，但边界比简单字符串改写可靠得多。

## 三、兼容 Oracle 为什么不会对性能产生影响

严格说，任何功能只要被使用，就一定有它自己的执行成本。Oracle 模式下使用 Oracle 类型、Oracle 函数、PL/iSQL、Package、LOB、复杂日期格式解析，这些功能不可能完全没有代价。这里说"不会对性能产生影响"，更准确的意思是：IvorySQL 的 Oracle 兼容设计不会让普通 PG 查询平白多跑一层 Oracle 逻辑，也不会把 Oracle 兼容变成所有会话共享的系统性负担。

**第一，parser 在会话开始时已经分流。** 普通 PG 会话使用 `PG_PARSER`，`sql_raw_parser` 指向 `standard_raw_parser`；Oracle 会话才会切到 `ora_raw_parser`。SQL parser 是每条语句都会经过的入口，如果每条 SQL 都先尝试 Oracle 语法，再尝试 PG 语法，成本会非常直接。IvorySQL 没有这么做。它在会话级别确定 parser，PG 语句仍然按 PG parser 解析，Oracle 语句才进入 Oracle parser。

**第二，Oracle hook 多数有明确触发条件。** 比如类型优先级 hook 不是每次操作符解析都完整跑一遍 Oracle 规则，而是在找不到合适操作符，并且当前处于 Oracle 模式时才介入。Package 查找也类似，`parse_package.c` 会先判断 parser 类型，不是 `ORA_PARSER` 就不继续走 Oracle Package 查找。hook 在代码里存在，不等于所有查询都承担完整兼容逻辑。

**第三，Oracle 类型和函数进入 PostgreSQL 原生对象体系以后，执行阶段可以复用 PG 的函数调用、表达式求值、排序、索引访问和缓存机制。** `NUMBER`、LOB、RAW、ROWID 等类型被放进 catalog，配套 operator、cast、opclass 后，优化器和执行器可以按 PG 熟悉的方式处理它们。Oracle 函数自身有成本，但那是使用功能时的成本，不会转嫁给不使用这些对象的普通 PG 查询。

**第四，Package 通过缓存避免重复解析。** Package 如果每次调用都重新读 catalog、解析包体、构造执行上下文，性能会很差。IvorySQL 的 `PackageCache` 放在 `CacheMemoryContext`，通过 syscache callback 管理失效。package 或 package body 发生 DDL 变化后，相关缓存和 plan cache 会被清理；没有变化时，调用可以复用缓存对象。它比临时拼装式实现更适合长期运行的业务系统。

**第五，`ROWNUM` 优化只在能保证等价时发生。** 简单的 `ROWNUM <= N`、`ROWNUM = 1`、`ROWNUM < N` 可以改写成 `LIMIT`。复杂查询里，如果 Oracle `ROWNUM` 和 PostgreSQL `LIMIT` 的生效时机不一致，IvorySQL 就不强行改写。兼容数据库不能为了让某些 SQL 看起来更快，就让复杂场景结果悄悄变错。

**第六，`sys` schema 和扩展对象减少了名字解析干扰。** Oracle 函数、类型、系统视图和内置包主要由 `ivorysql_ora` 扩展和 `sys` schema 提供。Oracle 模式下 search_path 优先查 `sys`，PG 模式下不需要把这些对象放进普通 SQL 的默认查找路径。

**第七，PG 和 Oracle 测试目标是分开的。** 项目里可以看到 `oracle-check`、`oracle-installcheck`、`oracle-pg-check` 等测试目标。这说明 IvorySQL 不只是验证 Oracle SQL 能不能跑，也在验证 Oracle 兼容改动有没有影响 PG 侧行为。兼容功能越多，越需要持续证明 PG 模式没有被误伤。

所以，IvorySQL 的性能逻辑可以概括成一句话：Oracle 兼容不是摆在所有 SQL 前面的一层解析器，而是通过模式、parser 指针、hook 条件、schema、扩展、catalog 和 cache 被放在特定路径上。PG 模式下，绝大多数 Oracle 逻辑不会进入热路径；Oracle 模式下，额外成本主要来自用户确实使用了 Oracle 语义。这种成本是功能成本，不是架构上的无差别打击。

这也是为什么 IvorySQL 的设计比"统一拦截所有 SQL 再判断方言"的方案更健康。它让 PG 继续像 PG 一样运行，让 Oracle 兼容在需要的时候生效。对于企业数据库来说，这种边界比单点优化更重要。边界清楚，性能才有讨论空间；边界不清楚，再多微优化也容易被全局分支和语义污染抵消。

## 四、总结：IvorySQL 对 PG 生态的业务贡献

IvorySQL 对 PG 生态的贡献，在于给 PostgreSQL 生态加上了一条面向 Oracle 存量系统迁移的内核级路径。

企业系统里，Oracle 往往不是一个单纯的数据存储。大量业务逻辑、权限习惯、报表工具、运维脚本、数据字典查询、存储过程和包都围绕 Oracle 建了很多年。IvorySQL 把 parser、类型、Package、PL/iSQL、系统视图、内置函数、会话语义这些迁移难点放到数据库侧处理，本质上是在降低企业拥抱 PG 生态的门槛。

对业务方来说，这意味着迁移项目没必要一开始就大规模重写。存储过程、包、隐式转换、Oracle 数据字典依赖这些历史包袱，可以先由数据库兼容能力承载一部分。应用团队可以把精力放在真正需要改造的业务逻辑上，而不是把大量时间花在低层语法和对象差异上，这无疑让项目的启动和验证变得更加低成本无负担。

对 PG 生态来说，IvorySQL 的意义就更不言而喻。PostgreSQL 原本就有稳定的内核、成熟的优化器、活跃的扩展生态和开放的社区基础，但在 Oracle 存量市场里，兼容深度一直是企业决策时绕不开的问题。IvorySQL 用内核增强的方式补齐了这块短板，让 PG 生态在金融、电信、政企、传统制造这些 Oracle 深度用户的场景里，多了一个更现实的落地选择。

更难得的是，IvorySQL 没有用牺牲 PG 原生体验来换 Oracle 兼容。它通过模式隔离、双 parser、hook 条件、`sys` schema、扩展对象和缓存机制，把 Oracle 兼容放在该出现的位置。PG 应用可以继续按 PG 的方式运行，Oracle 迁移应用也能获得更接近原系统的语义。这种路线对生态很友好：它扩大了 PostgreSQL 的适用范围，却没有把 PG 本身改成一个不可辨认的混合体。
