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
      <h2 className="text-2xl font-medium mb-4 text-center">Login</h2>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
          disabled={isSubmitting || loginMutation.isPending}
          className="w-full bg-[#8A92E3] hover:bg-[#7A82D3] text-black font-medium p-3
            rounded-md transition-colors duration-200 mt-2 relative overflow-hidden
            disabled:opacity-70 disabled:cursor-not-allowed"
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
