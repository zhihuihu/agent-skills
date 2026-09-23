# MyBatis-Plus 持久化

只在项目已经使用 MyBatis-Plus，或用户选择它作为持久化方案时应用本页。先确认 Spring Boot 与 MyBatis-Plus 版本，再从[官方安装说明](https://baomidou.com/getting-started/install/)选择对应 starter；检查现有依赖，避免重复引入普通 MyBatis starter 造成版本冲突。

## 放置位置与职责

简单项目将 `Order` 放在 `shop.domain`，领域仓储接口 `OrderRepository` 放在 `shop.domain.repository`；复杂项目在 `shop.ordering` 下使用相同分层。数据库映射类 `OrderEntity` 放在 `infrastructure.entity`，`OrderMapper extends BaseMapper<OrderEntity>` 放在 `infrastructure.mapper`，实现领域接口的 `OrderRepositoryImpl` 放在 `infrastructure.repo`。实体主键策略应与 Liquibase 表定义及项目既有规范保持一致：`IdType.ASSIGN_ID` 由应用生成主键，`IdType.AUTO` 需要数据库列具备自增或 identity 定义。技能中的建表示例采用应用生成 `BIGINT` 主键；若选 `AUTO`，须按 MySQL 或 PostgreSQL 方言调整建表 SQL。自定义 SQL/XML 随 Mapper 管理，遵循项目既有资源路径。仓储实现负责 `Order` 与 `OrderEntity` 转换。`BaseMapper`、`IService`、`Page`、`Wrapper` 等 MyBatis-Plus 类型不进入领域接口或 HTTP 契约。已有项目直接复用实体与 Service 接口时，先沿用其既有结构，避免在一个小改动中大规模改造。

普通单表操作可使用 [`BaseMapper`](https://baomidou.com/guides/data-interface/)；复杂查询使用清晰的自定义 Mapper 方法与 SQL/XML。把查询条件、排序白名单和结果映射留在持久化适配层，不为每种查询强行加载完整聚合。

## 查询与更新

- 使用 `LambdaQueryWrapper` 等条件构造器时，让用户输入作为参数值参与绑定；不要把前端提供的列名、排序或 SQL 片段直接拼入语句。动态排序采用服务端允许的字段白名单。参阅[条件构造器](https://baomidou.com/guides/wrapper/)。
- 分页先确认项目是否已配置 `PaginationInnerInterceptor`；从 MyBatis-Plus 3.5.9 起，该插件需要额外的 `mybatis-plus-jsqlparser` 依赖。限制每页条数，并核对自定义 SQL 的分页与总数结果。参阅[分页插件](https://baomidou.com/plugins/pagination/)。
- 更新聚合时先检查业务不变量和事务边界。需要乐观锁时，核对 `@Version`、插件配置以及实际更新方法是否受支持；更新未命中时处理并发冲突，不能把它当作成功。参阅[乐观锁插件](https://baomidou.com/plugins/optimistic-locker/)。
- 逻辑删除属于业务数据生命周期选择。使用 `@TableLogic` 或全局配置前，明确历史数据查询、唯一约束和关联数据行为；不要把业务状态简单替换为删除标志。参阅[逻辑删除](https://baomidou.com/guides/logic-delete/)。
- 修改或删除必须有明确范围。项目需要额外保护时可采用[防全表更新与删除插件](https://baomidou.com/plugins/block-attack/)，但仍需审查调用处的条件。

## 验证

涉及映射、XML、分页、逻辑删除或并发更新时，使用项目的数据库集成测试方式核对实际 SQL 和结果。数据结构变化同步提交[Liquibase 变更集](liquibase.md)，并检查索引与查询计划。
