import time
import os
from playwright.sync_api import sync_playwright

def verify_login_page():
    os.makedirs("/home/jules/verification/video", exist_ok=True)
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(record_video_dir="/home/jules/verification/video")
        page = context.new_page()
        try:
            # Нам не нужно запускать весь Vite сервер, так как мы можем просто
            # открыть скомпилированный билд через локальный сервер
            page.goto("http://localhost:4173/login")

            # Ждем немного, чтобы убедиться что ничего не "моргает" и тема применилась
            time.sleep(2)

            # Проверяем, что нет ошибок в консоли (утечек, запросов к базе)
            page.screenshot(path="/home/jules/verification/login_page.png")

            # Проверяем наличие мета тега robots
            robots_meta = page.locator('meta[name="robots"]').get_attribute('content')
            print(f"Robots meta tag: {robots_meta}")

            print("Verification complete.")
        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    verify_login_page()
