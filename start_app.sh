kill $(lsof -t -i :5173) 2>/dev/null || true
npm run dev > npm_output.log 2>&1 &
