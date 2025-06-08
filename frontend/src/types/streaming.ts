/**
 * Defines the structure for errors that can occur during the streaming process.
 */
export interface StreamError {
  type:
    | "auth_error"
    | "http_error"
    | "parsing_error"
    | "connection_error"
    | "generation_error" // Errors from the LLM
    | "rate_limit_exceeded"
    | "user_cancelled";
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Represents a tool call made by the assistant, which can be part of a message.
 */
export interface ToolCall {
  name: string;
  /**
   * The result of the tool call. The structure is unknown and should be
   * safely parsed by the component that consumes it.
   */
  result: unknown;
}

/**
 * Represents a complete chat message.
 */
export interface Message {
  message_id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system" | "error" | "tool";
  content: string;
  tokens_used: number;
  model: string;
  tool_calls?: ToolCall[];
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type GetMessages = {
  data: Message[];
};
