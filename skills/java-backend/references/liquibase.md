# Liquibase 数据库变更

本技能使用 `src/main/resources/sql/` 管理数据库结构与随版本发布的数据变更。按数据库方言建立 `sql/postgresql/`、`sql/mysql/` 等目录，每个数据库各有一个 XML 主 changelog，按顺序 `include` 同目录的 formatted SQL 文件。项目只支持一种数据库时只保留对应目录。

Spring Boot 项目通过 `spring.liquibase.change-log` 指向所选数据库的主文件。例如 PostgreSQL 配置为 `classpath:/sql/postgresql/db.changelog-master.xml`，MySQL 配置为 `classpath:/sql/mysql/db.changelog-master.xml`。依赖和配置属性按项目的 Spring Boot 版本核对[官方数据库初始化文档](https://docs.spring.io/spring-boot/reference/how-to/data-initialization.html)；数据库驱动、数据源与 changelog 方言应对应。

## XML 主文件与 SQL 变更文件

XML 主文件只管理迁移顺序；新变更追加一个 `include`。`relativeToChangelogFile="true"` 让 SQL 路径相对当前 XML 文件解析。实际示例：

- [PostgreSQL 主文件](../examples/liquibase/src/main/resources/sql/postgresql/db.changelog-master.xml)与[SQL 变更](../examples/liquibase/src/main/resources/sql/postgresql/20260923.sql)
- [MySQL 主文件](../examples/liquibase/src/main/resources/sql/mysql/db.changelog-master.xml)与[SQL 变更](../examples/liquibase/src/main/resources/sql/mysql/20260923.sql)

示例使用虚构的 `catalog_item` 表和 `sampledev` 作者，`id BIGINT PRIMARY KEY` 表示由应用提供主键值；若采用数据库自增主键，需分别修改 MySQL 与 PostgreSQL 的建表语句。SQL 文件以 `--liquibase formatted sql` 开头，并为每次变更定义唯一的 `--changeset author:id`；数据库专属语法分别写在对应目录。主文件可采用项目 Liquibase 版本支持的 XSD；不要直接沿用旧示例中的 `dbchangelog-3.1.xsd`。参阅[官方 formatted SQL 说明](https://docs.liquibase.com/community/user-guide-5-0-4/sql-changelog-example)及[文件包含说明](https://docs.liquibase.com/oss/reference-guide-4-33/changelog-attributes/include)。

## 变更约定

- SQL 文件名按版本开始日期（如 `20260923.sql`）或稳定的业务版本（如 `v2.4.0.sql`）命名，文件名不附加业务标签。新项目先选定一种规则并持续使用：日期规则适用于每个发布版本都能对应唯一日期的项目；若可能在同一天独立发布多个版本，从一开始采用版本规则。同一版本的多个变更仅在首次部署前合并到一个文件，并使用不同的 changeset ID。两种数据库的对应版本保持相同文件名，并在各自主文件中明确包含顺序。已有项目沿用既有命名规则，不重命名已部署文件。
- 为新表、字段、索引或数据升级追加 SQL 文件和 changeset；文件一经部署，不再向其中添加或改写 changeset，后续修正使用下一版本的新文件。Liquibase 用文件路径、作者和 ID 标识变更集，移动旧文件也会影响识别。
- 需要先决条件时明确失败行为。`MARK_RAN` 只用于已核对过现存结构的历史基线场景；普通建表失败应暴露错误，避免把未执行的变更标记成功。
- 旧项目中可能出现的 `validCheckSum ANY` 属于特殊的历史校验处理，不作为新 changeset 模板。遇到校验冲突先确认部署记录与文件差异，再决定处理方式。
- 分批发布时考虑新旧代码兼容、数据回填、索引和约束的顺序。不可逆变更说明回滚或前向修复方案。参阅[回滚策略](https://docs.liquibase.com/community/implementation-guide-5-0-4/implement-a-rollback-strategy-with-modeled-changelogs-xml-yaml-json)。
- 现有项目若使用其他迁移工具，先确认数据库结构与历史执行记录，制定 Liquibase 基线和接管步骤，避免同一变更重复执行。

## 验证

检查 XML、`include` 路径和 formatted SQL 语法；在隔离的 PostgreSQL 或 MySQL 数据库中分别验证空库初始化和已部署版本升级。支持两种数据库时验证两套 changelog，并核对相关 Mapper 对新结构的读写行为。
