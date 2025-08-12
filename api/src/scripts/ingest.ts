import fs from "fs"; 
import path from "path";
import { upsertProperties, Property } from "../ai/vector";

async function run(){
    const file = path.join(__dirname, "../../data/properties.json");
    const json = JSON.parse(fs.readFileSync(file, "utf-8")) as Property[];
    await upsertProperties(json);
    console.log(`Ingested ${json.length} properties`);
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});