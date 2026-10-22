import { fileURLToPath } from "node:url";
export const rootDir = fileURLToPath(new URL("../../../", import.meta.url));
export const image = process.env.OPTISCOPE_IMAGE || "optiscope-sandbox:local";
export const MAX_FILE_SIZE = 128 * 1024;
export const MAX_ACTIVE_JOBS = 2;
