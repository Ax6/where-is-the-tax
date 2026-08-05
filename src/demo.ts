import expenditure from "../tests/fixtures/valid/de/2024/expenditure.csv?raw";
import extractions from "../tests/fixtures/valid/de/2024/extractions.json?raw";
import meta from "../tests/fixtures/valid/de/2024/meta.json?raw";
import provenance from "../tests/fixtures/valid/de/2024/provenance.json?raw";
import revenue from "../tests/fixtures/valid/de/2024/revenue.csv?raw";
import sources from "../tests/fixtures/valid/de/2024/sources.json?raw";

import { loadDatasetBundle } from "./data/load.ts";

export const demoBundle = loadDatasetBundle({ meta, revenue, expenditure, sources, extractions, provenance });
