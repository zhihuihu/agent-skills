# 限界上下文与业务模块

从业务流程、术语含义、数据归属和规则差异识别边界。简单项目只有一个主要业务范围时，直接在根业务包（如 `shop`）下组织 `domain`、`application`、`infrastructure`，以及实际需要的 `interapi`、`openapi`。复杂项目中，不同业务范围有独立模型和规则时，再在根包下增加限界上下文层，各上下文内遵循同样的包结构。不要按数据库表数或 Controller 数机械拆分。

复杂项目的上下文名称使用团队的统一语言，例如 `ordering`、`inventory`、`billing`；聚合名称表达领域对象，例如 `Order`；用例名称表达动作，例如 `PlaceOrder`。这些英文名只是示例，应由实际业务语言决定。简单项目无需为了命名而额外增加上下文包。参阅[简单与复杂项目结构](project-structure.md)。

每个上下文明确自己拥有的数据与规则，以及对其他上下文公开的能力。跨上下文使用公开接口或集成事件，不直接依赖对方的 Mapper、持久化对象和内部聚合。外部系统概念需要转换时，在接入边界处理。

只有跨上下文确实共用且语义一致的概念才进入共享模块。Spring Modulith 可辅助验证模块依赖，但目录结构本身不要求引入该依赖。参考 [DDD 模块与限界上下文](https://www.domainlanguage.com/ddd/reference/)和 [Spring Modulith 模块结构](https://docs.spring.io/spring-modulith/reference/fundamentals.html)。
