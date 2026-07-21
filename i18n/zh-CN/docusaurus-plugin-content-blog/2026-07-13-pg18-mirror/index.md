---
slug: pg18-mirror
title: "没想到！IvorySQL 居然同步了原生 PG18.4 镜像"
authors: [ShunWah]
category: IvorySQL
image: img/blog/covers/pg18-mirror-en.png
tags: [IvorySQL, PostgreSQL, Docker, Mirror, PG18, openEuler]
---

<!-- truncate -->



<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/jpeg/26769700/1782804758419-d6166a84-3d31-44d5-92d6-0b7232f229e0.jpeg)

### 📖 前言
前段时间发了一篇 IvorySQL 国内镜像实测文章，不少读者私信问：**仓库里能不能拉原生 PostgreSQL？**

今天专门拿 openEuler 真机完整测一遍 PG 18.4-bookworm 镜像，把整套实操、踩坑点一次性说透。

之前用 Docker Hub 拉 PG 镜像，老毛病一堆：⏱️ 高峰几百 KB/s、下到 90% 直接断连，机房无外网代理时干脆完全拉不动。现在 IvorySQL 社区 `registry.highgo` 仓库同步了官方原生 PG 镜像，不用切换第三方加速源，一套仓库同时跑 IvorySQL、原生 PG，做迁移对比、兼容性测试特别省事。

全文没有套话，全部是真机复制可执行命令，把版本标签坑、磁盘爆满、宿主机无客户端、命令粘贴报错这些运维高频问题全部拆解，新手照着操作也能一次性部署成功。

> 🔥 **写在前面：本文所有命令均基于 openEuler 真机实测，截图均为实际操作记录，非模拟演示。**
>

### 一、前置环境说明
本次实测机器配置：

| 项目 | 版本/信息 |
| --- | --- |
| 🖥️ **操作系统** | openEuler |
| 🐳 **Docker** | 20.10.24 |
| 📦 **Docker Compose** | v2.20.0 |
| 📍 **镜像仓库** | registry.highgo.com |
| 🎯 **测试镜像** | registry.highgo.com/postgres/postgres:18.4-bookworm |


```plain
[root@openeuler-server ~]# docker --version
Docker version 20.10.24, build 297e128
[root@openeuler-server ~]# docker-compose --version
Docker Compose version v2.20.0
[root@openeuler-server ~]#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804758085-8af2f9a7-9501-4a67-ab7b-fa793f05c819.png)



### 1.1 🚨 先划重点：镜像标签致命大坑
很多人会直接执行下面这条命令，**百分百报错**：

```bash
# ❌ 错误写法，纯数字tag仓库不存在,而且路径也是错的少了postgres/postgres
docker pull registry.highgo.com/postgres:18.4
```

#### 1.1.1 报错现场
```bash
[root@openeuler-server ~]# docker pull registry.highgo.com/postgres:18.4
Error response from daemon: unknown: bad request: invalid repository name: postgres
[root@openeuler-server ~]# 
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804758093-70008948-0862-456d-bc52-d500cace8bee.png)

#### 1.1.2 原因 & 正确指令
> 📌 **根因**：仓库内 PG 镜像必须携带系统发行后缀 `-bookworm` / `-trixie`，不能只写数字版本。
>
> 📌 **正确**：仓库内 PG 镜像的完整路径是 `postgres/postgres`，不是 `postgres`；且标签必须带 `-bookworm` 发行版后缀
>

✅ **正确拉取命令**：

