import React, { useState, useMemo, useEffect } from "react";
import {
  HelpCircle,
  Search,
  X,
  ChevronRight,
  Clock,
  PlusCircle,
  CreditCard,
  Wallet,
  AlertCircle,
  Calculator,
  ArrowLeft,
  Banknote
} from "lucide-react";

interface HelpSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const sections: HelpSection[] = [
  {
    id: "shift",
    title: "Рабочая смена",
    description: "Открытие и закрытие дня, выбор персонала и ролей",
    icon: <Clock className="w-5 h-5 text-blue-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Начало работы</h3>
          <p className="mb-4">Каждый рабочий день начинается с открытия смены. Без этого невозможно добавлять услуги и вести учет.</p>

          <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-foreground flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">1</span>
              Дата смены
            </h4>
            <p className="pl-8 text-muted-foreground">По умолчанию стоит сегодняшний день. Для внесения данных за прошедший период выберите нужную дату в календаре.</p>

            <h4 className="font-bold text-foreground flex items-center gap-2 mt-4">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs">2</span>
              Состав и роли
            </h4>
            <p className="pl-8 text-muted-foreground">Отметьте сотрудников, которые сегодня работают, укажите их роли и необходимость учета минимальной оплаты за выход.</p>
          </div>
        </div>

        <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl">
          <h4 className="flex items-center gap-2 font-bold text-amber-600 mb-2">
            <AlertCircle className="w-5 h-5" /> Важное предупреждение
          </h4>
          <p className="text-amber-600/90 text-sm">
            Если вы ошиблись при открытии смены, используйте кнопку <strong>«Изменить состав»</strong>.
            <br/><br/>
            <strong>Внимание:</strong> Если снять галочки со всех сотрудников и сохранить — текущая смена и все данные за этот день будут <strong>ПОЛНОСТЬЮ УДАЛЕНЫ</strong>. Потребуется пароль от настроек.
          </p>
        </div>
      </div>
    ),
  },

  {
    id: "services",
    title: "Учет услуг",
    description: "Как правильно записывать автомобили и исполнителей",
    icon: <PlusCircle className="w-5 h-5 text-green-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-4">Создание новой записи</h3>
          <p className="mb-5 text-muted-foreground">Нажмите основную синюю кнопку <strong>«Добавить услугу»</strong> или кнопку с плюсиком (+) на карточке конкретного сотрудника.</p>

          <div className="grid gap-4">
            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-foreground mb-1 text-base">Машина и Услуга</h4>
              <p className="text-muted-foreground">Укажите марку или номер автомобиля и краткое название услуги.</p>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
              <h4 className="font-bold text-foreground mb-1 text-base">Исполнители</h4>
              <p className="text-muted-foreground">
                Введите полную стоимость услуги. При выборе нескольких сотрудников выручка и зарплата автоматически разделятся между ними поровну.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  {
    id: "payments",
    title: "Оплата и Долги",
    description: "Наличные, карты, безнал, сертификаты и должники",
    icon: <CreditCard className="w-5 h-5 text-indigo-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Способы оплаты</h3>
          <div className="space-y-3">
            <div className="p-4 bg-muted/20 border border-border/50 rounded-2xl">
              <h4 className="font-bold text-foreground text-base">Наличные и Карта</h4>
              <p className="text-muted-foreground mt-1">Обычная оплата от физлиц. Наличные сразу попадают в "Состояние кассы".</p>
            </div>

            <div className="p-4 bg-muted/20 border border-border/50 rounded-2xl">
              <h4 className="font-bold text-foreground text-base">Безналичные (Организации)</h4>
              <p className="text-muted-foreground mt-1">Выберите организацию из списка (настраивается в Настройках). Если включено «Учитывать в общей сумме», оплата добавится к выручке дня.</p>
            </div>

            <div className="p-4 bg-muted/20 border border-border/50 rounded-2xl">
              <h4 className="font-bold text-foreground text-base">Сертификаты</h4>
              <p className="text-muted-foreground mt-1"><strong>Продажа:</strong> Деньги сразу в кассу, ЗП не начисляется. <strong>Использование:</strong> Выберите способ оплаты «Сертификат», деньги в кассу не идут, ЗП сотрудникам начисляется.</p>
            </div>

            <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl">
              <h4 className="font-bold text-red-600 dark:text-red-500 text-base">Долги</h4>
              <p className="text-muted-foreground mt-1">Выберите способ оплаты «Долг». Зарплата сотрудникам начислится сразу. Когда клиент принесет деньги, найдите его в виджете «Активные долги» и нажмите галочку — сумма добавится в кассу текущей смены.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  {
    id: "cash-safe",
    title: "Касса, Сейф и Расходы",
    description: "Учет наличных, сверка и операции с сейфом",
    icon: <Wallet className="w-5 h-5 text-amber-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Движение наличных</h3>
          <p className="mb-4">Виджет <strong>«Состояние кассы»</strong> на главной странице показывает сумму на начало дня и ожидаемый остаток с учетом всех оплат наличными.</p>

          <div className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Banknote className="w-4 h-4"/> Сверка кассы</h4>
              <p>В конце смены нажмите <strong>«Сверить кассу»</strong>. Введите физическую сумму в ящике. Система покажет излишек или недостачу.</p>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><PlusCircle className="w-4 h-4"/> Внесения и Изъятия</h4>
              <p>Нажмите на плитку <strong>«Наличные»</strong> в блоке «Итого». Используйте <em>Внесение</em> для размена и <em>Изъятие</em> для покупки расходников или инкассации. Эти операции не влияют на зарплату.</p>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2"><Wallet className="w-4 h-4"/> Глобальный сейф</h4>
              <p>Излишки из кассы можно перенести в глобальный сейф кнопкой <strong>«В сейф»</strong>. Сейф находится в Настройках и хранит весь баланс предприятия.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  {
    id: "salary",
    title: "Зарплаты и Выплаты",
    description: "Расчет процентов, минималка и выдача денег",
    icon: <Calculator className="w-5 h-5 text-emerald-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Как считается зарплата</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
              <h4 className="font-bold text-foreground mb-1">Проценты</h4>
              <p className="text-muted-foreground text-xs">Стоимость услуги делится между исполнителями и умножается на их персональный процент.</p>
            </div>
            <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
              <h4 className="font-bold text-foreground mb-1">Минималка</h4>
              <p className="text-muted-foreground text-xs">Гарантированный оклад за выход. Система дотянет ЗП до этой суммы, если проценты за день меньше.</p>
            </div>
          </div>

          <div className="bg-muted/20 border border-border/50 rounded-2xl p-4 mb-6">
            <h4 className="font-bold text-foreground mb-1">Ручная ЗП (Премии/Штрафы)</h4>
            <p className="text-muted-foreground text-xs">Нажмите на карточку сотрудника и введите сумму вручную. Это значение перекроет все автоматические расчеты.</p>
          </div>

          <h3 className="text-xl font-bold text-foreground mb-3">Выдача денег</h3>
          <p className="mb-4 text-muted-foreground">Нажмите <strong>«Рассчитать сотрудников»</strong> в виджете кассы или перейдите в раздел <strong>«Выплаты»</strong> в меню.</p>
          <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl">
            <ul className="list-disc pl-5 space-y-2 text-xs">
              <li><strong>Баланс за месяц:</strong> На странице выплат отображается актуальный долг перед сотрудником (или переплата) с учетом заработанного и выплаченного с 1-го числа.</li>
              <li><strong>Источник «Касса»:</strong> Деньги вычитаются из фактического остатка кассы дня.</li>
              <li><strong>Источник «Сейф»:</strong> Деньги списываются из глобального сейфа, касса смены не меняется.</li>
              <li>Кнопка <strong>«Всё»</strong> позволяет выдать ровно заработанную за день сумму в один клик.</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
];

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  // Для десктопа - ID активной секции. Для мобилок - ID открытой секции (null если смотрим список)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(sections[0].id);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Отслеживаем размер окна
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Если переключились на десктоп и нет активной секции (были в списке на мобилке), открываем первую
      if (!mobile && !activeSectionId) {
        setActiveSectionId(sections[0].id);
      }
      // Если переключились на мобилку, сбрасываем в список для удобства
      if (mobile && isOpen && activeSectionId !== null) {
        setActiveSectionId(null);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeSectionId, isOpen]);

  // Сброс состояния при открытии
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      if (window.innerWidth < 768) {
        setActiveSectionId(null); // Мобилка: показываем список
      } else {
        setActiveSectionId(sections[0].id); // Десктоп: показываем первую вкладку
      }
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        // На мобилке: если открыта статья, по Esc возвращаемся в список
        if (isMobile && activeSectionId) {
          setActiveSectionId(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isMobile, activeSectionId, onClose]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const query = searchQuery.toLowerCase();
    return sections.filter(
      (s) => s.title.toLowerCase().includes(query) || s.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Умный сброс активной секции при поиске
  useEffect(() => {
    if (!isMobile && filteredSections.length > 0 && (!activeSectionId || !filteredSections.find(s => s.id === activeSectionId))) {
      setActiveSectionId(filteredSections[0].id);
    }
  }, [filteredSections, isMobile, activeSectionId]);

  if (!isOpen) return null;

  const activeSection = activeSectionId ? sections.find(s => s.id === activeSectionId) : null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background/95 backdrop-blur-md">

      {/* HEADER */}
      <div className="flex items-center justify-between p-4 md:px-6 md:py-4 border-b border-border/40 bg-card shrink-0 z-10">
        <div className="flex items-center gap-3">
          {/* Кнопка "Назад" для мобилок */}
          {isMobile && activeSectionId ? (
            <button
              onClick={() => setActiveSectionId(null)}
              className="p-2 -ml-2 mr-1 rounded-xl hover:bg-accent text-foreground"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <HelpCircle className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          )}

          <div className="flex flex-col">
            <h1 className="text-lg md:text-xl font-bold leading-tight">
              {isMobile && activeSectionId && activeSection ? activeSection.title : "Справка и Инструкции"}
            </h1>
            {(!isMobile || !activeSectionId) && (
              <span className="text-xs text-muted-foreground">Руководство пользователя</span>
            )}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-muted/50 hover:bg-muted text-foreground"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative bg-background">
        <div
          className={`flex h-full w-[200%] md:w-full transition-transform duration-300 ease-in-out md:transition-none md:transform-none ${
            isMobile && activeSectionId ? "-translate-x-1/2" : "translate-x-0"
          }`}
        >

          {/* SIDEBAR / MOBILE LIST */}
          <div className="w-1/2 md:w-[320px] shrink-0 flex flex-col bg-muted/10 border-r border-border/40 h-full">
            {/* Поиск */}
            <div className="p-4 border-b border-border/40 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Поиск по инструкции..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-card border border-border/50 rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-primary/50 shadow-sm"
                />
              </div>
            </div>

            {/* Список разделов */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
              {filteredSections.length > 0 ? (
                filteredSections.map((section) => {
                  const isActive = !isMobile && activeSectionId === section.id;

                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSectionId(section.id)}
                      className={`
                        w-full flex items-start gap-4 p-4 rounded-2xl text-left border
                        ${isActive
                          ? "bg-card border-primary/20 shadow-sm"
                          : "bg-transparent border-transparent hover:bg-card hover:border-border/50 hover:shadow-sm"
                        }
                      `}
                    >
                      <div className={`shrink-0 p-2.5 rounded-xl ${isActive ? "bg-primary/10" : "bg-muted"}`}>
                        {section.icon}
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className={`text-sm font-bold truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                          {section.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                          {section.description}
                        </p>
                      </div>
                      {isMobile && (
                        <ChevronRight className="w-5 h-5 shrink-0 text-muted-foreground self-center ml-2" />
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                  <Search className="w-8 h-8 mb-3 opacity-20" />
                  <p className="text-sm font-medium">Ничего не найдено</p>
                  <p className="text-xs mt-1">Попробуйте изменить запрос</p>
                </div>
              )}
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="w-1/2 md:flex-1 shrink-0 flex flex-col overflow-hidden bg-background h-full relative">
            {activeSection ? (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-5 md:p-8 lg:p-12">
                <div className="max-w-3xl mx-auto">

                  {/* Заголовок статьи на десктопе */}
                  {!isMobile && (
                    <div className="flex items-center gap-4 mb-8 pb-6 border-b border-border/40">
                      <div className="p-3 bg-muted/50 rounded-2xl border border-border/50">
                        {activeSection.icon}
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold text-foreground tracking-tight">{activeSection.title}</h2>
                        <p className="text-muted-foreground mt-1 text-sm">{activeSection.description}</p>
                      </div>
                    </div>
                  )}

                  {/* Контент */}
                  <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none">
                    {activeSection.content}
                  </div>

                </div>
              </div>
            ) : (
              // Empty state for desktop when nothing is selected
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
                <div className="w-16 h-16 rounded-3xl bg-muted/30 flex items-center justify-center mb-4 border border-border/50">
                  <HelpCircle className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-lg font-medium text-foreground">Выберите раздел</h3>
                <p className="text-sm mt-1 max-w-xs text-center">Инструкции и ответы на частые вопросы появятся здесь</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default HelpModal;
