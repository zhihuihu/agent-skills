# Installation Guide

## Quick Install

### Option 1: Full GitHub URL (Recommended)

```bash
npx skills add https://github.com/zhihuihu/agent-skills
```

### Option 2: GitHub Shorthand

```bash
npx skills add zhihuihu/agent-skills
```

Both commands do the same thing - install all skills from this repository.

## Install Specific Skill Only

If you only want to install a specific skill (e.g., `swagger-api-query`):

```bash
npx skills add https://github.com/zhihuihu/agent-skills --skill swagger-api-query
```

Or using shorthand:

```bash
npx skills add zhihuihu/agent-skills --skill swagger-api-query
```

## Installation Options

### Common Options

```bash
# List available skills without installing
npx skills add zhihuihu/agent-skills --list

# Install to specific agents
npx skills add zhihuihu/agent-skills -a claude-code -a cursor

# Install globally (available across all projects)
npx skills add zhihuihu/agent-skills -g

# Non-interactive installation (skip prompts)
npx skills add zhihuihu/agent-skills -y

# Install all skills to all agents
npx skills add zhihuihu/agent-skills --all
```

### Option Reference

| Option | Description |
|--------|-------------|
| `-g, --global` | Install to user directory instead of project |
| `-a, --agent <agents...>` | Target specific agents (e.g., claude-code, codex) |
| `-s, --skill <skills...>` | Install specific skills by name |
| `-l, --list` | List available skills without installing |
| `-y, --yes` | Skip all confirmation prompts |
| `--all` | Install all skills to all agents without prompts |

## What Gets Installed

The `skills` CLI will:

1. Detect which AI agents you have installed (Claude Code, Codex, Cursor, etc.)
2. Automatically install skills to the correct directories for each agent
3. Make all skills immediately available to your agents

## Installation Scope

### Project Scope (Default)

```bash
npx skills add zhihuihu/agent-skills
```

Installs to `./<agent>/skills/` - committed with your project, shared with team.

### Global Scope

```bash
npx skills add zhihuihu/agent-skills -g
```

Installs to `~/<agent>/skills/` - available across all projects.

## Supported Agents

- ✅ Claude Code (`~/.claude/skills/`)
- ✅ Codex (`~/.codex/skills/`)
- ✅ Cursor (`~/.cursor/skills/`)
- ✅ OpenCode (`.agents/skills/`)
- ✅ Antigravity (`.agent/skills/`)
- ✅ Cline (`.cline/skills/`)
- ✅ GitHub Copilot (`.agents/skills/`)
- ✅ Windsurf (`.windsurf/skills/`)
- ✅ Kiro CLI (`.kiro/skills/`)
- ✅ And 30+ more...

## Verify Installation

After installation, restart your AI agent and ask:

```
"List all available skills"
```

You should see `swagger-api-query` in the list.

## Update Skills

Check for updates:

```bash
npx skills check
```

Update all installed skills:

```bash
npx skills update
```

## Uninstall

Remove a specific skill:

```bash
npx skills remove swagger-api-query
```

Remove from global scope:

```bash
npx skills remove swagger-api-query -g
```

List installed skills:

```bash
npx skills list
```

## Troubleshooting

### "No skills found"

Ensure the repository contains valid SKILL.md files with both `name` and `description` in the frontmatter.

### Skill not loading in agent

1. Verify the skill was installed to the correct path
2. Restart your AI agent
3. Check the agent's documentation for skill loading requirements
4. Ensure the SKILL.md frontmatter is valid YAML

### Permission errors

Ensure you have write access to the target directory. You may need to use the `-g` flag for global installation.

### Command not found: skills

Make sure you have Node.js and npm installed:

```bash
node --version
npm --version
```

## More Information

- [Getting Started Guide](GETTING_STARTED.md)
- [swagger-api-query Documentation](skills/swagger-api-query/README.md)
- [GitHub Repository](https://github.com/zhihuihu/agent-skills)
- [skills.sh Directory](https://skills.sh)
- [Official Skills CLI](https://github.com/vercel-labs/skills)
