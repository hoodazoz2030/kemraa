const fs = require("fs");
const pdf = require("pdf-parse");

(async () => {
  const buf = fs.readFileSync("D:\\kemraa\\test-contract.pdf");
  const data = await pdf(buf);
  console.log("=== Extracted PDF Text ===");
  console.log(data.text);
  console.log("\n=== Checks ===");
  console.log("Pages:", data.numpages);
  console.log("Has KEMRAA:", data.text.includes("KEMRAA"));
  console.log("Has PARTNERSHIP:", data.text.includes("PARTNERSHIP"));
  console.log("Has SHA-256 hash:", /[a-f0-9]{64}/.test(data.text));
  console.log("Has Cairo Grand:", data.text.includes("Cairo Grand"));
  console.log("Has CONTRACT ID:", data.text.includes("CONTRACT ID"));
  console.log("Has ISSUED AT:", data.text.includes("ISSUED AT"));
})();
