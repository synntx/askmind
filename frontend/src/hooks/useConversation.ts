import { useToast } from "@/components/ui/toast";
import { convApi } from "@/lib/api";
import { CreateConversation } from "@/lib/validations";
import { Conversation } from "@/types/conversation";
import { AppError } from "@/types/errors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

export const LIST_SPACE_CONVERSATIONS = "list_space_conversations";

export const useGetConversations = (spaceId: string) => {
  return useQuery<Conversation[], AxiosError<AppError>>({
    queryKey: [LIST_SPACE_CONVERSATIONS],
    queryFn: () => convApi.listSpaceConversations(spaceId),
    retry: 0,
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateConversation) => {
      const res = await convApi.create(data);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LIST_SPACE_CONVERSATIONS] });
      addToast("Conversation Created Successfully", "success");
    },
    onError: (error: AxiosError<AppError>) => {
      addToast(
        error.response?.data?.error.message || "Conversation creation failed",
        "error",
      );
      console.error(
        "Conversation creation failed",
        error.response?.data || error.message,
      );
    },
  });
};
