from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()

        # Capture console errors
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(str(exc)))

        # Load the page and mock local storage and auth
        page.goto('http://localhost:5173')
        page.evaluate("""
            window.localStorage.setItem('shiftStarted', 'true');
            window.localStorage.setItem('shiftEmployees', JSON.stringify(['emp1', 'emp2']));
            window.localStorage.setItem('sb-supabase-auth-token', JSON.stringify({
                access_token: 'fake', refresh_token: 'fake',
                user: { id: 'test-user', role: 'authenticated' }
            }));
        """)

        page.goto('http://localhost:5173')
        page.wait_for_timeout(2000)

        print("Console errors:", errors)

        browser.close()

if __name__ == '__main__':
    main()
