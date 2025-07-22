import { userApi } from "@/lib/api";
import { AppError } from "@/types/errors";
import { User } from "@/types/user";
import { useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";

export const useGetUser = () => {
  return useQuery<User, AxiosError<AppError>>({
    queryKey: ["user"],
    queryFn: userApi.me,
    retry: 0,
  });
};

