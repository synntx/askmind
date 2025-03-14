import { messageApi } from "@/lib/api";
import { ApiError } from "@/types/errors";
import { Message } from "@/types/message";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

export const useGetConvMessages = (conversationId: string) => {
  return useQuery<Message[], AxiosError<ApiError>>({
    queryKey: [conversationId],
    queryFn: () => messageApi.getConvMessages(conversationId),
    retry: 0,
  });
};
