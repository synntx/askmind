import { spaceApi } from "@/lib/api";
import { Space } from "@/types/space";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

export const useGetSpaces = () => {
  return useQuery<Space[], AxiosError<ApiError>>({
    queryKey: ["space"],
    queryFn: spaceApi.list,
    retry: 2,
  });
};
