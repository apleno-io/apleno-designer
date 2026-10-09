import { describe, it, expect } from 'vitest';
import { ProjectFileUtils } from '../src/common/project';

describe('ProjectFileUtils.sanitize with Apleno 3.x files', () => {
  const legacy = {
    start: 'main.pseq',
    name: 'App',
    wd: 'program',
    rconsole: 'r',
    list: 'hide',
    created: '2024-02-21T15:29:20+01:00',
    history: [
      { date: '21/02/2024', version: '1.0', author: 'Nicolas', changelog: 'First version' }
    ]
  };

  it('keeps the changelog entries, stored under a "changelog" key in 3.x', () => {
    expect(ProjectFileUtils.sanitize(legacy).changelog).toEqual([
      { date: '21/02/2024', version: '1.0', author: 'Nicolas', message: 'First version' }
    ]);
  });

  it('keeps the creation date, stored as an ISO string in 3.x', () => {
    expect(ProjectFileUtils.sanitize(legacy).dateCreated).toBe(Date.parse('2024-02-21T15:29:20+01:00'));
  });

  it('converts the 3.x settings', () => {
    const project = ProjectFileUtils.sanitize(legacy);
    expect(project.sequenceStart).toBe('main.pseq');
    expect(project.defaultWorkingDirectory).toBe('app');
    expect(project.consoleAccess).toBe('enabled');
    expect(project.stepListType).toBe('hidden');
  });
});
