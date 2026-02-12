# Agent Skills

A collection of reusable AI agent skills following the [skills.sh](https://skills.sh) standard.

## Quick Start

```bash
npx skills add https://github.com/zhihuihu/agent-skills
```

Or using GitHub shorthand:

```bash
npx skills add zhihuihu/agent-skills
```

That's it! Your AI agent now has access to all skills in this repository.

📖 [View Installation Guide](INSTALLATION.md) | 🚀 [Getting Started Guide](GETTING_STARTED.md)

## Available Skills

### 📚 swagger-api-query

Query and analyze large Swagger/OpenAPI JSON documents on-demand, avoiding loading the entire spec into context.

**Features:**
- 🔍 Search APIs by keyword, tag, or path
- 📋 List all endpoints with summary information
- 🎯 Get detailed endpoint information on-demand
- 📊 View schema definitions separately
- 💾 Supports JSON output for programmatic use

**Usage:**

After installation, ask your agent:
- "Find all user-related endpoints in the API documentation"
- "Show me the login API details"
- "What's the schema for UserDTO?"

[View detailed documentation →](skills/swagger-api-query/README.md)

## Repository Structure

```
skills/
  swagger-api-query/          # Swagger/OpenAPI query skill
    ├── SKILL.md              # Skill definition
    ├── README.md             # Documentation
    ├── scripts/              # Python scripts
    ├── agents/               # Agent configurations
    └── examples/             # Example files
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT - See individual skill directories for details.

## Links

- [skills.sh Directory](https://skills.sh)
- [Anthropic Skills Documentation](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [GitHub Repository](https://github.com/zhihuihu/agent-skills)
