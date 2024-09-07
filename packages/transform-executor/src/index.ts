import fs from "node:fs/promises";

import Queue from "p-queue";
import { Piscina } from "piscina";

import { type OperationConfig } from "@u/code-transform";

import type { WorkerArgs, WorkerResult } from "./worker.mjs";

export interface Hooks {
  onStart?: (fileCount: number) => void;
  onFileComplete?: (file: string) => void;
}

export function _transformFiles(
  readFile: typeof _readFile,
  writeFile: typeof _writeFile,
): (files: string[], config: OperationConfig, hooks: Hooks) => Promise<void> {
  return async (files, config, hooks) => {
    const readQueue = new Queue({ concurrency: 10 });
    const writeQueue = new Queue({ concurrency: 10 });

    const piscina = new Piscina<WorkerArgs, WorkerResult>({
      // The URL must be a file:// URL
      filename: new URL("./worker.mjs", import.meta.url).href,
      workerData: config,
    });

    // Keep track of the number of files that have been read so we can wait for them all to be written out
    let readCount = 0;

    for (const file of files) {
      void readQueue.add(async () => {
        const content = await readFile(file);
        readCount += 1;
        return { content, filePath: file };
      });
    }

    readQueue.on(
      "completed",
      ({ content, filePath }: { content: string; filePath: string }) => {
        void piscina
          .run({ content, filePath })
          .then(({ content, filePath }) => {
            hooks.onFileComplete?.(filePath);
            void writeQueue.add(async () => {
              await writeFile(filePath, content);
              readCount -= 1;
            });
          });
      },
    );

    // Wait for anything to happen to one of the queues to ensure we don't falsly think they are done
    await Promise.race([
      new Promise<void>((resolve) => readQueue.once("add", resolve)),
      new Promise<void>((resolve) => writeQueue.once("add", resolve)),
    ]);

    // Wait for all queues to be idle and ensure that we have written a 1:1 ratio of read files
    // to guarantee that we have written all the files
    await Promise.all([
      readQueue.onIdle(),
      writeQueue.onIdle(),
      new Promise<void>((resolve) => {
        function check(): void {
          if (readCount === 0) {
            resolve();
          }

          setTimeout(check, 100);
        }
        check();
      }),
    ]);

    // Need to shut the background worker threads down when we finish so they don't leak
    await piscina.destroy();
  };
}

export const transformFiles: ReturnType<typeof _transformFiles> =
  _transformFiles(_readFile, _writeFile);

async function _readFile(file: string): Promise<string> {
  return fs.readFile(file, "utf8");
}

async function _writeFile(file: string, content: string): Promise<void> {
  return fs.writeFile(file, content);
}
