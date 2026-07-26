import { createAgent } from 'langchain'
import { SYSTEM_PROMPT } from '../../systemPrompt.js'

export const processAgent = createAgent({
    name: "Data Processing Agent",
    model: "ollama:gemma4:31b-cloud",
    systemPrompt: SYSTEM_PROMPT,
})