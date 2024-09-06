import { a } from "@test/source";

import { b } from "./b.js";
import { ignored } from "./ignored.js";

const c: number = a + b;

export { c, ignored };
