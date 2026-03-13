import React, { useState, useEffect } from "react";
import { X, Save, RotateCcw } from "lucide-react";
import Modal from "./ui/modal";

interface ManualSalaryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  currentSalary: number;
  onSave: (newSalary: number | null) => void;
}

const ManualSalaryEditModal: React.FC<ManualSalaryEditModalProps> = ({
  isOpen,
  onClose,
  employeeName,
  currentSalary,
  onSave,
}) => {
  const [inputValue, setInputValue] = useState(currentSalary.toString());

  useEffect(() => {
    if (isOpen) {
      setInputValue(currentSalary.toString());
    }
  }, [isOpen, currentSalary]);

  const handleSave = () => {
    const value = inputValue.trim();
    if (value === "") {
      return;
    }
    const parsed = Number.parseFloat(value.replace(",", "."));
    if (isNaN(parsed) || parsed < 0) {
      alert("Пожалуйста, введите корректное положительное число или 0");
      return;
    }
    onSave(parsed);
  };

  const handleReset = () => {
    onSave(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 sm:p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold text-card-foreground">
            Корректировка зарплаты
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Укажите новую зарплату для сотрудника <strong>{employeeName}</strong>.
            Можно установить 0.
          </p>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1.5">
              Сумма (BYN)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              placeholder="0.00"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Сбросить к авто
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Save className="w-4 h-4" />
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ManualSalaryEditModal;
