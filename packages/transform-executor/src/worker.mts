import { workerData } from "piscina";

import type { OperationConfig } from "@ubermouse/code-transform";
import { transformCode } from "@ubermouse/code-transform";

export interface WorkerArgs {
  content: string;
  filePath: string;
}

export interface WorkerResult extends WorkerArgs {}

export default async function transformFile({
  content,
  filePath,
}: WorkerArgs): Promise<WorkerResult> {
  const config = workerData as OperationConfig;

  try {
    const result = await transformCode(content, config);

    return { content: result, filePath };
  } catch (e) {
    console.error("Error transforming", filePath, e);
    process.exit(1);
  }
}
