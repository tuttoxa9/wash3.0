import type React from 'react';
import { useState, useEffect } from 'react';
import { useAppContext } from '@/lib/context/AppContext';
import { format, parseISO } from 'date-fns';
import { Building, Calendar, Loader2, FileDown, X } from 'lucide-react';
import { carWashService } from '@/lib/services/firebaseService';
import type { CarWashRecord, Organization } from '@/lib/types';
import { useToast } from '@/lib/hooks/useToast';
import { Document, Paragraph, Table, TableRow, TableCell, HeadingLevel, TextRun, AlignmentType, BorderStyle } from 'docx';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { ru } from 'date-fns/locale';

type OrganizationsReportProps = {}

const OrganizationsReport: React.FC<OrganizationsReportProps> = () => {
  const { state } = useAppContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [records, setRecords] = useState<CarWashRecord[]>([]);
  const [startDate, setStartDate] = useState(() => {
    // По умолчанию начало текущего месяца
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [endDate, setEndDate] = useState(() => {
    // По умолчанию сегодня
    return new Date();
  });

  // Загрузка записей при выборе организации
  useEffect(() => {
    const loadOrganizationRecords = async () => {
      if (!selectedOrganizationId) {
        setRecords([]);
        return;
      }

      setLoading(true);
      try {
        const fetchedRecords = await carWashService.getByOrganization(selectedOrganizationId);

        // Фильтрация по дате
        const filteredRecords = fetchedRecords.filter(record => {
          const recordDate = typeof record.date === 'string'
            ? parseISO(record.date)
            : new Date(record.date);

          return recordDate >= startDate && recordDate <= endDate;
        });

        // Сортировка по дате (от новых к старым)
        filteredRecords.sort((a, b) => {
          const dateA = typeof a.date === 'string' ? parseISO(a.date) : new Date(a.date);
          const dateB = typeof b.date === 'string' ? parseISO(b.date) : new Date(b.date);
          return dateB.getTime() - dateA.getTime();
        });

        setRecords(filteredRecords);
      } catch (error) {
        console.error('Ошибка при загрузке записей организации:', error);
        toast.error('Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    loadOrganizationRecords();
  }, [selectedOrganizationId, startDate, endDate]);

  // Обработчик выбора организации
  const handleOrganizationSelect = (organizationId: string) => {
    setSelectedOrganizationId(organizationId);
  };

  // Обработчик сброса выбора
  const clearSelection = () => {
    setSelectedOrganizationId(null);
    setRecords([]);
  };

  // Расчет итоговой суммы
  const totalAmount = records.reduce((sum, record) => sum + record.price, 0);

  // Форматирование даты
  const formatDate = (date: Date | string) => {
    return format(typeof date === 'string' ? parseISO(date) : date, 'dd.MM.yyyy');
  };

  // Функция для экспорта данных в Word
  const exportToWord = async () => {
    if (!selectedOrganizationId || records.length === 0) {
      toast.error('Нет данных для экспорта');
      return;
    }

    try {
      // Получаем название организации
      const organizationName = state.organizations.find(org => org.id === selectedOrganizationId)?.name || 'Организация';

      // Создаем таблицу для отчета
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ text: "№", alignment: AlignmentType.CENTER, bold: true })],
              width: { size: 500, type: "dxa" }
            }),
            new TableCell({
              children: [new Paragraph({ text: "Дата", alignment: AlignmentType.CENTER, bold: true })],
              width: { size: 1200, type: "dxa" }
            }),
            new TableCell({
              children: [new Paragraph({ text: "Время", alignment: AlignmentType.CENTER, bold: true })],
              width: { size: 1000, type: "dxa" }
            }),
            new TableCell({
              children: [new Paragraph({ text: "Авто", alignment: AlignmentType.CENTER, bold: true })],
              width: { size: 2000, type: "dxa" }
            }),
            new TableCell({
              children: [new Paragraph({ text: "Услуга", alignment: AlignmentType.CENTER, bold: true })],
              width: { size: 2000, type: "dxa" }
            }),
            new TableCell({
              children: [new Paragraph({ text: "Стоимость", alignment: AlignmentType.CENTER, bold: true })],
              width: { size: 1300, type: "dxa" }
            }),
          ],
          tableHeader: true
        })
      ];

      // Добавляем записи в таблицу
      records.forEach((record, index) => {
        const recordDate = typeof record.date === 'string'
          ? format(parseISO(record.date), 'dd.MM.yyyy', { locale: ru })
          : format(new Date(record.date), 'dd.MM.yyyy', { locale: ru });

        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER })]
              }),
              new TableCell({
                children: [new Paragraph({ text: recordDate })]
              }),
              new TableCell({
                children: [new Paragraph({ text: record.time || '-', alignment: AlignmentType.CENTER })]
              }),
              new TableCell({
                children: [new Paragraph({ text: record.carInfo || '' })]
              }),
              new TableCell({
                children: [new Paragraph({ text: record.service || '' })]
              }),
              new TableCell({
                children: [new Paragraph({ text: record.price.toFixed(2), alignment: AlignmentType.RIGHT })]
              }),
            ]
          })
        );
      });

      // Добавляем строку с итогами
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                text: "Итого:",
                alignment: AlignmentType.RIGHT,
                bold: true
              })],
              columnSpan: 5
            }),
            new TableCell({
              children: [new Paragraph({
                text: totalAmount.toFixed(2),
                alignment: AlignmentType.RIGHT,
                bold: true
              })]
            }),
          ]
        })
      );

      // Создаем документ
      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              // Заголовок отчета
              new Paragraph({
                text: `Отчет по организации: ${organizationName}`,
                heading: HeadingLevel.HEADING_1,
                spacing: { after: 200 }
              }),

              // Период отчета
              new Paragraph({
                text: `Период: ${formatDate(startDate)} - ${formatDate(endDate)}`,
                spacing: { after: 200 }
              }),

              // Таблица отчета
              new Table({
                rows: tableRows,
                width: { size: 8000, type: "dxa" },
                borders: {
                  top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
                }
              }),

              // Итоговая сумма и дата создания
              new Paragraph({
                spacing: { before: 200, after: 100 },
                children: [new TextRun({ text: `Итого: ${totalAmount.toFixed(2)} BYN`, bold: true })]
              }),

              new Paragraph({
                spacing: { before: 100, after: 400 },
                alignment: AlignmentType.RIGHT,
                children: [new TextRun({ text: `Отчет сформирован: ${format(new Date(), 'dd.MM.yyyy HH:mm:ss', { locale: ru })}`, size: 18 })]
              }),

              // Место для подписи
              new Paragraph({
                text: "Подпись ответственного лица: ___________________",
                spacing: { before: 400 }
              }),
            ]
          }
        ]
      });

      // Сохраняем документ
      const blob = await Packer.toBlob(doc);
      const fileName = `Отчет_${organizationName}_${format(new Date(), 'dd-MM-yyyy')}.docx`;
      saveAs(blob, fileName);

      toast.success('Документ успешно экспортирован');
    } catch (error) {
      console.error('Ошибка при экспорте документа:', error);
      toast.error('Ошибка при экспорте документа');
    }
  };

  return (
    <div className="space-y-5">
      {/* Выбор организации */}
      <div className="card-with-shadow p-4">
        <h3 className="text-lg font-medium mb-4 flex items-center">
          <Building className="w-5 h-5 mr-2" />
          Выберите организацию
        </h3>

        {selectedOrganizationId ? (
          <div className="mb-4">
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
              <span className="font-medium">
                {state.organizations.find(org => org.id === selectedOrganizationId)?.name || 'Организация'}
              </span>
              <button
                onClick={clearSelection}
                className="p-1 hover:bg-secondary/50 rounded-md"
                aria-label="Сбросить выбор"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {state.organizations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {state.organizations.map(org => (
                  <button
                    key={org.id}
                    onClick={() => handleOrganizationSelect(org.id)}
                    className="p-3 border border-border rounded-lg text-left hover:bg-secondary/20 transition-colors"
                  >
                    <div className="font-medium">{org.name}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>Нет доступных организаций</p>
                <p className="text-sm mt-1">Добавьте организации в разделе настроек</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Период отчета */}
      {selectedOrganizationId && (
        <div className="card-with-shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Период отчета
            </h3>
          </div>

          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                От:
              </label>
              <input
                type="date"
                value={format(startDate, 'yyyy-MM-dd')}
                onChange={(e) => setStartDate(new Date(e.target.value))}
                className="px-3 py-1.5 border border-input rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">
                До:
              </label>
              <input
                type="date"
                value={format(endDate, 'yyyy-MM-dd')}
                onChange={(e) => setEndDate(new Date(e.target.value))}
                className="px-3 py-1.5 border border-input rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Таблица отчета */}
      {selectedOrganizationId && (
        <div className="card-with-shadow overflow-hidden">
          <div className="flex justify-between items-center p-4 border-b border-border">
            <h3 className="font-medium">
              Отчет по организации: {state.organizations.find(org => org.id === selectedOrganizationId)?.name}
            </h3>
            <button
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors text-sm"
              onClick={exportToWord}
            >
              <FileDown className="w-4 h-4" />
              Экспорт
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
              <p>Загрузка данных...</p>
            </div>
          ) : records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 px-4 text-left">Дата</th>
                    <th className="py-3 px-4 text-left">Время</th>
                    <th className="py-3 px-4 text-left">Авто</th>
                    <th className="py-3 px-4 text-left">Услуга</th>
                    <th className="py-3 px-4 text-right">Стоимость</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(record => (
                    <tr key={record.id} className="border-b border-border hover:bg-muted/30">
                      <td className="py-3 px-4">{formatDate(record.date)}</td>
                      <td className="py-3 px-4">{record.time}</td>
                      <td className="py-3 px-4">{record.carInfo}</td>
                      <td className="py-3 px-4">{record.service}</td>
                      <td className="py-3 px-4 text-right font-medium">{record.price.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-secondary/20 font-medium">
                    <td className="py-3 px-4" colSpan={4}>Итого:</td>
                    <td className="py-3 px-4 text-right">{totalAmount.toFixed(2)} BYN</td>
                  </tr>
                </tbody>
              </table>

              {/* Сумма итого */}
              <div className="flex justify-between border-t border-dashed border-border pt-4 mt-4">
                <span className="font-medium">Итого:</span>
                <span className="font-bold">{totalAmount.toFixed(2)} BYN</span>
              </div>

              {/* Информация о создании */}
              <div className="mt-4 text-xs text-muted-foreground">
                <p>Отчет сформирован: {format(new Date(), 'dd.MM.yyyy HH:mm:ss')}</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>Нет данных для отображения</p>
              <p className="text-sm mt-1">Попробуйте изменить период отчета или выбрать другую организацию</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrganizationsReport;
