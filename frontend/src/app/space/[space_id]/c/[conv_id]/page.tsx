"use client";

import Conversation from "@/components/conversation/conversationPage";
import NewConvInput from "@/components/conversation/newConvInput";
import { useParams, useSearchParams } from "next/navigation";
import React from "react";

const page = () => {
  const { conv_id, space_id } = useParams();
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  return (
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
  );
};

export default page;
