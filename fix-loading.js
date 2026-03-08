import fs from 'fs';
let content = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');

const additionalEffect = `
  useEffect(() => {
    // В AppContext данные загружаются, как только они приходят, отключаем лоадер
    if (state.employees) {
      setLoading((prev) => ({ ...prev, employees: false }));
    }
  }, [state.employees]);
`;

// Insert after the daily report loading effect
content = content.replace("  // --- RENDERING SPLIT ---", additionalEffect + "\n  // --- RENDERING SPLIT ---");
fs.writeFileSync('src/pages/HomePage.tsx', content);
