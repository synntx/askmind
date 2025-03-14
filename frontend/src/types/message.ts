export interface Message {
  message_id: string;
  conversation_id: string;
  role: string;
  content: string;
  tokens_used: number;
  model: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

export type GetMessages = {
  data: Message[];
};
