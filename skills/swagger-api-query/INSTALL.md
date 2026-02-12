# Installation Guide

## Prerequisites

- Python 3.6 or higher
- An AI agent that supports the skills.sh standard (e.g., Claude Code, Codex, etc.)

## Installation Methods

### Method 1: Via npx (Recommended)

This is the standard way to install skills from GitHub:

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

This will install the skill to all detected AI agents on your system.

### Method 2: Manual Installation

1. Clone or download this repository
2. Copy the `skills/swagger-api-query` directory to your agent's skills folder:
   - For Claude Code: `~/.claude/skills/`
   - For Codex: `~/.codex/skills/`
   - Or your agent's configured skills directory

3. Restart your agent

### Method 3: Direct Git Clone

```bash
cd ~/.claude/skills  # or your agent's skills directory
git clone https://github.com/zhihuihu/agent-skills.git temp
mv temp/skills/swagger-api-query ./swagger-api-query
rm -rf temp
```

## Verification

After installation, ask your agent:

```
"List all available skills"
```

You should see `swagger-api-query` in the list.

## Testing

To test the skill, place an OpenAPI/Swagger JSON file named `api-docs.json` in your project directory, then ask:

```
"What API endpoints are available in the documentation?"
```

Or specify a custom path:

```
"Query the API documentation at path/to/my-api.json"
```

## Troubleshooting

### Python not found

Make sure Python 3.6+ is installed and available in your PATH:

```bash
python --version
```

### Skill not loading

1. Check that the skill directory structure is correct
2. Verify that `SKILL.md` exists and has valid YAML frontmatter
3. Restart your agent
4. Check agent logs for any error messages

### Script execution errors

Make sure the script has the correct path. The agent should run:

```bash
python skills/swagger-api-query/scripts/swagger_query.py [command]
```

## Uninstallation

To remove the skill:

1. Delete the `swagger-api-query` directory from your agent's skills folder
2. Restart your agent

Or use your agent's skill management command if available.
