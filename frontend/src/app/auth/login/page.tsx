"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, LoginFormValues } from "@/lib/validations";
import { useLogin } from "@/hooks/useAuth";

export default function Login() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const loginMutation = useLogin();

  const onSubmit = (data: LoginFormValues) => {
    console.log("Submitted data:", data);
    loginMutation.mutate(data);
  };

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Welcome back
        </h2>
        <p className="text-sm text-muted-foreground">Sign in to your account</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
          disabled={isSubmitting || loginMutation.isPending}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium
            py-3 rounded-lg transition-colors duration-200
            disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loginMutation.isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don't have an account?{" "}
        <Link
          href="/auth/register"
          className="text-primary hover:text-primary/80 transition-colors"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
