--liquibase formatted sql

--changeset sampledev:20260923-001
--preconditions onFail:HALT onError:HALT
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'catalog_item'
--comment: 创建示例商品目录表
CREATE TABLE catalog_item (
    id BIGINT PRIMARY KEY,
    sku VARCHAR(64) NOT NULL,
    title VARCHAR(200) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uk_catalog_item_sku UNIQUE (sku)
);
COMMENT ON TABLE catalog_item IS '示例商品目录';

--rollback DROP TABLE catalog_item;
