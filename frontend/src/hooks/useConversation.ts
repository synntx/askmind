import { useToast } from "@/components/ui/toast";
import { convApi } from "@/lib/api";
import { CreateConversation } from "@/lib/validations";
import { Conversation } from "@/types/conversation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";

export const LIST_SPACE_CONVERSATIONS = "list_space_conversations";

export const useGetConversations = (spaceId: string) => {
  return useQuery<Conversation[], AxiosError<ApiError>>({
    queryKey: [LIST_SPACE_CONVERSATIONS],
    queryFn: () => convApi.listSpaceConversations(spaceId),
    retry: 0,
  });
};

export const useCreateConversation = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: CreateConversation) => {
      const res = await convApi.create(data);
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: [LIST_SPACE_CONVERSATIONS] });
      router.push(`/space/${res.space_id}/c/${res.conversation_id}`);
      addToast("Conversation Created Successfully", "success");
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
