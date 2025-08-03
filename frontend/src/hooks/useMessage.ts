import { messageApi } from "@/lib/api";
import { AppError } from "@/types/errors";
import { Message } from "@/types/streaming";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

export const useGetConvMessages = (conversationId: string) => {
  return useQuery<Message[], AxiosError<AppError>>({
    queryKey: [conversationId],
    queryFn: () => messageApi.getConvMessages(conversationId),
    retry: 0,
    enabled: conversationId !== "new",
  });
};

export const useListPrompts = () => {
  return useQuery<string[], AxiosError<AppError>>({
    queryKey: ["prompts"],
    queryFn: () => messageApi.listPrompts(),
    retry: 0,
  });
};
