import tools from "../data/tools.json";

export default function sitemap() {
  const baseUrl =
    "https://one-click-tools.com";
  const lastModified = new Date();

  const staticPages = [
    "",
    "/about",
    "/privacy",
    "/terms",
    "/contact",
  ].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified,
  }));

  const toolPages = tools.map((tool) => ({
    url: `${baseUrl}/tools/${tool.slug}`,
    lastModified,
  }));

  return [
    ...staticPages,
    ...toolPages,
  ];
}
