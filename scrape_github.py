import sys
from playwright.sync_api import sync_playwright

def scrape_github_repo():
    url = "https://github.com/mvicendese/ArithmeticFirebaseAntigravity"
    print(f"Connecting to Chrome on port 9222 to inspect: {url}")
    
    try:
        with sync_playwright() as p:
            # Connect to the existing browser session
            browser = p.chromium.connect_over_cdp("http://localhost:9222")
            
            # Use the first existing context or create a new page in it
            if browser.contexts:
                context = browser.contexts[0]
            else:
                context = browser.new_context()
                
            page = context.new_page()
            page.goto(url)
            page.wait_for_load_state("networkidle")
            
            # Scrape file names from the file list
            print("\n--- Repository Contents ---")
            
            # Take a screenshot to verify what we see
            page.screenshot(path="github_view.png")
            print("Screenshot saved to github_view.png")

            # Try to find the file navigation table
            # Common GitHub selectors
            selectors = [
                'div[role="row"].react-directory-row', # New UI
                '.js-navigation-item', # Old UI
                'tr.react-directory-row',
                '[aria-label="Directory"] div[role="row"]' 
            ]
            
            found_files = []
            
            for selector in selectors:
                rows = page.locator(selector)
                count = rows.count()
                if count > 0:
                    print(f"Found {count} items using selector: {selector}")
                    for i in range(count):
                        row = rows.nth(i)
                        text = row.inner_text()
                        lines = text.split('\n')
                        if lines:
                            filename = lines[0].strip()
                            # Filter out empty or navigation up dots if needed
                            if filename and filename != ".." and filename not in found_files:
                                found_files.append(filename)
                    break # Stop if we found something
            
            if found_files:
                for f in found_files:
                    print(f"- {f}")
            else:
                print("No files found. Dumping first 2000 chars of body text:")
                print(page.locator("body").inner_text()[:2000])

            page.close()
            # Do not close the browser as we are connected to the user's instance
            
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        print("Ensure Chrome is running with: chrome.exe --remote-debugging-port=9222")

if __name__ == "__main__":
    scrape_github_repo()
