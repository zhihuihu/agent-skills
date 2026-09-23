# 项目结构

根据业务规模决定是否在根包和 DDD 分层之间增加限界上下文。`shop`、`ordering`、`inventory` 是示例名称，实际项目使用团队的业务术语。以下是包结构示例，不要求把每个目录单独做成 Maven/Gradle 模块。

## 简单项目：直接在 `shop` 下分层

业务模型较集中时，`shop` 就是当前业务范围。保留 DDD 的职责边界，不额外增加 `ordering` 一层，也不预建 `model`、`repository`、`service` 等空子包。

```text
src/main/java/com/example/shop/
  ShopApplication.java
  domain/
    Order.java                    # 聚合与业务规则
    repository/
      OrderRepository.java        # 领域需要的仓储接口
  application/
    PlaceOrderService.java        # 用例与事务编排
    port/
      ShippingRateGateway.java    # 用例需要的外部运费能力；有需求时创建
  interapi/                       # 自有前端及内部系统接口；有需求时创建
    controller/
      OrderController.java
    dto/
      PlaceOrderRequest.java
  openapi/                        # 外部合作方接口；有需求时创建
    controller/
      PublicOrderController.java
    dto/
      PublicOrderResponse.java
  infrastructure/
    entity/
      OrderEntity.java            # 数据库映射实体
    mapper/
      OrderMapper.java            # MyBatis-Plus Mapper
    repo/
      OrderRepositoryImpl.java    # 领域仓储接口的实现
    client/
      shipping/
        ShippingRateClient.java   # 第三方运费接口适配
        dto/
          ShippingRateResponse.java
src/test/java/com/example/shop/    # 对应分层的测试
```

只有真实业务规则和持久化边界需要这些类时才创建它们；简单读写也可以减少类的数量，但仍把 HTTP、用例、领域规则和数据库访问放在相应职责位置。

## 复杂项目：先分限界上下文，再分层

当订单、库存等业务有不同模型、独立规则和明确的协作边界时，在 `shop` 下增加业务上下文。每个上下文内部保持相同的 DDD 分层；只有相关代码变多时才继续按聚合或适配器细分。

```text
src/main/java/com/example/shop/
  ShopApplication.java
  ordering/
    OrderManagement.java         # 需要时公开的跨上下文能力
    domain/
      order/
        Order.java
      repository/
        OrderRepository.java
      OrderPlaced.java
    application/
      PlaceOrderService.java
      port/
        ShippingRateGateway.java
    interapi/
      controller/
        OrderController.java
      dto/
        PlaceOrderRequest.java
    openapi/
      controller/
        PublicOrderController.java
      dto/
        PublicOrderResponse.java
    infrastructure/
      entity/
        OrderEntity.java
      mapper/
        OrderMapper.java
      repo/
        OrderRepositoryImpl.java
      client/
        shipping/
          ShippingRateClient.java
          dto/
            ShippingRateResponse.java
  inventory/                      # 只创建库存业务实际需要的分层与入口
```

`interapi` 用于自有前端及内部系统调用的 HTTP 接口，`openapi` 用于向外部合作方提供的 HTTP 接口；两者直接位于根业务包或限界上下文下，是本项目的包名约定，不等同于 OpenAPI 规范。只创建实际用到的入口和 DTO。外部调用由 `application.port` 表达用例所需能力，`infrastructure.client` 封装第三方协议；不需要抽象时不预建端口。`inventory` 中也只创建实际用到的目录。入口调用应用用例，应用层使用领域模型与仓储接口，基础设施实现接口；领域代码不依赖 HTTP 或 MyBatis-Plus 类型。复杂项目仍可保持单个构建模块；需要独立交付或严格隔离时，再按 `shop-app`、`ordering`、`inventory` 等业务边界拆为多个构建模块。

## 工具类与共享代码

先按用途归位：业务计算和规则放在所属上下文的 `domain`；用例专用的转换放在 `application`；HTTP、数据库、外部协议相关的辅助代码放在对应的 `interapi`、`openapi` 或 `infrastructure` 子包。只有确实跨上下文复用、且不依赖业务模型或基础设施的纯通用代码，才在 `shop.common` 下建立按用途命名的包。避免把业务逻辑集中到 `util` 或让 `common` 反向依赖某个业务上下文。

## 数据库资源

Liquibase 文件统一位于 `src/main/resources/sql/`，按数据库方言分目录。只支持一种数据库的项目只需创建对应目录；支持多种数据库时分别维护主 changelog 与 SQL 变更文件。

```text
src/main/resources/
  application.yml
  sql/
    postgresql/
      db.changelog-master.xml
      20260923.sql
    mysql/
      db.changelog-master.xml
      20260923.sql
```

各环境通过 `spring.liquibase.change-log` 选择对应的 XML 主文件；主文件按顺序引入同目录的 formatted SQL。参阅 [Liquibase 约定](liquibase.md)和其中的完整示例。已有项目调整迁移工具时先确认历史基线与执行状态。
