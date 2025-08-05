import type React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '@/lib/context/AppContext';
import { format, parseISO, isToday, isTomorrow, isThisWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import {
  Calendar,
  CheckCircle,
  Clock,
  Edit,
  Filter,
  List,
  Loader2,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { appointmentService } from '@/lib/services/firebaseService';
import { toast } from 'sonner';
import type { Appointment } from '@/lib/types';
import Modal from '@/components/ui/modal';

const RecordsPage: React.FC = () => {
  // Состояние для вкладок и фильтрации
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Состояние для модальных окон и форм
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Реф для модальных окон
  const modalRef = useRef<HTMLDivElement>(null);

  // Состояние для календаря
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Состояние загрузки
  const [loading, setLoading] = useState(true);

  // Состояние формы для добавления/редактирования записи
  const [formData, setFormData] = useState<{
    date: string;
    time: string;
    carInfo: string;
    service: string;
    clientName?: string;
    clientPhone?: string;
    status: 'scheduled' | 'completed' | 'cancelled';
  }>({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00',
    carInfo: '',
    service: '',
    clientName: '',
    clientPhone: '',
    status: 'scheduled'
  });

  // Добавляем состояние для хранения позиции клика
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);

  // Получение данных из контекста
  const { state, dispatch } = useAppContext();

  // Получение списка записей
  useEffect(() => {
    const loadAppointments = async () => {
      setLoading(true);
      try {
        const appointments = await appointmentService.getAll();
        dispatch({ type: 'SET_APPOINTMENTS', payload: appointments });
      } catch (error) {
        console.error('Ошибка при загрузке записей:', error);
        toast.error('Не удалось загрузить записи');
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, [dispatch]);

  // Эффект для закрытия модального окна по клику вне его области
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !(modalRef.current as HTMLElement).contains(event.target as Node)) {
        handleCloseModal();
      }
    }

    // Добавляем обработчик только когда открыто модальное окно
    if (showAddModal || showEditModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAddModal, showEditModal]);

  // Фильтрация записей
  const filteredAppointments = state.appointments.filter(appointment => {
    // Фильтр по статусу
    if (filterStatus !== 'all' && appointment.status !== filterStatus) {
      return false;
    }

    // Фильтр по поиску
    if (searchTerm) {
      const searchTermLower = searchTerm.toLowerCase();
      const carInfoMatch = appointment.carInfo.toLowerCase().includes(searchTermLower);
      const clientNameMatch = appointment.clientName?.toLowerCase().includes(searchTermLower) || false;
      const clientPhoneMatch = appointment.clientPhone?.toLowerCase().includes(searchTermLower) || false;

      if (!carInfoMatch && !clientNameMatch && !clientPhoneMatch) {
        return false;
      }
    }

    // Фильтр по дате для режима календаря
    if (activeTab === 'calendar') {
      const appointmentDate = parseISO(appointment.date);
      const selected = new Date(selectedDate);
      return appointmentDate.getDate() === selected.getDate() &&
             appointmentDate.getMonth() === selected.getMonth() &&
             appointmentDate.getFullYear() === selected.getFullYear();
    }

    return true;
  });

  // Функция для определения периода (сегодня, завтра, эта неделя и т.д.)
  const getDateGroup = (dateString: string): string => {
    const date = parseISO(dateString);
    if (isToday(date)) return 'Сегодня';
    if (isTomorrow(date)) return 'Завтра';
    if (isThisWeek(date)) return 'Эта неделя';
    return 'Позже';
  };

  // Группировка записей по дате для списка
  const groupedAppointments: Record<string, Appointment[]> = {};

  filteredAppointments.forEach(appointment => {
    const group = getDateGroup(appointment.date);
    if (!groupedAppointments[group]) {
      groupedAppointments[group] = [];
    }
    groupedAppointments[group].push(appointment);
  });

  // Обработчик добавления новой записи
  const handleAddAppointment = (event: React.MouseEvent) => {
    // Сохраняем позицию клика для анимации
    setClickPosition({ x: event.clientX, y: event.clientY });

    // Сбрасываем форму к начальным значениям
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      time: '10:00',
      carInfo: '',
      service: '',
      clientName: '',
      clientPhone: '',
      status: 'scheduled'
    });
    setShowAddModal(true);
  };

  // Обработчик редактирования записи
  const handleEditAppointment = (appointment: Appointment, event: React.MouseEvent) => {
    // Сохраняем позицию клика для анимации
    setClickPosition({ x: event.clientX, y: event.clientY });

    setSelectedAppointment(appointment);
    setFormData({
      date: appointment.date,
      time: appointment.time,
      carInfo: appointment.carInfo,
      service: appointment.service,
      clientName: appointment.clientName || '',
      clientPhone: appointment.clientPhone || '',
      status: appointment.status
    });
    setShowEditModal(true);
  };

  // Обработчик закрытия модального окна
  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedAppointment(null);
    setClickPosition(null);
  };

  // Обработчик изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Обработчик изменения даты
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({ ...prev, date: format(date, 'yyyy-MM-dd') }));
    }
  };

  // Обработчик сохранения формы
  const handleSaveAppointment = async () => {
    // Проверка обязательных полей
    if (!formData.date || !formData.time || !formData.carInfo || !formData.service) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    try {
      setLoading(true);

      if (showEditModal && selectedAppointment) {
        // Обновление существующей записи
        const updatedAppointment: Appointment = {
          ...selectedAppointment,
          ...formData
        };

        const success = await appointmentService.update(updatedAppointment);

        if (success) {
          dispatch({ type: 'UPDATE_APPOINTMENT', payload: updatedAppointment });
          toast.success('Запись успешно обновлена');
          handleCloseModal();
        } else {
          toast.error('Не удалось обновить запись');
        }
      } else {
        // Добавление новой записи
        const newAppointment: Omit<Appointment, 'id'> = {
          ...formData,
          createdAt: new Date()
        };

        const addedAppointment = await appointmentService.add(newAppointment);

        if (addedAppointment) {
          dispatch({ type: 'ADD_APPOINTMENT', payload: addedAppointment });
          toast.success('Запись успешно создана');
          handleCloseModal();
        } else {
          toast.error('Не удалось создать запись');
        }
      }
    } catch (error) {
      console.error('Ошибка при сохранении записи:', error);
      toast.error('Произошла ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  // Обработчик удаления записи
  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
      return;
    }

    try {
      setLoading(true);
      const success = await appointmentService.delete(id);

      if (success) {
        dispatch({ type: 'REMOVE_APPOINTMENT', payload: id });
        toast.success('Запись успешно удалена');
      } else {
        toast.error('Не удалось удалить запись');
      }
    } catch (error) {
      console.error('Ошибка при удалении записи:', error);
      toast.error('Произошла ошибка при удалении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      <h2 className="text-2xl font-semibold border-b pb-3">Записи</h2>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Фильтры и поиск */}
        <div className="card-with-shadow w-full md:max-w-xs space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Статус
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground"
            >
              <option value="all">Все записи</option>
              <option value="scheduled">Запланированные</option>
              <option value="completed">Выполненные</option>
              <option value="cancelled">Отмененные</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-foreground">
              Поиск
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Авто, клиент или телефон..."
                className="w-full pl-10 pr-3 py-2 border border-input rounded-lg bg-background text-foreground"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <button
              onClick={(e) => handleAddAppointment(e)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Создать запись
            </button>
          </div>
        </div>

        {/* Основной контент */}
        <div className="flex-1 w-full">
          <div className="card-with-shadow">
            {/* Вкладки */}
            <div className="flex border-b border-border mb-4">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 flex items-center gap-2 ${
                  activeTab === 'list'
                    ? 'border-b-2 border-primary text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List className="h-4 w-4" />
                Список
              </button>
              <button
                onClick={() => setActiveTab('calendar')}
                className={`px-4 py-2 flex items-center gap-2 ${
                  activeTab === 'calendar'
                    ? 'border-b-2 border-primary text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Calendar className="h-4 w-4" />
                Календарь
              </button>
            </div>

            {/* Содержимое в зависимости от активной вкладки */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {activeTab === 'list' ? (
                  <div className="space-y-6">
                    {Object.keys(groupedAppointments).length > 0 ? (
                      Object.entries(groupedAppointments).map(([group, appointments]) => (
                        <div key={group}>
                          <h3 className="text-lg font-medium mb-3 text-foreground">{group}</h3>
                          <div className="space-y-3">
                            {appointments.map(appointment => (
                              <div
                                key={appointment.id}
                                className={`p-4 rounded-lg border ${
                                  appointment.status === 'scheduled' ? 'border-blue-200 bg-blue-50' :
                                  appointment.status === 'completed' ? 'border-green-200 bg-green-50' :
                                  'border-red-200 bg-red-50'
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-foreground">{appointment.carInfo}</p>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Calendar className="w-3.5 h-3.5" />
                                      <span>{format(parseISO(appointment.date), 'dd.MM.yyyy')}</span>
                                      <Clock className="w-3.5 h-3.5 ml-2" />
                                      <span>{appointment.time}</span>
                                    </div>
                                    {appointment.clientName && (
                                      <p className="text-sm mt-1">Клиент: {appointment.clientName} {appointment.clientPhone && `(${appointment.clientPhone})`}</p>
                                    )}
                                    <div className="mt-2">
                                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                        appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                        appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                      }`}>
                                        {appointment.status === 'scheduled' ? 'Запланирована' :
                                         appointment.status === 'completed' ? 'Выполнена' : 'Отменена'}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      className="p-1.5 rounded hover:bg-secondary"
                                      onClick={(e) => handleEditAppointment(appointment, e)}
                                    >
                                      <Edit className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                    <button className="p-1.5 rounded hover:bg-secondary" onClick={() => handleDeleteAppointment(appointment.id)}>
                                      <Trash2 className="w-4 h-4 text-destructive" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        <p>Нет записей, соответствующих выбранным критериям</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-[300px]">
                      <DayPicker
                        locale={ru}
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => date && setSelectedDate(date)}
                        className="bg-card p-3 rounded-lg border border-border"
                        classNames={{
                          day_selected: "bg-primary text-white",
                          day_today: "font-bold",
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-medium mb-3">
                        {format(selectedDate, 'dd MMMM yyyy', { locale: ru })}
                      </h3>

                      <div className="space-y-3">
                        {filteredAppointments.length > 0 ? (
                          filteredAppointments.map(appointment => (
                            <div
                              key={appointment.id}
                              className={`p-4 rounded-lg border ${
                                appointment.status === 'scheduled' ? 'border-blue-200 bg-blue-50' :
                                appointment.status === 'completed' ? 'border-green-200 bg-green-50' :
                                'border-red-200 bg-red-50'
                              }`}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-medium text-foreground">{appointment.carInfo}</p>
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{appointment.time}</span>
                                  </div>
                                  {appointment.clientName && (
                                    <p className="text-sm mt-1">Клиент: {appointment.clientName} {appointment.clientPhone && `(${appointment.clientPhone})`}</p>
                                  )}
                                  <div className="mt-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                      appointment.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                      appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                                      'bg-red-100 text-red-800'
                                    }`}>
                                      {appointment.status === 'scheduled' ? 'Запланирована' :
                                       appointment.status === 'completed' ? 'Выполнена' : 'Отменена'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    className="p-1.5 rounded hover:bg-secondary"
                                    onClick={(e) => handleEditAppointment(appointment, e)}
                                  >
                                    <Edit className="w-4 h-4 text-muted-foreground" />
                                  </button>
                                  <button className="p-1.5 rounded hover:bg-secondary" onClick={() => handleDeleteAppointment(appointment.id)}>
                                    <Trash2 className="w-4 h-4 text-destructive" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-10 text-muted-foreground">
                            <p>Нет записей на выбранную дату</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Модальное окно для добавления/редактирования записи с анимацией */}
          <Modal
            isOpen={showAddModal || showEditModal}
            onClose={handleCloseModal}
            clickPosition={clickPosition}
            className="max-w-lg"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">
                {showEditModal ? 'Редактировать запись' : 'Новая запись'}
              </h3>

              <form onSubmit={handleSaveAppointment}>
                <div className="space-y-4">
                  {/* Дата */}
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium mb-1 text-foreground">
                      Дата
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>

                  {/* Время */}
                  <div>
                    <label htmlFor="time" className="block text-sm font-medium mb-1 text-foreground">
                      Время
                    </label>
                    <input
                      type="time"
                      id="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>

                  {/* Информация об авто */}
                  <div>
                    <label htmlFor="carInfo" className="block text-sm font-medium mb-1 text-foreground">
                      Авто, гос номера
                    </label>
                    <input
                      type="text"
                      id="carInfo"
                      name="carInfo"
                      value={formData.carInfo}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>

                  {/* Услуга */}
                  <div>
                    <label htmlFor="service" className="block text-sm font-medium mb-1 text-foreground">
                      Услуга
                    </label>
                    <input
                      type="text"
                      id="service"
                      name="service"
                      value={formData.service}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input rounded-xl bg-background text-foreground"
                      required
                    />
                  </div>

                  {/* Информация о клиенте (опционально) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="clientName" className="block text-sm font-medium mb-1 text-foreground">
                        Имя клиента (опционально)
                      </label>
                      <input
                        type="text"
                        id="clientName"
                        name="clientName"
                        value={formData.clientName || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-input rounded-xl bg-background text-foreground"
                      />
                    </div>
                    <div>
                      <label htmlFor="clientPhone" className="block text-sm font-medium mb-1 text-foreground">
                        Телефон (опционально)
                      </label>
                      <input
                        type="text"
                        id="clientPhone"
                        name="clientPhone"
                        value={formData.clientPhone || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-input rounded-xl bg-background text-foreground"
                      />
                    </div>
                  </div>

                  {/* Статус (только при редактировании) */}
                  {showEditModal && (
                    <div>
                      <label htmlFor="status" className="block text-sm font-medium mb-1 text-foreground">
                        Статус
                      </label>
                      <select
                        id="status"
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-input rounded-xl bg-background text-foreground"
                      >
                        <option value="scheduled">Запланирована</option>
                        <option value="completed">Выполнена</option>
                        <option value="cancelled">Отменена</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Кнопки действий */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-input rounded-xl hover:bg-secondary/50 transition-colors text-foreground"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : (
                      'Сохранить'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </Modal>
        </div>
      </div>
    </motion.div>
  );
};

export default RecordsPage;
