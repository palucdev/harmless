CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    content TEXT,
    tool_name TEXT,
    tool_call_id TEXT,
    tool_args TEXT,
    tool_result TEXT,
    tool_status TEXT,
    sequence INTEGER NOT NULL DEFAULT 0,
    UNIQUE(message_id, sequence)
)