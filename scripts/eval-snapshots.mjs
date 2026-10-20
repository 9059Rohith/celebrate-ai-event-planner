import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
mkdirSync("public/evals/cases", { recursive: true });
for (const name of ["latest", "v1"]) {
  const run = JSON.parse(readFileSync(`evals/results/${name}.json`, "utf8"));
  if (name === "latest")
    for (const item of run.results) {
      if (!/^[a-zA-Z0-9_-]+$/.test(item.id)) throw Error("Unsafe case id");
      writeFileSync(
        `public/evals/cases/${item.id}.json`,
        JSON.stringify({ input: item.input, output: item.output }),
      );
    }
  writeFileSync(
    `evals/results/${name}.summary.json`,
    JSON.stringify({
      ...run,
      results:
        name === "v1" ? [] : run.results.map(({ output, ...item }) => item),
    }),
  );
}
