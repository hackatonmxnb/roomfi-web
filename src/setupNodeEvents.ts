import fs from 'node:fs/promises';
export function setupNodeEvents(on:any, config:any){
  on('task', {
    async saveContext(ctx:any){
      await fs.mkdir('ai-fixes', { recursive: true });
      await fs.appendFile('ai-fixes/context.jsonl', JSON.stringify(ctx) + '\n', 'utf8');
      return null;
    }
  });
  return config;
}