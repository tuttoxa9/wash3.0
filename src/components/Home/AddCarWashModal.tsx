import React, { useState, useEffect, useRef } from "react";
import { Plus, X, Loader2, Check, CreditCard, Save } from "lucide-react";
import Modal from "@/components/ui/modal";
import { useAppContext } from "@/lib/context/AppContext";
import { carWashService, appointmentService } from "@/lib/services/supabaseService";
import type { Appointment, EmployeeRole, PaymentMethod } from "@/lib/types";
import { toast } from "sonner";

interface AddCarWashModalProps {
  onClose: () => void;
  selectedDate: string;
  prefilledData?: Appointment | null;
  clickPosition?: { x: number; y: number } | null;
  employeeRoles: Record<string, EmployeeRole>;
  preselectedEmployeeId?: string | null;
  onSuccess?: () => void;
}

const AddCarWashModal: React.FC<AddCarWashModalProps> = ({
  onClose,
  selectedDate,
  prefilledData,
  clickPosition,
  employeeRoles,
  preselectedEmployeeId,
  onSuccess,
}) => {
  const { state, dispatch } = useAppContext();
  const [loading, setLoading] = useState(false);

  // Получаем текущий отчет и его сотрудников
  const currentReport = state.dailyReports[selectedDate] || null;
  const shiftEmployeeIds = currentReport?.employeeIds || [];

  // Начальное состояние формы с учетом предзаполненных данных
  const [formData, setFormData] = useState(() => {
    if (prefilledData) {
      return {
        time: prefilledData.time,
        carInfo: prefilledData.carInfo,
        service: prefilledData.service,
        serviceType: "wash" as "wash" | "dryclean",
        price: 0, // Нужно указать цену
        paymentMethod: { type: "cash" } as PaymentMethod,
        employeeIds: preselectedEmployeeId ? [preselectedEmployeeId] : [],
      };
    }

    return {
      time: format(new Date(), "HH:mm"),
      carInfo: "",
      service: "",
      serviceType: "wash" as "wash" | "dryclean",
      price: 0,
      paymentMethod: { type: "cash" } as PaymentMethod,
      employeeIds: preselectedEmployeeId ? [preselectedEmployeeId] : [],
    };
  });

  // Обработка изменений в форме
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Обработка изменения способа оплаты
  const handlePaymentTypeChange = (
    type: "cash" | "card" | "organization" | "debt" | "certificate",
  ) => {
    setFormData({
      ...formData,
      paymentMethod: {
        type,
        organizationId:
          type === "organization"
            ? formData.paymentMethod.organizationId
            : undefined,
        organizationName:
          type === "organization"
            ? formData.paymentMethod.organizationName
            : undefined,
        comment: type === "debt" ? formData.paymentMethod.comment : undefined,
      },
    });
  };

  // Обработка изменений в выборе организации
  const handleOrganizationChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    const organizationId = e.target.value;
    const organization = state.organizations.find(
      (org) => org.id === organizationId,
    );

    setFormData({
      ...formData,
      paymentMethod: {
        ...formData.paymentMethod,
        organizationId,
        organizationName: organization?.name,
      },
    });
  };

  // Обработка изменений в выборе сотрудников
  const handleEmployeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;

    if (checked) {
      setFormData({
        ...formData,
        employeeIds: [...formData.employeeIds, value],
      });
    } else {
      setFormData({
        ...formData,
        employeeIds: formData.employeeIds.filter((id) => id !== value),
      });
    }
  };

  // Функция для добавления записи в базу данных и отчет
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Проверка валидности данных
    if (!formData.carInfo || !formData.service || !formData.time) {
      toast.error("Заполните все обязательные поля");
      return;
    }

    const price = Number.parseFloat(formData.price.toString());
    if (isNaN(price) || price <= 0) {
      toast.error("Укажите корректную стоимость");
      return;
    }

    // Проверка наличия хотя бы одного сотрудника
    if (formData.employeeIds.length === 0) {
      toast.error("Выберите хотя бы одного сотрудника");
      return;
    }

    setLoading(true);

    try {
      // Подготовка данных записи
      let paymentMethod = { ...formData.paymentMethod };

      // Убедимся, что передаются только нужные поля для каждого типа оплаты
      if (paymentMethod.type === "cash" || paymentMethod.type === "card") {
        paymentMethod = {
          type: paymentMethod.type,
        };
      } else if (paymentMethod.type === "debt") {
        paymentMethod = {
          type: "debt",
          comment: paymentMethod.comment,
        };
      }

      // Проверка необходимых данных для способа оплаты "organization"
      if (
        paymentMethod.type === "organization" &&
        !paymentMethod.organizationId
      ) {
        toast.error("Выберите организацию для оплаты");
        setLoading(false);
        return;
      }

      // Создаем новую запись о мойке с корректной структурой
      const newRecord: Omit<CarWashRecord, "id"> = {
        date: selectedDate,
        time: formData.time,
        carInfo: formData.carInfo,
        service: formData.service,
        serviceType: formData.serviceType,
        price,
        paymentMethod,
        employeeIds: formData.employeeIds,
      };

      console.log("Отправляем данные записи:", JSON.stringify(newRecord));

      // Добавляем запись в базу данных
      const addedRecord = await carWashService.add(newRecord);

      if (addedRecord) {
        // Добавляем запись в отчет
        const success = await dailyReportService.addRecord(
          selectedDate,
          addedRecord,
        );

        if (success) {
          // Обновляем локальное состояние
          dispatch({
            type: "ADD_CAR_WASH_RECORD",
            payload: {
              date: selectedDate,
              record: addedRecord,
            },
          });

          // Если запись была создана из существующей записи на мойку,
          // обновляем статус записи на "completed"
          if (prefilledData) {
            try {
              const updatedAppointment: Appointment = {
                ...prefilledData,
                status: "completed",
              };

              const success =
                await appointmentService.update(updatedAppointment);

              if (success) {
                // Обновляем список записей
                setAppointments(
                  appointments.map((app) =>
                    app.id === appointment.id ? updatedAppointment : app,
                  ),
                );

                // Обновляем в глобальном состоянии
                dispatch({
                  type: "UPDATE_APPOINTMENT",
                  payload: updatedAppointment,
                });

                toast.success("Запись отмечена как выполненная");
              }
            } catch (error) {
              console.error("Ошибка при обновлении статуса записи:", error);
              // Все равно показываем уведомление об успешном добавлении записи о мойке
              toast.success("Запись о мойке успешно добавлена");
            }
          } else {
            toast.success("Запись о мойке успешно добавлена");
          }

          // Вызываем коллбек об успешном добавлении, чтобы обновить списки в родительском компоненте
          if (onSuccess) {
            onSuccess();
          }

          // Закрываем модальное окно
          onClose();
        } else {
          toast.error("Запись добавлена, но не удалось обновить отчет");
          console.error("Ошибка при обновлении отчета");
        }
      } else {
        toast.error("Не удалось добавить запись");
        console.error("Ошибка: addedRecord вернул null");
      }
    } catch (error) {
      console.error("Ошибка при добавлении записи:", error);
      toast.error("Произошла ошибка при добавлении записи");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      clickPosition={clickPosition}
      className="max-w-lg"
    >
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4">Добавить услугу</h3>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Время */}
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
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Информация об авто */}
            <div>
              <label
                htmlFor="carInfo"
                className="block text-sm font-medium mb-1"
              >
                Авто
              </label>
              <input
                type="text"
                id="carInfo"
                name="carInfo"
                value={formData.carInfo}
                onChange={handleChange}
                placeholder="Например: VW Polo, 1234 AB-7"
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Тип услуги */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Тип услуги
              </label>
              <div className="segmented-control mb-3">
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, serviceType: "wash" })
                  }
                  className={formData.serviceType === "wash" ? "active" : ""}
                >
                  Мойка
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, serviceType: "dryclean" })
                  }
                  className={
                    formData.serviceType === "dryclean" ? "active" : ""
                  }
                >
                  Химчистка
                </button>
              </div>
            </div>

            {/* Услуга */}
            <div>
              <label
                htmlFor="service"
                className="block text-sm font-medium mb-1"
              >
                Услуга
              </label>
              <input
                type="text"
                id="service"
                name="service"
                list="services-list"
                value={formData.service}
                onChange={(e) => {
                  const val = e.target.value;
                  const service = state.services.find((s) => s.name === val);
                  if (service) {
                    setFormData((prev) => ({
                      ...prev,
                      service: val,
                      price: service.price,
                    }));
                  } else {
                    setFormData((prev) => ({ ...prev, service: val }));
                  }
                }}
                placeholder={
                  formData.serviceType === "wash"
                    ? "Например: Комплекс"
                    : "Например: Химчистка салона"
                }
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
              <datalist id="services-list">
                {state.services.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.price} BYN
                  </option>
                ))}
              </datalist>
            </div>

            {/* Цена */}
            <div>
              <label htmlFor="price" className="block text-sm font-medium mb-1">
                Стоимость
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            {/* Оплата - новый дизайн с 3 опциями */}
            <div>
              <label className="block text-sm font-medium mb-2">Оплата</label>
              <div className="segmented-control mb-3">
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("cash")}
                  className={
                    formData.paymentMethod.type === "cash" ? "active" : ""
                  }
                >
                  Наличные
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("card")}
                  className={
                    formData.paymentMethod.type === "card" ? "active" : ""
                  }
                >
                  Карта
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("organization")}
                  className={
                    formData.paymentMethod.type === "organization"
                      ? "active"
                      : ""
                  }
                >
                  Безнал
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("debt")}
                  className={
                    formData.paymentMethod.type === "debt" ? "active" : ""
                  }
                >
                  Долг
                </button>
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange("certificate")}
                  className={
                    formData.paymentMethod.type === "certificate" ? "active" : ""
                  }
                >
                  Сертификат
                </button>
              </div>

              {/* Комментарий для долга */}
              {formData.paymentMethod.type === "debt" && (
                <div className="mt-2">
                  <label
                    htmlFor="comment"
                    className="block text-sm font-medium mb-1"
                  >
                    Кто должен / Комментарий
                  </label>
                  <input
                    type="text"
                    id="comment"
                    value={formData.paymentMethod.comment || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paymentMethod: {
                          ...formData.paymentMethod,
                          comment: e.target.value,
                        },
                      })
                    }
                    placeholder="Имя клиента, телефон"
                    className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                    required={formData.paymentMethod.type === "debt"}
                  />
                </div>
              )}

              {/* Выбор организации */}
              {formData.paymentMethod.type === "organization" && (
                <div className="mt-2">
                  <label
                    htmlFor="organizationId"
                    className="block text-sm font-medium mb-1"
                  >
                    Выберите организацию
                  </label>
                  <select
                    id="organizationId"
                    name="organizationId"
                    value={formData.paymentMethod.organizationId || ""}
                    onChange={handleOrganizationChange}
                    className="w-full px-3 py-2 border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-ring"
                    required={formData.paymentMethod.type === "organization"}
                  >
                    <option value="" disabled>
                      Выберите организацию
                    </option>
                    {state.organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  {state.organizations.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Нет доступных организаций. Добавьте их в разделе настроек.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Выбор сотрудников */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Сотрудники, выполнившие работу
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto p-2 border border-input rounded-xl">
                {state.employees.length > 0 ? (
                  // Сортируем сотрудников: сначала те, кто на смене, потом остальные
                  [...state.employees]
                    .sort((a, b) => {
                      const aOnShift = shiftEmployeeIds.includes(a.id);
                      const bOnShift = shiftEmployeeIds.includes(b.id);
                      if (aOnShift && !bOnShift) return -1;
                      if (!aOnShift && bOnShift) return 1;
                      return 0;
                    })
                    .map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="checkbox"
                          id={`employee-${employee.id}`}
                          name="employeeIds"
                          value={employee.id}
                          checked={formData.employeeIds.includes(employee.id)}
                          onChange={handleEmployeeChange}
                          className="rounded border-input text-primary focus:ring-ring"
                        />
                        <label
                          htmlFor={`employee-${employee.id}`}
                          className={`flex-1 flex items-center gap-2 text-sm ${shiftEmployeeIds.includes(employee.id) ? "font-medium" : ""}`}
                        >
                          <span>{employee.name}</span>
                          {shiftEmployeeIds.includes(employee.id) && (
                            <span
                              className={`px-2 py-1 rounded text-xs text-white ${
                                employeeRoles[employee.id] === "admin"
                                  ? "bg-green-500"
                                  : employeeRoles[employee.id] === "washer"
                                    ? "bg-blue-500"
                                    : "bg-gray-500"
                              }`}
                            >
                              {employeeRoles[employee.id] === "admin"
                                ? "Админ"
                                : employeeRoles[employee.id] === "washer"
                                  ? "Мойщик"
                                  : "на смене"}
                            </span>
                          )}
                        </label>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-muted-foreground py-2">
                    Нет доступных сотрудников. Добавьте их в разделе настроек.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-input hover:bg-secondary/50 transition-colors"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-70"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                "Сохранить"
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};


export default AddCarWashModal;