```bash
[root@openeuler-server ~]# docker pull registry.highgo.com/postgres/postgres:18.4-bookworm
18.4-bookworm: Pulling from postgres/postgres
dc4bf025fa70: Pull complete 
07800c4658aa: Pull complete 
d3b29a572ab1: Pull complete 
9c32480c36e2: Pull complete 
ab0222f6080d: Pull complete 
26068876c106: Pull complete 
204ea99b8184: Pull complete 
b9b7e4c43bc2: Pull complete 
d626a1ee2499: Pull complete 
df093a451bde: Pull complete 
4551c7621254: Pull complete 
b7cc028a2062: Pull complete 
4ea1c3550cc2: Pull complete 
Digest: sha256:d323ae4f611b8c41e2488693785b770d2797c10e859b259e4e7706246debb069
Status: Downloaded newer image for registry.highgo.com/postgres/postgres:18.4-bookworm
registry.highgo.com/postgres/postgres:18.4-bookworm
[root@openeuler-server ~]#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804758453-9aa04963-12c4-4bbf-bf82-957a81720ed3.png)



### 二、⚡ 极速拉取：从20分钟到30秒
#### 2.1 执行拉取
```bash
[root@openeuler-server ~]# docker pull registry.highgo.com/postgres/postgres:18.4-bookworm
18.4-bookworm: Pulling from postgres/postgres
67cf8384fcca: Pull complete
047252d203fc: Pull complete
285c515ff12e: Pull complete
c04bac481cf: Pull complete
4d2f8983bdeb: Pull complete
928cbc530e9b: Pull complete
b7d7c0b1553c: Pull complete
ef11daf91965: Pull complete
5dab6177213d: Pull complete
b73f5647695f: Pull complete
9c1186127d05: Pull complete
c73bb36f2399: Pull complete
142af709c9ab: Pull complete
Digest: sha256:1fa4bccc8246ee2ba9592895d804dcf767119e632999ef22d2b3355a93b627c3
Status: Downloaded newer image for registry.highgo.com/postgres/postgres:18.4-bookworm
registry.highgo.com/postgres/postgres:18.4-bookworm
```

> 💡 **实测效果**：从敲下回车到下载完毕，**大概只用了30秒左右**。之前在 Docker Hub 上龟速爬行的日子一去不复返，下载速度直接飙到几十 MB/s。这效率，简直是质的飞跃。
>

#### 2.2 镜像完整性校验
拉完核对镜像 ID、文件大小，确认无损坏分层：

```bash
[root@openeuler-server ~]# docker images | grep postgres
registry.highgo.com/postgres/postgres               18.4-bookworm   dda003c01642   2 weeks ago    440MB
registry.highgo.com/postgres/postgres               18.3-bookworm   3c67953c3a90   7 weeks ago    440MB
[root@openeuler-server ~]#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804758144-91b59a98-3124-4630-b642-e6101799f1bb.png)



### 三、🚀 启动容器：连环踩坑实录
镜像拉下来了，接下来就是启动。**这里我要特别提醒一句**：PostgreSQL 的 Docker 镜像和 MySQL / IvorySQL 有点不一样，它默认不会暴露 1521 端口，而且对环境变量的要求比较"倔强"。

#### 3.1 坑①：Shell 历史扩展 `!!` 引发的"鬼畜"报错
我第一次启动时，习惯性地用了之前 IvorySQL 的命令风格，结果悲剧了：

```bash
[root@openeuler-server ~]# docker run --name pg184 -p 5432:5432 -e POSTGRES_PASSWORD=StrongPass456!! -v pgdata:/var/lib/postgresql/data -d registry.highgo.com/postgres/postgres:18.4-bookworm
Unable to find image 'run:latest' locally
docker: Error response from daemon: Get "https://registry-1.docker.io/v2/": dial tcp 202.160.130.66:443: connect: connection timed out.
See 'docker run --help'.
[root@openeuler-server ~]#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804759084-dda5437b-306d-42fa-b2e9-d15a94efa591.png)

> 🔍 **根因分析**：你注意看密码：`StrongPass456!!`。在 Bash 等 Shell 中，`!!` 是一个特殊指令，意思是"**重复执行上一条命令**"。Shell 在执行前会把 `!!` 替换成上一条完整命令，结果就"展开"成了一条包含自身的超长命令，自然报错。
>

✅ **解决方案**：用单引号或双引号把密码包起来：

```bash
[root@openeuler-server ~]# docker run --name pg184 -p 5432:5432 -e POSTGRES_PASSWORD='StrongPass456!!' -v pgdata:/var/lib/postgresql/data -d registry.highgo.com/postgres/postgres:18.4-bookworm
5867e8daa44e925e7818598013a1da62ad7dbdd685e6aa0fae68a94d590edbce
docker: Error response from daemon: driver failed programming external connectivity on endpoint pg184 (7e11a12a731fb44d5aea01d0363b015deadb223d87df0569a40c46a0698da70e): Bind for 0.0.0.0:5432 failed: port is already allocated.
[root@openeuler-server ~]#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804759079-e02f9fbc-7de2-4591-bf4e-9059ff37275c.png)

