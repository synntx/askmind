export type ConversationStatus = "active" | "archived";

export interface Conversation {
  conversationId: string;
  spaceId: string;
  userId: string;
  title: string;
  status: ConversationStatus;
  createdAt: string;
  updatedAt: string;
}

export type GetConversation = {
  data: Conversation[];
};
