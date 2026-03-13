import React, { useState, useMemo, useEffect } from "react";
import { HelpCircle, Search, X, BookOpen, ChevronRight, CheckCircle, AlertTriangle, Info } from "lucide-react";
import Modal from "./modal";

interface HelpSection {
  id: string;
  title: string;
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
    icon: <BookOpen className="w-5 h-5 text-primary" />,
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <h3 className="text-lg font-bold text-foreground">Начало работы</h3>
        <p className="text-muted-foreground">Каждый рабочий день начинается с открытия смены. Без этого невозможно добавлять услуги.</p>
        <ul className="list-disc pl-5 space-y-2 text-foreground/90">
          <li>Перейдите на Главную страницу.</li>
          <li>Выберите дату. По умолчанию стоит сегодняшний день, но можно выбрать и другую дату в календаре (например, для добавления задним числом).</li>
          <li>Выберите сотрудников, которые сегодня работают, поставив галочки.</li>
          <li>При необходимости, переключите роль сотрудника (Мойщик/Админ) и установите/снимите галочку "Учитывать минималку".</li>
          <li>Нажмите кнопку <strong className="text-primary">«Начать смену»</strong>.</li>
        </ul>

        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl mt-4">
          <h4 className="flex items-center gap-2 font-bold text-amber-600 mb-2">
            <AlertTriangle className="w-4 h-4" /> Важно знать
          </h4>
          <p className="text-amber-600/90 text-xs">
            Если вы случайно начали смену не с теми сотрудниками, вы можете изменить состав, нажав кнопку «Изменить состав» в блоке "Сотрудники". Если снять галочки со всех сотрудников и сохранить — смена (и все добавленные услуги за этот день) будет <strong>ПОЛНОСТЬЮ УДАЛЕНА</strong> (потребуется пароль от настроек).
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "services",
    title: "Добавление услуг",
    icon: <CheckCircle className="w-5 h-5 text-green-500" />,
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <h3 className="text-lg font-bold text-foreground">Запись оказанных услуг</h3>
        <p className="text-muted-foreground">Для добавления услуги нажмите кнопку <strong>«Добавить услугу»</strong> (или плюсик возле имени сотрудника).</p>
        <ul className="list-disc pl-5 space-y-2 text-foreground/90">
          <li><strong>Машина/Услуга:</strong> Введите марку/номер машины и краткое название услуги.</li>
          <li><strong>Сумма:</strong> Укажите полную стоимость услуги для клиента.</li>
          <li><strong>Исполнители:</strong> Выберите одного или нескольких сотрудников, которые выполняли работу. Если выбрано несколько человек, выручка от этой машины пойдет в их персональную статистику (сумма делится на количество исполнителей).</li>
          <li><strong>Способ оплаты:</strong> Выберите, как клиент расплатился (Наличные, Карта, Безнал, Сертификат, Долг).</li>
        </ul>
      </div>
    ),
  },
  {
    id: "payments",
    title: "Способы оплаты и Безнал",
    icon: <BookOpen className="w-5 h-5 text-blue-500" />,
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <h3 className="text-lg font-bold text-foreground">Разделение выручки</h3>
        <p className="text-muted-foreground">В системе поддерживается несколько способов оплаты, они по-разному влияют на кассу и зарплату.</p>

        <div className="space-y-3 mt-4">
          <div className="p-3 bg-muted/20 border border-border/50 rounded-lg">
            <h4 className="font-bold">Наличные и Карта</h4>
            <p className="text-xs text-muted-foreground mt-1">Обычная оплата от физлиц. Попадают в общую кассу дня, с них начисляется зарплата.</p>
          </div>

          <div className="p-3 bg-muted/20 border border-border/50 rounded-lg">
            <h4 className="font-bold">Безналичные (Организации)</h4>
            <p className="text-xs text-muted-foreground mt-1">При выборе "Безнал" необходимо указать организацию из выпадающего списка (создаются в Настройках). Если в настройках организации включена галочка "Учитывать в общей сумме", то сумма оплаты приплюсуется к "Всего" за день. Зарплата работникам начисляется в любом случае.</p>
          </div>

          <div className="p-3 bg-muted/20 border border-border/50 rounded-lg">
            <h4 className="font-bold">Сертификат</h4>
            <p className="text-xs text-muted-foreground mt-1">При оплате сертификатом живые деньги в кассу не поступают (они поступили ранее, при продаже сертификата). Однако эта сумма учитывается для расчета зарплаты работнику.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "certificates",
    title: "Работа с сертификатами",
    icon: <BookOpen className="w-5 h-5 text-purple-500" />,
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <h3 className="text-lg font-bold text-foreground">Продажа и использование</h3>

        <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl mt-2">
          <h4 className="font-bold text-purple-600 mb-1">Шаг 1. Продажа сертификата</h4>
          <p className="text-purple-600/90 text-xs mb-2">
            Используйте виджет "Сертификаты" (справа на компьютере или внизу на телефоне). Нажмите "Продать".
          </p>
          <ul className="list-disc pl-5 text-xs text-purple-600/90 space-y-1">
            <li>При продаже сертификата деньги <strong>сразу попадают в кассу</strong> (в "Наличные" или "Карту", как движение средств).</li>
            <li>Эта сумма НЕ влияет на зарплату мойщиков, так как услуга еще не оказана.</li>
          </ul>
        </div>

        <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl">
          <h4 className="font-bold text-purple-600 mb-1">Шаг 2. Использование (Оказание услуги)</h4>
          <p className="text-purple-600/90 text-xs mb-2">
            Когда клиент приезжает по сертификату:
          </p>
          <ul className="list-disc pl-5 text-xs text-purple-600/90 space-y-1">
            <li>В виджете "Сертификаты" найдите нужный и нажмите галочку "Использовать".</li>
            <li>Либо просто добавьте услугу обычным способом и выберите оплату "Сертификат".</li>
            <li>При использовании <strong>деньги в кассу не добавляются</strong> (чтобы не было задвоения), но услуга записывается мойщику в статистику и с нее <strong>начисляется зарплата</strong>.</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    id: "cash",
    title: "Касса (Изъятия/Внесения)",
    icon: <BookOpen className="w-5 h-5 text-amber-500" />,
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <h3 className="text-lg font-bold text-foreground">Движение наличных и по карте</h3>
        <p className="text-muted-foreground">Иногда в кассе происходят изменения, не связанные с мойкой машин: размен, инкассация, покупка расходников, продажа сертификатов.</p>

        <ul className="list-disc pl-5 space-y-2 text-foreground/90">
          <li>На Главной странице нажмите на плитку <strong>«Наличные»</strong> (или «Карта» в будущем, если применимо), чтобы открыть модальное окно движений по кассе.</li>
          <li><strong>Внесение (Плюс):</strong> добавление денег в кассу (например, утренний размен).</li>
          <li><strong>Изъятие (Минус):</strong> забрали деньги из кассы (например, инкассация боссу или покупка губок/химии). Обязательно пишите комментарий, на что ушли деньги.</li>
        </ul>

        <div className="bg-primary/10 border border-primary/20 p-4 rounded-xl mt-4">
          <h4 className="flex items-center gap-2 font-bold text-primary mb-2">
            <Info className="w-4 h-4" /> Как это работает
          </h4>
          <p className="text-primary/90 text-xs">
            Эти суммы изменяют итоговую цифру "Наличных" в интерфейсе, чтобы она совпадала с физическими деньгами в кассе. Они также отображаются в Ежедневной ведомости отдельным блоком, но <strong>не влияют на зарплаты</strong> сотрудников и общую сумму оказанных услуг.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "debts",
    title: "Долги",
    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <h3 className="text-lg font-bold text-foreground">Оформление и закрытие долгов</h3>
        <p className="text-muted-foreground">Если клиент обещал занести деньги позже.</p>

        <ol className="list-decimal pl-5 space-y-2 text-foreground/90">
          <li>При добавлении услуги выберите способ оплаты <strong>«Долг»</strong> и обязательно напишите комментарий (имя клиента, номер телефона).</li>
          <li>Долг запишется в статистику, сотрудникам <strong>начислится зарплата</strong> за эту машину.</li>
          <li>Долг не попадет ни в Наличные, ни в Карту, пока его не закроют.</li>
          <li>Все неоплаченные долги висят в виджете "Активные долги" на главной странице (под Записями).</li>
          <li><strong>Закрытие долга:</strong> Когда клиент принес деньги, нажмите зеленую галочку рядом с его долгом в виджете. Выберите, как он отдал деньги (Нал/Карта). Сумма автоматически добавится в кассу <strong>текущей открытой смены</strong> (как внесение), чтобы у вас сошлись деньги.</li>
        </ol>
      </div>
    ),
  },
  {
    id: "salary",
    title: "Расчет зарплат",
    icon: <BookOpen className="w-5 h-5 text-emerald-500" />,
    content: (
      <div className="space-y-4 text-sm leading-relaxed">
        <h3 className="text-lg font-bold text-foreground">Как считается зарплата</h3>
        <p className="text-muted-foreground">Зарплата считается автоматически на основе настроек. Вы можете изменить проценты в разделе "Настройки".</p>

        <ul className="list-disc pl-5 space-y-2 text-foreground/90">
          <li><strong>Проценты от выручки:</strong> Настраиваются для обычных услуг, химчистки, полировки и т.д.</li>
          <li><strong>Минимальная оплата (Оклад):</strong> Если сотрудник за день заработал на процентах меньше "минималки" (настраивается в Настройках), программа автоматически дотянет его ЗП до этой минималки.</li>
          <li><strong>Ручная ЗП:</strong> Если вы хотите заплатить сотруднику другую сумму (премия или штраф), нажмите на карточку сотрудника и введите "Ручную ЗП". На карточке появится оранжевая звездочка (*). Это значение перекроет все автоматические расчеты.</li>
          <li><strong>Почасовая разбивка:</strong> Во время смены (с 9:00 до 21:00) программа показывает расчет "ЗП за N часов" — это примерная сумма, которую сотрудник уже заработал к текущему времени, разделяя финальную дневную (или минимальную) ЗП на часы.</li>
        </ul>
      </div>
    ),
  },
];

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0].id);

  // Фильтрация разделов по поиску
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;

    const query = searchQuery.toLowerCase();
    return sections.filter(
      (section) =>
        section.title.toLowerCase().includes(query) ||
        // Простой хак для поиска по текстовому содержимому (перевод ReactNode в строку работает не идеально,
        // но базовые ключевые слова найдет, если они есть в title или если мы добавим keywords)
        // Для надежности фильтруем по заголовку
        section.title.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Если отфильтрованный список не содержит активного раздела, переключаемся на первый найденный
  useEffect(() => {
    if (filteredSections.length > 0 && !filteredSections.find(s => s.id === activeSectionId)) {
      setActiveSectionId(filteredSections[0].id);
    }
  }, [filteredSections, activeSectionId]);

  const activeSection = sections.find((s) => s.id === activeSectionId) || sections[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-5xl h-[90dvh] md:h-[80vh] flex flex-col p-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50 shrink-0 bg-background/50 backdrop-blur-xl z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-primary rounded-xl">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground leading-none">Справка и Инструкции</h2>
            <p className="text-sm text-muted-foreground mt-1">Детальное руководство по работе с программой</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* Sidebar / Top bar navigation */}
        <div className="md:w-1/3 lg:w-1/4 flex flex-col border-b md:border-b-0 md:border-r border-border/50 bg-muted/10 shrink-0 max-h-[40vh] md:max-h-full">
          {/* Search */}
          <div className="p-4 border-b border-border/50 shrink-0">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск по разделам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border/50 rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 transition-shadow"
              />
            </div>
          </div>

          {/* Navigation List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
            {filteredSections.length > 0 ? (
              filteredSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSectionId(section.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${
                    activeSectionId === section.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  <div className={`shrink-0 ${activeSectionId === section.id ? "text-primary" : "text-muted-foreground"}`}>
                    {section.icon}
                  </div>
                  <span className="text-sm flex-1 truncate">{section.title}</span>
                  {activeSectionId === section.id && (
                    <ChevronRight className="w-4 h-4 shrink-0 hidden md:block" />
                  )}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Ничего не найдено
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col bg-background overflow-hidden relative">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar">
            <div className="max-w-3xl mx-auto">
              {activeSection && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-muted rounded-xl">
                      {activeSection.icon}
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">{activeSection.title}</h2>
                  </div>

                  <div className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-p:text-muted-foreground prose-li:text-muted-foreground">
                    {activeSection.content}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default HelpModal;
