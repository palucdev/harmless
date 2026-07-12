export enum EventTypes {
  TOOL_PRE_USE = 'tool:preUse',
  TOOL_POST_USE = 'tool:postUse',
  AGENT_STARTED = 'agent:started',
  AGENT_COMPLETED = 'agent:completed',
  MODEL_REQUEST = 'model:request',
  MODEL_RESPONSE = 'model:response',
  MESSAGE_ADDED = 'message:added',
  SKILL_ON_LOAD = 'skill:onLoad',
}
