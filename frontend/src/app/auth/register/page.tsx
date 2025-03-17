"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterFormValues } from "@/lib/validations";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { AxiosError } from "axios";
import { AppError } from "@/types/errors";
import { useRef } from "react";

export default function Register() {
  const router = useRouter();
  const { addToast, clearToasts, removeToast } = useToast();
  const toastIdRef = useRef<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      const response = await api.post("/auth/register", data);
      return response.data;
    },
    onSuccess: () => {
      addToast("Account created!", "success", {
        variant: "magical",
      });
      router.push("/auth/login");
    },
    onError: (error: AxiosError<AppError>) => {
      toastIdRef.current = addToast(
        error.response?.data?.error.message || "Registration failed",
        "error",
        {
          variant: "magical",
          action: {
            label: "Go to Login",
            onClick: () => {
              router.push("login");
              if (toastIdRef.current) {
                removeToast(toastIdRef.current);
              }
              toastIdRef.current = null;
            },
          },
        },
      );
    },
    onSettled: () => {
      clearToasts();
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-medium mb-4 text-center">Join Us</h2>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              placeholder="First name"
              {...register("first_name")}
              className="w-full border border-[#20242f] bg-[#1c1d27] rounded-md p-3
                focus:outline-none focus:ring-1 focus:ring-[#8A92E3]
                transition-all placeholder-[#767676] hover:border-[#3A3F4F]"
            />
            {errors.first_name && (
              <p className="text-xs text-red-400 mt-1">
                {errors.first_name.message}
              </p>
            )}
          </div>

          <div className="flex-1">
            <input
              type="text"
              placeholder="Last name"
              {...register("last_name")}
              className="w-full border border-[#20242f] bg-[#1c1d27] rounded-md p-3
                focus:outline-none focus:ring-1 focus:ring-[#8A92E3]
                transition-all placeholder-[#767676] hover:border-[#3A3F4F]"
            />
            {errors.last_name && (
              <p className="text-xs text-red-400 mt-1">
                {errors.last_name.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <input
            type="email"
            placeholder="Email"
            {...register("email")}
            className="w-full border border-[#20242f] bg-[#1c1d27] rounded-md p-3
              focus:outline-none focus:ring-1 focus:ring-[#8A92E3]
              transition-all placeholder-[#767676] hover:border-[#3A3F4F]"
          />
          {errors.email && (
            <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <input
            type="password"
            placeholder="Password"
            {...register("password")}
            className="w-full border border-[#20242f] bg-[#1c1d27] rounded-md p-3
              focus:outline-none focus:ring-1 focus:ring-[#8A92E3]
              transition-all placeholder-[#767676] hover:border-[#3A3F4F]"
          />
          {errors.password && (
            <p className="text-xs text-red-400 mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || registerMutation.isPending}
          className="w-full bg-[#8A92E3] hover:bg-[#7A82D3] text-black font-medium p-3
            rounded-md transition-colors duration-200 mt-2 relative overflow-hidden
            disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {registerMutation.isPending ? "Creating..." : "Create Account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-[#CACACA]">
        Already have an account?{" "}
        <Link href="/auth/login" className="text-[#8A92E3] hover:underline">
          Login
        </Link>
      </p>
    </div>
  );
}