#### 3.2 坑②：端口 5432 已被 IvorySQL 占用
报错信息：`Bind for 0.0.0.0:5432 failed: port is already allocated`。

看一眼 `docker ps -a` 的结果，真相大白：

```bash
[root@openeuler-server ~]# docker ps -a
CONTAINER ID   IMAGE                                                      COMMAND                  CREATED          STATUS                   PORTS                                                                                            NAMES
5867e8daa44e   registry.highgo.com/postgres/postgres:18.4-bookworm        "docker-entrypoint.s…"   31 seconds ago   Created                                                                                                                   pg184
90f5945502a0   registry.highgo.com/ivorysql/ivorysql:5.3-ubi8             "docker-entrypoint.s…"   9 days ago       Up 9 days                0.0.0.0:1521->1521/tcp, :::1521->1521/tcp, 0.0.0.0:5432->5432/tcp, :::5432->5432/tcp, 5866/tcp   ivorysql
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804758924-2371741c-3883-4963-8030-7d23aedcc69e.png)

那个叫 `ivorysql` 的容器已经占了 `5432`。**一台服务器上，一个端口同一时间只能服务一个程序。**

✅ **解决方案**：换个端口映射。把宿主机的 `5433` 映射到容器的 `5432`：

```bash
[root@openeuler-server ~]# docker stop pg184
pg184
[root@openeuler-server ~]# docker rm pg184
pg184
[root@openeuler-server ~]# docker run --name pg184 -p 5433:5432 -e POSTGRES_PASSWORD='StrongPass456!!' -v pgdata:/var/lib/postgresql/data -d registry.highgo.com/postgres/postgres:18.4-bookworm
aa42ab39ec930934befb825efa15e7b646af0cd3b84560c3ff5aba73818af60b
[root@openeuler-server ~]#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804759096-61a2161f-be0c-4260-90b5-7b2f95f581d3.png)

#### 3.3 坑③：PostgreSQL 18+ 数据路径 Breaking Change
端口解决了，但容器还是没起来：

```bash
[root@openeuler-server ~]# docker ps | grep pg18
[root@openeuler-server ~]#
```

查看日志：

```bash
[root@openeuler-server ~]# docker logs pg184
Error: in 18+, these Docker images are configured to store database data in a
       format which is compatible with "pg_ctlcluster" (specifically, using
       major-version-specific directory names).

       Counter to that, there appears to be PostgreSQL data in:
         /var/lib/postgresql/data (unused mount/volume)

       The suggested container configuration for 18+ is to place a single mount
       at /var/lib/postgresql which will then place PostgreSQL data in a
       subdirectory...
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804759442-1e282f7e-37b2-4fb9-adea-e382e8619ac6.png)

> 🔍 **根因分析**：从 PostgreSQL 18 开始，官方 Docker 镜像**不再把数据存在 **`/var/lib/postgresql/data`，而是放在带版本号的新路径 `/var/lib/postgresql/18/docker`。你的挂载点 `/var/lib/postgresql/data` 是旧路径，PG 18 启动时发现路径对不上，直接报错退出。
>

✅ **解决方案**：把挂载点从 `/var/lib/postgresql/data` 改为 `/var/lib/postgresql`：

```bash
[root@openeuler-server ~]# docker stop pg184
pg184
[root@openeuler-server ~]# docker rm pg184
pg184
[root@openeuler-server ~]# docker run --name pg184 -p 5433:5432 -e POSTGRES_PASSWORD='StrongPass456!!' -v pgdata:/var/lib/postgresql -d registry.highgo.com/postgres/postgres:18.4-bookworm
0ea9e62cd3d0f19a6a791914f2b946ca417ba7247556a4b8f56b3c851118e2ba
[root@openeuler-server ~]#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804759886-f359672f-fe14-4d8e-a22b-b982e0af5855.png)

