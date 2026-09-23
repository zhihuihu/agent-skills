---
name: java-backend
description: 创建或修改 Java 后端功能，主要面向 Spring Boot 项目的业务建模、REST 接口、持久化、Liquibase 数据库迁移、缓存、消息及外部服务集成。适用于需要按业务上下文实现完整用例的任务；不适用于纯前端或仅查询 API 文档（文档解析请使用 openapi-explorer）。
---

# Java 后端开发

在现有项目中先识别业务边界和项目约定，再实现功能。简单项目直接在根业务包（如 `shop`）下按 DDD 职责分层；复杂项目先划分限界上下文，再在每个上下文内分层。已有项目采用其他结构时，沿用其约定并逐步改善相关代码，不为一个小改动重排整个项目。

## 工作方式

1. 已有项目先阅读相关业务代码、构建文件和配置，确认 Java 与 Spring Boot 版本、模块、依赖、持久化方式、数据库迁移状态及测试命令；新项目以 Liquibase 管理数据库变更。参阅[项目识别](references/project-discovery.md)。
2. 明确用例、业务术语、数据归属、不变量和对外契约。新增或调整模块边界时参阅[限界上下文](references/bounded-context.md)，按[项目结构](references/project-structure.md)决定是否增加上下文层。
3. 把业务规则放在领域对象或合适的领域服务中，由用例服务编排流程与事务。按任务阅读[领域模型](references/domain.md)和[应用层](references/application.md)。简单的读写功能只建立实际需要的抽象。
4. 实现入口与技术适配：HTTP 入口参阅[接口层](references/interfaces.md)；数据库和外部依赖适配参阅[基础设施](references/infrastructure.md)。数据库结构或受控数据变更参阅[Liquibase](references/liquibase.md)；使用 MyBatis-Plus 时再阅读[MyBatis-Plus 持久化](references/mybatis-plus.md)。
5. 仅在任务涉及相应组件时阅读[缓存](references/integrations/cache.md)、[消息](references/integrations/messaging.md)或[外部服务](references/integrations/external-services.md)。保留项目现有选型，核对与项目版本匹配的官方文档。
6. 按[验证](references/testing.md)检查业务规则和改动边界，运行相关测试或构建，并说明未验证的部分。

## 边界约定

- 简单项目在根业务包下组织 `domain`、`application`、`infrastructure`，需要 HTTP 入口时直接增加 `interapi`（自有前端及内部系统使用的接口）或 `openapi`（外部合作方使用的接口，为项目包名约定，与 OpenAPI 文档规范无关）；复杂项目先增加限界上下文层，再按相同职责组织，并通过明确的接口或事件协作。
- HTTP 请求对象、数据库记录、消息载荷与领域对象各有职责。只在边界处转换，不让外部协议决定领域规则。
- 聚合内保证需要同步成立的业务约束；事务边界与用例和一致性要求相符。
- 数据库变更用 Liquibase changelog 管理；已部署的变更集通过新增变更集修正。
- 不因使用本技能而自动加入 Spring Modulith、缓存、消息队列或新框架依赖。
