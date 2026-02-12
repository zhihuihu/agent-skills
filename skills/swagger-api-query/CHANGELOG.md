# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-02-12

### Added
- Initial release of swagger-api-query skill
- Core functionality for querying Swagger/OpenAPI JSON documents
- Commands: list-tags, list-all, tag, search, detail, schema
- Support for custom document paths via --spec parameter
- JSON output format via --format json parameter
- Progressive disclosure design for efficient context usage
- Example API documentation file
- Comprehensive documentation (README, SKILL.md, INSTALL.md)
- MIT License
- Package.json for skills.sh compatibility

### Features
- 🔍 Search APIs by keyword, tag, or path
- 📋 List all endpoints with summary information
- 🎯 Get detailed endpoint information on-demand
- 📊 View schema definitions separately
- 💾 Supports JSON output for programmatic use
- 🌐 Works with any OpenAPI/Swagger JSON document
