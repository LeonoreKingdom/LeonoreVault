/**
 * Standardized API response envelope.
 * All API endpoints return data wrapped in this shape.
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

/** Paginated list metadata */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Standardized API error response.
 * Returned when `success` is false.
 */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}

/** Generic paginated request params */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

/** Item list filter params */
export interface ItemFilterParams extends PaginationParams {
  search?: string;
  status?: string;
  category_id?: string;
  location_id?: string;
  tags?: string[];
}
