# Swagger API Query Skill

Query and analyze large Swagger/OpenAPI JSON documents on-demand, avoiding loading the entire spec into context.

## Features

- 🔍 Search APIs by keyword, tag, or path
- 📋 List all endpoints with summary information
- 🎯 Get detailed endpoint information on-demand
- 📊 View schema definitions separately
- 💾 Supports JSON output for programmatic use
- 🌐 Works with any OpenAPI/Swagger JSON document

## Installation

### Via npx (Recommended)

```bash
npx skills add https://github.com/zhihuihu/agent-skills
```

Or using GitHub shorthand:

```bash
npx skills add zhihuihu/agent-skills
```

Or install only this skill:

```bash
npx skills add zhihuihu/agent-skills --skill swagger-api-query
```

### Manual Installation

See [INSTALL.md](INSTALL.md) for detailed installation instructions.

## Usage

Once installed, your AI agent can automatically query Swagger/OpenAPI documentation. Simply ask:

**Example queries:**
- "What API endpoints are available?"
- "Find all user-related endpoints"
- "Show me the login API details"
- "What's the request body for creating a user?"
- "Explain the UserDTO schema"

**With custom API document:**
- "Query the API documentation at path/to/api-docs.json"
- "Search for upload endpoints in my-api.json"

## How It Works

This skill uses **progressive disclosure** to efficiently work with large API documents:

1. **Level 1**: Agent loads skill metadata (name + description) at startup
2. **Level 2**: Agent reads SKILL.md when the skill is relevant
3. **Level 3**: Agent queries specific endpoints/schemas only when needed

This approach keeps context usage minimal while providing access to complete API documentation.

## Command Reference

The skill provides a Python script that can be used directly:

```bash
# List all API categories/tags
python scripts/swagger_query.py list-tags

# List all endpoints
python scripts/swagger_query.py list-all

# Search by keyword
python scripts/swagger_query.py search "user"

# Get endpoints by tag
python scripts/swagger_query.py tag "User Management"

# Get endpoint details
python scripts/swagger_query.py detail "/api/users" get

# View schema definition
python scripts/swagger_query.py schema "UserDTO"

# Specify custom API document path
python scripts/swagger_query.py --spec path/to/api-docs.json list-all

# Get JSON output
python scripts/swagger_query.py --format json search "login"
```

## Requirements

- Python 3.6+
- OpenAPI/Swagger JSON file (defaults to `api-docs.json`)

## Examples

See the `examples/` directory for sample API documents.

## License

MIT
