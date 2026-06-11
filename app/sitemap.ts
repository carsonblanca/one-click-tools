import tools from "../data/tools.json";
import { localized3dToolSlugs } from "../lib/i18n";

export default function sitemap() {
  const baseUrl =
    "https://one-click-tools.com";
  const lastModified = new Date();
  const localizedStaticPaths = [
    "",
    "/about",
    "/privacy",
    "/terms",
    "/contact",
  ];

  const staticPages = localizedStaticPaths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    alternates: {
      languages: {
        en: `${baseUrl}${path}`,
        "zh-CN": `${baseUrl}/zh-cn${path}`,
        "zh-TW": `${baseUrl}/zh-tw${path}`,
      },
    },
  }));

  const toolPages = tools.map((tool) => ({
    url: `${baseUrl}/tools/${tool.slug}`,
    lastModified,
    ...(localized3dToolSlugs.includes(tool.slug)
      ? {
          alternates: {
            languages: {
              en: `${baseUrl}/tools/${tool.slug}`,
              "zh-CN": `${baseUrl}/zh-cn/tools/${tool.slug}`,
              "zh-TW": `${baseUrl}/zh-tw/tools/${tool.slug}`,
            },
          },
        }
      : {}),
  }));

  const localizedStaticPages = ["zh-cn", "zh-tw"].flatMap((locale) =>
    localizedStaticPaths.map((path) => ({
      url: `${baseUrl}/${locale}${path}`,
      lastModified,
      alternates: {
        languages: {
          en: `${baseUrl}${path}`,
          "zh-CN": `${baseUrl}/zh-cn${path}`,
          "zh-TW": `${baseUrl}/zh-tw${path}`,
        },
      },
    })),
  );

  const localizedToolPages = ["zh-cn", "zh-tw"].flatMap((locale) =>
    localized3dToolSlugs.map((slug) => ({
      url: `${baseUrl}/${locale}/tools/${slug}`,
      lastModified,
      alternates: {
        languages: {
          en: `${baseUrl}/tools/${slug}`,
          "zh-CN": `${baseUrl}/zh-cn/tools/${slug}`,
          "zh-TW": `${baseUrl}/zh-tw/tools/${slug}`,
        },
      },
    })),
  );

  return [
    ...staticPages,
    ...toolPages,
    ...localizedStaticPages,
    ...localizedToolPages,
  ];
}
