import { useToast } from "@/components/ui/toast";
import { convApi } from "@/lib/api";
import { CreateConversation } from "@/lib/validations";
import { Conversation } from "@/types/conversation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

export const LIST_SPACE_CONVERSATIONS = "list_space_conversations";

export const useGetConversations = (spaceId: string) => {
  return useQuery<Conversation[], AxiosError<ApiError>>({
    queryKey: [LIST_SPACE_CONVERSATIONS],
    queryFn: () => convApi.listSpaceConversations(spaceId),
    retry: 0,
  });
};

export const useCreateConversations = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateConversation) => {
      await convApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LIST_SPACE_CONVERSATIONS] });
      addToast("Space Created Successfully", "success");
    },
    onError: (error: any) => {
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
