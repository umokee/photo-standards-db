import axios from "axios";
import { BASE_URL } from "../utils/constants";

export type ApiError = {
  code: string;
  message: string;
  details?: {
    errors?: Array<{ field: string; message: string; type: string }>;
    [key: string]: unknown;
  };
  status: number;
};

export const client = axios.create({
  baseURL: BASE_URL,
});

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error.response?.data;

    const ApiError: ApiError = {
      code: data?.code ?? "SERVER_ERROR",
      message: data?.message ?? "Сервер недоступен",
      details: data?.details,
      status: error.response?.status ?? 500,
    };

    error.ApiError = ApiError;
    return Promise.reject(error);
  }
);
