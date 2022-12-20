#!/usr/bin/env node

import * as path from "path";
import { execSync } from "child_process";
const join = path.join;
import * as fs from "fs";
import puppeteer from "puppeteer";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// loads the process first argument

const inCommand = process.argv[2];

const browser = await puppeteer.launch({
  ignoreHTTPSErrors: true,
  args: ["--force-device-scale-factor=3"],
}); // run browser
const page = await browser.newPage(); // open new tab

// output = "\n".join(
//         subprocess.check_output(["script", "-c", command, "/dev/null"])
//         .decode("utf-8")
//         .split("\n")[1:-2]
//     )
const scriptCommand = `script -c "${inCommand}" /dev/null`;
const scriptOutput = execSync(scriptCommand).toString("utf-8").split("\n")
  .slice(
    1,
    -2,
  ).join("\n");
// executes the ansi2html command by giving it the scriptOuptut as the STANDARD INPUT
const ansi2htmlCommand = `ansi2html`;
const ansi2htmlOutput = execSync(ansi2htmlCommand, {
  input: scriptOutput,
}).toString("utf-8");

//await page.goto("http://localhost:8000"); // go to site
await page.setContent(ansi2htmlOutput); // set content

//<script src="https://twemoji.maxcdn.com/v/latest/twemoji.min.js" crossorigin="anonymous"></script>
// adds the above script to the page
await page.addScriptTag({
  url: "https://twemoji.maxcdn.com/v/latest/twemoji.min.js",
});
await page.addStyleTag({
  "content": `
.emoji {
  display: inline-block;
  width: 1em;
  height: 1em;
  vertical-align: -.1em;
}
`,
});

// waits until element tag pre is visible
await page.waitForSelector("pre");

await page.evaluate(() => {
  // gets the element with the tag pre
  const pre = document.querySelector("pre");
  twemoji.parse(pre, {
    folder: "svg",
    ext: ".svg",
  });
});
//then selects the element and takes a screenshot
// const items = await page.$eval("img", (element) => {
//   return element.outerHTML;
// }); // Get DOM HTML elements
// saves the items to a file
//fs.writeFileSync(join(__dirname, "screenshot.html"), items);
const data = await page.evaluate(() => document.querySelector("*").outerHTML);
await page.setContent(data, { waitUntil: "networkidle0" });
await page.emulateMediaType("print");
await page.pdf({ path: join(__dirname, "output.pdf"), format: "A4" }); // Save PDF
// imports execSync from child_process as es6 module

// execSync(
//   `inkscape --without-gui --file=${
//     join(__dirname, "output.pdf")
//   } --export-plain-svg=${join(__dirname, "output.svg")}`,
// );
execSync(
  `pdf2svg ${join(__dirname, "output.pdf")} ${
    join(
      __dirname,
      "output.svg",
    )
  }`,
);
// read svg file synchronously
const svg = fs.readFileSync(join(__dirname, "output.svg"), "utf8");
const page2 = await browser.newPage(); // open new tab
await page2.setContent(svg); // set svg content
await page2.evaluate(() => {
  const svg = document.getElementsByTagName("svg")[0];
  const bbox = svg.getBBox();
  const viewBox = [bbox.x, bbox.y, bbox.width, bbox.height].join(" ");
  svg.setAttribute("viewBox", viewBox);
  svg.setAttribute("width", bbox.width);
  svg.setAttribute("height", bbox.height);
});
const outer = await page2.$eval("svg", (element) => {
  return element.outerHTML;
}); // Get DOM HTML elements
fs.writeFile("output.svg", outer, function (err) {
  if (err) return console.log(err);
});

await browser.close();
