import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const apiAuth = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Добавляем токен
apiAuth.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Обработка ошибок
apiAuth.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 400:
          console.error('Ошибка 400: Неверные аргументы', data.message);
          break;
        case 401:
          console.error('Ошибка 401: Неверный пароль или неавторизованный пользователь', data.message);
          localStorage.removeItem('token');
          break;
        case 500:
          console.error('Ошибка 500: Ошибка сервера', data.message);
          break;
        default:
          console.error(`Ошибка ${status}:`, data.message);
      }
    }
    return Promise.reject(error);
  }
);

export interface IAuthResponse {
  token: string;
}

export interface ILoginData {
  login: string;
  password: string;
}

export interface IRegisterData {
  login: string;
  password: string;
  name: string;
  lastname: string;
  avatar?: File;
}

// Функция обработки ошибок
const handleApiError = (error: unknown, customMessage: string): never => {
  const axiosError = error as AxiosError<{ message?: string }>;
  const errorMessage = axiosError.response?.data?.message || customMessage;
  throw new Error(errorMessage);
};

// Авторизация пользователя
export const login = async (data: ILoginData): Promise<IAuthResponse> => {
  try {
    const response = await apiAuth.post<IAuthResponse>('/login', data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.response?.status === 400) {
      throw new Error('Ошибка 400: Неверные аргументы при авторизации.');
    }
    if (axiosError.response?.status === 401) {
      throw new Error('Ошибка 401: Неверный пароль.');
    }
    return handleApiError(axiosError, 'Ошибка авторизации');
  }
};

// Регистрация пользователя
export const register = async (data: IRegisterData): Promise<IAuthResponse> => {
  try {
    const formData = new FormData();
    formData.append('login', data.login);
    formData.append('password', data.password);
    formData.append('name', data.name);
    formData.append('lastname', data.lastname);
    if (data.avatar) {
      formData.append('avatar', data.avatar);
    }

    const response = await apiAuth.post<IAuthResponse>('/registration', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.response?.status === 400) {
      throw new Error('Ошибка 400: Неверные аргументы при регистрации.');
    }
    if (axiosError.response?.status === 500) {
      throw new Error('Ошибка 500: Ошибка сервера при регистрации.');
    }
    return handleApiError(axiosError, 'Ошибка регистрации пользователя');
  }
};

export default apiAuth;
