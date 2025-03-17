"use client";

import Conversation from "@/components/conversation/conversationPage";
import NewConvInput from "@/components/conversation/newConvInput";
import { useParams } from "next/navigation";
import React from "react";

const Page = () => {
  const { conv_id } = useParams();

  return (
    <>
      <div>
        {conv_id == "new" ? (
          <div>
            <NewConvInput />
          </div>
        ) : (
          <div>
            <Conversation />
          </div>
        )}
      </div>
    </>
  );
};

export default Page;
