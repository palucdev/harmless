import { Database } from 'bun:sqlite';
import sessionsSql from './sql/sessions.sql' with { type: 'text' };
import messagesSql from './sql/messages.sql' with { type: 'text' };
import partsSql from './sql/parts.sql' with { type: 'text' };
import type { MessageRow, PartRow, SessionRow, UpdatableSessionFields } from './types';
import type { AgentConversationItem } from '@/client/responses-client';

export class SessionRepository {
  private db: Database;
  private readonly UPDATABLE_SESSION_FIELDS = new Set(['title', 'status', 'turn_count', 'total_input_tokens', 'total_output_tokens', 'agent_name']);
  private readonly COMPACTION_WINDOW_SIZE: number = Number(process.env.COMPACTION_WINDOW_SIZE) ?? 20;
  private readonly MAX_COMPACTED_TEXT_PER_TURN: number = Number(process.env.MAX_COMPACTED_TEXT_PER_TURN) ?? 500;

  constructor(name = 'sessions.db') {
    this.db = new Database(name);

    this.db.run('PRAGMA synchronous = NORMAL');
    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA busy_timeout = 5000');

    this.createTables();
    this.createIndexes();
  }

  private createTables() {
    this.db.run(sessionsSql);
    this.db.run(messagesSql);
    this.db.run(partsSql);
  }

  private createIndexes() {
    this.db.run('CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_parts_message ON parts(message_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_parts_tool_call_id ON parts(tool_call_id)');
  }

  // Sessions

  public createSession = (title: string, agentName: string, model: string, exerciseName?: string): number => {
    if (exerciseName !== undefined) {
      const result = this.db.prepare('INSERT INTO sessions (title, agent_name, model, exercise_name) VALUES (?, ?, ?, ?)').run(title, agentName, model, exerciseName);
      return Number(result.lastInsertRowid);
    }
    const result = this.db.prepare('INSERT INTO sessions (title, agent_name, model) VALUES (?, ?, ?)').run(title, agentName, model);
    return Number(result.lastInsertRowid);
  };

  public getSession = (id: number): SessionRow | null => {
    return (this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow) ?? null;
  };

  public updateSession = (id: number, updates: Partial<Pick<SessionRow, UpdatableSessionFields>>): void => {
    const fields: string[] = [];
    const values: (string | number | bigint | boolean | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!this.UPDATABLE_SESSION_FIELDS.has(key)) continue;
      fields.push(`${key} = ?`);
      values.push(value);
    }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    values.push(id);

