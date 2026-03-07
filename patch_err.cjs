const fs = require('fs');
let code = fs.readFileSync('src/pages/HomePage.tsx', 'utf8');
code = code.replace(
`                  }

                  return (
                  return (
                    <div`,
`                  }

                  return (
                    <div`
);

fs.writeFileSync('src/pages/HomePage.tsx', code);
