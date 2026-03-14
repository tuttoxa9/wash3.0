import React, { useState, useMemo, useEffect } from "react";
import {
  Wallet,
  HelpCircle,
  Search,
  X,
  ChevronRight,
  Clock,
  PlusCircle,
  CreditCard,
  Gift,
  AlertCircle,
  Calculator,
  ArrowLeft,
  Info
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
    title: "Открытие и закрытие смены",
    description: "Ввод утренней кассы, выбор сотрудников, настройка ролей",
    icon: <Clock className="w-5 h-5 text-blue-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Начало работы</h3>
          <p className="mb-4">Каждый рабочий день начинается с открытия смены. Без этого невозможно добавлять услуги и вести учет.</p>

          <ol className="list-decimal pl-5 space-y-3">
            <li>На главном экране <strong>обязательно укажите сумму наличных</strong>, которая физически находится в кассе утром. (Система подскажет вам, сколько денег должно было остаться со вчерашнего дня).</li>
            <li>Ниже в списке сотрудников отметьте тех, кто сегодня вышел на работу.</li>
            <li>Укажите роль для каждого выбранного: <strong>Мойщик</strong> или <strong>Админ</strong>.</li>
            <li>При необходимости, снимите галочку «Учитывать минималку», если сотруднику сегодня не положена минимальная выплата (например, стажер).</li>
            <li>Нажмите большую синюю кнопку <strong>«Начать смену»</strong>.</li>
          </ol>
        </div>

        <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Важно: Состав смены
          </h4>
          <p>
            Если в течение дня пришел новый сотрудник или кто-то ушел, вы можете нажать кнопку <strong>«Изменить состав»</strong> на главной странице (в блоке "Сотрудники") и обновить список. Если вы снимете галочки со всех сотрудников, <strong>текущая смена и все её записи будут полностью удалены!</strong> (Для этого потребуется ввести пароль от настроек).
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "cash-safe",
    title: "Касса, Выплаты и Сейф",
    description: "Сверка наличных в конце дня, выдача зарплаты всем сотрудникам, перенос остатка в сейф",
    icon: <Wallet className="w-5 h-5 text-green-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Учет наличных средств</h3>
          <p className="mb-4">Новый виджет <strong>«Состояние кассы»</strong> на главной странице (справа) помогает отслеживать все наличные деньги в реальном времени. Он показывает сумму на начало дня и то, сколько денег ожидается в кассе с учетом всех оплат наличными.</p>

          <div className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
              <h4 className="font-semibold text-foreground mb-2">1. Сверка кассы (Конец дня)</h4>
              <p>В конце смены нажмите кнопку <strong>«Сверить кассу»</strong> в виджете. Пересчитайте все физические деньги в ящике и введите эту сумму. Система автоматически покажет, сошлась ли касса, или есть излишек/недостача.</p>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
              <h4 className="font-semibold text-foreground mb-2">2. Расчет сотрудников</h4>
              <p>После сверки кассы нажмите <strong>«Рассчитать сотрудников»</strong>. Откроется список <em>абсолютно всех</em> сотрудников из базы (даже тех, кто сегодня не работал). Вы можете:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Нажать кнопку <strong>«Всё»</strong>, чтобы выдать сотруднику ровно ту сумму, которую он заработал за сегодня.</li>
                <li>Ввести любую другую сумму вручную (например, выдать аванс или удержать часть ЗП).</li>
                <li>Эти деньги будут вычтены из фактического остатка вашей кассы.</li>
              </ul>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
              <h4 className="font-semibold text-foreground mb-2">3. Перенос в сейф</h4>
              <p>Оставшиеся в кассе деньги (выручку минус зарплаты) можно перенести в глобальный сейф, нажав кнопку <strong>«В сейф»</strong>. Это спишет деньги из кассы текущего дня.</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "records",
    title: "Добавление и редактирование услуг",
    description: "Как записать машину, выбрать тип оплаты и удалить ошибку",
    icon: <PlusCircle className="w-5 h-5 text-purple-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Работа с записями</h3>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Добавление новой записи</h4>
              <p className="text-muted-foreground">Нажмите синюю кнопку «Добавить услугу» вверху экрана. Либо нажмите плюсик (+) рядом с именем конкретного сотрудника, чтобы он сразу был выбран как исполнитель.</p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-1">Выбор способа оплаты</h4>
              <p className="text-muted-foreground">В форме доступны следующие способы оплаты:</p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                <li><strong>Наличные / Карта</strong> — стандартные методы, деньги сразу идут в кассу.</li>
                <li><strong>Безнал (Организация)</strong> — оплата по договору. Вам нужно выбрать организацию из списка (настраивается в Настройках).</li>
                <li><strong>В долг</strong> — клиент не заплатил (забыл кошелек). Обязательно напишите в комментарии, кто должен (номер машины или имя). Долг повиснет в базе и будет отображаться красным виджетом справа, пока его не закроют.</li>
                <li><strong>Сертификат</strong> — если клиент расплачивается заранее купленным сертификатом. Зарплата сотрудникам с этой машины будет начислена, но в общую выручку (кассу) дня сумма не пойдет, чтобы не было задвоения.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-1">Редактирование и удаление</h4>
              <p className="text-muted-foreground">
                Чтобы изменить запись (если вы ошиблись с суммой или способом оплаты), откройте «Ежедневную ведомость», найдите нужную машину и нажмите иконку карандаша. В этом же окне можно удалить запись (иконка корзины).
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "debts",
    title: "Работа с долгами",
    description: "Как закрывать долги клиентов и корректировать ошибки",
    icon: <AlertCircle className="w-5 h-5 text-red-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Долги клиентов</h3>
          <p className="mb-4">Все неоплаченные машины автоматически попадают в виджет <strong>«Активные долги»</strong> на главной странице. Они будут висеть там изо дня в день, пока вы их не закроете.</p>

          <div className="bg-muted/30 p-4 rounded-xl border border-border/50 mb-4">
            <h4 className="font-semibold text-foreground mb-2">Как закрыть долг?</h4>
            <ol className="list-decimal pl-5 space-y-2">
              <li>Найдите долг в виджете справа и нажмите зеленую галочку.</li>
              <li>Выберите фактический способ оплаты (Наличные или Карта), которым клиент наконец-то рассчитался.</li>
              <li>Долг закроется в том дне, когда машина мылась, <strong>А деньги (внесение) автоматически упадут в кассу ТЕКУЩЕЙ смены</strong>, чтобы у вас физически сошлись наличные/карта сегодня.</li>
            </ol>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              Ошибочный долг?
            </h4>
            <p>
              Если вы случайно записали машину в долг, и клиент на самом деле ничего не должен, не "закрывайте" его. Зайдите в <strong>Настройки → Долги</strong> и нажмите кнопку "Удалить" рядом с этой машиной. Она навсегда исчезнет из базы вместе с начисленной зарплатой.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "certificates",
    title: "Сертификаты и Внесения в кассу",
    description: "Продажа сертификатов, изъятие денег на чай/воду",
    icon: <Gift className="w-5 h-5 text-purple-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Сертификаты и Движение наличных</h3>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Продажа сертификата</h4>
              <p className="text-muted-foreground">Если пришел человек и хочет просто купить сертификат в подарок, используйте виджет <strong>«Сертификаты»</strong> (кнопка Продать). Выберите оплату нал/карта. Эти деньги сразу упадут в фактическую кассу сегодняшнего дня (так как вы их реально получили), но машины в списке не появится.</p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-1">Внесения и Изъятия из кассы</h4>
              <p className="text-muted-foreground">Если вы берете из кассы деньги на нужды мойки (покупка воды, чая, химии), вы должны это зафиксировать. На главной странице, в блоке "Итого", нажмите на карточку <strong>«Наличные»</strong>.</p>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                <li>Откроется модальное окно движения средств.</li>
                <li>Выберите "Изъять" и введите сумму (например, 10 BYN на чай).</li>
                <li>Эта сумма вычтется из ожидаемой кассы (Состояние кассы), чтобы вечером у вас всё сошлось.</li>
                <li>Точно так же можно вносить деньги в кассу (размен).</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "salary",
    title: "Как считается зарплата",
    description: "Формулы расчета, минималки, проценты админа",
    icon: <Calculator className="w-5 h-5 text-indigo-500" />,
    content: (
      <div className="space-y-6 text-sm leading-relaxed text-foreground/90">
        <div>
          <h3 className="text-xl font-bold text-foreground mb-3">Начисление заработной платы</h3>
          <p className="mb-4">Зарплата считается автоматически в реальном времени. Все проценты и суммы минималок задаются владельцем в Настройках. Ничего не нужно считать вручную.</p>

          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Для мойщика</h4>
              <p className="text-muted-foreground">Зарплата = Сумма всех машин, которые он мыл * Процент мойщика. <br/>Если эта сумма к концу дня (после 21:00) меньше Минимальной оплаты, система автоматически начислит ему минималку (если не снята галочка "Учитывать минималку").</p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-1">Для администратора</h4>
              <p className="text-muted-foreground">Зарплата = (Общая выручка за день * Процент админа от кассы) + (Сумма машин, которые он мыл сам * Процент админа от мойки). <br/>Аналогично работает гарантия минималки.</p>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border border-border/50">
              <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                Ручное изменение (Премия / Штраф)
              </h4>
              <p>
                Если вы хотите дать сотруднику премию или штраф, кликните по его карточке на главной странице. Откроется его детальный профиль. Там есть кнопка <strong>«Изменить ЗП за день»</strong>. Введите нужную сумму, и она перезапишет автоматический расчет. Рядом с такой зарплатой появится звездочка (*).
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  }
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