#### 3.4 ✅ 终于启动成功
```bash
[root@openeuler-server ~]# docker ps | grep pg18
0ea9e62cd3d0   registry.highgo.com/postgres/postgres:18.4-bookworm   "docker-entrypoint.s…"   2 minutes ago   Up 2 minutes   0.0.0.0:5433->5432/tcp, :::5433->5432/tcp                                                        pg184
[root@openeuler-server ~]#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804759877-ea2fbdbd-2f08-442e-844d-e1da7a2b92d4.png)

查看日志确认就绪：

```bash
[root@openeuler-server ~]# docker logs pg184 | tail -10
2026-06-27 09:56:43.153 UTC [1] LOG:  starting PostgreSQL 18.4 (Debian 18.4-1.pgdg12+1) on x86_64-pc-linux-gnu
2026-06-27 09:56:43.153 UTC [1] LOG:  listening on IPv4 address "0.0.0.0", port 5432
2026-06-27 09:56:43.153 UTC [1] LOG:  listening on IPv6 address "::", port 5432
2026-06-27 09:56:43.155 UTC [1] LOG:  listening on Unix socket "/var/run/postgresql/.s.PGSQL.5432"
2026-06-27 09:56:43.161 UTC [73] LOG:  database system was shut down at 2026-06-27 09:56:43 UTC
2026-06-27 09:56:43.170 UTC [1] LOG:  database system is ready to accept connections
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804759558-e65aecf3-28a8-4799-96eb-14a3f0852220.png)

🎉 **看到** `ready to accept connections`，**成了！**



### 四、📦 生产环境 Docker Compose 编排
单机 run 命令适合临时测试，长期测试、准生产环境统一使用 Compose 管理，配置集中、扩容迁移更便捷。

#### 4.1 新建编排工作目录
```bash
[root@openeuler-server ~]# mkdir -p /data/pg-compose
[root@openeuler-server ~]# cd /data/pg-compose
[root@openeuler-server pg-compose]#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804759852-12def78c-6dea-433a-82ce-46b5e96a400a.png)

#### 4.2 docker-compose.yml 完整配置（适配 PG18.4）
```yaml
[root@openeuler-server pg-compose]# vim docker-compose.yml

version: '3.8'
services:
  pg18:
    image: registry.highgo.com/postgres/postgres:18.4-bookworm
    container_name: pg18
    restart: always
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: PGtest@2026
      POSTGRES_DB: testdb
    # ⚠️ PG18+挂载根目录 /var/lib/postgresql，非 /data 子目录
    volumes:
      - ./pgdata:/var/lib/postgresql
    networks:
      pg_net:
networks:
  pg_net:
    driver: bridge
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782890471776-ea3a8c12-3a70-4be5-a79a-f472d9a9e76d.png)

