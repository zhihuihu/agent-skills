# Getting Started

## Quick Start

### 1. Install

```bash
npx skills add https://github.com/zhihuihu/agent-skills
```

Or using GitHub shorthand:

```bash
npx skills add zhihuihu/agent-skills
```

Or install only the swagger-api-query skill:

```bash
npx skills add zhihuihu/agent-skills --skill swagger-api-query
```

### 2. Use

After installation, your AI agent automatically has access to all skills. No additional configuration needed!

## Using swagger-api-query Skill

### Basic Usage

Simply ask your agent to query API documentation:

```
"What API endpoints are available in the documentation?"
"Find all user-related endpoints"
"Show me the login API details"
```

### With Custom API Document

If your API document is not named `api-docs.json` or is in a different location:

```
"Query the API documentation at path/to/my-api.json"
"Search for upload endpoints in ./docs/api-spec.json"
```

### Example Queries

**Discovery:**
- "List all API categories"
- "What endpoints are available?"
- "Find all POST endpoints"

**Search:**
- "Search for user-related APIs"
- "Find login endpoints"
- "Show me all upload APIs"

**Details:**
- "Show me the details of the /api/users endpoint"
- "What's the request body for creating a user?"
- "What parameters does the login API accept?"

**Schemas:**
- "Explain the UserDTO schema"
- "What fields are in the CreateUserRequest?"
- "Show me the structure of the API response"

## Testing Locally

You can test the skill's Python script directly:

```bash
# Navigate to your project
cd /path/to/your/project

# List all API tags
python ~/.claude/skills/swagger-api-query/scripts/swagger_query.py list-tags

# Search for endpoints
python ~/.claude/skills/swagger-api-query/scripts/swagger_query.py search "user"

# Get endpoint details
python ~/.claude/skills/swagger-api-query/scripts/swagger_query.py detail "/api/users" get
```

## Requirements

- Python 3.6 or higher
- An AI agent that supports skills (Claude Code, Codex, Cursor, etc.)
- OpenAPI/Swagger JSON document

## Troubleshooting

### Skill not found

Make sure you've installed the skills:
```bash
npx skills add https://github.com/zhihuihu/agent-skills
```

Then restart your AI agent.

### Python not found

Install Python 3.6+ and make sure it's in your PATH:
```bash
python --version
```

### API document not found

The skill looks for `api-docs.json` in:
1. Current directory
2. Parent directories
3. Skill directory

You can specify a custom path:
```
"Query the API at /path/to/api-docs.json"
```

## More Information

- [swagger-api-query Documentation](skills/swagger-api-query/README.md)
- [Installation Guide](skills/swagger-api-query/INSTALL.md)
- [GitHub Repository](https://github.com/zhihuihu/agent-skills)
