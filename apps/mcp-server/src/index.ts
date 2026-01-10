#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';

import { openMindwtrDb, closeDb } from './db.js';
import { addTask, completeTask, listTasks } from './queries.js';

const args = process.argv.slice(2);

const parseArgs = (argv: string[]) => {
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg || !arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      i += 1;
    } else {
      flags[key] = true;
    }
  }
  return flags;
};

const flags = parseArgs(args);

const dbPath = typeof flags.db === 'string' ? flags.db : undefined;
const readonly = Boolean(flags.readonly);
const keepAlive = Boolean(flags.wait || flags.keepalive || process.env.MINDWTR_MCP_WAIT) || Boolean(process.stdin.isTTY);

const server = new McpServer({
  name: 'mindwtr-mcp-server',
  version: '0.1.0',
});

const listTasksSchema = z.object({
  status: z.string().optional(),
  projectId: z.string().optional(),
  includeDeleted: z.boolean().optional(),
  limit: z.number().int().optional(),
  offset: z.number().int().optional(),
  search: z.string().optional(),
});

const addTaskSchema = z.object({
  title: z.string().optional(),
  quickAdd: z.string().optional(),
  status: z.string().optional(),
  projectId: z.string().optional(),
  dueDate: z.string().optional(),
  startTime: z.string().optional(),
  contexts: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  priority: z.string().optional(),
  timeEstimate: z.string().optional(),
});

const completeTaskSchema = z.object({
  id: z.string(),
});

const withDb = async <T>(fn: (db: Awaited<ReturnType<typeof openMindwtrDb>>['db']) => T): Promise<T> => {
  const { db } = await openMindwtrDb({ dbPath, readonly });
  try {
    return fn(db);
  } finally {
    closeDb(db);
  }
};

server.registerTool(
  'mindwtr.list_tasks',
  {
    description: 'List tasks from the local Mindwtr SQLite database.',
    inputSchema: listTasksSchema,
  },
  async (input) => {
    const tasks = await withDb((db) => listTasks(db, { ...input, status: input.status as any }));
    return {
      content: [{ type: 'text', text: JSON.stringify({ tasks }, null, 2) }],
    };
  },
);

server.registerTool(
  'mindwtr.add_task',
  {
    description: 'Add a task to the local Mindwtr SQLite database.',
    inputSchema: addTaskSchema,
  },
  async (input) => {
    if (readonly) throw new Error('Database opened read-only.');
    const task = await withDb((db) => addTask(db, { ...input, status: input.status as any }));
    return {
      content: [{ type: 'text', text: JSON.stringify({ task }, null, 2) }],
    };
  },
);

server.registerTool(
  'mindwtr.complete_task',
  {
    description: 'Mark a task as done in the local Mindwtr SQLite database.',
    inputSchema: completeTaskSchema,
  },
  async (input) => {
    if (readonly) throw new Error('Database opened read-only.');
    const task = await withDb((db) => completeTask(db, { id: input.id }));
    return {
      content: [{ type: 'text', text: JSON.stringify({ task }, null, 2) }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  if (keepAlive) {
    process.stdin.resume();
    process.stdin.on('end', () => process.exit(0));
    await new Promise(() => {});
  }
}

main().catch((error) => {
  console.error('[mindwtr-mcp] Failed to start:', error);
  process.exit(1);
});
