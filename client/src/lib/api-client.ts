import axios from "axios";
import { BASE_URL } from "../utils/constants";

export class ApiError extends Error {
  code: string;
  status: number;
  details?: {
    errors?: Array<{ field: string; message: string; type: string }>;
    [key: string]: unknown;
  };

  constructor(data: {
    code: string;
    message: string;
    status: number;
    details?: Record<string, unknown>;
  }) {
    super(data.message);
    this.name = "ApiError";
    this.code = data.code;
    this.status = data.status;
    this.details = data.details;
  }
}

export const client = axios.create({
  baseURL: BASE_URL,
});

client.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const data = error.response?.data;
    return Promise.reject(
      new ApiError({
        code: data?.code ?? "SERVER_ERROR",
        message: data?.message ?? "Сервер недоступен",
        status: error.response?.status ?? 500,
        details: data?.details,
      })
    );
  }
);