#### 4.3 ⚠️ 启动报错又一个端口冲突
```bash
[root@openeuler-server pg-compose]# docker-compose up -d
Error response from daemon: Bind for 0.0.0.0:5432 failed: port is already allocated
[root@openeuler-server pg-compose]#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804760378-72c10ceb-377e-4df1-b316-a65e6b0d101a.png)

> 🔍 **根因**：Compose 模板里写的是 `"5432:5432"`，直接和 IvorySQL 的 `5432` 端口冲突。调整为 `"5435:5432"` 即可。
>

#### 4.4 修改 docker-compose.yml 完整配置（适配 PG18.4）
```yaml
[root@openeuler-server pg-compose]# vim docker-compose.yml

version: '3.8'
services:
  pg18:
    image: registry.highgo.com/postgres/postgres:18.4-bookworm
    container_name: pg18
    restart: always
    ports:
      - "5435:5432"          # 宿主机5435，避开5432/5433占用
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: PGtest@2026
      POSTGRES_DB: testdb
    # ⚠️ PG18+挂载根目录 /var/lib/postgresql，非 /data 子目录
    volumes:
      - ./pgdata:/var/lib/postgresql
    networks:
      pg_net:
networks:
  pg_net:
    driver: bridge
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804760199-05c508e5-f647-47b1-aa6d-fae49fa97609.png)

#### 4.5 修正后重新启动
```bash
[root@openeuler-server pg-compose]# docker-compose down
[+] Running 2/2
 ✔ Container pg18             Removed                                                0.0s 
 ✔ Network pg-compose_pg_net  Removed                                                0.2s 
[root@openeuler-server pg-compose]# vim docker-compose.yml   # 端口改为5435
[root@openeuler-server pg-compose]# docker-compose up -d
[+] Running 2/2
 ✔ Network pg-compose_pg_net  Created                                                0.2s 
 ✔ Container pg18             Started                                                0.4s 
[root@openeuler-server pg-compose]#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804760830-b11d7d95-c543-4672-bb33-c2b25c42df19.png)

查看日志确认成功：

```bash
[root@openeuler-server pg-compose]# docker logs pg18 | grep "ready to accept"
2026-06-27 10:31:46.188 UTC [1] LOG:  database system is ready to accept connections
```

#### 4.6 验证容器运行状态
```bash
[root@openeuler-server pg-compose]# docker ps | grep pg18
1d53e4097a3d   registry.highgo.com/postgres/postgres:18.4-bookworm   "docker-entrypoint.s…"   30 seconds ago   Up 29 seconds   0.0.0.0:5435->5432/tcp, :::5435->5432/tcp                                                        pg18
0ea9e62cd3d0   registry.highgo.com/postgres/postgres:18.4-bookworm   "docker-entrypoint.s…"   35 minutes ago   Up 35 minutes   0.0.0.0:5433->5432/tcp, :::5433->5432/tcp                                                        pg184
[root@openeuler-server pg-compose]#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804760473-4f5ff67f-01be-413e-9af0-cf5813262467.png)



### 五、🔍 PostgreSQL 18.4 基础 CRUD 实操验证
容器日志输出 `database system is ready to accept connections` 代表数据库完全初始化完毕，直接进入容器完成版本校验与增删改查全流程验证。

#### 5.1 进入数据库终端 & 版本校验
```bash
[root@openeuler-server pg-compose]# docker exec -it pg18 psql -U postgres
psql (18.4 (Debian 18.4-1.pgdg12+1))
Type "help" for help.

postgres=# select version();
                                                                 version                                                              
------------------------------------------------------------------------------------------------------------------------------------
 PostgreSQL 18.4 (Debian 18.4-1.pgdg12+1) on x86_64-pc-linux-gnu, compiled by gcc (Debian 12.2.0-14+deb12u1) 12.2.0, 64-bit
(1 row)
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804760545-2437c33a-08a0-4996-9a6a-539a73cf4f92.png)

#### 5.2 完整 CRUD 示例
```sql
-- 1. 创建测试业务表
CREATE TABLE test_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    age INT,
    create_time TIMESTAMP DEFAULT now()
);
```

```plain
postgres=# CREATE TABLE test_user (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    age INT,
    create_time TIMESTAMP DEFAULT now()
);
CREATE TABLE
postgres=#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804760896-63d841a6-ef5a-4da7-aab3-317786fb17da.png)

