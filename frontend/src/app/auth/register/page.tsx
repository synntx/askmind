"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, RegisterFormValues } from "@/lib/validations";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import api from "@/lib/api";
import { useToast } from "@/components/ui/toast";

export default function Register() {
  const router = useRouter();
  const { addToast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      const response = await api.post("/auth/register", data);
      return response.data;
    },
    onSuccess: (data) => {
      addToast("Registration successful", "success");
      console.log("Registration successful:", data);
      router.push("/auth/login");
    },
    onError: (error: any) => {
      addToast(error.response?.data?.message || "Registration failed", "error");
      console.error(
        "Registration failed:",
        error.response?.data.message || error.message,
      );
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    console.log("Submitted data:", data);
    registerMutation.mutate(data);
  };

  return (
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-medium mb-8 text-center">
        Create an Account
      </h2>
      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label
            htmlFor="first_name"
            className="block text-sm font-medium text-[#CACACA]"
          >
            First Name
          </label>
          <input
            type="text"
            id="first_name"
            placeholder="John"
            {...register("first_name")}
            className="mt-1 block w-full border border-[#282828]  bg-[#1A1A1A] text-sm placeholder:text-sm placeholder-[#767676] rounded-md p-2 focus:outline-none focus:border-[#8A92E3]/40"
          />
          {errors.first_name && (
            <p className="text-xs text-red-500 mt-1">
              {errors.first_name.message}
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="last_name"
            className="block text-sm font-medium text-[#CACACA]"
          >
            Last Name
          </label>
          <input
            type="text"
            id="last_name"
            placeholder="Doe"
            {...register("last_name")}
            className="mt-1 block w-full border border-[#282828]  bg-[#1A1A1A] text-sm placeholder:text-sm placeholder-[#767676] rounded-md p-2 focus:outline-none focus:border-[#8A92E3]/40"
          />
          {errors.last_name && (
            <p className="text-xs text-red-500 mt-1">
              {errors.last_name.message}
            </p>
          )}
        </div>
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
            className="mt-1 block w-full border border-[#282828]  bg-[#1A1A1A] text-sm placeholder:text-sm placeholder-[#767676] rounded-md p-2 focus:outline-none focus:border-[#8A92E3]/40"
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
            placeholder="secure-password..."
            {...register("password")}
            className="mt-1 block w-full border border-[#282828]  bg-[#1A1A1A] text-sm placeholder:text-sm placeholder-[#767676] rounded-md p-2 focus:outline-none focus:border-[#8A92E3]/40"
          />
          {errors.password && (
            <p className="text-xs text-red-500 mt-1">
              {errors.password.message}
            </p>
          )}
        </div>
        <button
          type="submit"
          className="w-full bg-[#D3D3D3] text-black font-medium py-2 rounded-md transition-colors"
        >
          Register
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-[#CACACA]">
        {"Already have an account? "}
        <Link href="/auth/login" className="text-[#8A92E3] hover:underline">
          Login here
        </Link>
      </p>
    </div>
  );
}
