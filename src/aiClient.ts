import axios from 'axios';

export async function callAiFix(payload: any): Promise<any|null> {
  try {
    const url = process.env.AI_AGENT_URL || 'http://127.0.0.1:8000/fix_locator';
    const { data } = await axios.post(url, payload, { timeout: 45000 });
    return data;
  } catch (e) {
    console.error('❌ Error calling AI service:', e);
    return null;
  }
}

// Para Cypress task
export async function aiFix(payload: any) {
  console.log('🎯 aiFix called with payload:', payload);
  
  // Transform the payload to match the expected format for the AI service
  const transformedPayload = {
    key: payload.cmd === 'get' ? payload.selector : payload.text,
    error: `${payload.cmd} failed for: ${payload.cmd === 'get' ? payload.selector : payload.text}`,
    dom: payload.dom,
    cmd: payload.cmd,
    selector: payload.selector,
    text: payload.text
  };
  
  console.log('🔄 Transformed payload:', transformedPayload);
  const res = await callAiFix(transformedPayload);
  console.log('✅ aiFix result:', res);
  
  // If the AI service returns null, we should return null to indicate failure
  if (!res) {
    console.log('❌ AI service returned null, indicating failure');
    return null;
  }
  
  return res;
}
