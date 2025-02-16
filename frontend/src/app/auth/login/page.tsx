"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormValues } from "@/lib/validations";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export default function Login() {
  const router = useRouter();
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const response = await api.post("/auth/login", data);
      return response.data;
    },
    onSuccess: (data) => {
      addToast("Login successful", "success");
      localStorage.setItem("token", data.token); 
      router.push("/space"); 
    },
    onError: (error: any) => {
      addToast(
        error.response?.data?.error.message || "Login failed", "error"
      );
      console.error(
        "Login failed:",
        error.response?.data || error.message
      );
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    console.log("Submitted data:", data);
    loginMutation.mutate(data);
  };

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-medium mb-8 text-center">Login</h2>
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[#CACACA]"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            placeholder="yourname@example.com"
            {...register("email")}
            className="mt-1 block w-full border border-[#282828] bg-[#1A1A1A] text-sm placeholder:text-sm placeholder-[#767676] rounded-md p-2 focus:outline-none focus:border-[#8A92E3]/40"
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[#CACACA]"
          >
            Password
          </label>
          <input
            type="password"
            id="password"
            placeholder="your-password..."
            {...register("password")}
            className="mt-1 block w-full border border-[#282828] bg-[#1A1A1A] text-sm placeholder:text-sm placeholder-[#767676] rounded-md p-2 focus:outline-none focus:border-[#8A92E3]/40"
          />
          {errors.password && (
            <p className="text-xs text-red-500 mt-1">
              {errors.password.message}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={loginMutation.isPending}
          className="w-full bg-[#D3D3D3] text-black font-medium py-2 rounded-md transition-colors hover:bg-[#BEBEBE] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loginMutation.isPending ? "Logging in..." : "Login"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-[#CACACA]">
        {"Don't have an account? "}
        <Link href="/auth/register" className="text-[#8A92E3] hover:underline">
          Create a new one
        </Link>
      </p>
    </div>
  );
}
