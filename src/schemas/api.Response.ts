type APIResponse<T> = {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
  } | null;
  meta: {
    requestId: string;
  };
};

export type { APIResponse };

const successResponse = <T>(data: T, requestId: string): APIResponse<T> => {
  return {
    success: true,
    data,
    error: null,
    meta: {
      requestId,
    },
  };
};

const errorResponse = <T>(
  code: string,
  message: string,
  requestId: string,
): APIResponse<T> => {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
    },
    meta: {
      requestId,
    },
  };
};

export { successResponse, errorResponse };