    this.db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  };

  public listSessions = (limit = 20, offset = 0): SessionRow[] => {
    return this.db.prepare('SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?').all(limit, offset) as SessionRow[];
  };

  public completeSession = (id: number): void => {
    this.db.prepare("UPDATE sessions SET status = 'completed', updated_at = datetime('now') WHERE id = ?").run(id);
  };

  public findActiveSessionsByExerciseName = (exerciseName: string): SessionRow[] => {
    return this.db.prepare("SELECT * FROM sessions WHERE exercise_name = ? AND status = 'active' ORDER BY updated_at DESC").all(exerciseName) as SessionRow[];
  };

  // Messages

  public addMessage = (sessionId: number, role: string, sequence: number): number => {
    const result = this.db.prepare('INSERT INTO messages (session_id, role, sequence) VALUES (?, ?, ?)').run(sessionId, role, sequence);
    return Number(result.lastInsertRowid);
  };

  public getMessages = (sessionId: number): MessageRow[] => {
    return this.db.prepare('SELECT * FROM messages WHERE session_id = ? ORDER BY sequence').all(sessionId) as MessageRow[];
  };

  public getNextSequence = (sessionId: number): number => {
    const row = this.db.prepare('SELECT MAX(sequence) AS max_seq FROM messages WHERE session_id = ?').get(sessionId) as { max_seq: number | null } | null;
    return row?.max_seq != null ? row.max_seq + 1 : 0;
  };

  // Parts
  public addPart = (messageId: number, part: Omit<PartRow, 'id' | 'message_id'>): number => {
    const result = this.db
      .prepare('INSERT INTO parts (message_id, type, content, tool_name, tool_call_id, tool_args, tool_result, tool_status, sequence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        messageId,
        part.type,
        part.content ?? null,
        part.tool_name ?? null,
        part.tool_call_id ?? null,
        part.tool_args ?? null,
        part.tool_result ?? null,
        part.tool_status ?? null,
        part.sequence ?? 0
      );
    return Number(result.lastInsertRowid);
  };

  public getPartsForMessage = (messageId: number): PartRow[] => {
    return this.db.prepare('SELECT * FROM parts WHERE message_id = ? ORDER BY sequence').all(messageId) as PartRow[];
  };

  public getPartsForSession = (sessionId: number): (MessageRow & { parts: PartRow[] })[] => {
    const messages = this.getMessages(sessionId);
    return messages.map((msg) => ({
      ...msg,
      parts: this.getPartsForMessage(msg.id),
    }));
  };

  // Composite operations

  public saveConversationItem = (sessionId: number, item: AgentConversationItem, sequence: number): void => {
    const type = (item as any).type;

    if (type === 'message') {
      const role = (item as any).role as string;
      const msgId = this.addMessage(sessionId, role, sequence);
      const content = (item as any).content as any[] | null | undefined;

      if (content) {
        content.forEach((part: any, idx: number) => {
          this.addPart(msgId, {
            type: part.type,
            content: part.text ?? null,
            tool_name: null,
            tool_call_id: null,
            tool_args: null,
            tool_result: null,
            tool_status: null,
            sequence: idx,
          });
        });
      }
    } else if (type === 'function_call') {
      const fc = item as unknown as { name: string; call_id: string; arguments: string; status?: string };
      const msgId = this.addMessage(sessionId, 'assistant', sequence);
      this.addPart(msgId, {
        type: 'function_call',
        content: null,
        tool_name: fc.name,
        tool_call_id: fc.call_id,
        tool_args: fc.arguments,
        tool_result: null,
        tool_status: fc.status ?? null,
        sequence: 0,
      });
    } else if (type === 'function_call_output') {
      const fco = item as unknown as { call_id: string; output: string; status?: string };
      const msgId = this.addMessage(sessionId, 'tool', sequence);
      this.addPart(msgId, {
        type: 'function_call_output',
        content: null,
        tool_name: null,
        tool_call_id: fco.call_id,
        tool_args: null,
        tool_result: fco.output,
        tool_status: fco.status ?? null,
        sequence: 0,
      });
    }
  };

  public loadConversation = (sessionId: number): AgentConversationItem[] => {
    const messagesWithParts = this.getPartsForSession(sessionId);
    const items: AgentConversationItem[] = [];

    for (const msg of messagesWithParts) {
      // Skip system messages — Agent.run() re-adds the system prompt
      if (msg.role === 'system') continue;

      if (msg.parts.length === 0) continue;

      const firstPart = msg.parts[0]!;

      if (firstPart.type === 'function_call') {
        items.push({
          type: 'function_call',
          name: firstPart.tool_name!,
          call_id: firstPart.tool_call_id!,
          arguments: firstPart.tool_args!,
        } as AgentConversationItem);
      } else if (firstPart.type === 'function_call_output') {
        items.push({
          type: 'function_call_output',
          call_id: firstPart.tool_call_id!,
          output: firstPart.tool_result!,
        } as AgentConversationItem);
      } else {
        // message type — rebuild content array
        const content = msg.parts.map((p) => {
          if (p.type === 'input_text') {
            return { type: 'input_text', text: p.content! };
          } else if (p.type === 'output_text') {
            return { type: 'input_text', text: p.content! };
          } else if (p.type === 'compaction') {
            // Compaction summaries are persisted with type 'compaction' but must be
            // sent to the API as input_text (developer role messages).
            return { type: 'input_text', text: p.content! };
          }
          return { type: p.type, text: p.content! };
        });

        if (msg.role === 'assistant') {
          items.push({
            type: 'message',
            role: msg.role,
            content,
          } as AgentConversationItem);
        } else {
          items.push({
            type: 'message',
            role: msg.role as any,
            content,
          } as AgentConversationItem);
        }
      }
    }

    return items;
  };

  public updateTokenUsage = (sessionId: number, inputTokens: number, outputTokens: number): void => {
    this.db
      .prepare("UPDATE sessions SET total_input_tokens = total_input_tokens + ?, total_output_tokens = total_output_tokens + ?, updated_at = datetime('now') WHERE id = ?")
      .run(inputTokens, outputTokens, sessionId);
  };

  // ── Compaction ──────────────────────────────────────────────────

  public compactSession = (sessionId: number): AgentConversationItem[] => {
    const allMessages = this.getMessages(sessionId);

    if (allMessages.length <= this.COMPACTION_WINDOW_SIZE) {
      return this.loadConversation(sessionId);
    }

    const olderMessages = allMessages.slice(0, allMessages.length - this.COMPACTION_WINDOW_SIZE);
    const recentMessages = allMessages.slice(allMessages.length - this.COMPACTION_WINDOW_SIZE);

    // Check for existing compaction message among older messages
    let existingCompactionText = '';
    for (const msg of olderMessages) {
      if (msg.role === 'developer') {
        const parts = this.getPartsForMessage(msg.id);
        const compactionPart = parts.find((p) => p.type === 'compaction');
        if (compactionPart?.content) {
          existingCompactionText = compactionPart.content;
        }
      }
    }

    // Generate summary from older non-compaction messages
    const exchanges: string[] = [];
    let exchangeNum = 1;
    let currentUserText = '';
    let currentTools: string[] = [];
    let currentAssistantText = '';

    const flushExchange = (): void => {
      if (!currentUserText && !currentAssistantText && currentTools.length === 0) return;
      let entry = `${exchangeNum}. User: ${currentUserText.slice(0, this.MAX_COMPACTED_TEXT_PER_TURN)}`;
      if (currentTools.length > 0) {
        entry += `\n   Tools: ${currentTools.join(', ')}`;
      }
      if (currentAssistantText) {
        entry += `\n   Assistant: ${currentAssistantText.slice(0, this.MAX_COMPACTED_TEXT_PER_TURN)}`;
      }
      exchanges.push(entry);
      exchangeNum++;
      currentUserText = '';
      currentTools = [];
      currentAssistantText = '';
    };

    for (const msg of olderMessages) {
      if (msg.role === 'developer') continue; // skip existing compaction messages

      const parts = this.getPartsForMessage(msg.id);

      if (msg.role === 'user') {
        // Flush previous exchange if we have one
        if (currentUserText) flushExchange();
        currentUserText = parts
          .map((p) => p.content ?? '')
          .join(' ')
          .trim();
      } else if (msg.role === 'assistant') {
        const fcPart = parts.find((p) => p.type === 'function_call');
        if (fcPart) {
          const argsStr = fcPart.tool_args ? `(${fcPart.tool_args.slice(0, 50)})` : '()';
          currentTools.push(`${fcPart.tool_name}${argsStr}`);
        } else {
          currentAssistantText = parts
            .map((p) => p.content ?? '')
            .join(' ')
            .trim();
        }
      } else if (msg.role === 'tool') {
        const fcoPart = parts.find((p) => p.type === 'function_call_output');
        if (fcoPart && currentTools.length > 0) {
          const resultSnippet = (fcoPart.tool_result ?? '').slice(0, 50);
          currentTools[currentTools.length - 1] += ` → ${resultSnippet}`;
        }
      }
    }
    flushExchange();

    const exchangeCount = olderMessages.filter((m) => m.role === 'user').length;
    let summaryText = `[Session context — compacted from ${exchangeCount} earlier exchanges]\n\n${exchanges.join('\n')}`;

    if (existingCompactionText) {
      summaryText = `${existingCompactionText}\n\n${summaryText}`;
    }

    // Transactional DB operations

    try {
      this.db.run('BEGIN TRANSACTION');

      // Delete older messages (CASCADE deletes parts)
      const olderIds = olderMessages.map((m) => m.id);
      if (olderIds.length > 0) {
        this.db.prepare(`DELETE FROM messages WHERE id IN (${olderIds.map(() => '?').join(',')})`).run(...olderIds);
      }

      // Insert compaction message at sequence 0
      const compactionMsgId = this.addMessage(sessionId, 'developer', 0);
      this.addPart(compactionMsgId, {
        type: 'compaction',
        content: summaryText,
        tool_name: null,
        tool_call_id: null,
        tool_args: null,
        tool_result: null,
        tool_status: null,
        sequence: 0,
      });

      // Re-sequence recent messages starting from 1
      recentMessages.forEach((msg, idx) => {
        this.db.prepare('UPDATE messages SET sequence = ? WHERE id = ?').run(idx + 1, msg.id);
      });

      // Update session updated_at
      this.db.prepare("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?").run(sessionId);

      this.db.run('COMMIT');
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }

    // Return compaction item + recent conversation items
    const compactionItem: AgentConversationItem = {
      type: 'message',
      role: 'developer',
      content: [{ type: 'input_text', text: summaryText }],
    } as any;

    // Reload recent items from DB (they've been re-sequenced)
    const recentItems = this.loadConversation(sessionId);
    // loadConversation skips system but includes developer — filter to get just the recent ones
    // Actually loadConversation returns all non-system items, so compaction msg + recent
    // We need to return our constructed compaction item + the rest
    const nonCompactionItems = recentItems.filter((item: any) => {
      if (item.type === 'message' && item.role === 'developer') return false;
      return true;
    });

    return [compactionItem, ...nonCompactionItems];
  };

  // ── Delete ──────────────────────────────────────────────────────

  public deleteSession = (id: number): boolean => {
    const result = this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
    return result.changes > 0;
  };

  public deleteAllSessions = (excludeId?: number): number => {
    if (excludeId != null) {
      const result = this.db.prepare('DELETE FROM sessions WHERE id != ?').run(excludeId);
      return result.changes;
    }
    const result = this.db.prepare('DELETE FROM sessions').run();
    return result.changes;
  };

  // ── Cleanup ────────────────────────────────────────────────────

  public close = (): void => {
    this.db.close();
  };
}
