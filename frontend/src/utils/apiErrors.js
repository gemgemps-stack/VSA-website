export const getApiErrorStatus = (error) => error?.response?.status;

export const isAuthOrPermissionError = (error) => {
  const status = getApiErrorStatus(error);
  return status === 401 || status === 403;
};

export const getApiErrorMessage = (error, fallbackMessage) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.detail ||
  error?.message ||
  fallbackMessage;
