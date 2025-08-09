import { useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { employeeService, serviceService, dailyReportService } from '../services/supabaseService';
import { format } from 'date-fns';

// Хук для загрузки данных из Firebase
export function useFirebaseData() {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState({
    employees: true,
    services: true,
    dailyReport: true
  });
  const [error, setError] = useState<string | null>(null);

  // Загрузка списка сотрудников
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const employees = await employeeService.getAll();
        dispatch({ type: 'SET_EMPLOYEES', payload: employees });
      } catch (err) {
        console.error('Ошибка при загрузке сотрудников:', err);
        setError('Не удалось загрузить список сотрудников');
      } finally {
        setLoading(prev => ({ ...prev, employees: false }));
      }
    };

    loadEmployees();
  }, [dispatch]);

  // Загрузка списка услуг
  useEffect(() => {
    const loadServices = async () => {
      try {
        const services = await serviceService.getAll();
        dispatch({ type: 'SET_SERVICES', payload: services });
      } catch (err) {
        console.error('Ошибка при загрузке услуг:', err);
        setError('Не удалось загрузить список услуг');
      } finally {
        setLoading(prev => ({ ...prev, services: false }));
      }
    };

    loadServices();
  }, [dispatch]);

  // Загрузка отчета за текущий день
  useEffect(() => {
    const loadDailyReport = async () => {
      if (!state.currentDate) return;

      try {
        setLoading(prev => ({ ...prev, dailyReport: true }));
        const report = await dailyReportService.getByDate(state.currentDate);

        if (report) {
          dispatch({
            type: 'SET_DAILY_REPORT',
            payload: { date: state.currentDate, report }
          });
        }
      } catch (err) {
        console.error('Ошибка при загрузке отчета:', err);
        setError('Не удалось загрузить отчет за текущий день');
      } finally {
        setLoading(prev => ({ ...prev, dailyReport: false }));
      }
    };

    loadDailyReport();
  }, [state.currentDate, dispatch]);

  // Изменение текущей даты
  const changeDate = (date: Date) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    dispatch({ type: 'SET_CURRENT_DATE', payload: formattedDate });
  };

  return {
    loading,
    error,
    changeDate,
    isLoading: Object.values(loading).some(Boolean)
  };
}
