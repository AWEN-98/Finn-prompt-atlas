(function attachTaskQueueRuntime(root, factory) {
  const runtime = factory();
  if (typeof module === 'object' && module.exports) module.exports = runtime;
  root.FBaseTaskQueueRuntime = runtime;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createTaskQueueRuntime() {
  'use strict';

  const STATUS = Object.freeze({
    WAITING: 'waiting',
    QUEUED: 'queued',
    RUNNING: 'running',
    ERROR: 'error',
    COMPLETED: 'completed'
  });
  const VALID_STATUSES = new Set(Object.values(STATUS));
  const ALLOWED_TRANSITIONS = Object.freeze({
    waiting: new Set(['waiting', 'queued', 'error', 'completed']),
    queued: new Set(['queued', 'running', 'waiting', 'error', 'completed']),
    running: new Set(['running', 'waiting', 'error', 'completed']),
    error: new Set(['error', 'waiting', 'queued', 'completed']),
    completed: new Set(['completed'])
  });

  function tombstoneTime(tombstones, id) {
    if (!id || !tombstones) return 0;
    if (typeof tombstones.get === 'function') return Number(tombstones.get(id)) || 0;
    return Number(tombstones[id]) || 0;
  }

  function wasCompleted(task, tombstones) {
    if (!task) return false;
    if (task.status === STATUS.COMPLETED || Number(task.completedAt) > 0) return true;
    return tombstoneTime(tombstones, task.id) > (Number(task.createdAt) || 0);
  }

  function hasCompletedResult(task, tombstones) {
    if (wasCompleted(task, tombstones)) return true;
    if (!task || task.status === STATUS.RUNNING || task.status === STATUS.QUEUED) return false;
    const result = task.result;
    return Boolean(result?.analysisId && result?.reversePrompt && (Number(result?.imported) >= 0 || Array.isArray(result?.terms)));
  }

  function canTransition(task, nextStatus, tombstones) {
    if (!task || !VALID_STATUSES.has(nextStatus)) return false;
    if (wasCompleted(task, tombstones)) return nextStatus === STATUS.COMPLETED;
    const current = VALID_STATUSES.has(task.status) ? task.status : STATUS.WAITING;
    return ALLOWED_TRANSITIONS[current].has(nextStatus);
  }

  function transition(task, nextStatus, options = {}) {
    if (!canTransition(task, nextStatus, options.tombstones)) return false;
    const now = Number(options.now) || Date.now();
    task.status = nextStatus;
    if (Object.prototype.hasOwnProperty.call(options, 'error')) task.error = String(options.error || '');
    if (Object.prototype.hasOwnProperty.call(options, 'runnerId')) task.runnerId = String(options.runnerId || '');
    if (Object.prototype.hasOwnProperty.call(options, 'phase')) task.phase = String(options.phase || '');

    if (nextStatus === STATUS.QUEUED) {
      task.queuedAt = now;
      task.phase = options.phase || 'queued';
      task.error = String(options.error || '');
    } else if (nextStatus === STATUS.RUNNING) {
      task.startedAt = Number(task.startedAt) || now;
      task.error = String(options.error || '');
    } else if (nextStatus === STATUS.WAITING) {
      task.phase = '';
      task.runnerId = '';
    } else if (nextStatus === STATUS.ERROR) {
      task.phase = '';
      task.runnerId = '';
    } else if (nextStatus === STATUS.COMPLETED) {
      task.completedAt = Math.max(Number(task.completedAt) || 0, now);
      task.phase = 'completed';
      task.runnerId = '';
      task.error = '';
    }
    task.updatedAt = Math.max(Number(task.updatedAt) || 0, now);
    return true;
  }

  function setPhase(task, phase, now = Date.now()) {
    if (!task || wasCompleted(task)) return false;
    task.phase = String(phase || '');
    task.phaseAt = Number(now) || Date.now();
    task.updatedAt = Math.max(Number(task.updatedAt) || 0, task.phaseAt);
    return true;
  }

  function recoverOrphaned(task, liveRunnerIds, ownRunnerId, now = Date.now()) {
    if (!task || wasCompleted(task)) return null;
    const inFlight = task.status === STATUS.RUNNING || task.status === STATUS.QUEUED;
    const remote = inFlight && task.runnerId && task.runnerId !== ownRunnerId;
    if (!remote || liveRunnerIds?.has(task.runnerId)) return task;
    const recovered = { ...task };
    transition(recovered, STATUS.WAITING, {
      now,
      error: '上次运行已中断，请重新开始'
    });
    return recovered;
  }

  function recordFreshness(task) {
    return Math.max(
      Number(task?.completedAt) || 0,
      Number(task?.updatedAt) || 0,
      Number(task?.phaseAt) || 0,
      Number(task?.startedAt) || 0,
      Number(task?.queuedAt) || 0,
      Number(task?.createdAt) || 0
    );
  }

  function mergeSharedTasks(remoteTasks, localTasks, localRunningIds, tombstones) {
    const localById = new Map((Array.isArray(localTasks) ? localTasks : []).filter(Boolean).map(task => [task.id, task]));
    const merged = [];
    const seen = new Set();
    for (const remote of Array.isArray(remoteTasks) ? remoteTasks : []) {
      if (!remote?.id || seen.has(remote.id) || hasCompletedResult(remote, tombstones)) continue;
      seen.add(remote.id);
      const local = localById.get(remote.id);
      if (local && localRunningIds?.has(local.id)) {
        merged.push(local);
        continue;
      }
      if (local && recordFreshness(local) > recordFreshness(remote)) merged.push(local);
      else merged.push(remote);
    }
    for (const local of localById.values()) {
      if (!local?.id || seen.has(local.id) || hasCompletedResult(local, tombstones)) continue;
      merged.push(local);
    }
    return merged;
  }

  return Object.freeze({
    STATUS,
    wasCompleted,
    hasCompletedResult,
    canTransition,
    transition,
    setPhase,
    recoverOrphaned,
    mergeSharedTasks,
    recordFreshness
  });
});
