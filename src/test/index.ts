import { Test } from "./db/Test";
import Sequelastic from "../index";

const sequelastic = new Sequelastic({ models: [Test] });
console.log("🚀 ~ file: index.ts ~ line 5 ~ sequelastic", sequelastic)
