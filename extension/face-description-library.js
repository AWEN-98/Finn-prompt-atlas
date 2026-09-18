(function initializeFBaseFaceDescriptionLibrary(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FBaseFaceDescriptionLibrary = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createFBaseFaceDescriptionLibrary() {
  'use strict';

  const FIELD_SCOPES = Object.freeze({
    faceShape: ['face_geometry', 'face_shape', 'face_archetype', 'facial_maturity'],
    eyes: ['eye_design', 'brow_expression', 'gaze', 'face_geometry'],
    nose: ['face_geometry', 'face_shape'],
    lips: ['mouth_lip_style', 'micro_expression', 'expression', 'face_geometry'],
    skinTone: ['skin_tone', 'skin_tone_color'],
    skinRendering: ['skin_rendering', 'skin_detail', 'skin_exposure', 'skin_lighting', 'capture_signature'],
    makeup: ['style_reference', 'face_archetype', 'skin_rendering', 'eye_design', 'mouth_lip_style', 'styling']
  });

  const ASSETS = Object.freeze([
    asset('face_narrow_long_oval', 'faceShape', '窄长鹅蛋脸', '窄鹅蛋脸，脸宽较窄，纵向比例略长，轮廓收紧，下颌线清晰流畅，下颌角弱化，下巴小巧偏尖且保留圆润过渡，骨相轻薄精致',
      ['窄鹅蛋', '窄椭圆', '狭长椭圆', '脸宽较窄', '纵向比例略长', '长鹅蛋'], ['宽脸', '方脸', '圆脸']),
    asset('face_narrow_soft_oval', 'faceShape', '柔和窄椭圆脸', '柔和偏窄的椭圆面部，脸宽克制，颧骨不过度外扩，下颌线轻盈流畅，下巴小巧且不锐利',
      ['柔和偏窄', '窄椭圆', '小鹅蛋', '柔和鹅蛋', '轻盈下颌', '流畅下颌'], ['宽下颌', '方下巴']),
    asset('face_soft_oval', 'faceShape', '柔和鹅蛋脸', '柔和鹅蛋脸，额头、中庭和下庭比例协调，面部骨点克制，颧面平顺，下颌向短圆下巴自然收束',
      ['鹅蛋脸', '椭圆脸', '圆润下巴', '柔和下颌'], ['狭长', '方脸']),
    asset('face_heart_small', 'faceShape', '精致心形小脸', '精致心形小脸，额头略宽，颧弓轻微展开，下颌快速收窄，下巴小巧，轮廓保持自然轻薄',
      ['心形脸', '心形小脸', '额头略宽', '下颌快速收窄'], ['方脸', '宽下巴']),
    asset('face_petiteness', 'faceShape', '紧凑精致小脸', '紧凑精致的小脸，面部横向占比克制，中庭紧凑，轮廓干净，下颌线柔和收束',
      ['巴掌小脸', '精致小脸', '小巧脸', '短中庭', '紧凑面部'], ['宽脸', '长中庭']),
    asset('face_round_petite_youthful', 'faceShape', '幼态圆润小脸', '小巧偏圆的柔和脸型，脸宽与脸长接近，双颊饱满，面中紧凑，下颌线圆润收束，下巴短圆，保留幼态软组织和自然面部体积',
      ['小巧偏圆', '圆润小脸', '短圆下巴', '双颊饱满', '脸型偏圆润', '幼态圆脸'], ['狭长', '长下巴', '方下颌']),

    asset('eyes_long_almond', 'eyes', '清澈长杏眼', '长杏眼略带狭长凤眼感，眼裂横向舒展，双眼皮褶窄而自然，卧蚕轻微，眼神清澈且压力克制',
      ['长杏眼', '狭长凤眼', '细长眼', '眼裂偏长', '横向舒展'], ['圆眼', '大鹿眼']),
    asset('eyes_large_almond', 'eyes', '明亮大杏眼', '大杏仁眼带轻微鹿眼感，虹膜占比适中偏大，卧蚕细薄自然，眼神明亮且保留真实眼睑结构',
      ['大杏眼', '大杏仁', '鹿眼', '桃花眼', '虹膜占比明显'], ['狭长眼', '小眼']),
    asset('eyes_soft_almond', 'eyes', '舒展杏眼', '自然杏眼，眼裂与虹膜比例协调，眉眼舒展，卧蚕克制，眼神清亮安静',
      ['杏眼', '舒展眉眼', '清亮眼神', '清澈眼神'], ['狭长凤眼', '大圆眼']),

    asset('nose_delicate_straight', 'nose', '秀气直鼻', '鼻梁细直秀气，鼻部宽度克制，鼻尖小巧圆润，鼻翼自然且不过度收窄',
      ['细直鼻', '秀气鼻梁', '纤细鼻梁', '鼻尖小巧', '小巧挺直鼻'], ['宽鼻', '大鼻头']),
    asset('nose_low_radix_narrow', 'nose', '中低山根窄鼻', '山根中低且过渡自然，鼻梁窄而平顺，鼻头小巧圆润，保留东亚面部自然起伏',
      ['中低山根', '山根较低', '鼻梁窄', '低山根'], ['高山根', '宽鼻梁']),

    asset('lips_soft_natural', 'lips', '柔软自然唇', '唇形柔软清晰，上下唇比例自然，唇峰克制，嘴角放松，保留细微唇纹',
      ['柔软唇', '自然唇', '唇形柔软', '唇形自然', '嘴角放松'], ['厚重唇妆']),
    asset('lips_restrained_rose', 'lips', '克制豆沙唇', '中等偏薄的自然唇形，豆沙粉或低饱和玫瑰色，边缘柔和，嘴唇轻抿并保留唇纹',
      ['豆沙', '淡色唇', '低饱和唇', '轻抿', '中等偏薄'], ['高饱和红唇', '水光唇']),
    asset('lips_dewy_peach', 'lips', '水润桃粉唇', '自然饱满的柔软唇形，桃粉色水润唇面，高光集中在唇峰和下唇中央，不扩散到面部皮肤',
      ['水润唇', '水光唇', '桃粉唇', '玻璃唇', '果冻唇'], ['雾面唇', '哑光唇']),

    asset('tone_cool_fair', 'skinTone', '冷白肤色', '肤色为冷白至象牙白，面部固有色保持自然层次，眼下与双颊允许轻微粉色，不把冷白处理成无血色灰白',
      ['冷白', '象牙白', '冷调白皙', '瓷白'], ['暖黄', '小麦色', '深肤色']),
    asset('tone_pink_porcelain', 'skinTone', '粉白瓷肌', '肤色为粉白至浅暖瓷色，双颊带克制红润，肤色通透且保留自然色差',
      ['粉白', '瓷肌', '浅暖米白', '自然微醺红', '轻微粉色'], ['冷灰', '小麦色']),
    asset('tone_natural_fair', 'skinTone', '自然白皙肤色', '白皙肤色保留轻微暖冷变化，额头、面中与颈部维持真实色差，不做全脸统一漂白',
      ['白皙通透', '白皙肤色', '自然白皙', '浅肤色'], ['深肤色']),

    asset('skin_matte_velvet', 'skinRendering', '雾面丝绒肌', '自然雾面丝绒底妆，额头大面与双颊保持柔和漫反射，鼻梁和唇峰只留窄高光，保留细腻毛孔和轻微肤色变化',
      ['雾面丝绒', '哑光底妆', '自然半哑光', '半哑光', '漫反射'], ['水光肌', '湿亮', '油光']),
    asset('skin_satin_real', 'skinRendering', '自然半缎光肌', '自然半缎光皮肤，额头和双颊反射柔和，T区高光窄而克制，保留真实毛孔、细小绒毛与轻微肤色不均',
      ['半缎光', '自然缎光', '自然肤质', '真实皮肤纹理', '细微毛孔'], ['全脸湿亮', '塑料皮肤']),
    asset('skin_dewy_porcelain', 'skinRendering', '通透瓷感水光肌', '通透瓷感皮肤，水润反射集中在眼下、鼻梁窄线与唇部，双颊保留肤色层次和细微纹理，避免连续油膜',
      ['水光肌', '瓷白水光', '通透水润', '玻璃肌'], ['雾面', '哑光']),
    asset('skin_mobile_beauty_smoothed', 'skinRendering', '移动截帧美颜肤质', '手机自拍视频、短视频截帧或屏幕截图形成的柔化肤质，保留自动曝光造成的冷白提亮、轻度美颜降噪、较低皮肤微对比、边缘柔化、肤理压平和低码率压缩；不补写清晰毛孔、锐利绒毛或暖调商业精修高光',
      ['手机自拍', '手机视频', '短视频截帧', '视频截帧', '屏幕截图', '手机截图', '状态栏', '美颜柔化', '美颜降噪', '轻度磨皮', '冷白提亮', '低微对比', '肤理压平', '低码率', '二次压缩'], ['清晰毛孔', '锐利毛孔', '精细绒毛', '暖调商业精修']),
    asset('skin_raw_lifelike', 'skinRendering', '写实生活肤质', '保留鼻翼与面中自然毛孔、轻微肤色不均、细小绒毛、唇纹和局部粉感，暗部允许轻微噪点与压缩感，整体维持真实半哑光反射',
      ['自然毛孔', '轻微毛孔', '肤色不均', '生活感', '手机随拍', '暗部噪点', '压缩感', '真实随拍'], ['零毛孔', '完美无瑕', '美颜柔化', '美颜降噪', '轻度磨皮', '磨皮', '肤理压平', '低微对比']),

    asset('makeup_korean_sheer', 'makeup', '韩系清透淡妆', '清透奶油裸妆，眼线纤细，卧蚕自然，眼下少量浅粉腮红，唇色柔和，妆面轻薄并保留皮肤本身',
      ['韩系淡颜', '清透奶油裸妆', '女团', '浅粉唇', '自然卧蚕'], ['古风', '浓妆']),
    asset('makeup_cool_classical', 'makeup', '清冷古典淡妆', '淡雅清冷的古典妆容，眼线细长，眉眼压力轻，腮红弱化，唇色为低饱和豆沙粉，气质克制疏离',
      ['古风', '古典', '清冷', '淡色古风唇', '弱腮红'], ['桃粉甜美', '女团']),
    asset('makeup_peach_clear', 'makeup', '桃粉清透妆', '轻薄通透底妆，眼下桃粉腮红克制晕染，眼妆干净，桃粉唇保持局部水润，整体清甜明亮',
      ['桃粉', '甜美妆', '眼下腮红', '粉色水润唇'], ['清冷古风']),
    asset('makeup_clean_natural', 'makeup', '白开水自然妆', '白开水感自然淡妆，眉形舒展，眼妆与腮红接近原生肤色，唇色柔和，真实皮肤纹理可见',
      ['白开水妆', '自然淡妆', '清秀淡颜', '淡妆', '原生妆感'], ['浓妆', '烟熏'])
  ]);

  function asset(id, group, label, text, cues, conflicts = []) {
    return Object.freeze({ id, group, label, text, cues: Object.freeze(cues), conflicts: Object.freeze(conflicts) });
  }

  function normalizeText(value) {
    return String(value || '').toLocaleLowerCase('zh-CN').replace(/[\s，。,.、:：;；_（）()\[\]【】/\\]+/g, '');
  }

  function rowsByKey(result) {
    const rows = Array.isArray(result?.breakdown) ? result.breakdown : [];
    const map = new Map();
    for (const row of rows) {
      const key = String(row?.key || '').trim().toLowerCase();
      if (!key) continue;
      map.set(key, `${map.get(key) || ''} ${String(row?.value || '')}`.trim());
    }
    return map;
  }

  function scopedText(map, fields) {
    return fields.map(key => map.get(key) || '').filter(Boolean).join(' ');
  }

  function scoreAsset(candidate, text) {
    const normalized = normalizeText(text);
    if (!normalized) return 0;
    if (candidate.conflicts.some(term => normalized.includes(normalizeText(term)))) return -1;
    return candidate.cues.reduce((score, cue) => score + (normalized.includes(normalizeText(cue)) ? 1 : 0), 0);
  }

  function selectForGroup(group, text) {
    const ranked = ASSETS
      .filter(item => item.group === group)
      .map(item => ({ item, score: scoreAsset(item, text) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id));
    return ranked[0] || null;
  }

  function match(result) {
    if (result?.imageType?.key !== 'photographic_portrait') return emptyMatch('仅适用于真实摄影人像');
    const map = rowsByKey(result);
    const selected = [];
    for (const group of Object.keys(FIELD_SCOPES)) {
      const ranked = selectForGroup(group, scopedText(map, FIELD_SCOPES[group]));
      if (ranked) selected.push({ ...ranked.item, score: ranked.score });
    }
    const structuralCount = selected.filter(item => ['faceShape', 'eyes', 'nose', 'lips'].includes(item.group)).length;
    const skinCount = selected.filter(item => ['skinTone', 'skinRendering'].includes(item.group)).length;
    const eligible = structuralCount >= 1 && skinCount >= 1;
    return {
      eligible,
      confidence: eligible ? Math.min(0.98, 0.56 + selected.reduce((sum, item) => sum + item.score, 0) * 0.035) : 0,
      reason: eligible ? '脸部几何与皮肤字段均有可见证据' : '脸部几何或皮肤证据不足',
      selected,
      prompt: eligible ? selected.map(item => item.text).join('；') : ''
    };
  }

  function emptyMatch(reason) {
    return { eligible: false, confidence: 0, reason, selected: [], prompt: '' };
  }

  function injectFaceAnchor(prompt, facePrompt) {
    const source = String(prompt || '').trim();
    if (!source || !facePrompt) return source;
    const withoutOld = source.replace(/脸部高优先级锚点：[^。]*(?:。|$)/u, '').trim();
    const anchor = `脸部高优先级锚点：${facePrompt}。`;
    const aspectMatch = withoutOld.match(/^(画幅\s*[^，,。]+[，,])/u);
    if (aspectMatch) return `${aspectMatch[1]}${anchor}${withoutOld.slice(aspectMatch[1].length)}`;
    return `${anchor}${withoutOld}`;
  }

  function apply(result, options = {}) {
    const source = result && typeof result === 'object' ? result : {};
    const matchResult = match(source);
    if (options.enabled === false || !matchResult.eligible) return { ...source, faceAssetMatch: matchResult };
    const breakdown = (Array.isArray(source.breakdown) ? source.breakdown : [])
      .filter(row => String(row?.key || '').toLowerCase() !== 'face_reference_assets');
    breakdown.push({ key: 'face_reference_assets', label: '脸部参考资产', value: matchResult.prompt });
    return {
      ...source,
      breakdown,
      prompt: injectFaceAnchor(source.prompt, matchResult.prompt),
      variantPrompt: source.variantPrompt ? injectFaceAnchor(source.variantPrompt, matchResult.prompt) : '',
      faceAssetMatch: matchResult
    };
  }

  return Object.freeze({ ASSETS, FIELD_SCOPES, match, apply, injectFaceAnchor });
});
