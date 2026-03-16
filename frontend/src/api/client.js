import axios from "axios";
import { BASE_URL } from "../utils/constants";

export const client = axios.create({
  baseURL: BASE_URL,
});
