import { readSecret } from "./secrets"
import { named_log } from "./util"

const log = named_log('ai')

let AI_KEYS
readSecret('ai.json').then(keys => {
    AI_KEYS = keys
    log({AI_KEYS})
})

export const query_llm = async (text) => {
    return {
        response: undefined,
        error: 'LLM not yet connected - waiting on credits',
    }
}
