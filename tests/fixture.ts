import { resolve } from "node:path";

import { loadDatasetBundle, type DatasetBundle } from "../src/data/load.ts";
import { readBundleText } from "../src/data/read.ts";

export async function loadSyntheticBundle(): Promise<DatasetBundle> {
  const root = resolve("tests/fixtures/valid/de/2024");
  return loadDatasetBundle(await readBundleText(root));
}
