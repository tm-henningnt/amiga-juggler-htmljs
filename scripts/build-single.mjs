import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const [template, css, js, workerJs] = await Promise.all([
  readFile(resolve(root, "src/index.template.html"), "utf8"),
  readFile(resolve(root, "src/styles.css"), "utf8"),
  readFile(resolve(root, "dist/juggler.js"), "utf8"),
  readFile(resolve(root, "dist/juggler-worker.js"), "utf8")
]);

const html = template
  .replace("/*__INLINE_CSS__*/", css)
  .replace("/*__INLINE_WORKER_JS__*/", escapeScriptText(workerJs))
  .replace("/*__INLINE_JS__*/", js);

await writeFile(resolve(root, "index.html"), html, "utf8");
console.log("Wrote standalone index.html");

function escapeScriptText(source) {
  return source
    .replace(/[ \t]+$/gm, "")
    .replace(/<\/script/gi, "<\\/script");
}
