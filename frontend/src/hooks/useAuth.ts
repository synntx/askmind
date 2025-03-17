import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { LoginFormValues } from "@/lib/validations";
import { User } from "@/types/user";
import api from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { AxiosError } from "axios";
import { AppError } from "@/types/errors";

interface LoginResponse {
  status: string;
  data: { token: string; user: User };
}

export const useLogin = () => {
  const router = useRouter();
  const { addToast } = useToast();

  return useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const response = await api.post<LoginResponse>("/auth/login", data);
      return response.data;
    },
    onSuccess: (res: LoginResponse) => {
      console.log(res.data.token);

      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        addToast("Login successful", "success");
        router.push("/space");
      }
    },
    onError: (error: AxiosError<AppError>) => {
      addToast(error.response?.data?.error.message || "Login failed", "error");
      console.error("Login failed:", error.response?.data || error.message);
    },
  });
};
