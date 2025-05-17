export interface Message {
  message_id: string;
  conversation_id: string;
  role: string;
  content: string;
  tokens_used: number;
  model: string;
  tool_calls?: ToolCall[];
  metadata: string;
  created_at: string;
  updated_at: string;
}

export type GetMessages = {
  data: Message[];
};

export interface ToolCall {
  name: string;
  // eslint-disable-next-line
  result: any;
}
