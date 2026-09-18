(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.FBaseXiezhenAssets = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const OUTPUT_TEMPLATES = Object.freeze([
    { id: 'detailed', label: '直接给提示词', description: '复制就能用，复杂画面按需保留细节', directive: '输出连续完整的中文提示词，优先保留三至五个辨识特征及必要细节。省略重复、低影响信息与通用负面词。用户要求时再展开，不自动署名。' },
    { id: 'series_master', label: '保持这个感觉', description: '系列母版：满意后提炼设定，复制到下一次复用', directive: '提炼简洁可复制的系列设定，固定已确认的主体、媒介、色彩与成像特征，列出可变项。不默认规划八张，不声称永久保存。' },
    { id: 'series_variant', label: '继续做一组', description: '同系列变体：延续风格，换场景、动作或镜头', directive: '按用户指定数量输出独立可用的同系列提示词，未指定时三张。保留已确认视觉特征，变化指定内容。没有母版时从当前参考提炼，不编造已保存的设定。' },
    { id: 'lottery', label: '试三个方向', description: '抽卡短词：三个独立可用的短方案，选好再细化', directive: '给三个明显不同的短提示词，每个均能独立使用，用中文短标题区分。用户指定数量时服从用户，不输出需自行拼接的词池。' }
  ]);

  const MAKEUP_BASES = Object.freeze([
    { id: 'mobile_beauty_frame', label: '移动截帧美颜妆', cues: ['手机自拍','手机视频','短视频截帧','视频截帧','屏幕截图','手机截图','状态栏','美颜柔化','美颜降噪','轻度磨皮','冷白提亮','低微对比','肤理压平','低码率','二次压缩'], skin: '保留手机自动曝光形成的冷白提亮、轻度美颜降噪、肤理压平、较低皮肤微对比、边缘柔化和低码率压缩，不补写清晰毛孔、锐利绒毛或暖调商业精修高光', eyes: '沿用原图眉眼和眼妆强度，轮廓受移动端柔化影响，避免自动增强眼线、睫毛和眼球锐度', blush: '只保留原图可见的低强度贴肤红润，不新增商业美妆式腮红色块', lips: '保留原图唇色、边缘柔化与有限反光，不自动升级为镜面唇或锐利唇纹', faceFits: ['原图可见脸型','自拍视频近景','短视频人像'], lightingFits: ['手机自动曝光','室内冷白环境光','前置摄像头补偿'], goodWith: ['自拍视频','短视频截帧','屏幕截图','低码率压缩'], avoidWith: ['清晰毛孔','锐利绒毛','暖调商业精修','均匀棚拍光'], reflectionBoundary: '保留冷白提亮和美颜柔化后的低微对比，额头、双颊与鼻部反射服从原图自动曝光，不扩展成暖调精修高光', variables: ['冷白提亮强度','美颜柔化程度','压缩与边缘柔化程度'] },
    { id: 'clear_natural', label: '清透原生妆', cues: ['淡妆','清透','自然眉','裸妆','生活感'], skin: '自然半哑光底妆，保留细微毛孔与肤色起伏', eyes: '舒展眉眼，细眼线，睫毛轻盈，眼下仅有弱修饰', blush: '低饱和贴肤腮红，边缘柔和', lips: '自然豆沙或裸粉唇，反光克制', faceFits: ['柔和椭圆脸','小鹅蛋脸','自然圆脸'], lightingFits: ['窗边柔光','阴天散射光','室内环境光'], goodWith: ['生活随拍','胶片颗粒','低饱和服装'], avoidWith: ['厚重舞台眼妆','镜面高光全脸覆盖'], reflectionBoundary: '额头和双颊保持漫反射，只在鼻梁、鼻尖和唇峰保留窄高光', variables: ['唇色冷暖','腮红浓度','眼线长度'] },
    { id: 'peach_soft', label: '桃粉柔光妆', cues: ['桃粉','粉润','甜美','卧蚕','少女妆'], skin: '粉白细腻肤色，柔和缎光底妆并保留真实皮肤纹理', eyes: '长杏眼或杏仁眼，轻微卧蚕，棕色细眼线', blush: '桃粉腮红集中在眼下与面中', lips: '水润桃粉唇，唇峰清楚', faceFits: ['窄鹅蛋脸','心形脸','精致小脸'], lightingFits: ['柔和正面光','浅暖窗光','低反差棚光'], goodWith: ['韩系写真','浅色针织','奶油色背景'], avoidWith: ['深色烟熏眼','高硬度顶光'], reflectionBoundary: '面中保持柔润，额头和脸颊避免大面积湿亮反光', variables: ['桃粉饱和度','卧蚕强度','唇部水光'] },
    { id: 'green_fresh', label: '青绿氧气妆', cues: ['氧气感','青绿','清新','元气','初恋感'], skin: '冷白到中性白肤色，轻薄清透底妆', eyes: '清亮眼神，灰棕眉眼，眼尾轻微延伸', blush: '低浓度冷粉或杏粉腮红', lips: '浅粉润唇，唇缘自然', faceFits: ['小鹅蛋脸','圆润小脸'], lightingFits: ['清晨自然光','树荫散射光','浅青环境光'], goodWith: ['白色服装','浅绿色场景','户外写真'], avoidWith: ['橙黄重滤镜','浓黑眼圈'], reflectionBoundary: '皮肤通透感来自薄底妆和柔光，避免瓷器般无纹理表面', variables: ['环境冷暖','唇色明度','眉色深浅'] },
    { id: 'rose_satin', label: '玫瑰缎光妆', cues: ['玫瑰','缎光','红润','成熟','精致妆'], skin: '中性偏暖肤色，细腻缎光底妆', eyes: '清晰睫毛与柔棕眼影，眼尾略抬', blush: '玫瑰色腮红沿颧面轻扫', lips: '玫瑰豆沙唇或低饱和红唇', faceFits: ['椭圆脸','心形脸','菱形脸'], lightingFits: ['暖调侧光','柔和轮廓光','室内钨丝灯'], goodWith: ['晚宴服装','复古首饰','深色背景'], avoidWith: ['荧光粉色','全脸油亮'], reflectionBoundary: '颧面和唇部允许柔和缎光，鼻翼与额头保持克制', variables: ['唇色深浅','眼尾角度','颧面光泽'] },
    { id: 'tea_matte', label: '茶棕雾面妆', cues: ['茶棕','雾面','低饱和','棕调','复古妆'], skin: '暖米色雾面底妆，细小肤理可见', eyes: '茶棕眼影与内收眼线，眉色自然偏深', blush: '棕粉腮红低位铺开', lips: '茶棕或肉桂色雾面唇', faceFits: ['长椭圆脸','方圆脸','骨相清晰'], lightingFits: ['复古直闪','暖暗环境光','窗帘过滤光'], goodWith: ['胶片生活感','棕色皮革','深色针织'], avoidWith: ['冷白高亮底妆','高饱和蓝紫光'], reflectionBoundary: '全脸以柔和漫反射为主，唇部仅保留微弱湿度', variables: ['棕调比例','唇部明度','眼影边界'] },
    { id: 'cool_cat', label: '冷调猫系妆', cues: ['猫系','冷欲','清冷','上挑眼线','疏离'], skin: '冷白或中性偏冷肤色，薄雾面底妆', eyes: '狭长眼型，上挑细眼线，眼神压力明确', blush: '冷粉腮红少量集中于颧面', lips: '灰粉或冷豆沙唇，边缘利落', faceFits: ['窄椭圆脸','菱形脸','精致小脸'], lightingFits: ['冷调侧光','低照度室内光','蓝灰环境光'], goodWith: ['黑色服装','金属配饰','暗调近景'], avoidWith: ['圆润夸张卧蚕','橙色厚腮红'], reflectionBoundary: '高光收窄在鼻梁和眼球，双颊保持平静雾面', variables: ['眼线上扬角度','唇色灰度','腮红位置'] },
    { id: 'y2k_glass', label: '千禧玻璃唇妆', cues: ['千禧','玻璃唇','闪片','亮泽','甜酷'], skin: '清透中性底妆，局部细闪极少量', eyes: '细长眼线配轻微亮片眼影，睫毛根根分明', blush: '浅粉腮红集中面中', lips: '透明感玻璃唇，唇心高光清楚', faceFits: ['精致小脸','心形脸','窄鹅蛋脸'], lightingFits: ['机顶直闪','彩色环境灯','夜间室内闪光'], goodWith: ['千禧配饰','金属材质','低照度随拍'], avoidWith: ['全脸镜面反射','厚重粉底'], reflectionBoundary: '亮泽集中唇部和眼部小面积，脸颊与额头避免湿亮覆盖', variables: ['亮片密度','唇色底色','直闪强度'] },
    { id: 'classical_jade', label: '新中式玉润妆', cues: ['新中式','古典','清冷古风','玉润','豆沙唇'], skin: '冷白到粉白肤色，细腻玉润感并保留自然肌理', eyes: '细长眼线，眼神含蓄，眉形舒展', blush: '弱腮红，颜色贴近肤色', lips: '豆沙粉或淡古典红唇，轮廓柔和', faceFits: ['窄鹅蛋脸','柔和椭圆脸','古典小脸'], lightingFits: ['柔和侧逆光','窗格散射光','低饱和棚光'], goodWith: ['丝绸','玉石首饰','中式庭院'], avoidWith: ['欧美重修容','荧光色眼影'], reflectionBoundary: '肤面柔润且不塑料化，额头和双颊保留柔和漫反射', variables: ['唇色古典度','眉形弧度','肤色冷暖'] },
    { id: 'direct_flash_clean', label: '直闪清透妆', cues: ['直闪','机顶闪光','闪光灯','随拍','清透妆'], skin: '轻薄底妆，真实肤理、轻微油脂和局部曝光差异可见', eyes: '简洁眼线与自然睫毛，眼球保留小型直闪反光', blush: '淡粉或杏粉腮红，不扩大成重色块', lips: '自然润泽唇，避免过强镜面效果', faceFits: ['自然脸型','小鹅蛋脸','圆润小脸'], lightingFits: ['机顶直闪','夜间室内光','低照度环境加闪光'], goodWith: ['生活抓拍','颗粒噪点','暗背景'], avoidWith: ['均匀商业棚光','全局磨皮'], reflectionBoundary: '鼻尖、额头和唇部允许局部闪点，保留暗部噪点与曝光不均', variables: ['闪光强度','背景暗度','颗粒程度'] },
    { id: 'film_lifelike', label: '胶片生活妆', cues: ['胶片','颗粒','生活感','低照度','粗粝'], skin: '暖中性真实肤色，半哑光表面与轻微颗粒共同存在', eyes: '自然眉眼与低强度眼妆，边缘稍柔', blush: '贴肤暖粉腮红，受环境色轻微影响', lips: '低饱和自然唇色，细节适度柔化', faceFits: ['自然椭圆脸','方圆脸','窄椭圆脸'], lightingFits: ['窗边侧光','低照度环境光','暖色实景灯'], goodWith: ['胶片颗粒','旧室内场景','暖灰色调'], avoidWith: ['超清商业锐化','瓷白无纹理皮肤'], reflectionBoundary: '高光有轻微扩散，皮肤纹理和暗部颗粒仍可辨认', variables: ['颗粒粗细','色偏程度','高光扩散'] }
  ]);

  const AESTHETIC_PRESETS = Object.freeze([
    { id: 'faithful', label: '保持原图感觉', description: '沿用参考图的光线、色彩和质感', styleChain: [], imagingChain: [], makeupIds: [], scenePool: [], propPool: [], actionPool: [], guardrails: ['不增加输入未支持的妆造与风格'] },
    { id: 'clean_korean', label: '清透韩系', description: '明亮柔光、低对比、干净自然的肤色', styleChain: ['清透生活写真','干净柔和','自然有记忆点'], imagingChain: ['柔和散射光','自然半哑光皮肤','浅景深克制'], makeupIds: ['clear_natural','peach_soft','green_fresh'], scenePool: ['窗边','浅色室内','安静街角'], propPool: ['小型首饰','简洁织物'], actionPool: ['轻微侧头','放松直视','自然抬手'], guardrails: ['保留真实皮肤纹理','避免模板化网红脸','避免过度磨皮'] },
    { id: 'direct_flash_retro', label: '复古直闪', description: '正面闪光、清晰阴影、暗背景抓拍感', styleChain: ['复古生活随拍','亲密近距离','不均匀曝光'], imagingChain: ['机顶直闪','暗背景压缩','轻微噪点与高光扩散'], makeupIds: ['direct_flash_clean','tea_matte','y2k_glass'], scenePool: ['夜间室内','旧公寓','狭窄走廊'], propPool: ['复古眼镜','小型金属首饰'], actionPool: ['近距离自拍','贴近镜头','即时抓拍'], guardrails: ['避免均匀商业棚光','避免全局超清','保留暗部层次'] },
    { id: 'film_lifelike', label: '胶片生活感', description: '自然光、日常构图、暖灰色彩与轻微颗粒', styleChain: ['胶片生活摄影','松弛真实','轻微年代感'], imagingChain: ['环境光主导','柔和颗粒','低饱和暖灰色偏'], makeupIds: ['film_lifelike','clear_natural','tea_matte'], scenePool: ['居住空间','旧街道','窗边餐桌'], propPool: ['日常织物','旧木家具','生活小物'], actionPool: ['走神瞬间','自然倚靠','轻微转身'], guardrails: ['避免过度摆拍','避免皮肤塑料感','避免高饱和滤镜'] },
    { id: 'new_chinese', label: '新中式写真', description: '东方古典气质、克制妆面与现代摄影语言', styleChain: ['新中式人物写真','清冷含蓄','传统材质现代化'], imagingChain: ['柔和侧逆光','低饱和青灰与暖肤色','细腻织物反射'], makeupIds: ['classical_jade','rose_satin'], scenePool: ['中式庭院','木格窗边','简洁灰墙'], propPool: ['玉石首饰','纸伞','丝织物'], actionPool: ['低垂视线','轻握道具','克制回望'], guardrails: ['避免影楼古装套版','避免浓重舞台妆','避免道具堆砌'] },
    { id: 'cinematic_editorial', label: '电影编辑感', description: '明确场面关系、局部叙事与克制后期', styleChain: ['电影式人物编辑摄影','场面关系明确','瞬间叙事'], imagingChain: ['动机光源','分区曝光','电影颗粒与色彩密度'], makeupIds: ['clear_natural','rose_satin','cool_cat'], scenePool: ['实景走廊','林间道路','城市夜景'], propPool: ['叙事道具','环境前景遮挡'], actionPool: ['越肩关系','视线冲突','动作前后瞬间'], guardrails: ['避免人物证件照式居中','避免背景空泛','避免商业人像均匀补光'] }
  ]);

  const byId = (items, id, fallback) => items.find(item => item.id === id) || items.find(item => item.id === fallback) || items[0];
  const textOf = result => [result?.prompt, result?.variantPrompt, ...(Array.isArray(result?.breakdown) ? result.breakdown.map(row => `${row.label || ''} ${row.value || ''}`) : [])].join(' ');
  const MOBILE_CAPTURE_CUES = Object.freeze(['手机自拍','手机前置','前置摄像头','手机视频','自拍视频','短视频截帧','视频截帧','屏幕截图','手机截图','截屏','状态栏','手机录屏','屏幕录制']);
  const MOBILE_DEGRADATION_CUES = Object.freeze(['美颜柔化','美颜降噪','轻度磨皮','磨皮','冷白提亮','低微对比','肤理压平','低码率','二次压缩','压缩感','边缘柔化','局部柔焦']);

  function matchMakeup(result) {
    if (result?.imageType?.key !== 'photographic_portrait') return { eligible: false, selected: null, score: 0, evidence: [] };
    const text = textOf(result);
    const mobileCaptureEvidence = MOBILE_CAPTURE_CUES.filter(cue => text.includes(cue));
    const mobileDegradationEvidence = MOBILE_DEGRADATION_CUES.filter(cue => text.includes(cue));
    if (mobileCaptureEvidence.length && mobileDegradationEvidence.length) {
      const selected = byId(MAKEUP_BASES, 'mobile_beauty_frame', 'clear_natural');
      const evidence = [...new Set([...mobileCaptureEvidence, ...mobileDegradationEvidence])];
      return { eligible: true, selected, score: evidence.length, evidence };
    }
    let best = null;
    for (const item of MAKEUP_BASES) {
      const evidence = item.cues.filter(cue => text.includes(cue));
      const score = evidence.length;
      if (!best || score > best.score) best = { item, score, evidence };
    }
    if (!best || best.score < 2) return { eligible: false, selected: null, score: best?.score || 0, evidence: best?.evidence || [] };
    return { eligible: true, selected: best.item, score: best.score, evidence: best.evidence };
  }

  function makeupAnchor(item) {
    if (!item) return '';
    return `妆容母体参考：${item.label}；底妆：${item.skin}；眉眼：${item.eyes}；腮红：${item.blush}；唇妆：${item.lips}；反射边界：${item.reflectionBoundary}。`;
  }

  function applyEvidenceMakeup(result) {
    const output = { ...(result || {}), breakdown: Array.isArray(result?.breakdown) ? result.breakdown.map(row => ({ ...row })) : [] };
    const match = matchMakeup(output);
    if (!match.eligible) return output;
    const anchor = makeupAnchor(match.selected);
    if (!output.breakdown.some(row => row.key === 'makeup_reference_asset')) {
      output.breakdown.push({ key: 'makeup_reference_asset', label: '妆容母体参考', value: `${match.selected.label}；证据：${match.evidence.join('、')}；${match.selected.skin}；${match.selected.eyes}；${match.selected.lips}` });
    }
    if (output.prompt && !output.prompt.includes('妆容母体参考：')) output.prompt = `${output.prompt}\n${anchor}`;
    return output;
  }

  function creativeGuide(presetId, templateId) {
    const preset = byId(AESTHETIC_PRESETS, presetId, 'faithful');
    const template = byId(OUTPUT_TEMPLATES, templateId, 'detailed');
    if (preset.id === 'faithful') return `输出模板：${template.label}。${template.directive}`;
    const makeups = preset.makeupIds.map(id => byId(MAKEUP_BASES, id, '')?.label).filter(Boolean);
    return [
      `输出模板：${template.label}。${template.directive}`,
      `审美预设：${preset.label}。${preset.description}`,
      `风格链：${preset.styleChain.join('、')}。成像链：${preset.imagingChain.join('、')}。`,
      `妆容参考仅在用户要求改变妆容时使用：${makeups.join('、')}。默认保持人物身份、肤色与服装。`,
      `仅在用户要求换场景、道具或动作时参考：场景 ${preset.scenePool.join('、')}；道具 ${preset.propPool.join('、')}；动作 ${preset.actionPool.join('、')}。`,
      `审美边界：${preset.guardrails.join('；')}。`
    ].join('\n');
  }

  function resolveIntent(text, settings = {}) {
    const next = { ...settings };
    const clauses = String(text || '').split(/[，。；！？\n,;!?]/).map(value => value.trim()).filter(Boolean);
    const requested = pattern => clauses.some(clause => {
      const match = pattern.exec(clause);
      if (!match || /怎么用|什么意思|解释一下|什么是/.test(clause)) return false;
      return !/不要|不用|别|避免|取消/.test(clause.slice(0, match.index));
    });
    if (requested(/试[三3几]个方向|抽卡(?:短词|关键词)?/)) next.xiezhenTemplate = 'lottery';
    else if (requested(/同系列变体|继续做一组|再来[一二三四五六七八九十\d]+张/)) next.xiezhenTemplate = 'series_variant';
    else if (requested(/系列母版|保持这个感觉|后面都照这个来/)) next.xiezhenTemplate = 'series_master';
    if (requested(/清透韩系|(?:明亮|干净).*(?:柔和|干净)/)) next.aestheticPreset = 'clean_korean';
    if (requested(/复古直闪|闪光灯抓拍/)) next.aestheticPreset = 'direct_flash_retro';
    if (requested(/胶片生活感|想要随手拍/)) next.aestheticPreset = 'film_lifelike';
    if (requested(/保持原图(?:风格|感觉)|忠实参考/) || /不要加风格/.test(text)) next.aestheticPreset = 'faithful';
    if (requested(/详细一点|详细提示词|详细拆解|尽量还原/)) next.promptDetail = 'precise';
    if (/只(?:要|给)提示词|只反推|不要变体/.test(text)) {
      next.xiezhenTemplate = 'detailed';
      next.outputVariant = false;
    }
    return next;
  }

  return Object.freeze({ OUTPUT_TEMPLATES, MAKEUP_BASES, AESTHETIC_PRESETS, resolveIntent, getTemplate: id => byId(OUTPUT_TEMPLATES, id, 'detailed'), getPreset: id => byId(AESTHETIC_PRESETS, id, 'faithful'), matchMakeup, applyEvidenceMakeup, makeupAnchor, creativeGuide });
});
