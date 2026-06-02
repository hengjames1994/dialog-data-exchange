import { copyFile, mkdir } from "node:fs/promises";

const files = ["index.html", "styles.css", "script.js", "manifest.webmanifest", "sw.js"];

await mkdir("www", { recursive: true });

await Promise.all(files.map((file) => copyFile(file, `www/${file}`)));

console.log("Prepared web assets in www/");