```sql
-- 2. 新增多条测试数据
INSERT INTO test_user (username,age) VALUES 
('zhangsan',24),
('lisi',28),
('wangwu',32);
```

```plain
postgres=# INSERT INTO test_user (username,age) VALUES 
('zhangsan',24),
('lisi',28),
('wangwu',32);
INSERT 0 3
postgres=#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804761022-6e50a131-5ae2-49ec-9556-38a820a74114.png)

```sql
-- 3. 全表查询
SELECT * FROM test_user;
```

```plain
postgres=# SELECT * FROM test_user;
 id | username | age |        create_time         
----+----------+-----+----------------------------
  1 | zhangsan |  24 | 2026-06-27 12:29:53.710586
  2 | lisi     |  28 | 2026-06-27 12:29:53.710586
  3 | wangwu   |  32 | 2026-06-27 12:29:53.710586
(3 rows)
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804761001-4cf4045d-d7d5-4929-b61d-02f7c1a780ac.png)

```sql
-- 4. 条件更新数据
UPDATE test_user SET age=29 WHERE username='lisi';
```

```plain
postgres=# UPDATE test_user SET age=29 WHERE username='lisi';
UPDATE 1
postgres=#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804761173-6d7bf770-d079-46bb-9e08-41e1d9cddca7.png)

```sql
-- 5. 确认更新结果
SELECT * FROM test_user;
```

```plain
postgres=# SELECT * FROM test_user;
 id | username | age |        create_time         
----+----------+-----+----------------------------
  1 | zhangsan |  24 | 2026-06-27 12:29:53.710586
  3 | wangwu   |  32 | 2026-06-27 12:29:53.710586
  2 | lisi     |  29 | 2026-06-27 12:29:53.710586
(3 rows)
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804761436-1be4cc98-384e-49de-b28f-669351cc7ae7.png)

```sql
-- 6. 删除指定行数据
DELETE FROM test_user WHERE username='wangwu';
```

```plain
postgres=# DELETE FROM test_user WHERE username='wangwu';
DELETE 1
postgres=#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804761443-5d55acd7-d804-4f77-9b90-c5df2f7c435a.png)

```sql
-- 7. 最终结果验证
SELECT * FROM test_user;
```

```plain
postgres=# SELECT * FROM test_user;
 id | username | age |        create_time         
----+----------+-----+----------------------------
  1 | zhangsan |  24 | 2026-06-27 12:29:53.710586
  2 | lisi     |  29 | 2026-06-27 12:29:53.710586
(2 rows)

postgres=# \q
[root@openeuler-server pg-compose]#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804761593-7140d70b-5280-4616-9de4-1f94667e5bb9.png)



### 六、📊 连接端口区分说明
| 部署方式 | 外部连接端口 | 数据库类型 |
| --- | --- | --- |
| IvorySQL 容器 | `5432` / `1521` | IvorySQL 5.3 |
| 单机 run 部署 | `5433` | PostgreSQL 18.4 |
| Compose 部署 | `5435` | PostgreSQL 18.4 |


```bash
# Compose 容器内免密登录（不受宿主机端口影响）
[root@openeuler-server pg-compose]# docker exec -it pg18 psql -U postgres
psql (18.4 (Debian 18.4-1.pgdg12+1))
Type "help" for help.

postgres=#
```

