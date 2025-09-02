import React from "react";
import Conversation from "@/components/conversation/conversationPage";
import { ConversationLayout } from "@/components/conversation/conversationLayout";

const Page = () => {
  return (
    <ConversationLayout>
      <Conversation />
    </ConversationLayout>
  );
};

export default Page;
