import { OpenAI } from "openai"; 
import { semanticSearch } from "./vector";
import { getEnv } from "../config/env";

const openai = new OpenAI({ apiKey: getEnv("OPENAI_API_KEY") }); 

export async function ragAnswer(userQuery: string){
    // retrieve 
    const hits = await semanticSearch(userQuery, 5);
    const context = hits
    .map((m: { metadata: any; }) => {
        const meta = m.metadata as any; 
        return `+ ${meta.title} | ${meta.operation} | $${meta.price} | ${meta.address ?? ""}`;
    })
    .join("\n");

    // generate 
    const prompt = `
    Eres un asistente inmobiliario. Responde brevemente usando SOLO el contexto. Si falta información, dilo claramente.
    Consulta: "${userQuery}"
    
    Contexto:
    ${context || "(sin resultados relevantes)"}
    Responde: 
    `; 

    const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{role: "user", content: prompt}],
        temperature: 0.2
    });

    return {
        answer: completion.choices[0]?.message.content,
        context: hits
    };
}