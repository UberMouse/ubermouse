import { execute } from "./engine.js";

async function main(): Promise<void> {
  await execute({
    sourcePackageName: "@kx/export-data",
    operations: {
      rename: [
        {
          from: "createExportMachine",
          to: "yeaMate",
          importTarget: "@kx/export-data",
        },
      ],
    },
  });

  console.log("done");
  process.exit(0);
}

main().catch(console.error);
