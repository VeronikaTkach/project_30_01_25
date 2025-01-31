import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // куки?
});

// Добавляем токен
api.interceptors.request.use(
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
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 400:
          console.error('Ошибка 400: Неверные аргументы', data.message);
          break;
        case 401:
          console.error('Ошибка 401: Неавторизованный пользователь, требуется повторный вход', data.message);
          localStorage.removeItem('token'); // Очистка токена
          break;
        case 403:
          console.error('Ошибка 403: Доступ запрещен', data.message);
          break;
        case 404:
          console.error('Ошибка 404: Не найдено', data.message);
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

// Автоматическая проверка роли администратора в интерцепторе
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 403) {
      console.warn('403: Пользователь не является администратором, выполняем проверку...');
      try {
        const isAdminUser = await isAdmin();
        if (!isAdminUser) {
          console.warn('Пользователь не является администратором');
        }
      } catch (err) {
        console.error('Ошибка при проверке роли администратора:', err);
      }
    }
    return Promise.reject(error);
  }
);

export interface IAdmin {
  id: number;
  name: string;
  lastname: string;
  avatar: string;
  referal: string;
  count_users: number;
}

export interface IAvatarResponse {
  src: string;
}

export interface IIsAdminResponse {
  isAdmin: boolean;
}

export interface IReferralResponse {
  link: string;
}

export interface IChangePasswordData {
  oldPassword: string;
  newPassword: string;
}

// Функция обработки ошибок
const handleApiError = (error: unknown, customMessage: string): never => {
  const axiosError = error as AxiosError<{ message?: string }>;
  const errorMessage = axiosError.response?.data?.message || customMessage;
  throw new Error(errorMessage);
};

// Получения списка администраторов
export const getAdmins = async (): Promise<IAdmin[]> => {
  try {
    const response = await api.get<IAdmin[]>('/admins');
    return response.data;
  } catch (error) {
    console.error('Ошибка загрузки администраторов:', error);
    throw error;
  }
};

// Получение текущего аватара администратора
export const getAdminAvatar = async (): Promise<IAvatarResponse> => {
  try {
    const response = await api.get<IAvatarResponse>('/admins/avatar');
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 204) {
      return Promise.reject(new Error('У пользователя нет фото, установлено стандартное изображение.'));
    }
    if (axiosError.response?.status === 400) {
      return Promise.reject(new Error('Ошибка 400: Неверные аргументы при получении аватара.'));
    }
    return handleApiError(axiosError, 'Ошибка получения аватара администратора');
  }
};

// Обновление аватара администратора (отправка FormData)
export const updateAdminAvatar = async (file: File): Promise<IAvatarResponse> => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.patch<IAvatarResponse>('/admins/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    const { status } = axiosError.response || {};
    if (status === 400) {
      return Promise.reject(new Error('Ошибка 400: Неверные аргументы при загрузке аватара.'));
    }
    if (status === 403) {
      return Promise.reject(new Error('Ошибка 403: У пользователя недостаточно прав.'));
    }
    if (status === 500) {
      return Promise.reject(new Error('Ошибка 500: Ошибка сервера или изображение весит больше 10МБ.'));
    }
    return handleApiError(axiosError, 'Ошибка обновления аватара администратора');
  }
};

// Удаление аватара администратора
export const deleteAdminAvatar = async (): Promise<string> => {
  try {
    const response = await api.delete<string>('/admins/avatar');
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    const { status } = axiosError.response || {};
    if (status === 400) {
      return Promise.reject(new Error('Ошибка 400: Неверный запрос при удалении аватара.'));
    }
    if (status === 404) {
      return Promise.reject(new Error('Ошибка 404: Аватар не найден.'));
    }
    if (status === 500) {
      return Promise.reject(new Error('Ошибка 500: Ошибка сервера при удалении аватара.'));
    }
    return handleApiError(axiosError, 'Ошибка удаления аватара администратора');
  }
};

// Проверка, является ли пользователь администратором
export const isAdmin = async (): Promise<boolean> => {
  try {
    const response = await api.get<IIsAdminResponse>('/admins/isAdmin');
    return response.data.isAdmin;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.response?.status === 400) {
      throw new Error('Ошибка 400: Неверные аргументы при проверке роли администратора.');
    }
    if (axiosError.response?.status === 500) {
      throw new Error('Ошибка 500: Ошибка сервера при проверке роли администратора.');
    }
    return handleApiError(axiosError, 'Ошибка проверки роли администратора');
  }
};

// Получение реферальной ссылки
export const getReferralLink = async (): Promise<IReferralResponse> => {
  try {
    const response = await api.get<IReferralResponse>('/admins/referal');
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.response?.status === 400) {
      throw new Error('Ошибка 400: Неверные аргументы при получении реферальной ссылки.');
    }
    if (axiosError.response?.status === 500) {
      throw new Error('Ошибка 500: Ошибка сервера при получении реферальной ссылки.');
    }
    return handleApiError(axiosError, 'Ошибка получения реферальной ссылки');
  }
};

// Изменение пароля администратора
export const changePassword = async (data: IChangePasswordData): Promise<string> => {
  try {
    const response = await api.patch<string>('/admins/password', data);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const { status } = axiosError.response || {};
    if (status === 400) {
      throw new Error('Ошибка 400: Неверные аргументы при смене пароля.');
    }
    if (status === 403) {
      throw new Error('Ошибка 403: Недостаточно прав для смены пароля.');
    }
    if (status === 500) {
      throw new Error('Ошибка 500: Ошибка сервера при смене пароля.');
    }
    return handleApiError(axiosError, 'Ошибка смены пароля');
  }
};

export default api;
