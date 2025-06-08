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
  });
};
