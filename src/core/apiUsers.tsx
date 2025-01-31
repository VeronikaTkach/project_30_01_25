import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const apiUsers = axios.create({
  baseURL: `${API_BASE_URL}/users`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // куки?
});

// Добавляем токен
apiUsers.interceptors.request.use(
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
apiUsers.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 400:
          console.error('Ошибка 400: Неверные аргументы', data.message);
          break;
        case 401:
          console.error('Ошибка 401: Неавторизованный пользователь, требуется повторный вход', data.message);
          localStorage.removeItem('token');
          break;
        case 403:
          console.error('Ошибка 403: Доступ запрещен, недостаточно прав', data.message);
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

export interface IUser {
  id: number;
  name: string;
  last_name: string;
  email: string;
  phone_number: string;
  telegram: string;
  age: number;
  gender: string;
  isKid: boolean;
  from_referal?: string;
  questionnaire: string;
}

export interface IUserResponse {
  users: IUser[];
}

export interface IUserCreateResponse {
  message: string;
}

// Функция обработки ошибок
const handleApiError = (error: unknown, customMessage: string): never => {
  const axiosError = error as AxiosError<{ message?: string }>;
  const errorMessage = axiosError.response?.data?.message || customMessage;
  throw new Error(errorMessage);
};

// Получение списка всех анкет пользователей
export const getUsers = async (): Promise<IUser[]> => {
  try {
    const response = await apiUsers.get<IUser[]>('/');
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.response?.status === 403) {
      throw new Error('Ошибка 403: Недостаточно прав для просмотра списка пользователей.');
    }
    return handleApiError(axiosError, 'Ошибка загрузки списка пользователей');
  }
};

// Создание анкеты пользователя
export const createUser = async (data: IUser): Promise<IUserCreateResponse> => {
  try {
    const response = await apiUsers.post<IUserCreateResponse>('/', data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const { status } = axiosError.response || {};
    if (status === 400) {
      throw new Error('Ошибка 400: Неверные аргументы при создании анкеты.');
    }
    if (status === 500) {
      throw new Error('Ошибка 500: Ошибка сервера при создании анкеты.');
    }
    return handleApiError(axiosError, 'Ошибка создания анкеты пользователя');
  }
};

export default apiUsers;
