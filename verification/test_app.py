from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        # Wait for dev server to be ready
        page.goto("http://localhost:5173", timeout=10000)

        # Check for title or specific element
        # Let's check for "room.ai" text which is in the sidebar.
        page.wait_for_selector("text=room.ai", timeout=10000)

        # Take screenshot
        page.screenshot(path="verification/screenshot.png")
        print("Screenshot taken")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
