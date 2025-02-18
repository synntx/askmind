import axios from "axios";
import { Space } from "@/types/space";
import { CreateSpace, UpdateSpace } from "@/lib/validations";

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
    const res = await api.get<Space[]>("/space/list");
    return res.data;
  },
  create: (data: CreateSpace) => api.post<Space>("/spaces", data),
  update: (id: string, data: UpdateSpace) =>
    api.put<Space>(`/spaces/${id}`, data),
  delete: (id: string) => api.delete(`/spaces/${id}`),
};

export default api;
