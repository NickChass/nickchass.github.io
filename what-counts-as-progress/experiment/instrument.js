(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WCAPInstrument = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const STUDY_ID = 'repeat-credit-counts-rates';
  const VERSION = '0.1.0-draft';
  const SCHEMA_VERSION = '1.0.0-draft';
  const DURATION_MS = 480000;
  const ARMS = ['all_correct', 'distinct_item'];
  const FUTURE_PARTICIPANT_MODE_ENABLED = false;
  function requireValue(test, message) { if (!test) throw new Error(message); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function seededRandom(seed) {
    requireValue(Number.isInteger(seed) && seed >= 0 && seed <= 4294967295, 'Seed must be an unsigned 32-bit integer.');
    let value = seed >>> 0;
    return function () {
      value += 0x6D2B79F5;
      let mixed = Math.imul(value ^ value >>> 15, 1 | value);
      mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, 61 | mixed);
      return ((mixed ^ mixed >>> 14) >>> 0) / 4294967296;
    };
  }

  function createSession(options) {
    options = options || {};
    requireValue(options.items && Array.isArray(options.items.baseline) && Array.isArray(options.items.practice) && Array.isArray(options.items.transfer), 'A versioned item bank is required.');
    requireValue(options.items.baseline.length === 4 && options.items.practice.length === 6 && options.items.transfer.length === 6, 'Expected four baseline, six practice and six transfer items.');
    const itemBank = options.items;
    const lookup = Object.fromEntries([...itemBank.baseline, ...itemBank.practice, ...itemBank.transfer].map(item => [item.id, item]));
    requireValue(lookup.P1 && lookup.B1 && lookup.T1, 'Item IDs do not match the protocol.');
    const seed = options.randomSeed === undefined ? null : options.randomSeed;
    const random = options.random || (seed === null ? Math.random : seededRandom(seed));
    const override = options.armOverride || null;
    requireValue(override === null || ARMS.includes(override), 'Unknown development arm override.');
    const state = {
      stage: 'intro', status: 'incomplete', elapsed_ms: 0, arm: null, assignment_method: null,
      assignment_seed: seed, assignment_draw_raw: options.allocationDraw === undefined ? null : options.allocationDraw, assignment_draw: null,
      points: 0, successful_item_ids: [], encountered_item_ids: [], attempted_item_ids: [], events: [],
      baseline_score: null, baseline_responses: {}, warmup_correct: false, rule_checked: false,
      practice_elapsed_ms: 0, practice_started_at_ms: null, practice_window_completed: false,
      first_choice_category: 'none', active_item_id: null, active_answered: false,
      transfer_responses: {}, transfer_score: null, motivation_responses: {},
      development_time_advance_used: false
    };
    const recordKind = options.sessionKind || 'development_demo';
    requireValue(['development_demo', 'synthetic'].includes(recordKind), 'Participant collection mode is disabled pending review and piloting.');
    function log(type, payload) {
      const event = { sequence: state.events.length + 1, type, elapsed_ms: state.elapsed_ms, payload: clone(payload || {}) };
      state.events.push(event);
      return event;
    }
    function itemCorrect(itemId, responseOption) {
      const item = lookup[itemId];
      requireValue(item && Object.prototype.hasOwnProperty.call(item.options, responseOption), 'Response option is not in the item bank.');
      return responseOption === item.answer;
    }
    function guard(stage) { requireValue(state.stage === stage, `This action requires stage ${stage}; current stage is ${state.stage}.`); }
    log('session_started', { session_kind: recordKind, participant_mode_enabled: false });

    function finishPractice(reason) {
      requireValue(state.practice_elapsed_ms >= DURATION_MS, 'A no-choice outcome requires the complete practice window.');
      state.practice_elapsed_ms = DURATION_MS;
      state.practice_window_completed = true;
      log('practice_window_completed', { duration_ms: DURATION_MS, observed_elapsed_ms: state.elapsed_ms - state.practice_started_at_ms, reason, first_choice_category: state.first_choice_category, final_points: state.points });
      state.active_item_id = null;
      state.stage = 'transfer';
    }
    return {
      advance(milliseconds) {
        requireValue(Number.isFinite(milliseconds) && milliseconds >= 0, 'Elapsed time must be finite and nonnegative.');
        state.elapsed_ms += milliseconds;
        if (state.stage === 'practice') {
          state.practice_elapsed_ms = state.elapsed_ms - state.practice_started_at_ms;
          if (state.practice_elapsed_ms >= DURATION_MS) finishPractice('elapsed_window');
        }
      },
      acknowledge() { guard('intro'); log('demo_acknowledged', { research_consent: false }); state.stage = 'baseline'; },
      answerBaseline(responses) {
        guard('baseline');
        requireValue(itemBank.baseline.every(item => Object.prototype.hasOwnProperty.call(responses, item.id)), 'All four baseline responses are required before assignment.');
        let score = 0;
        itemBank.baseline.forEach(item => {
          const correct = itemCorrect(item.id, responses[item.id]); score += Number(correct);
          state.baseline_responses[item.id] = responses[item.id];
          log('baseline_response', { item_id: item.id, response_option: responses[item.id], correct });
        });
        state.baseline_score = score;
        log('baseline_completed', { answered: 4, score, possible: 4 }); state.stage = 'lesson';
      },
      finishLesson() { guard('lesson'); log('lesson_viewed', { lesson_version: VERSION }); state.stage = 'warmup'; },
      answerWarmup(responseOption) {
        guard('warmup'); const correct = itemCorrect('P1', responseOption);
        log('warmup_response', { item_id: 'P1', response_option: responseOption, correct });
        if (correct) {
          state.warmup_correct = true; state.successful_item_ids = ['P1']; state.encountered_item_ids = ['P1']; state.attempted_item_ids = ['P1'];
          log('warmup_completed', { item_id: 'P1', correct: true }); state.stage = 'assignment_ready';
        }
        return { correct, explanation: lookup.P1.explanation };
      },
      assign() {
        guard('assignment_ready'); requireValue(state.warmup_correct, 'A correct warmup must precede assignment.');
        const draw = override === null ? random() : null;
        if (override === null) requireValue(Number.isFinite(draw) && draw >= 0 && draw < 1, 'Random draw must be in [0,1).');
        state.arm = override || ARMS[draw < 0.5 ? 0 : 1];
        state.assignment_draw = draw;
        state.assignment_method = override === null ? (options.assignmentMethod || (seed === null ? 'independent_equal_probability' : 'seeded_equal_probability_development')) : (recordKind === 'synthetic' ? 'synthetic_fixture_fixed' : 'development_override');
        state.points = 1;
        log('condition_assigned', { arm: state.arm, assignment_method: state.assignment_method, assignment_seed: seed, assignment_draw_raw: state.assignment_draw_raw, assignment_draw: draw, initial_points: 1, eligible_correct_repeat_item_id: 'P1' });
        state.stage = 'rule'; return state.arm;
      },
      answerRule(responsePoints, responseOption = null) {
        guard('rule'); requireValue(responsePoints === 0 || responsePoints === 1, 'Choose zero or one point.');
        const expected = state.arm === 'all_correct' ? 1 : 0;
        log('rule_comprehension_response', { response_option: responseOption, response_points: responsePoints, correct: responsePoints === expected, expected_points: expected, exclusion: false });
        state.rule_checked = true; state.stage = 'practice_ready';
        return { correct: responsePoints === expected, expected };
      },
      startPractice() {
        guard('practice_ready'); requireValue(state.rule_checked && state.arm && state.warmup_correct && state.points === 1, 'Assignment and shared warmup must be complete.');
        state.practice_started_at_ms = state.elapsed_ms; state.stage = 'practice';
        log('practice_started', { duration_ms: DURATION_MS, initial_points: 1, successful_item_ids: ['P1'] });
      },
      menuChoice(category, requestedItem) {
        guard('practice'); requireValue(['repeat', 'new', 'review', 'retry'].includes(category), 'Unknown menu choice.');
        let itemId;
        if (category === 'new') {
          const item = itemBank.practice.find(item => !state.encountered_item_ids.includes(item.id));
          requireValue(item, 'No unseen practice item remains.'); itemId = item.id;
        } else if (category === 'repeat') {
          itemId = requestedItem || 'P1'; requireValue(state.successful_item_ids.includes(itemId), 'A repeat requires a previously correct item.');
        } else if (category === 'retry') {
          itemId = requestedItem; requireValue(state.attempted_item_ids.includes(itemId) && !state.successful_item_ids.includes(itemId), 'A retry requires a previously attempted but not-yet-correct item.');
        } else {
          itemId = requestedItem || 'P1'; requireValue(state.encountered_item_ids.includes(itemId), 'Only an encountered item can be reviewed.');
        }
        if (state.first_choice_category === 'none') {
          requireValue(category !== 'retry', 'Retry is unavailable at the first menu.');
          requireValue(itemId === (category === 'new' ? 'P2' : 'P1'), 'First menu content must be identical across arms.');
          state.first_choice_category = category;
        }
        log('practice_menu_choice', { choice: category, item_id: itemId, previously_correct: state.successful_item_ids.includes(itemId), previously_encountered: state.encountered_item_ids.includes(itemId) });
        if (!state.encountered_item_ids.includes(itemId)) state.encountered_item_ids.push(itemId);
        state.active_item_id = category === 'review' ? null : itemId; state.active_answered = false;
        if (category === 'review') log('explanation_viewed', { item_id: itemId, points_awarded: 0 });
        return clone(lookup[itemId]);
      },
      answerPractice(responseOption) {
        guard('practice'); requireValue(state.active_item_id && !state.active_answered, 'Choose an item from the menu before submitting one answer.');
        const itemId = state.active_item_id;
        const correct = itemCorrect(itemId, responseOption);
        const previouslyCorrect = state.successful_item_ids.includes(itemId);
        const awarded = correct && (state.arm === 'all_correct' || !previouslyCorrect) ? 1 : 0;
        state.points += awarded;
        if (correct && !previouslyCorrect) state.successful_item_ids.push(itemId);
        if (!state.attempted_item_ids.includes(itemId)) state.attempted_item_ids.push(itemId);
        state.active_answered = true;
        log('practice_response', { item_id: itemId, response_option: responseOption, correct, previously_correct: previouslyCorrect, points_awarded: awarded, total_points_after: state.points });
        return { correct, points_awarded: awarded, explanation: lookup[itemId].explanation };
      },
      advanceDevelopmentWindow() {
        guard('practice'); requireValue(recordKind === 'development_demo', 'Development time advance is unavailable to other record kinds.');
        const remaining = DURATION_MS - state.practice_elapsed_ms;
        state.elapsed_ms += remaining; state.practice_elapsed_ms = DURATION_MS;
        state.development_time_advance_used = true;
        log('development_clock_advanced', { added_ms: remaining, purpose: 'Inspect subsequent screens without waiting; not observed practice time' });
        finishPractice('development_time_advance');
      },
      answerTransfer(itemId, responseOption) {
        guard('transfer'); requireValue(itemBank.transfer.some(item => item.id === itemId), 'Not a transfer item.');
        requireValue(!Object.prototype.hasOwnProperty.call(state.transfer_responses, itemId), 'The first transfer answer is locked.');
        const correct = itemCorrect(itemId, responseOption); state.transfer_responses[itemId] = responseOption;
        log('transfer_response', { item_id: itemId, response_option: responseOption, correct, points_awarded: 0 });
      },
      finishTransfer() {
        guard('transfer'); const answered = Object.keys(state.transfer_responses).length;
        state.transfer_score = answered === 6 ? itemBank.transfer.reduce((sum, item) => sum + Number(state.transfer_responses[item.id] === item.answer), 0) : null;
        log('transfer_completed', { answered, possible: 6, score: state.transfer_score, complete: answered === 6, missing_not_zero: answered !== 6 });
        state.stage = 'reflection';
      },
      answerMotivation(responses) {
        guard('reflection');
        (itemBank.motivation || []).forEach(item => {
          const value = Object.prototype.hasOwnProperty.call(responses, item.id) ? responses[item.id] : null;
          requireValue(value === null || Number.isInteger(value) && value >= 1 && value <= 7, 'Reflection responses must be 1–7 or missing.');
          state.motivation_responses[item.id] = value; log('motivation_response', { item_id: item.id, value, validated_scale: false });
        });
        state.stage = 'debrief';
      },
      complete() { guard('debrief'); log('session_completed', { transfer_complete: state.transfer_score !== null }); state.status = 'completed'; state.stage = 'complete'; },
      withdraw() {
        requireValue(!['complete', 'withdrawn'].includes(state.stage), 'This run has already ended.');
        log('session_withdrawn', { stage_at_stop: state.stage, analytic_use: false });
        state.status = 'withdrawn'; state.stage = 'withdrawn'; state.active_item_id = null;
      },
      snapshot() { return clone(state); },
      exportRecord() {
        log('development_export_requested', { opt_in: true, no_remote_upload: true });
        const snapshot = clone(state); delete snapshot.events;
        return {
          study_id: STUDY_ID, protocol_version: VERSION, item_bank_version: VERSION, schema_version: SCHEMA_VERSION,
          session_kind: recordKind, session_label: options.sessionLabel || 'local-development-session',
          participant_collection_enabled: FUTURE_PARTICIPANT_MODE_ENABLED,
          arm: state.arm, assignment_method: state.assignment_method, assignment_seed: seed, assignment_draw_raw: state.assignment_draw_raw, status: state.status,
          events: clone(state.events), state_snapshot: snapshot,
          notice: recordKind === 'synthetic' ? 'Seeded synthetic software-test record; no participant observation' : 'Development demonstration record; not a participant observation'
        };
      }
    };
  }
  return { createSession, seededRandom, STUDY_ID, VERSION, SCHEMA_VERSION, DURATION_MS, ARMS, FUTURE_PARTICIPANT_MODE_ENABLED };
});
