import type React from 'react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '@/lib/context/AppContext';
import { format, parseISO, isToday, isTomorrow, startOfWeek, endOfWeek, addDays, isThisWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Car,
  Plus,
  Search,
  Filter,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Phone,
  MapPin,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Grid3X3,
  List,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react';
import { appointmentService } from '@/lib/services/supabaseService';
import { toast } from 'sonner';
import type { Appointment } from '@/lib/types';
import Modal from '@/components/ui/modal';

const RecordsPage: React.FC = () => {
  // Состояние для загрузки
  const [loading, setLoading] = useState({
    appointments: true,
    saving: false,
    deleting: false
  });

  // Состояние для отображения
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Фильтры и поиск
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'week'>('all');

  // Модальные окна
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number } | null>(null);

  // Форма для добавления/редактирования
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

  const { state, dispatch } = useAppContext();

  // Отслеживание состояния модальных окон
  useEffect(() => {
    console.log('Состояние модальных окон:', {
      showAddModal,
      showEditModal,
      showDetailsModal,
      selectedAppointment: selectedAppointment?.id || null
    });
  }, [showAddModal, showEditModal, showDetailsModal, selectedAppointment]);

  // Загрузка записей
  useEffect(() => {
    const loadAppointments = async () => {
      setLoading(prev => ({ ...prev, appointments: true }));
      try {
        const appointments = await appointmentService.getAll();
        dispatch({ type: 'SET_APPOINTMENTS', payload: appointments });
      } catch (error) {
        console.error('Ошибка при загрузке записей:', error);
        toast.error('Не удалось загрузить записи');
      } finally {
        setLoading(prev => ({ ...prev, appointments: false }));
      }
    };

    loadAppointments();
  }, [dispatch]);

  // Фильтрация записей
  const filteredAppointments = state.appointments.filter(appointment => {
    // Фильтр по статусу
    if (filterStatus !== 'all' && appointment.status !== filterStatus) {
      return false;
    }

    // Фильтр по дате
    const appointmentDate = parseISO(appointment.date);
    if (dateFilter === 'today' && !isToday(appointmentDate)) return false;
    if (dateFilter === 'tomorrow' && !isTomorrow(appointmentDate)) return false;
    if (dateFilter === 'week' && !isThisWeek(appointmentDate)) return false;

    // Поиск
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matches = [
        appointment.carInfo.toLowerCase().includes(searchLower),
        appointment.service.toLowerCase().includes(searchLower),
        appointment.clientName?.toLowerCase().includes(searchLower),
        appointment.clientPhone?.toLowerCase().includes(searchLower)
      ];
      if (!matches.some(match => match)) return false;
    }

    return true;
  });

  // Группировка записей по дням
  const groupedAppointments = filteredAppointments.reduce((groups, appointment) => {
    const date = appointment.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appointment);
    return groups;
  }, {} as Record<string, Appointment[]>);

  // Сортировка групп по дате
  const sortedGroups = Object.entries(groupedAppointments).sort(([a], [b]) =>
    new Date(a).getTime() - new Date(b).getTime()
  );

  // Статистика
  const stats = {
    total: filteredAppointments.length,
    scheduled: filteredAppointments.filter(a => a.status === 'scheduled').length,
    completed: filteredAppointments.filter(a => a.status === 'completed').length,
    cancelled: filteredAppointments.filter(a => a.status === 'cancelled').length,
    today: filteredAppointments.filter(a => isToday(parseISO(a.date))).length,
    tomorrow: filteredAppointments.filter(a => isTomorrow(parseISO(a.date))).length
  };

  // Обработчики
  const handleAddAppointment = (event: React.MouseEvent) => {
    setClickPosition({ x: event.clientX, y: event.clientY });
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

  const handleEditAppointment = (appointment: Appointment, event: React.MouseEvent) => {
    console.log('handleEditAppointment вызван для записи:', appointment.id);
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
    console.log('showEditModal установлен в true');
  };

  const handleViewDetails = (appointment: Appointment, event: React.MouseEvent) => {
    setClickPosition({ x: event.clientX, y: event.clientY });
    setSelectedAppointment(appointment);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDetailsModal(false);
    setSelectedAppointment(null);
    setClickPosition(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.date || !formData.time || !formData.carInfo || !formData.service) {
      toast.error('Заполните все обязательные поля');
      return;
    }

    setLoading(prev => ({ ...prev, saving: true }));

    try {
      if (showEditModal && selectedAppointment) {
        const updatedAppointment: Appointment = {
          ...selectedAppointment,
          ...formData
        };

        console.log('Обновляем запись:', updatedAppointment);
        const success = await appointmentService.update(updatedAppointment);
        if (success) {
          dispatch({ type: 'UPDATE_APPOINTMENT', payload: updatedAppointment });
          toast.success('Запись успешно обновлена');
          handleCloseModal();
        } else {
          toast.error('Не удалось обновить запись');
        }
      } else {
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
      setLoading(prev => ({ ...prev, saving: false }));
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) {
      return;
    }

    setLoading(prev => ({ ...prev, deleting: true }));

    try {
      console.log('Начинаем удаление записи с ID:', id);
      const success = await appointmentService.delete(id);
      if (success) {
        dispatch({ type: 'REMOVE_APPOINTMENT', payload: id });
        toast.success('Запись успешно удалена');
        handleCloseModal();
        console.log('Запись успешно удалена из состояния');
      } else {
        console.error('Не удалось удалить запись из Firebase');
        toast.error('Не удалось удалить запись');
      }
    } catch (error) {
      console.error('Ошибка при удалении записи:', error);
      toast.error('Произошла ошибка при удалении');
    } finally {
      setLoading(prev => ({ ...prev, deleting: false }));
    }
  };

  const handleStatusChange = async (appointment: Appointment, newStatus: 'scheduled' | 'completed' | 'cancelled') => {
    try {
      console.log('Изменяем статус записи', appointment.id, 'на', newStatus);
      const updatedAppointment: Appointment = {
        ...appointment,
        status: newStatus
      };

      const success = await appointmentService.update(updatedAppointment);
      if (success) {
        dispatch({ type: 'UPDATE_APPOINTMENT', payload: updatedAppointment });
        const statusText = newStatus === 'completed' ? 'завершена' :
                          newStatus === 'cancelled' ? 'отменена' : 'запланирована';
        toast.success(`Запись ${statusText}`);
        console.log('Статус записи успешно обновлен');
      } else {
        console.error('Не удалось обновить статус записи в Firebase');
        toast.error('Не удалось обновить статус записи');
      }
    } catch (error) {
      console.error('Ошибка при обновлении статуса:', error);
      toast.error('Произошла ошибка при обновлении статуса');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="w-3 h-3" />;
      case 'completed': return <CheckCircle2 className="w-3 h-3" />;
      case 'cancelled': return <XCircle className="w-3 h-3" />;
      default: return <AlertCircle className="w-3 h-3" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return 'Запланирована';
      case 'completed': return 'Выполнена';
      case 'cancelled': return 'Отменена';
      default: return 'Неизвестно';
    }
  };

  const formatDateGroup = (dateString: string) => {
    const date = parseISO(dateString);
    if (isTomorrow(date)) return 'Завтра';
    return format(date, 'EEEE, d MMMM', { locale: ru });
  };

  // Календарная сетка
  const generateCalendarDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const days = [];

    for (let i = 0; i < 42; i++) {
      const day = addDays(start, i);
      const dayAppointments = state.appointments.filter(a =>
        format(parseISO(a.date), 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
      );
      days.push({ date: day, appointments: dayAppointments });
    }

    return days;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Заголовок и статистика */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground truncate">Записи</h2>
            <p className="text-muted-foreground- mt-1 text-sm">Управление записями на автомойку</p>
          </div>

          <button
            onClick={handleAddAppointment}
            className="mobile-button inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-sm touch-manipulation active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Новая запись
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4">
          <motion.div
            className="mobile-card p-3 sm:p-4 text-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Всего</div>
          </motion.div>

          <motion.div
            className="mobile-card p-3 sm:p-4 text-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
            <div className="text-sm text-muted-foreground">Запланировано</div>
          </motion.div>

          <motion.div
            className="mobile-card p-3 sm:p-4 text-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-muted-foreground">Выполнено</div>
          </motion.div>

          <motion.div
            className="mobile-card p-3 sm:p-4 text-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <div className="text-sm text-muted-foreground">Отменено</div>
          </motion.div>

          <motion.div
            className="mobile-card p-3 sm:p-4 text-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl font-bold text-orange-600">{stats.today}</div>
          </motion.div>

          <motion.div
            className="mobile-card p-3 sm:p-4 text-center"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.2 }}
          >
            <div className="text-2xl font-bold text-purple-600">{stats.tomorrow}</div>
            <div className="text-sm text-muted-foreground">Завтра</div>
          </motion.div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 lg:gap-6">
        {/* Боковая панель с фильтрами */}
        <div className="space-y-4">
          {/* Поиск */}
          <div className="card-with-shadow p-4">
            <label className="block text-sm font-medium mb-2">Поиск</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Поиск по авто, услуге, клиенту..."
                className="w-full pl-10 pr-3 py-2 border border-input rounded-lg bg-background"
              />
            </div>
          </div>

          {/* Фильтры */}
          <div className="card-with-shadow p-4 space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Фильтры
            </h3>

            <div>
              <label className="block text-sm font-medium mb-2">Статус</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background"
              >
                <option value="all">Все статусы</option>
                <option value="scheduled">Запланированные</option>
                <option value="completed">Выполненные</option>
                <option value="cancelled">Отмененные</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Период</label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-input rounded-lg bg-background"
              >
                <option value="all">Все даты</option>

                <option value="tomorrow">Завтра</option>
                <option value="week">Эта неделя</option>
              </select>
            </div>
          </div>

          {/* Переключатель режима просмотра */}
          <div className="card-with-shadow p-4">
            <label className="block text-sm font-medium mb-2">Режим просмотра</label>
            <div className="flex border border-input rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <List className="w-4 h-4 mx-auto" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                <Grid3X3 className="w-4 h-4 mx-auto" />
              </button>
            </div>
          </div>
        </div>

        {/* Основной контент */}
        <div className="card-with-shadow">
          {loading.appointments ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary mr-3" />
              <span className="text-muted-foreground">Загрузка записей...</span>
            </div>
          ) : (
            <>
              {viewMode === 'list' ? (
                <div className="p-6">
                  <AnimatePresence mode="wait">
                    {sortedGroups.length > 0 ? (
                      <motion.div
                        className="space-y-6"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {sortedGroups.map(([date, appointments]) => (
                          <div key={date} className="space-y-3">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{formatDateGroup(date)}</h3>
                              <div className="text-sm text-muted-foreground">
                                {format(parseISO(date), 'dd.MM.yyyy')}
                              </div>
                              <div className="flex-1 border-t border-border"></div>
                              <div className="text-sm text-muted-foreground">
                                {appointments.length} {appointments.length === 1 ? 'запись' : 'записей'}
                              </div>
                            </div>

                            <div className="grid gap-3">
                              {appointments
                                .sort((a, b) => a.time.localeCompare(b.time))
                                .map((appointment) => (
                                <motion.div
                                  key={appointment.id}
                                  className="p-4 border border-border rounded-lg hover:shadow-md transition-all cursor-pointer"
                                  onClick={(e) => handleViewDetails(appointment, e)}
                                  whileHover={{ scale: 1.01 }}
                                  transition={{ duration: 0.2 }}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3 mb-2">
                                        <div className="flex items-center gap-1 text-sm font-medium">
                                          <Clock className="w-4 h-4 text-muted-foreground" />
                                          {appointment.time}
                                        </div>
                                        <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                                          {getStatusIcon(appointment.status)}
                                          {getStatusText(appointment.status)}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 mb-1">
                                        <Car className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">{appointment.carInfo}</span>
                                      </div>

                                      <div className="text-sm text-muted-foreground mb-2">
                                        {appointment.service}
                                      </div>

                                      {(appointment.clientName || appointment.clientPhone) && (
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                          {appointment.clientName && (
                                            <div className="flex items-center gap-1">
                                              <User className="w-3 h-3" />
                                              {appointment.clientName}
                                            </div>
                                          )}
                                          {appointment.clientPhone && (
                                            <div className="flex items-center gap-1">
                                              <Phone className="w-3 h-3" />
                                              {appointment.clientPhone}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1 ml-4">
                                      {appointment.status === 'scheduled' && (
                                        <>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleStatusChange(appointment, 'completed');
                                            }}
                                            className="p-1.5 rounded-md hover:bg-green-100 text-green-600 transition-colors"
                                            title="Отметить как выполненную"
                                          >
                                            <CheckCircle2 className="w-4 h-4" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleStatusChange(appointment, 'cancelled');
                                            }}
                                            className="p-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors"
                                            title="Отменить запись"
                                          >
                                            <XCircle className="w-4 h-4" />
                                          </button>
                                        </>
                                      )}
                                      <button
                                        onClick={(e) => {
                                          console.log('Клик по кнопке редактирования для записи:', appointment.id);
                                          e.stopPropagation();
                                          handleEditAppointment(appointment, e);
                                        }}
                                        className="p-1.5 rounded-md hover:bg-blue-100 text-blue-600 transition-colors"
                                        title="Редактировать"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          console.log('Клик по кнопке удаления для записи:', appointment.id);
                                          e.stopPropagation();
                                          handleDeleteAppointment(appointment.id);
                                        }}
                                        className="p-1.5 rounded-md hover:bg-red-100 text-red-600 transition-colors"
                                        title="Удалить"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.div
                        className="text-center py-12"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium mb-2">Записей не найдено</h3>
                        <p className="text-muted-foreground mb-4">
                          Попробуйте изменить фильтры или создайте новую запись
                        </p>
                        <button
                          onClick={handleAddAppointment}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Создать запись
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                // Календарный режим
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">
                      {format(selectedDate, 'LLLL yyyy', { locale: ru })}
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedDate(addDays(selectedDate, -30))}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setSelectedDate(addDays(selectedDate, 30))}
                        className="p-2 rounded-lg hover:bg-muted transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {/* Заголовки дней недели */}
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                      <div key={day} className="p-3 text-center font-medium text-muted-foreground text-sm">
                        {day}
                      </div>
                    ))}

                    {/* Календарная сетка */}
                    {generateCalendarDays().map(({ date, appointments }, index) => {
                      const isCurrentMonth = date.getMonth() === selectedDate.getMonth();
                      const isTodayDate = isToday(date);

                      return (
                        <motion.div
                          key={index}
                          className={`min-h-[100px] border border-border rounded-lg p-2 ${
                            isCurrentMonth ? 'bg-background' : 'bg-muted/30'
                          } ${isTodayDate ? 'ring-2 ring-primary' : ''}`}
                          whileHover={{ scale: 1.02 }}
                          transition={{ duration: 0.1 }}
                        >
                          <div className={`text-sm font-medium mb-1 ${
                            isTodayDate ? 'text-primary' : isCurrentMonth ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            {format(date, 'd')}
                          </div>

                          <div className="space-y-1">
                            {appointments.slice(0, 3).map(appointment => (
                              <div
                                key={appointment.id}
                                className={`text-xs p-1 rounded cursor-pointer ${getStatusColor(appointment.status)}`}
                                onClick={(e) => handleViewDetails(appointment, e)}
                                title={`${appointment.time} - ${appointment.carInfo}`}
                              >
                                <div className="truncate">
                                  {appointment.time} {appointment.carInfo}
                                </div>
                              </div>
                            ))}

                            {appointments.length > 3 && (
                              <div className="text-xs text-muted-foreground text-center">
                                +{appointments.length - 3} еще
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Модальные окна */}
      <AnimatePresence>
        {(showAddModal || showEditModal) && (
          <Modal
            isOpen={true}
            onClose={handleCloseModal}
            clickPosition={clickPosition}
            className="max-w-lg"
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">
                {showEditModal ? 'Редактировать запись' : 'Новая запись'}
              </h3>

              <form onSubmit={handleSaveAppointment} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-medium mb-1">
                      Дата
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="time" className="block text-sm font-medium mb-1">
                      Время
                    </label>
                    <input
                      type="time"
                      id="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="carInfo" className="block text-sm font-medium mb-1">
                    Автомобиль
                  </label>
                  <input
                    type="text"
                    id="carInfo"
                    name="carInfo"
                    value={formData.carInfo}
                    onChange={handleChange}
                    placeholder="Марка, модель, номер"
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="service" className="block text-sm font-medium mb-1">
                    Услуга
                  </label>
                  <input
                    type="text"
                    id="service"
                    name="service"
                    value={formData.service}
                    onChange={handleChange}
                    placeholder="Описание услуги"
                    className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="clientName" className="block text-sm font-medium mb-1">
                      Имя клиента (опционально)
                    </label>
                    <input
                      type="text"
                      id="clientName"
                      name="clientName"
                      value={formData.clientName || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                    />
                  </div>

                  <div>
                    <label htmlFor="clientPhone" className="block text-sm font-medium mb-1">
                      Телефон (опционально)
                    </label>
                    <input
                      type="tel"
                      id="clientPhone"
                      name="clientPhone"
                      value={formData.clientPhone || ''}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                    />
                  </div>
                </div>

                {showEditModal && (
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium mb-1">
                      Статус
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-input rounded-lg bg-background"
                    >
                      <option value="scheduled">Запланирована</option>
                      <option value="completed">Выполнена</option>
                      <option value="cancelled">Отменена</option>
                    </select>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-input rounded-lg hover:bg-muted transition-colors"
                    disabled={loading.saving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                    disabled={loading.saving}
                  >
                    {loading.saving ? (
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
        )}

        {showDetailsModal && selectedAppointment && (
          <Modal
            isOpen={true}
            onClose={handleCloseModal}
            clickPosition={clickPosition}
            className="max-w-md"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">Детали записи</h3>
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedAppointment.status)}`}>
                  {getStatusIcon(selectedAppointment.status)}
                  {getStatusText(selectedAppointment.status)}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {format(parseISO(selectedAppointment.date), 'dd MMMM yyyy', { locale: ru })}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDateGroup(selectedAppointment.date)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div className="font-medium">{selectedAppointment.time}</div>
                </div>

                <div className="flex items-center gap-3">
                  <Car className="w-5 h-5 text-muted-foreground" />
                  <div className="font-medium">{selectedAppointment.carInfo}</div>
                </div>

                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">Услуга</div>
                    <div className="text-sm text-muted-foreground">{selectedAppointment.service}</div>
                  </div>
                </div>

                {(selectedAppointment.clientName || selectedAppointment.clientPhone) && (
                  <div className="border-t border-border pt-4">
                    <h4 className="font-medium mb-2">Информация о клиенте</h4>
                    {selectedAppointment.clientName && (
                      <div className="flex items-center gap-3 mb-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedAppointment.clientName}</span>
                      </div>
                    )}
                    {selectedAppointment.clientPhone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{selectedAppointment.clientPhone}</span>
                      </div>
                    )}
                  </div>
                )}

                {selectedAppointment.createdAt && (
                  <div className="text-xs text-muted-foreground border-t border-border pt-4">
                    Создано: {(() => {
                      try {
                        const date = typeof selectedAppointment.createdAt === 'string'
                          ? parseISO(selectedAppointment.createdAt)
                          : selectedAppointment.createdAt;

                        // Проверяем валидность даты
                        if (date instanceof Date && isNaN(date.getTime())) {
                          return 'Неизвестная дата';
                        }

                        return format(date, 'dd.MM.yyyy HH:mm');
                      } catch (error) {
                        console.error('Ошибка форматирования даты:', error);
                        return 'Неизвестная дата';
                      }
                    })()}
                  </div>
                )}
              </div>

              <div className="flex justify-between gap-3 pt-4 border-t border-border mt-6">
                {selectedAppointment.status === 'scheduled' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleStatusChange(selectedAppointment, 'completed');
                        handleCloseModal();
                      }}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      Выполнено
                    </button>
                    <button
                      onClick={() => {
                        handleStatusChange(selectedAppointment, 'cancelled');
                        handleCloseModal();
                      }}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    >
                      Отменить
                    </button>
                  </div>
                )}

                <div className="flex gap-2 ml-auto">
                  <button
                    onClick={(e) => {
                      handleCloseModal();
                      handleEditAppointment(selectedAppointment, e);
                    }}
                    className="px-3 py-2 border border-input rounded-lg hover:bg-muted transition-colors text-sm"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteAppointment(selectedAppointment.id);
                    }}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                    disabled={loading.deleting}
                  >
                    {loading.deleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Удалить'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default RecordsPage;