<!-- 这是一张图片，ocr 内容为： -->
![](https://cdn.nlark.com/yuque/0/2026/png/26769700/1782804761636-7a0b3605-2647-4665-aef6-625ff2624a4d.png)



### 七、🧾 实测高频踩坑汇总（翻车记录）
#### 坑 1：简写 Tag 直接拉取，提示镜像不存在
+ **现象**：`postgres:18.4` 拉取失败
+ **解决**：仓库内 PG 镜像的完整路径是 `postgres/postgres`，不是 `postgres`；且标签必须带 `-bookworm` 发行版后缀

#### 坑 2：Shell 历史扩展 `!!` 导致命令错乱
+ **现象**：密码带 `!!` 后命令被"展开"，报 `Unable to find image 'run:latest'`
+ **解决**：密码用单引号包起来，或用不带 `!` 的密码

#### 坑 3：端口 5432 被 IvorySQL 占用
+ **现象**：`Bind for 0.0.0.0:5432 failed: port is already allocated`
+ **解决**：换端口映射，如 `5433:5432` 或 `5435:5432`

#### 坑 4：PG18+ 挂载路径变更
+ **现象**：容器启动失败，日志提示 `unused mount/volume`
+ **解决**：挂载 `/var/lib/postgresql`，**不是** `/var/lib/postgresql/data`

#### 坑 5：宿主机无 psql 客户端
+ **现象**：`-bash: psql: 未找到命令`
+ **解决**：统一用 `docker exec -it pg18 psql -U postgres` 进入容器



### 八、💭 实测体验客观点评
很多人觉得国内镜像只是单纯提速工具，其实对 PG 迁移场景价值更大：

✅ **优势：**

1. 一套仓库同时拥有 IvorySQL + 原生 PG 镜像，做 Oracle 语法兼容对比、数据库迁移评估不用切换镜像源，环境搭建效率翻倍；
2. PG 18.4 同步最新社区内核修复，同步速度和海外 Docker Hub 差距极小，中小企业不用搭建私有镜像仓库；
3. 镜像完全官方原生无二次修改，信创、政企测试环境合规，规避第三方镜像篡改风险。



### 总结
这次完整实测 `registry.highgo` 仓库 PostgreSQL 18.4-bookworm 镜像，整套流程从拉取、单机部署、生产 Compose 编排到排坑全部落地。

**核心优势总结：** 国内节点高速拉取、原生官方镜像安全合规、搭配 IvorySQL 一站式完成迁移对比测试。

**实操重点提醒：** 拉取镜像务必携带 `-bookworm` 后缀，必须挂载宿主机数据目录防止磁盘爆满，复制命令优先单行避免参数错乱。



### 📋 作者注
本文所有操作及测试均基于 **openEuler 操作系统环境**完成，核心围绕 IvorySQL 社区镜像仓库 `registry.highgo.com` 内 **PostgreSQL 18.4-bookworm** 兼容性验证展开。

请注意 IvorySQL 社区 PostgreSQL 镜像迭代较快，文中配置参数、命令行输出可能随新版本更新调整。生产部署前，请以 IvorySQL 官方文档、`registry.highgo` 仓库最新 Tag 清单为准。

以上仅为个人实践总结，不代表社区官方观点，文中命令、密码仅作演示，线上环境请自定义高强度密码。

### 👤 作者简介
> **作者：** ShunWah  
**公众号：** "shunwah星辰数智社"主理人。  
>
> **持有认证：** OceanBase、MySQL、OpenGauss、崖山、金仓KingBase、KaiwuDB、亚信AntDBCA、翰高、GBase、Galaxybase、Neo4j、NebulaGraph、东方通TongTech、TiDB 等多项权威认证。  
>
> **获奖经历：** 崖山YashanDB YVP、浪潮KaiwuDB MVP、墨天轮 MVP、金仓社区KVA、TiDB社区MVA、NebulaGraph社区之星、IFClub星珩联盟·智库星系技术专家、ITPUB 技术专家、GBase 8a开发者联盟成员 社区版主及布道师。在OceanBase&墨天轮征文大赛、OpenGauss、TiDB、YashanDB、Kingbase、KWDB、Navicat 征文等赛事中多次斩获一、二、三等奖，原创技术文章常年被墨天轮、CSDN、ITPUB 等平台首页推荐。
>