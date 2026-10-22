import { pathToFileURL } from "node:url";
import { app } from "./app.js";
export { app };
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = app.listen(Number(process.env.PORT || 3001), "127.0.0.1", () =>
    console.log(
      "OptiScope API listening at http://127.0.0.1:" + server.address().port,
    ),
  );
  server.requestTimeout = 45000;
}
