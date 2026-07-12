import boxen from 'boxen';
import * as p from '@clack/prompts';
import { getStats } from '../../client/token-stats';

export const showHeader = (agentName: string, model: string, sessionId: number) => {
  console.log(
    boxen(`${agentName}  |  ${model}  |  session #${sessionId}`, {
      borderStyle: 'round',
      borderColor: 'cyan',
      padding: { top: 0, bottom: 0, left: 2, right: 2 },
      title: 'ai_devs4',
      titleAlignment: 'center',
    })
  );
};

export const showStats = () => {
  const { input, output, requests } = getStats();
  if (requests === 0) return;
  p.log.info(`${requests} requests | ${input} in | ${output} out | ${input + output} total tokens`);
};
