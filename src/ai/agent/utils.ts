import type { AgentConversationItem } from '../../client/responses-client';

export const getAgentQueryString = (conversationHistory: AgentConversationItem[]): string => {
  if (!conversationHistory || conversationHistory.length === 0) return '';
  const lastItem = conversationHistory[conversationHistory.length - 1] as any;

  const tryFormatJson = (str: any) => {
    if (typeof str !== 'string') return JSON.stringify(str, null, 2);
    try {
      return JSON.stringify(JSON.parse(str), null, 2);
    } catch {
      return str;
    }
  };

  let contentStr;
  if (lastItem.type === 'function_call') {
    contentStr = `Tool call: ${lastItem.name}\n${tryFormatJson(lastItem.arguments)}`;
  } else if (lastItem.type === 'function_call_output') {
    contentStr = `Tool result:\n${tryFormatJson(lastItem.output)}`;
  } else if (lastItem.content) {
    if (typeof lastItem.content === 'string') {
      contentStr = lastItem.content;
    } else if (Array.isArray(lastItem.content)) {
      contentStr = lastItem.content.map((c: any) => c.text ?? tryFormatJson(c)).join('\n');
    } else {
      contentStr = tryFormatJson(lastItem.content);
    }
  } else {
    contentStr = tryFormatJson(lastItem);
  }

  return contentStr;
};
