import { z } from "zod";

export const registerSchema = z.object({
  first_name: z.string().min(1, { message: "First name is required" }),
  last_name: z.string().min(1, { message: "Last name is required" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters" }),
});

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export const createSpaceSchema = z.object({
  Title: z.string().min(0, "Title is required"),
  Description: z.string().min(0, "Description is required"),
});

export const updateSpaceSchema = z.object({
  Title: z.string().optional(),
  Description: z.string().optional(),
});

export const CreateConversationSchema = z.object({
  SpaceId: z.string().uuid(),
  Title: z.string(),
});

// INFER TYPES:
export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type CreateSpace = z.infer<typeof createSpaceSchema>;
export type UpdateSpace = z.infer<typeof updateSpaceSchema>;
export type CreateConversation = z.infer<typeof CreateConversationSchema>;
