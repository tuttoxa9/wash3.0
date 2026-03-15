from playwright.sync_api import sync_playwright

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Capture console errors
        errors = []
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: errors.append(str(exc)))

        # Go to home and inject mock auth token to pass ProtectedRoute
        page.goto('http://localhost:5173')

        # Setting the session token that supabase requires
        page.evaluate("""
            const mockSession = {
                access_token: 'fake-token',
                refresh_token: 'fake-token',
                user: { id: 'test-user', role: 'authenticated' },
                expires_in: 3600,
                expires_at: Math.floor(Date.now() / 1000) + 3600,
            };
            window.localStorage.setItem('sb-supabase-auth-token', JSON.stringify(mockSession));
            window.localStorage.setItem('shiftStarted', 'true');
            window.localStorage.setItem('shiftEmployees', JSON.stringify(['emp1', 'emp2']));
        """)

        page.goto('http://localhost:5173')
        page.wait_for_timeout(2000)

        print("Taking screenshot to see if it's a white screen...")
        page.screenshot(path='check_screenshot.png')

        print("Console errors:", errors)

        browser.close()

if __name__ == '__main__':
    main()
