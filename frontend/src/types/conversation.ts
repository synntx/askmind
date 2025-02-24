export type ConversationStatus = "active" | "archived";

export interface Conversation {
  conversation_id: string;
  space_id: string;
  user_id: string;
  title: string;
  status: ConversationStatus;
  created_at: string;
  updated_at: string;
}

export type GetConversation = {
  data: Conversation;
};

export type GetConversations = {
  data: Conversation[];
};
