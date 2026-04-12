import type React from "react";
import { useState, useEffect } from "react";
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
    <Modal isOpen={isOpen} onClose={onClose} className="!max-w-md">
      <div className="w-full">
        <div className="p-5 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-bold text-card-foreground">
            Корректировка зарплаты
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <p className="text-sm text-muted-foreground">
            Укажите новую зарплату для сотрудника <strong className="text-foreground">{employeeName}</strong>:
          </p>

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Сумма (BYN)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-input rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow text-lg"
              placeholder="0.00"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSave();
                }
              }}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Сбросить
            </button>
            <button
              onClick={handleSave}
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 font-medium"
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
