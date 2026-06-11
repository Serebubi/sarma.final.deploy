import { buildManualPreview, marketplaceById, previewLinkResponseSchema, type MarketplaceId } from "shared";

interface OpenGraphPreview {
  title: string | null;
  imageUrl: string | null;
  price: number | null;
}

function extractText(source: string, expression: RegExp) {
  const match = source.match(expression);
  return match?.[1]?.trim() ?? null;
}

function safeNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^\d.,]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchOpenGraph(url: string): Promise<OpenGraphPreview | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const title =
      extractText(html, /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ??
      extractText(html, /<title>([^<]+)<\/title>/i);
    const imageUrl = extractText(html, /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
    const price =
      safeNumber(extractText(html, /<meta[^>]+property=["']product:price:amount["'][^>]+content=["']([^"']+)["']/i)) ??
      safeNumber(extractText(html, /"price"\s*:\s*"([^"]+)"/i));

    return {
      title,
      imageUrl,
      price,
    };
  } catch {
    return null;
  }
}

export async function previewMarketplaceLink(marketplace: MarketplaceId, url: string) {
  const definition = marketplaceById[marketplace];

  if (
    definition.parserMode !== "supported" ||
    !(definition.domains as readonly string[]).includes(new URL(url).hostname.toLowerCase())
  ) {
    const preview = buildManualPreview(url, marketplace);
    return previewLinkResponseSchema.parse({
      marketplace,
      preview,
      mode: "fallback",
      message: preview.parserMessage,
    });
  }

  const og = await fetchOpenGraph(url);

  if (!og?.title) {
    const preview = buildManualPreview(url, marketplace);
    return previewLinkResponseSchema.parse({
      marketplace,
      preview,
      mode: "fallback",
      message: preview.parserMessage,
    });
  }

  return previewLinkResponseSchema.parse({
    marketplace,
    preview: {
      title: og.title,
      price: og.price,
      imageUrl: og.imageUrl,
      sourceUrl: url,
      parserMode: "parsed",
      parserMessage: "Карточка успешно распознана.",
    },
    mode: "parsed",
    message: "Карточка успешно распознана.",
  });
}
