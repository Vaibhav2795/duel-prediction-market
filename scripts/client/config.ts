/**
 * Client configuration for API interactions
 */

// API base URL - defaults to localhost:3000
export const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000";

// API endpoints
export const API_ENDPOINTS = {
  CREATE_MATCH: "/matches",
  GET_MATCH: (id: string) => `/matches/${id}`,
  LIST_MATCHES: "/matches",
} as const;

