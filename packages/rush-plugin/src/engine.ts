import path from "path";

import Rush from "@microsoft/rush-lib";
import { parseJsonConfigFileContent, sys } from "typescript";

import { type OperationConfig } from "@u/code-transform";
import {
  _transformFiles as transformFilesFactory,
  transformFiles as defaultTransformFiles,
} from "@u/transform-executor";

type TransformFiles = Parameters<typeof transformFilesFactory>;

export interface Options {
  sourcePackageName: string;
  operations: OperationConfig;
  fsOverrides?: TransformFiles;
}

export async function execute({
  sourcePackageName,
  operations,
  fsOverrides,
}: Options): Promise<void> {
  const transformFiles = fsOverrides
    ? transformFilesFactory(...fsOverrides)
    : defaultTransformFiles;
  const rushConfiguration = Rush.RushConfiguration.loadFromDefaultLocation();
  const rushProject = rushConfiguration.getProjectByName(sourcePackageName);

  if (!rushProject) {
    throw new Error(`Project ${sourcePackageName} not found`);
  }

  console.log("sourcePackageName", sourcePackageName);
  const dependents = rushProject.consumingProjects;
  const sourceFiles = await Promise.all(
    [...dependents.values()].flatMap((dependant) => {
      const tsConfigPath = path.join(dependant.projectFolder, "tsconfig.json");
      console.log("Resolving files from", tsConfigPath);
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

  console.log("transforming", withoutDts);

  await transformFiles(withoutDts, operations);
}
