import {
  CommandLineParser,
  type CommandLineFlagParameter,
  type CommandLineStringListParameter,
  type CommandLineStringParameter,
} from "@rushstack/ts-command-line";

import { execute } from "./engine.js";

export class RefactorCommandLine extends CommandLineParser {
  private _verbose: CommandLineFlagParameter;
  private _fromPackage: CommandLineStringParameter;
  private _renameSymbols: CommandLineStringListParameter;

  public constructor() {
    super({
      toolFilename: "refactor",
      toolDescription:
        'The "refactor" tool lets you rename symbols across your codebase exported by a specific package',
    });
  }

  protected onDefineParameters(): void {
    this._verbose = this.defineFlagParameter({
      parameterLongName: "--verbose",
      parameterShortName: "-v",
      description: "Show extra logging detail",
    });

    this._fromPackage = this.defineStringParameter({
      parameterLongName: "--from",
      parameterShortName: "-f",
      argumentName: "FROM_PACKAGE",
      environmentVariable: "FROM_PACKAGE",
      description: "The package to rename symbols from",
      required: true,
    });

    this._renameSymbols = this.defineStringListParameter({
      parameterLongName: "--rename",
      parameterShortName: "-r",
      argumentName: "SYMBOL_RENAME",
      description:
        "The rename symbol configuration in the format of 'from,to' case-sensitive",
    });
  }

  protected async onExecute(): Promise<void> {
    await execute({
      sourcePackageName: this._fromPackage.value!,
      operations: {
        rename: this._renameSymbols.values.map((value) => {
          const [from, to] = value.split(",");

          return { from, to, importTarget: this._fromPackage.value! };
        }),
      },
    });

    process.exit(0);
  }
}
