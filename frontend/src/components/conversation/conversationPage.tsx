import api from "@/lib/api";
import { useParams, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";

const Conversation = () => {
  const { conv_id, space_id } = useParams();
  const searchParams = useSearchParams();
  const query = searchParams.get("q");

  const getCompletion = () => {
    api
      .post(`/c/completion?user_message=${query}&model=idk&conv_id=${conv_id}`, {
        headers: {
          Accept: "text/event-stream",
        },
        responseType: "stream",
        adapter: "fetch",
      })
      .then(async (response) => {
        console.log("axios got a response");
        const stream = response.data;

        const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          console.log(value);
        }
      });
  };

  useEffect(() => {
    getCompletion();
  }, []);

  return <div>Conversation</div>;
};

export default Conversation;
