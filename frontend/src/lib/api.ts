import axios from "axios";
import { Space, SpaceListResponse } from "@/types/space";
import {
  CreateConversation,
  CreateSpace,
  UpdateSpace,
} from "@/lib/validations";
import {
  Conversation,
  ConversationStatus,
  GetConversation,
  GetConversations,
} from "@/types/conversation";
import { GetMessages } from "@/types/streaming";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const spaceApi = {
  list: async () => {
    const res = await api.get<SpaceListResponse>("/space/list");
    console.log(res.data);
    return res.data.data;
  },
  create: async (data: CreateSpace) => {
    const res = await api.post<Space>("/space", data);
    return res.data;
  },
  update: async (id: string, data: UpdateSpace) => {
    const params = new URLSearchParams({ space_id: id });
    await api.put<Space>(`/space/update?${params}`, data);
  },
  delete: async (id: string) => {
    const params = new URLSearchParams({ space_id: id });
    return await api.delete(`/space/delete?${params.toString()}`);
  },
};

// Routes :
// 1. /c/create
// 2. /c/get?conv_id=asd;isdh
// 3. /c/update/title?title=fhsfh&conv_id=shfliadshi
// 4. /c/update/status?status=sfhsj&conv_id=sdfhish
// 5. /c/delete?conv_id=sdfhish
// 6. /c/list/space?space_id=sdfh;oij
// 7. /c/list/user

// &conv.ConversationId,
// &conv.SpaceId,
// &conv.UserId,
// &conv.Title,
// &conv.Status,
// &conv.CreatedAt,
// &conv.UpdatedAt,

export const convApi = {
  create: async (data: CreateConversation) => {
    const res = await api.post<GetConversation>("/c/create", data);
    return res.data.data as Conversation;
  },
  get: async () => {
    const res = await api.get<GetConversation>("/c/get");
    console.log(res.data);
    return res.data.data;
  },
  updateTitle: async (conv_id: string, title: string) => {
    const params = new URLSearchParams({ conv_id: conv_id, title: title });
    await api.put(`/c/update/title?${params}`);
  },
  updateStatus: async (conv_id: string, status: ConversationStatus) => {
    const params = new URLSearchParams({ conv_id: conv_id, status: status });
    await api.put(`/space/update/status?${params}`);
  },
  listSpaceConversations: async (spaceId: string) => {
    const params = new URLSearchParams({ space_id: spaceId });
    const res = await api.get<GetConversations>(`/c/list/space?${params}`);
    return res.data.data;
  },
  delete: async (conv_id: string) => {
    const params = new URLSearchParams({ conv_id: conv_id });
    return await api.delete(`/space/delete?${params}`);
  },
};

export const messageApi = {
  getConvMessages: async (conv_id: string) => {
    const res = await api.get<GetMessages>(
      `/msg/get/all-msgs?conv_id=${conv_id}`,
    );
    console.log(res.data);
    return res.data.data;
  },
};

export default api;
