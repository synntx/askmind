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
    queryKey: [LIST_SPACE_CONVERSATIONS, spaceId],
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

export const useUpdateTitle = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (data: { id: string; title: string }) => {
      const res = await convApi.updateTitle(data.id, data.title);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LIST_SPACE_CONVERSATIONS] });
      addToast("Conversation Title Updated Successfully", "success");
    },
    onError: (error: AxiosError<AppError>) => {
      addToast(
        error.response?.data?.error.message ||
          "Conversation title update failed",
        "error",
      );
      console.error(
        "Conversation title update failed",
        error.response?.data || error.message,
      );
    },
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (data: { conv_id: string }) => {
      const res = await convApi.delete(data.conv_id);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [LIST_SPACE_CONVERSATIONS] });
      addToast("Conversation Deleted Successfully", "success");
    },
    onError: (error: AxiosError<AppError>) => {
      addToast(
        error.response?.data?.error.message || "Deleting conversation failed",
        "error",
      );
      console.error(
        "Deleting conversation failed",
        error.response?.data || error.message,
      );
    },
  });
};
