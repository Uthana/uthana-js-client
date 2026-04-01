import resolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import { defineConfig } from "rollup";

const external = ["react", "react/jsx-runtime", "@tanstack/react-query", "@uthana/client"];

export default defineConfig([
  {
    input: "src/index.ts",
    external,
    plugins: [
      resolve(),
      typescript({
        tsconfig: "./tsconfig.json",
        compilerOptions: { declaration: false, declarationMap: false },
      }),
    ],
    output: { file: "dist/index.js", format: "esm", sourcemap: true },
  },
  {
    input: "src/index.ts",
    external,
    plugins: [
      resolve(),
      typescript({
        tsconfig: "./tsconfig.json",
        compilerOptions: { declaration: false, declarationMap: false },
      }),
    ],
    output: { file: "dist/index.cjs", format: "cjs", sourcemap: true },
  },
  {
    input: "src/index.ts",
    external,
    plugins: [dts()],
    output: [
      { file: "dist/index.d.ts", format: "esm" },
      { file: "dist/index.d.cts", format: "cjs" },
    ],
  },
]);
