import { chromium } from "@playwright/test";
import { writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const names = [
  "PC Gaming Lab",
  "Esports Daily",
  "FPS Database",
  "Mobile Games Asia",
  "Streaming Creator Hub",
  "Hardware Arena",
];
const titles = [
  "BUILD YOUR NEXT\nADVANTAGE.",
  "THE GAME\nNEVER STOPS.",
  "KNOW YOUR\nBATTLEFIELD.",
  "A WORLD\nIN YOUR HANDS.",
  "CREATE WITHOUT\nLIMITS.",
  "ENGINEERED\nFOR MORE.",
];
const colors = [
  "#249cff",
  "#a345ff",
  "#79a8ad",
  "#c46cef",
  "#6d54ff",
  "#ec7862",
];
await mkdir("public/previews", { recursive: true });
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
});
const page = await browser.newPage({
  viewport: { width: 1100, height: 470 },
  deviceScaleFactor: 1,
});
const metadata = [];
for (let i = 0; i < 6; i++) {
  const c = colors[i];
  await page.setContent(
    `<html><head><style>*{box-sizing:border-box}body{margin:0;background:#080d19;color:white;font-family:Arial}header{padding:23px 40px;display:flex;align-items:center;justify-content:space-between;font-size:13px;border-bottom:1px solid #ffffff18}b{font-size:19px}nav{word-spacing:24px;color:#aaa;font-size:11px}.hero{height:400px;padding:46px 42px;position:relative;overflow:hidden;background:radial-gradient(ellipse at 80% 70%,${c}55,transparent 58%)}small{font-size:10px;letter-spacing:3px;color:${c}}h1{font-size:49px;line-height:1.06;letter-spacing:-2px;margin:18px 0;font-weight:900;white-space:pre-line}p{color:#8292ae;font-size:12px}button{border:0;background:${c};padding:11px 20px;border-radius:4px;color:white;font-weight:bold;margin-top:12px}.object{position:absolute;right:85px;top:27px;width:290px;height:285px;transform:rotate(-12deg);border:2px solid ${c};border-radius:25px;background:linear-gradient(135deg,#15213a,#090d18);box-shadow:0 0 50px ${c}55,inset 0 0 35px ${c}44}.ring{width:140px;height:140px;border:14px solid ${c};border-radius:50%;position:absolute;top:60px;left:75px;box-shadow:0 0 35px ${c}88,inset 0 0 20px ${c};background:repeating-conic-gradient(#090c15 0deg 20deg,#28304a 20deg 35deg)}.line{position:absolute;height:3px;width:160px;background:${c};bottom:40px;left:65px;box-shadow:0 0 15px ${c}}.caption{position:absolute;right:30px;bottom:28px;font-size:9px;letter-spacing:3px;color:#ffffff66}</style></head><body><header><b>${names[i]}</b><nav>EXPLORE REVIEWS GUIDES COMMUNITY</nav></header><div class="hero"><small>INDEPENDENT INSIGHT. REAL IMPACT.</small><h1>${titles[i]}</h1><p>Your next discovery starts here.</p><button>Explore the latest ↗</button><div class="object"><div class="ring"></div><div class="line"></div></div><div class="caption">INDEX DEMO PREVIEW</div></div></body></html>`,
  );
  const bytes = await page.screenshot({type:"jpeg",quality:80,
    path: `public/previews/site-${i + 1}.jpg`,
  });
  metadata.push({
    site_id: `demo-${i + 1}`,
    image_url: `/previews/site-${i + 1}.jpg`,
    captured_at: new Date().toISOString(),
    viewport: { width: 1100, height: 470 },
    hash: createHash("sha256").update(bytes).digest("hex"),
    visual_change_score: null,
    source: "local-demo-html",
  });
}
await writeFile(
  "public/previews/manifest.json",
  JSON.stringify(metadata, null, 2),
);
await browser.close();
