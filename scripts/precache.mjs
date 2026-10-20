import { readdirSync, writeFileSync } from "node:fs";
const scan = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? scan(`${dir}/${e.name}`) : [`${dir}/${e.name}`],
  );
const assets = scan(".next/static")
  .filter((p) => /\.(js|css|woff2)$/.test(p))
  .map((p) => p.replace(".next/", "/_next/"));
writeFileSync("public/precache.json", JSON.stringify({ assets }));
