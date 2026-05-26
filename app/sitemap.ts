import tools from "../data/tools.json";

export default function sitemap() {
  const baseUrl =
    "https://one-click-tools.com";

  const toolPages = tools.map((tool) => ({
    url: `${baseUrl}/tools/${tool.slug}`,
    lastModified: new Date(),
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
    },

    ...toolPages,
  ];
}