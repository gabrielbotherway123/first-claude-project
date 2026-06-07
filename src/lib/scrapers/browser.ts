import "server-only";
import type { Browser, Page } from "puppeteer";

// A realistic desktop Chrome UA so pages render the normal layout.
export const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";

// Reuse a single browser instance across requests (launch is expensive).
let browserPromise: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    // Dynamic import keeps puppeteer out of the client bundle entirely.
    const puppeteer = (await import("puppeteer")).default;
    browserPromise = puppeteer
      .launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-blink-features=AutomationControlled",
          "--disable-dev-shm-usage",
          "--window-size=1280,900",
        ],
      })
      .catch((err) => {
        browserPromise = null; // allow retry on next call
        throw err;
      });
  }
  return browserPromise;
}

export async function newPage(): Promise<Page> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);
  await page.setViewport({ width: 1280, height: 900 });
  await page.setExtraHTTPHeaders({ "Accept-Language": "en-GB,en;q=0.9" });
  // Trim obvious automation signals.
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  return page;
}

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
