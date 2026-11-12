const SUPPORTED_HOSTS = [
  "hh.ru", "rabota.ru", "superjob.ru", "career.habr.com", "geekjob.ru",
  "getmatch.ru", "career.sber.ru", "career.yandex.ru", "career.tbank.ru",
  "career.ozon.ru", "career.mts.ru"
];

function isSupportedUrl(value) {
  let url;
  try { url = new URL(value); } catch { return false; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return SUPPORTED_HOSTS.some((domain) => host === domain || host.endsWith("." + domain));
}

function decodeHtml(value = "") {
  return value.replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function plainText(value = "") {
  return decodeHtml(value.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

function meta(html, key) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const name = tag.match(/(?:property|name)=["']([^"']+)["']/i)?.[1];
    const content = tag.match(/content=["']([^"']*)["']/i)?.[1];
    if (name?.toLowerCase() === key.toLowerCase() && content) return decodeHtml(content);
  }
  return "";
}

function walkJobPosting(value) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) { const found = walkJobPosting(item); if (found) return found; }
    return null;
  }
  const type = value["@type"];
  if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return value;
  if (value["@graph"]) return walkJobPosting(value["@graph"]);
  return null;
}

function jsonLd(html) {
  const scripts = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) || [];
  for (const script of scripts) {
    const body = script.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    try { const found = walkJobPosting(JSON.parse(body)); if (found) return found; } catch {}
  }
  return null;
}

function salaryText(job, text) {
  const base = job?.baseSalary;
  if (base) {
    const value = base.value || base;
    const min = value.minValue ?? value.value;
    const max = value.maxValue;
    const currency = base.currency || value.currency || "RUB";
    if (min != null && max != null) return `${Number(min).toLocaleString("ru-RU")}–${Number(max).toLocaleString("ru-RU")} ${currency}`;
    if (min != null) return `от ${Number(min).toLocaleString("ru-RU")} ${currency}`;
  }
  const match = text.match(/(?:от\s*)?\d[\d\s\u00a0]*(?:[–—-]\s*\d[\d\s\u00a0]*)?\s*(?:₽|руб(?:лей|ля|\.)?|RUB|USD|EUR|€|\$)\s*(?:на руки|до вычета налогов)?/i);
  return match ? match[0].replace(/\s+/g, " ").trim() : "";
}

function locationText(job) {
  const locations = Array.isArray(job?.jobLocation) ? job.jobLocation : job?.jobLocation ? [job.jobLocation] : [];
  return locations.map((item) => {
    const address = item?.address || item;
    return [address.addressLocality, address.addressRegion, address.addressCountry].filter(Boolean).join(", ");
  }).filter(Boolean).join(" / ");
}

function extract(html, url) {
  const job = jsonLd(html);
  const pageTitle = meta(html, "og:title") || (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "";
  const title = plainText(job?.title || pageTitle).replace(/\s*[|—-]\s*(hh\.ru|rabota\.ru|SuperJob).*$/i, "").trim();
  const description = plainText(job?.description || meta(html, "og:description") || meta(html, "description"));
  const bodyText = plainText(html).slice(0, 25000);
  const company = plainText(job?.hiringOrganization?.name || "");
  const salary = salaryText(job, bodyText);
  const place = locationText(job) || (/удал[её]нно|remote/i.test(bodyText) ? "Удалённо" : "");
  const source = new URL(url).hostname.replace(/^www\./, "");
  const skills = Array.isArray(job?.skills) ? job.skills.map((x) => typeof x === "string" ? x : x.name).filter(Boolean) : [];
  const responsibilities = plainText(job?.responsibilities || "");
  const requirements = plainText(job?.qualifications || "");
  const missing = [];
  if (!title) missing.push("название позиции");
  if (!company) missing.push("компания");
  if (!salary) missing.push("зарплата");
  if (!description) missing.push("описание");
  const note = [
    responsibilities && "Обязанности: " + responsibilities,
    requirements && "Требования: " + requirements,
    skills.length && "Навыки: " + skills.join(", ")
  ].filter(Boolean).join("\n\n");
  return { company, role: title, salary, place, source, url, description, responsibilities, requirements, skills, note, missing };
}

export async function onRequest({ request }) {
  const json = (data, status = 200) => new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
  if (request.method !== "POST") return json({ error: "Используй POST-запрос." }, 405);
  try {
    const body = await request.json();
    const inputUrl = String(body?.url || "").trim();
    if (!isSupportedUrl(inputUrl)) return json({
      error: "Пока поддерживаются hh.ru, Rabota.ru, SuperJob, Хабр Карьера, Geekjob, Getmatch и карьерные сайты Сбера, Яндекса, Т-Банка, Ozon и МТС."
    }, 400);
    let currentUrl = inputUrl;
    let response;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      response = await fetch(currentUrl, {
        headers: {
          "user-agent": "Mozilla/5.0 (compatible; CareerDesk/1.0)",
          "accept": "text/html,application/xhtml+xml"
        },
        redirect: "manual"
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      if (!location) break;
      const nextUrl = new URL(location, currentUrl).toString();
      if (!isSupportedUrl(nextUrl)) throw new Error("Сайт перенаправил на неподдерживаемый адрес. Импорт остановлен в целях безопасности.");
      currentUrl = nextUrl;
      if (attempt === 3) throw new Error("Слишком много перенаправлений.");
    }
    if (!response.ok) return json({ error: `Сайт вернул HTTP ${response.status}. Возможно, страница закрыта для автоматического просмотра.` }, 422);
    if (!(response.headers.get("content-type") || "").includes("text/html")) {
      return json({ error: "По этой ссылке сайт не вернул HTML-страницу вакансии." }, 422);
    }
    const html = (await response.text()).slice(0, 2_000_000);
    const data = extract(html, inputUrl);
    if (!data.role && !data.description && !data.company) {
      return json({ error: "Не удалось извлечь данные. Возможно, сайт использует защиту или загружает вакансию динамически. Попробуй другую ссылку или ручной ввод." }, 422);
    }
    return json({
      data,
      warning: data.missing.length ? "Часть полей не найдена автоматически — проверь и заполни их перед сохранением." : ""
    });
  } catch (error) {
    return json({ error: "Не удалось обработать ссылку: " + (error?.message || "неизвестная ошибка") }, 500);
  }
}
