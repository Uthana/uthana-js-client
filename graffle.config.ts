import { Generator } from "graffle/generator";

export default Generator.configure({
  name: "Uthana",
  schema: "./uthana.schema",
  out: "./packages/client/src/generated",
  lint: {
    missingCustomScalarCodec: false,
  },
});
