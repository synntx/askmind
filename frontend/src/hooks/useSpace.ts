import { useToast } from "@/components/ui/toast";
import { spaceApi } from "@/lib/api";
import { CreateSpace } from "@/lib/validations";
import { AppError } from "@/types/errors";
import { Space } from "@/types/space";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";

export const useGetSpaces = () => {
  return useQuery<Space[], AxiosError<AppError>>({
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
    onError: (error: AxiosError<AppError>) => {
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
      addToast("Space updated successfully", "success", {
        variant: "magical",
      });
    },
    onError: (error: AxiosError<AppError>) => {
      addToast(
        error.response?.data?.error.message || "Failed to update space",
        "error",
        {
          variant: "magical",
        },
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
      addToast("Space deleted successfully", "success", {
        variant: "magical",
      });
    },
    onError: (error: AxiosError<AppError>) => {
      addToast(
        error.response?.data?.error.message || "Failed to delete space",
        "error",
        { variant: "magical" },
      );
    },
  });
};
