export interface SessionRow {
  id: number;
  title: string;
  agent_name: string;
  model: string;
  created_at: string;
  updated_at: string;
  turn_count: number;
  total_input_tokens: number;
  total_output_tokens: number;
  status: string;
  exercise_name: string | null;
}

export interface MessageRow {
  id: number;
  session_id: number;
  role: string;
  sequence: number;
  created_at: string;
}

export interface PartRow {
  id: number;
  message_id: number;
  type: string;
  content: string | null;
  tool_name: string | null;
  tool_call_id: string | null;
  tool_args: string | null;
  tool_result: string | null;
  tool_status: string | null;
  sequence: number;
}

export type UpdatableSessionFields = 'title' | 'status' | 'turn_count' | 'total_input_tokens' | 'total_output_tokens' | 'agent_name';
