/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS checker loads Playwright from CHECK_DIR in GitHub Actions. */
// Deployed copy pins /Stewdent-demo/assets/index-C3gAcoRt.js to the exact built JS path before publication.
const { chromium, expect } = require(
  process.env.CHECK_DIR + "/node_modules/@playwright/test",
);
const fs = require("node:fs/promises");
(async () => {
  const url = process.env.SITE_URL,
    expectedAsset = process.env.EXPECTED_ASSET || "/Stewdent-demo/assets/index-C3gAcoRt.js";
  let ready = false;
  for (let n = 0; n < 60; n++) {
    try {
      const r = await fetch(url, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      const html = await r.text();
      if (
        r.status === 200 &&
        html.includes("<title>Stewdent｜教えて育てる学習デモ</title>") &&
        html.includes(expectedAsset)
      ) {
        ready = true;
        break;
      }
    } catch {}
    if (n === 0) console.log("Waiting for the updated Pages assets");
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (!ready)
    throw new Error(
      "Updated Pages assets were not published within the verification window",
    );
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: ["--no-sandbox"],
  });
  try {
    await fs.mkdir("site-evidence", { recursive: true });
    const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      }),
      api = [],
      external = [];
    page.on("request", (r) => {
      const u = new URL(r.url());
      if (u.pathname.includes("/api/")) api.push(r.url());
      if (/^https?:/.test(u.protocol) && u.origin !== new URL(url).origin)
        external.push(r.url());
    });
    const response = await page.goto(url, { waitUntil: "networkidle" });
    if (response.status() !== 200)
      throw new Error("Public URL did not return 200");
    const nav = async (p) =>
      page.evaluate((p) => {
        location.hash = p;
      }, p);
    async function login(label) {
      await nav("/login");
      await page.getByRole("button", { name: new RegExp("^" + label) }).click();
      await expect(page.locator(".student-app,.app-frame")).toBeVisible();
    }
    await page.getByRole("button", { name: "生徒AIに教えてみる" }).click();
    await page.getByRole("button", { name: "会話例を入力する" }).click();
    await page.getByRole("button", { name: "送信", exact: true }).click();
    await expect(page.locator(".chat-turn.assistant").last()).toContainText(
      "どことどこを行き来",
    );
    const conversationPath = await page.evaluate(() => location.hash);
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    if (
      !(await page.evaluate(() => document.fonts.check('16px "Stewdent Maru"')))
    )
      throw new Error("Bundled rounded font missing");
    await page.screenshot({
      path: "site-evidence/conversation.png",
      fullPage: true,
    });
    await page
      .getByRole("button", {
        name: "レモンにテストを受けてもらう",
        exact: true,
      })
      .click();
    await expect(page.locator(".ai-test-answer.observed")).toHaveCount(1);
    await expect(page.locator(".ai-test-answer.not_observed")).toHaveCount(2);
    await expect(page.getByText("Lv.1 · 10 XP", { exact: true })).toBeVisible();
    await page.screenshot({
      path: "site-evidence/conversation-test.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "この会話で教え直す" }).click();
    for (const body of [
      "参勤交代は、大名が江戸と自分の領地を行き来する制度です。",
      "大名に移動などの費用を負担させ、経済的な力を弱めるためです。",
    ]) {
      await page.getByLabel("レモンに教えるメッセージ").fill(body);
      await page.getByRole("button", { name: "送信", exact: true }).click();
      await expect(
        page.getByRole("button", { name: "送信", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".chat-turn.student").last()).toContainText(
        body,
      );
    }
    await page
      .getByRole("button", {
        name: "レモンにテストを受けてもらう",
        exact: true,
      })
      .click();
    await expect(page.locator(".ai-test-answer.observed")).toHaveCount(3);
    if ((await page.evaluate(() => location.hash)) !== conversationPath)
      throw new Error("Teaching again must keep the same conversation");
    await page.getByLabel("テストの履歴").selectOption("1");
    await expect(page.locator(".ai-test-answer.not_observed")).toHaveCount(2);
    await page.getByLabel("テストの履歴").selectOption("2");
    await expect(page.locator(".ai-test-answer.observed")).toHaveCount(3);
    await page
      .getByRole("button", { name: "今の会話の結果を見る", exact: true })
      .click();
    await expect(page.getByText("Lv.1 · 20 XP", { exact: true })).toBeVisible();
    await login("教師");
    const summary = page
      .locator(".teaching-summary")
      .filter({
        has: page.getByRole("heading", {
          name: "江戸幕府",
          exact: true,
        }),
      })
      .first();
    await summary.getByRole("link", { name: "説明の変化・対話を確認" }).click();
    const record = page
      .locator(".teaching-record")
      .filter({
        has: page.getByRole("heading", {
          name: "江戸幕府",
          exact: true,
        }),
      })
      .first();
    await record
      .getByText("生徒AIが受けたテストと、説明の根拠", { exact: true })
      .click();
    await record.getByLabel("AIテストの回").selectOption("1");
    await expect(record.locator(".ai-test-answer.not_observed")).toHaveCount(2);
    await record.getByLabel("AIテストの回").selectOption("2");
    await expect(record.locator(".ai-test-answer.observed")).toHaveCount(3);
    await record
      .getByLabel("確認できたこと・次に確かめたいこと")
      .fill("公開URLの架空検証：説明を確認し、理由は次の授業で確かめる。");
    await record.getByRole("button", { name: "説明の所見を保存" }).click();
    await expect(
      record.getByRole("heading", { name: "先生の確認履歴" }),
    ).toBeVisible();
    await page.evaluate(() => {
      document.activeElement?.blur();
      scrollTo(0, 0);
    });
    await page.screenshot({
      path: "site-evidence/studio-teacher.png",
      fullPage: true,
    });
    await login("生徒A");
    await page
      .getByRole("link", { name: "自分のチェック", exact: true })
      .click();
    await page
      .locator(".row")
      .filter({
        has: page.getByRole("heading", {
          name: "三権分立の理解チェック",
          exact: true,
        }),
      })
      .getByRole("link")
      .click();
    await page.getByRole("button", { name: "受検画面へ" }).click();
    await page.getByRole("button", { name: "チェックを開始・再開" }).click();
    for (let n = 0; n < 3; n++) {
      await page.getByRole("button", { name: "わからないと回答" }).click();
      await expect(
        page.getByText(n + 1 + " / 3 問 提出済み", { exact: true }),
      ).toBeVisible();
    }
    await page.getByRole("button", { name: "提出を確定", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "提出を受け付けました" }),
    ).toBeVisible();
    const attempt = await page.evaluate(() => location.hash.split("/").at(-1));
    await login("教師");
    await nav("/teacher/checks/" + attempt + "/review");
    for (let n = 0; n < 3; n++) {
      const section = page.locator("section.review-item").nth(n);
      await section.getByLabel("教師が確認した点数").fill("0");
      await section
        .getByLabel("確認・修正理由")
        .fill("公開デモの架空確認。実学校の評価ではありません。");
      await section.getByRole("button", { name: "教師レビューを保存" }).click();
      await expect(
        page
          .locator("section.review-item")
          .nth(n)
          .getByText("教師確認済み・未公開", { exact: true }),
      ).toBeVisible();
    }
    await page
      .getByRole("button", { name: "教師確認済みの結果を公開" })
      .click();
    await login("生徒A");
    await nav("/app/results/" + attempt);
    await expect(
      page.getByText("教師確認済みの得点 · 正式な評定ではありません"),
    ).toBeVisible();
    await login("チューター");
    await page.getByRole("link", { name: "指導・記録へ" }).click();
    await page
      .getByLabel("指導した内容")
      .fill("新しい体験版の公開確認（架空記録）。");
    await page.getByLabel("生徒の反応").fill("教え直す操作を試した。");
    await page.getByLabel("次回の課題").fill("理由をもう一度説明する。");
    await page
      .getByRole("button", { name: "指導記録を保存", exact: true })
      .click();
    await expect(
      page.getByText("新しい体験版の公開確認（架空記録）。", { exact: true }),
    ).toBeVisible();
    await page.setViewportSize({ width: 375, height: 812 });
    await login("生徒A");
    await expect(
      page.getByRole("button", { name: "会話例を入力する" }),
    ).toBeInViewport();
    if (
      !(await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ))
    )
      throw new Error("Mobile overflow");
    await page.screenshot({
      path: "site-evidence/studio-mobile.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: /^AIのテスト/ }).click();
    if (api.length || external.length)
      throw new Error("Unexpected API or external request");
    const proof = {
      url,
      status: 200,
      flow: "conversation/questions/test-rounds/frozen-history/continue-teaching/teacher-evidence/check/review/release/tutor",
      mobile_width: 375,
      bundled_rounded_font: true,
      api_requests: 0,
      external_requests: 0,
      checked_at: new Date().toISOString(),
    };
    await fs.writeFile(
      "site-evidence/result.json",
      JSON.stringify(proof, null, 2),
    );
    console.log(JSON.stringify(proof));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
