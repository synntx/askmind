import { useToast } from "@/components/ui/toast";
import { spaceApi } from "@/lib/api";
import { CreateSpace } from "@/lib/validations";
import { Space } from "@/types/space";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

export const useGetSpaces = () => {
  return useQuery<Space[], AxiosError<ApiError>>({
    queryKey: ["space"],
    queryFn: spaceApi.list,
    retry: 0,
  });
};

export const useCreateSpace = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSpace) => {
      console.log("Data in mutateFn: ", data);
      await spaceApi.create(data);
    },
    onSuccess: (res) => {
      console.log(res);
      queryClient.invalidateQueries({ queryKey: ["space"] });
      addToast("Space Created Successfully", "success");
    },
    onError: (error: any) => {
      addToast(
        error.response?.data?.error.message || "Space creation failed",
        "error",
      );
      console.error(
        "Space creation failed",
        error.response?.data || error.message,
      );
    },
  });
};

export const useUpdateSpace = (spaceId: string) => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateSpace) =>
      await spaceApi.update(spaceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["space"] });
      addToast("Space updated successfully", "success");
    },
    onError: (error: any) => {
      addToast(
        error.response?.data?.error.message || "Failed to update space",
        "error",
      );
    },
  });
};

export const useDeleteSpace = () => {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (spaceId: string) => await spaceApi.delete(spaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["space"] });
      addToast("Space deleted successfully", "success");
    },
    onError: (error: any) => {
      addToast(
        error.response?.data?.error.message || "Failed to delete space",
        "error",
      );
    },
  });
};
