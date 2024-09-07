import path from "path";

import Rush from "@microsoft/rush-lib";
import { parseJsonConfigFileContent, sys } from "typescript";

import { type OperationConfig } from "@u/code-transform";
import {
  _transformFiles as transformFilesFactory,
  transformFiles as defaultTransformFiles,
  type Hooks,
} from "@u/transform-executor";

type TransformFiles = Parameters<typeof transformFilesFactory>;

export interface Options {
  sourcePackageName: string;
  config: OperationConfig;
  fsOverrides?: TransformFiles;
  hooks?: Hooks;
}

export async function execute({
  sourcePackageName,
  config,
  fsOverrides,
  hooks = {},
}: Options): Promise<void> {
  const transformFiles = fsOverrides
    ? transformFilesFactory(...fsOverrides)
    : defaultTransformFiles;
  const rushConfiguration = Rush.RushConfiguration.loadFromDefaultLocation();
  const rushProject = rushConfiguration.getProjectByName(sourcePackageName);

  if (!rushProject) {
    throw new Error(`Project ${sourcePackageName} not found`);
  }

  const dependents = rushProject.consumingProjects;
  const sourceFiles = await Promise.all(
    [...dependents.values()].flatMap((dependant) => {
      const tsConfigPath = path.join(dependant.projectFolder, "tsconfig.json");
      const content = sys.readFile(tsConfigPath);
      const tsConfig = parseJsonConfigFileContent(
        JSON.parse(content!),
        sys,
        dependant.projectFolder,
      );

      return tsConfig.fileNames;
    }),
  );
  const withoutDts = sourceFiles.filter((file) => !file.endsWith(".d.ts"));
  hooks.onStart?.(withoutDts.length);

  await transformFiles(withoutDts, config, hooks);
}
