import axios from "axios";
import { BASE_URL } from "../utils/constants";
import { ApiErrorDetails, getErrorMessage } from "./errors";

export class ApiError extends Error {
  code: string;
  status: number;
  details: ApiErrorDetails;

  constructor(data: { code: string; message: string; status: number; details?: ApiErrorDetails }) {
    super(data.message);
    this.name = "ApiError";
    this.code = data.code;
    this.status = data.status;
    this.details = data.details ?? {};
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
        code: data?.code ?? "INTERNAL_SERVER_ERROR",
        message:
          typeof data?.message === "string" && data.message.trim()
            ? data.message
            : getErrorMessage(error),
        status: typeof data?.status === "number" ? data.status : (error.response?.status ?? 500),
        details: data?.details ?? {},
      })
    );
  }
);
