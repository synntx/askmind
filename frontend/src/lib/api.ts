import axios from "axios";
import { CreateSpaceValues, Space, UpdateSpaceValues } from "./validations";

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
  list: () => api.get<Space[]>("/spaces"),
  create: (data: CreateSpaceValues) => api.post<Space>("/spaces", data),
  update: (id: string, data: UpdateSpaceValues) => 
    api.put<Space>(`/spaces/${id}`, data),
  delete: (id: string) => api.delete(`/spaces/${id}`),
};

export default api;
