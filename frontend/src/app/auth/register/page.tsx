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

export default function Register() {
  const router = useRouter();
  const { addToast } = useToast();

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
      addToast("Account created successfully!", "success");
      router.push("/auth/login");
    },
    onError: (error: AxiosError<AppError>) => {
      addToast(
        error.response?.data?.error.message || "Registration failed",
        "error",
      );
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Create an account
        </h2>
        <p className="text-sm text-muted-foreground">
          Get started with your free account
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="First name"
              {...register("first_name")}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background
                outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30
                transition-all placeholder-muted-foreground"
            />
            {errors.first_name && (
              <p className="text-xs text-red-500 mt-1.5 ml-1">
                {errors.first_name.message}
              </p>
            )}
          </div>

          <div className="flex-1">
            <input
              type="text"
              placeholder="Last name"
              {...register("last_name")}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background
                outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30
                transition-all placeholder-muted-foreground"
            />
            {errors.last_name && (
              <p className="text-xs text-red-500 mt-1.5 ml-1">
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
            className="w-full px-4 py-3 rounded-lg border border-border bg-background
              outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30
              transition-all placeholder-muted-foreground"
          />
          {errors.email && (
            <p className="text-xs text-red-500 mt-1.5 ml-1">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <input
            type="password"
            placeholder="Password"
            {...register("password")}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background
              outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30
              transition-all placeholder-muted-foreground"
          />
          {errors.password && (
            <p className="text-xs text-red-500 mt-1.5 ml-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || registerMutation.isPending}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium
            py-3 rounded-lg transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {registerMutation.isPending ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
