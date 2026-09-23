# 基础设施层

基础设施负责数据库、缓存、外部 API 和消息等技术接入。简单项目将适配类放在 `shop.infrastructure`；复杂项目放在对应上下文的 `infrastructure` 包，使领域与应用用例不依赖具体客户端。使用 MyBatis-Plus 时，数据库映射类放在 `entity`，Mapper 接口放在 `mapper`，领域仓储接口的实现放在 `repo`，例如 `OrderEntity`、`OrderMapper` 和 `OrderRepositoryImpl`。

调用外部系统的客户端及其协议 DTO 放在 `infrastructure.client.<system>`；该系统专用的签名、序列化等辅助代码也留在这里。调用方需要稳定抽象时，由 `application.port` 定义业务所需能力，客户端适配器实现它。参阅[外部服务集成](integrations/external-services.md)。

- 持久化映射负责领域对象与表结构之间的转换。JPA、MyBatis 或 JDBC 选型以项目现状为准；查询性能与聚合边界都要检查。领域对象与持久化实体之间的转换优先使用手写显式映射或已有项目的 MapStruct，禁止在领域对象中引入持久化框架或映射框架注解。
- 项目使用 MyBatis-Plus 时，按[MyBatis-Plus 持久化](mybatis-plus.md)处理 Mapper、数据对象、分页及插件配置。
- 表结构与受控数据变化提交[Liquibase](liquibase.md)变更集，考虑历史数据、索引、唯一约束和回滚或兼容方案。
- Spring 配置集中管理客户端地址、超时、连接池等运行参数；敏感值使用项目既有的机密配置方式。
- 对外部组件设置可观察的失败行为。重试、熔断和降级应依据操作是否幂等及业务要求配置，避免在多层重复重试。
- 适配器把技术异常转换为应用层能够处理的失败类型，不让数据库或客户端异常决定业务语义。

核对项目使用版本对应的 [Spring Boot 数据访问文档](https://docs.spring.io/spring-boot/reference/data/index.html) 和具体组件官方文档，再采用配置属性或 API。
