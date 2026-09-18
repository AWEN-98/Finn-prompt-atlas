(function initializeFBaseReverseMethodology(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FBaseReverseMethodology = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createFBaseReverseMethodology() {
  'use strict';

  const SUPPORTED_RATIOS = Object.freeze(['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '4:5', '21:9', '9:21', '3:1', '1:3']);

  const PROFILE_CONTRACTS = Object.freeze({
    photographic_portrait: Object.freeze({
      label: '真实人像摄影',
      minimumRows: 28,
      groups: Object.freeze([
        ['medium_identity'],
        ['style_reference', 'style_filter', 'rendering'],
        ['frame_rotation'],
        ['framing', 'camera_angle', 'lens', 'composition'],
        ['camera_subject_geometry'],
        ['subject_occupancy'],
        ['subject', 'subject_identity', 'identity_anchors'],
        ['body_silhouette'],
        ['gaze', 'gaze_geometry', 'expression', 'micro_expression'],
        ['pose', 'gesture'],
        ['skin_tone'],
        ['skin_exposure'],
        ['skin_rendering'],
        ['hair_style', 'styling'],
        ['clothing'],
        ['clothing_fit'],
        ['clothing_material'],
        ['garment_tension_map'],
        ['scene', 'background', 'spatial_depth'],
        ['lighting_style', 'light_direction', 'light_quality'],
        ['color_system'],
        ['temperature', 'exposure'],
        ['sharpness', 'grain', 'post_processing'],
        ['negative_constraints', 'failure_risks']
      ])
    }),
    anime_illustration: Object.freeze({
      label: '动漫插画',
      minimumRows: 18,
      groups: Object.freeze([
        ['frame_carrier'], ['core_style_contract'], ['subject_identity'], ['face_archetype'], ['face_shape'],
        ['eye_design'], ['brow_expression'], ['mouth_lip_style'], ['body_silhouette'], ['pose_expression'],
        ['styling'], ['clothing_fit', 'clothing_material'], ['composition_space'], ['scene_background'],
        ['light_color'], ['surface_imaging'], ['dynamic_negative_constraints']
      ])
    }),
    poster_design: Object.freeze({
      label: '海报设计',
      minimumRows: 14,
      groups: Object.freeze([
        ['composition', 'layout_map'], ['subject'], ['subject_visibility'], ['focal_points'], ['clarity_occlusion'],
        ['graphic_elements'], ['typography'], ['hierarchy'], ['visual_weight'], ['negative_space'],
        ['material'], ['color_system'], ['generation_priority'], ['failure_risks']
      ])
    }),
    commercial_product: Object.freeze({
      label: '商业产品图',
      minimumRows: 15,
      groups: Object.freeze([
        ['physical_medium'], ['scale_cues'], ['manufacturing_evidence'], ['product_subject'],
        ['product_structure', 'silhouette_topology'], ['material_identity'],
        ['product_finish', 'surface_finish'], ['wear_distribution'], ['materials_details'], ['lighting_render'],
        ['arrangement'], ['background'], ['selling_point', 'usage_context'], ['generation_priority'], ['failure_risks']
      ])
    }),
    product_still: Object.freeze({
      label: '产品静物',
      minimumRows: 15,
      groups: Object.freeze([
        ['physical_medium'], ['scale_cues'], ['manufacturing_evidence'], ['subject'],
        ['silhouette_topology'], ['material_identity'], ['surface_finish'], ['wear_distribution'],
        ['surface'], ['arrangement'], ['materials_details'], ['lighting_style'],
        ['depth_of_field'], ['background'], ['color_system'], ['negative_constraints']
      ])
    }),
    space_landscape: Object.freeze({
      label: '空间风景',
      minimumRows: 11,
      groups: Object.freeze([
        ['scene'], ['composition', 'subject_occupancy'], ['foreground', 'midground', 'background'], ['spatial_depth'], ['perspective'],
        ['lighting_style'], ['tonal_map', 'exposure_map'], ['color_system'], ['texture'], ['detail_density'], ['negative_constraints']
      ])
    }),
    ui_infographic: Object.freeze({
      label: '界面信息图',
      minimumRows: 8,
      groups: Object.freeze([
        ['component_style'], ['layout_system'], ['information_hierarchy'], ['typography'],
        ['graphic_elements'], ['color_system'], ['visual_weight'], ['negative_space']
      ])
    }),
    mixed_other: Object.freeze({
      label: '混合视觉',
      minimumRows: 15,
      groups: Object.freeze([
        ['style_reference', 'style_filter'], ['render_medium', 'render_signature', 'asset_presentation'],
        ['composition', 'framing', 'subject_occupancy', 'negative_space'], ['focal_points', 'subject_visibility', 'layer_stack'],
        ['subject'], ['silhouette_topology', 'stylization_geometry'], ['material_identity'], ['surface_finish'], ['wear_distribution'],
        ['scene_background', 'scene', 'foreground', 'midground', 'background'], ['lighting_style', 'light_color'],
        ['tonal_map', 'exposure_map'], ['color_system'], ['material', 'texture', 'materials_details'], ['rendering', 'surface_imaging'],
        ['generation_priority'], ['failure_risks', 'negative_constraints']
      ])
    })
  });

  function cleanString(value) {
    return String(value || '').trim();
  }

  function normalizePromptPunctuation(value) {
    const source = cleanString(value)
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/[ \t]*([，。；：！？])[ \t]*/g, '$1')
      .replace(/。；|；。|，。/g, '。')
      .replace(/；，|，；/g, '；')
      .replace(/。{2,}/g, '。')
      .replace(/；{2,}/g, '；')
      .replace(/，{2,}/g, '，');
    if (!source) return '';
    const seen = new Set();
    const paragraphs = [];
    for (const rawParagraph of source.split(/\n+/)) {
      const heading = rawParagraph.trim();
      if (/^【[^】]+】$/u.test(heading)) {
        paragraphs.push(heading);
        continue;
      }
      const sentences = rawParagraph.match(/[^。！？]+[。！？]?/g) || [];
      const kept = [];
      for (let sentence of sentences) {
        sentence = sentence.replace(/^[，；。\s]+|[，；\s]+$/g, '').trim();
        if (!sentence) continue;
        const signal = sentence.replace(/[，。；：！？、\s]/g, '');
        if (!signal || seen.has(signal)) continue;
        seen.add(signal);
        if (!/[。！？]$/.test(sentence)) sentence += '。';
        kept.push(sentence);
      }
      if (kept.length) paragraphs.push(kept.join(''));
    }
    return paragraphs.join('\n');
  }

  function contractFor(imageTypeKey) {
    return PROFILE_CONTRACTS[imageTypeKey] || PROFILE_CONTRACTS.mixed_other;
  }

  const WATERMARK_TEXT = /水印|署名|落款|版权(?:标记|标识|文字)|watermark|copyright|(?:作者|摄影师|手写)签名|(?:handwritten|artist'?s?|photographer'?s?)\s+signature/i;

  function stripWatermarkClauses(value) {
    const original = cleanString(value);
    if (!WATERMARK_TEXT.test(original)) return original;
    // Remove a watermark aside while retaining the independent capture description.
    const text = original.replace(/[（(][^）)\n]*(?:[）)]|$)/g, aside => WATERMARK_TEXT.test(aside) ? '' : aside);
    return text.split(/[，,；;。\n]+/u).map(part => part.trim())
      .filter(part => part && !WATERMARK_TEXT.test(part)).join('；');
  }

  // 数值碎片与画幅比例不作为原子词：拆词切出的纯数字/比例标签没有可复用的视觉语义
  const JUNK_ATOMIC_LABEL_PATTERNS = [
    /^\d+(?:\.\d+)?$/,           // 纯数字（含小数）：3838、0.5
    /\d{1,4}\s*[:：]\s*\d{1,4}/, // 画幅比例：3:4、9:16、2048:1071、2.39:1
    /^\d+\s*[（(]/,              // 数字开头的截断碎片：29（天空
    /\d\.\d{2,}/,                // 测量精度小数：平均明度0.5251 这类读数不应出现在词条名
    /(?:明度|比例|离散)\s*(?:为|约|仅|约为|仅为)*\s*[:：]?\s*[0-9]/, // 指标名后直接跟数字：明度0、比例约21
    /[(（][^)）]*$/,             // 未闭合括号（拆句截断残留）
    /%/,                         // 百分比读数：31%、高度78%
    /[0-9]\s*至\s*[0-9]/,        // 断裂区间：87至0
    /(?:最亮|最暗)\S{0,4}约?\s*[0-9]/, // 最亮区约0
    /主色\s*[:：]|辅色\s*[:：]|文字色\s*[:：]/, // 调色盘转储
    /原图像?素|像素画[布幅]|像素[0-9]|[0-9]\s*[×x]\s*[0-9]/, // 像素/画布尺寸元数据
    /重力方向|场景正立|无旋转|正向竖幅|正向横幅/, // 朝向校准元数据
    /"[a-z_]{2,}"\s*[:：]|[a-z_]{2,}"\s*[:：]/, // JSON 键值碎片
    /#[0-9a-fA-F]{3,8}/         // 色号读数：#393A34、#CAB6AF
  ];
  function isJunkAtomicLabel(label) {
    const text = cleanString(label);
    return Boolean(text) && JUNK_ATOMIC_LABEL_PATTERNS.some(re => re.test(text));
  }

  function cleanAtomicTerm(item) {
    if (!item || typeof item !== 'object') return null;
    const result = { ...item };
    const oldLabel = cleanString(item.label);
    const newLabel = stripWatermarkClauses(oldLabel);
    if (!newLabel || isJunkAtomicLabel(newLabel)) return null;
    const clean = value => stripWatermarkClauses(oldLabel && oldLabel !== newLabel ? value.replaceAll(oldLabel, newLabel) : value);
    // Source prompts and archive references are provenance, not the atomic term itself.
    for (const key of ['label', 'value', 'shortLine', 'definition', 'risks']) {
      if (typeof result[key] === 'string') result[key] = clean(result[key]);
    }
    for (const key of ['effects', 'goodWith', 'badWith']) {
      if (Array.isArray(result[key])) result[key] = result[key].map(value => typeof value === 'string' ? clean(value) : value).filter(Boolean);
    }
    return cleanString(result.label) ? result : null;
  }

  function uniqueBreakdown(rows) {
    const output = [];
    const seen = new Set();
    for (const item of Array.isArray(rows) ? rows : []) {
      if (!item || typeof item !== 'object') continue;
      const key = cleanString(item.key).toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
      const value = stripWatermarkClauses(item.value);
      if (!key || !value || seen.has(key)) continue;
      seen.add(key);
      output.push({ key, label: cleanString(item.label), value });
    }
    return output;
  }

  function mergeBreakdown(draftRows, reviewedRows) {
    const reviewed = uniqueBreakdown(reviewedRows);
    const seen = new Set(reviewed.map(item => item.key));
    const recovered = uniqueBreakdown(draftRows).filter(item => !seen.has(item.key));
    return [...reviewed, ...recovered].slice(0, 120);
  }

  function mergeResults(draft, reviewed) {
    const first = draft && typeof draft === 'object' ? draft : {};
    const second = reviewed && typeof reviewed === 'object' ? reviewed : {};
    const secondType = second.imageType && typeof second.imageType === 'object' ? second.imageType : {};
    const firstType = first.imageType && typeof first.imageType === 'object' ? first.imageType : {};
    const reviewedTypeIsUseful = secondType.key
      && (secondType.key !== 'mixed_other' || firstType.key === 'mixed_other' || cleanString(secondType.reason));
    return {
      imageType: reviewedTypeIsUseful ? { ...firstType, ...secondType } : { ...firstType },
      breakdown: mergeBreakdown(first.breakdown, second.breakdown),
      prompt: cleanString(second.prompt) || cleanString(first.prompt),
      variantPrompt: cleanString(second.variantPrompt) || cleanString(first.variantPrompt)
    };
  }

  function ratioPattern() {
    const known = SUPPORTED_RATIOS.map(value => value.replace(':', '\\:')).join('|');
    return new RegExp(`(?:画幅|比例|宽高比)\\s*(?:约\\s*)?\\d{1,5}(?:\\.\\d{1,2})?\\s*[:：]\\s*\\d{1,5}|原图像素\\s*\\d{1,5}\\s*[×xX]\\s*\\d{1,5}|(?:${known})`, 'g');
  }

  function parseAspectRatio(value) {
    const match = cleanString(value).replace('：', ':').match(/^(\d{1,5})\s*:\s*(\d{1,5})$/);
    if (!match) return null;
    const width = Number(match[1]);
    const height = Number(match[2]);
    return width > 0 && height > 0 ? { width, height } : null;
  }

  function formatDecimal(value) {
    return Number(value.toFixed(2)).toString();
  }

  function aspectContract(aspectRatio) {
    const parsed = parseAspectRatio(aspectRatio);
    if (!parsed) return '';
    const { width, height } = parsed;
    if (Math.max(width, height) <= 64) return `画幅 ${width}:${height}`;
    const ratio = width / height;
    const orientation = ratio > 1.04 ? '横向宽幅' : ratio < 0.96 ? '竖向画幅' : '方形画幅';
    const displayRatio = ratio >= 1
      ? `${formatDecimal(ratio)}:1`
      : `1:${formatDecimal(1 / ratio)}`;
    return `${orientation}，比例约${displayRatio}，原图像素${width}×${height}`;
  }

  function stripAspectDeclarations(value) {
    return cleanString(value)
      .replace(/(?:横向宽幅|竖向画幅|方形画幅)\s*[，,]\s*比例\s*(?:约\s*)?\d{1,5}(?:\.\d{1,2})?\s*[:：]\s*\d{1,5}(?:\s*[，,]\s*原图像素\s*\d{1,5}\s*[×xX]\s*\d{1,5})?[。.]?/giu, '')
      .replace(/(?:画幅与媒介|画幅与载体|画幅|比例|宽高比|原图像素)(?:严格采用|严格使用|采用|约为|为|约|是|：|\s)*\d{1,5}(?:\.\d{1,2})?\s*[:：×xX]\s*\d{1,5}[，,]?/giu, '')
      .replace(/^\s*\d{1,5}\s*[:：]\s*\d{1,5}[，,]?/u, '')
      .replace(/^[，,；;。\s]+|[，,；;\s]+$/g, '')
      .trim();
  }

  function enforceAspectRatio(prompt, aspectRatio) {
    const text = cleanString(prompt);
    const contract = aspectContract(aspectRatio);
    if (!text || !contract) return text;
    const withoutRatios = stripAspectDeclarations(text);
    if (!withoutRatios) return `${contract}。`;
    if (/^画幅\s+\d{1,2}:\d{1,2}$/u.test(contract)) {
      return normalizePromptPunctuation(`${contract}，${withoutRatios}`);
    }
    return normalizePromptPunctuation(`${contract}。\n${withoutRatios}`);
  }

  function sanitizePortraitPrompt(prompt) {
    let text = cleanString(prompt);
    if (!text) return text;
    const conflicting = [
      /避免过度幼态化[，,、；;。]?/g,
      /避免夸张大眼[，,、；;。]?/g,
      /避免改变真实面部比例[，,、；;。]?/g,
      /压低虹膜占比[，,、；;。]?/g,
      /拉长中庭[，,、；;。]?/g,
      /拉长下巴[，,、；;。]?/g
    ];
    for (const pattern of conflicting) text = text.replace(pattern, '');
    text = text.replace(/[，,]{2,}/g, '，').replace(/[；;]{2,}/g, '；').replace(/^[，,；;。\s]+|[，,；;\s]+$/g, '').trim();
    const isSelfie = /(自拍|手机前置|手持手机|自拍杆|手机视频|短视频|视频截帧|屏幕截图|手机截图|状态栏)/.test(text);
    const isComplexAction = /(悬挂|绳索|吊带|安全带|攀爬|支撑|腾空|跳跃|倒挂|吊威亚)/.test(text);
    const perspectiveGuard = isSelfie
      ? '保持自拍机位产生的近大远小、纵向缩短、主体占位和边缘裁切'
      : isComplexAction
        ? '保持悬挂支点、受力方向、重心位置、肢体远近顺序和当前透视强度'
        : '保持当前机位产生的可见透视强度、主体占位和边缘裁切';
    const guard = `严格保持上述已描述的脸长、面部上下比例、下颌与下巴轮廓、眼裂与虹膜占比、鼻部长度宽度、唇形和眉眼妆容；同时保持头部与可见上半身的表观尺度关系、肩宽与头部比例、胸廓和服装共同形成的可见轮廓、胸腰轮廓、躯干长度、上臂粗细；服装必须锁定领口宽度与高度、肩部覆盖边界、袖口位置与长度、抽绳或系带位置、褶皱走向、面料厚薄弹性、贴合承托关系以及底色的明度饱和度；${perspectiveGuard}；肤色固有色、皮肤局部曝光和皮肤成像处理分别服从前文的区域描述，全局色卡不能覆盖面部与可见皮肤，真实或自然等词不能抹掉原图可见的冷白提亮、美颜柔化与低微对比；避免生成模板化商业人像脸或平均化标准身材`;
    return text.includes('眼裂与虹膜占比') ? text : `${text}${/[。！？]$/.test(text) ? '' : '。'}${guard}。`;
  }

  function silhouetteDominantEvidence(value) {
    return /(近黑|暗色|黑色)?(?:人物|人形|主体|角色)?剪影|主体内部.{0,18}(?:近黑|暗部|阴影|不可见|缺少细节)|五官.{0,14}(?:不可见|无法辨认|阴影)|轮廓识别|逆光.{0,18}(?:剪影|轮廓)|侧面剪影|大轮廓优先/i.test(cleanString(value));
  }

  function sanitizeDigitalHumanPrompt(prompt, rows = []) {
    const text = cleanString(prompt);
    if (!text) return text;
    const evidenceText = `${uniqueBreakdown(rows).map(item => `${item.label} ${item.value}`).join(' ')} ${text}`;
    if (silhouetteDominantEvidence(evidenceText)) {
      if (text.includes('剪影结构锁定')) return text;
      const withoutHiddenSurfaceClaims = text
        .replace(/[^。！？]*(?:数字皮肤着色器|皮肤着色器|受控次表面散射|写实PBR材质|PBR材质)[^。！？]*[。！？]?/giu, '')
        .trim();
      const lock = '剪影结构锁定：保持原图的数字影视概念画媒介，以主体外轮廓、主光几何、遮挡层级、流动线和低频明暗为第一优先；主体内部维持近黑，只保留有像素证据的边缘透光，不补写脸部、皮肤着色、护甲纹样或服装小件；渲染精度服务于轮廓光、半透明边缘和背景大色块';
      return `${lock}。${withoutHiddenSurfaceClaims}`;
    }
    if (text.includes('数字媒介锁定')) return text;
    const digitalEvidence = /(三维|3D|CG|PBR|数字角色|数字渲染|离线渲染|皮肤着色器|次表面散射)/i.test(text);
    const humanEvidence = /(人物|角色|女性|男性|头像|头肩|面部|脸|皮肤|眼球|头发)/i.test(text);
    if (!digitalEvidence || !humanEvidence) return text;
    const lock = '数字媒介锁定：三维数字角色资产展示渲染，以可见的数字雕刻几何、数字皮肤着色器、受控次表面散射、环境遮蔽、分层材质与发丝渲染构成主体；高保真和照片级只表示渲染精度，媒介始终保持数字角色资产展示；保持原图可见的风格化头脸比例、眼球与虹膜占比、颈肩连接、胸像裁切和背景明暗梯度';
    return `${lock}。${text}`;
  }

  function injectPhotographicPriorityContract(prompt, rows) {
    const source = normalizePromptPunctuation(prompt);
    if (!source || (source.match(/[\u3400-\u9fff]/g) || []).length >= 180) return source;
    const preferred = [
      'medium_identity', 'capture_signature', 'clarity_map', 'exposure_map',
      'camera_subject_geometry', 'subject_occupancy', 'identity_anchors',
      'face_geometry', 'gaze_geometry', 'body_silhouette', 'pose_identity', 'contact_map',
      'clothing', 'skin_tone', 'skin_rendering', 'color_system', 'prop_geometry', 'near_field_geometry'
    ];
    const rowMap = new Map(uniqueBreakdown(rows).map(item => [item.key, item]));
    const additions = preferred
      .map(key => rowMap.get(key))
      .filter(item => item && !source.includes(item.value))
      .slice(0, 12)
      .map(item => `${item.label || item.key}：${item.value}`);
    return additions.length
      ? normalizePromptPunctuation(`${source}\n关键复现锚点：${additions.join('；')}。`)
      : source;
  }

  function injectCaptureFidelityCeiling(prompt, rows) {
    const source = cleanString(prompt);
    if (!source) return source;
    const evidenceText = `${uniqueBreakdown(rows).map(item => `${item.label} ${item.value}`).join(' ')} ${source}`;
    const mobileCapture = /(手机前置|手机视频|短视频|视频截帧|屏幕截图|手机截图|截屏|状态栏|社交平台|低码率|二次压缩|美颜|磨皮|肤理压平|低微对比)/i.test(evidenceText);
    if (!mobileCapture) return source;
    const contract = '采集质感要求：保留原图的自动白平衡、局部曝光、美颜降噪、低微对比、边缘柔化、压缩和色阶。状态栏与平台界面只用于判断采集链，不进入生成画面。避免升级为暖调精修、锐利毛孔、均匀棚光或商业美妆肖像。';
    const withoutOld = source
      .replace(/采集质感要求：保留原图的自动白平衡、局部曝光、美颜降噪、低微对比、边缘柔化、压缩和色阶。状态栏与平台界面只用于判断采集链，不进入生成画面。避免升级为暖调精修、锐利毛孔、均匀棚光或商业美妆肖像。/gu, '')
      .replace(/采集质感上限合同：[\s\S]*?成像质量不得升级为暖调精修、锐利毛孔、均匀棚光或商业美妆肖像。/gu, '')
      .trim();
    const aspectMatch = withoutOld.match(/^(画幅\s*[^，,。]+[，,])/u);
    if (aspectMatch) return normalizePromptPunctuation(`${aspectMatch[1]}${contract}\n${withoutOld.slice(aspectMatch[1].length)}`);
    return normalizePromptPunctuation(`${contract}\n${withoutOld}`);
  }

  function finalizeResult(result, options = {}) {
    const normalized = result && typeof result === 'object' ? result : {};
    const ratio = cleanString(options.aspectRatio);
    const rows = uniqueBreakdown(normalized.breakdown);
    const imageTypeIndex = rows.findIndex(item => item.key === 'image_type' || item.key === 'frame_carrier');
    if (ratio && imageTypeIndex >= 0 && !rows[imageTypeIndex].value.includes(ratio)) {
      rows[imageTypeIndex] = { ...rows[imageTypeIndex], value: `${ratio}，${rows[imageTypeIndex].value}` };
    }
    if (options.portraitFidelity === true && normalized.imageType?.key === 'photographic_portrait') {
      const negativeIndex = rows.findIndex(item => item.key === 'negative_constraints');
      if (negativeIndex >= 0) rows[negativeIndex] = { ...rows[negativeIndex], value: sanitizePortraitPrompt(rows[negativeIndex].value) };
    }
    const isPhotographicPortrait = normalized.imageType?.key === 'photographic_portrait';
    const portraitFidelity = options.portraitFidelity === true && isPhotographicPortrait;
    const prompt = isPhotographicPortrait ? normalized.prompt : sanitizeDigitalHumanPrompt(normalized.prompt, rows);
    const aspectLockedPrompt = enforceAspectRatio(prompt, ratio);
    const priorityPrompt = isPhotographicPortrait
      ? injectPhotographicPriorityContract(aspectLockedPrompt, rows)
      : aspectLockedPrompt;
    const portraitPrompt = portraitFidelity ? sanitizePortraitPrompt(priorityPrompt) : priorityPrompt;
    const finalPrompt = normalizePromptPunctuation(isPhotographicPortrait ? injectCaptureFidelityCeiling(portraitPrompt, rows) : portraitPrompt);
    const variantSource = isPhotographicPortrait ? normalized.variantPrompt : sanitizeDigitalHumanPrompt(normalized.variantPrompt, rows);
    const aspectLockedVariant = enforceAspectRatio(variantSource, ratio);
    const priorityVariant = isPhotographicPortrait
      ? injectPhotographicPriorityContract(aspectLockedVariant, rows)
      : aspectLockedVariant;
    const portraitVariant = portraitFidelity ? sanitizePortraitPrompt(priorityVariant) : priorityVariant;
    const finalVariant = normalizePromptPunctuation(isPhotographicPortrait ? injectCaptureFidelityCeiling(portraitVariant, rows) : portraitVariant);
    return {
      ...normalized,
      breakdown: rows,
      prompt: finalPrompt,
      variantPrompt: finalVariant
    };
  }

  const GENERATION_PROMPT_GROUPS = Object.freeze([
    {
      title: '画幅与总体视觉',
      pattern: /^(?:image_type|frame_carrier|medium_identity|frame_rotation|render_medium|render_signature|asset_presentation|physical_medium|core_style|style_reference|style_filter|era|time|atmosphere)(?:_|$)/,
      priority: ['medium_identity', 'physical_medium', 'render_medium', 'render_signature', 'frame_carrier', 'image_type', 'core_style_contract', 'style_reference', 'style_filter', 'asset_presentation', 'frame_rotation'],
      limit: 3
    },
    {
      title: '相机与核心构图',
      pattern: /framing|camera_angle|lens|camera_subject_geometry|subject_occupancy|perspective|composition|layout|negative_space|visual_weight|spatial_map|focal_points|subject_visibility|layer_stack/,
      priority: ['composition', 'camera_subject_geometry', 'subject_occupancy', 'focal_points', 'subject_visibility', 'layer_stack', 'negative_space', 'framing', 'camera_angle', 'perspective', 'visual_weight'],
      limit: 5
    },
    {
      title: '主体外观',
      pattern: /subject$|subject_count|subject_identity|identity_anchors|face_|facial_|eye_|brow_|mouth_|gaze_geometry|body_silhouette|silhouette_topology|stylization_geometry|skin_tone|makeup|hair_style/,
      priority: ['subject', 'subject_identity', 'identity_anchors', 'silhouette_topology', 'body_silhouette', 'face_geometry', 'face_shape', 'eye_design', 'gaze_geometry', 'skin_tone'],
      limit: 4
    },
    {
      title: '动作与接触关系',
      pattern: /pose|gesture|support|contact|gaze$|expression|micro_expression|action|gravity|joint|motion|flow/,
      priority: ['pose', 'pose_identity', 'pose_expression', 'gesture', 'contact_map', 'support', 'gravity', 'flow', 'motion', 'expression', 'micro_expression'],
      limit: 4
    },
    {
      title: '服装与材质',
      pattern: /accessories|clothing|garment|styling|prop_|near_field|material|texture|surface_finish|manufacturing|articulation|wear_distribution|roughness|translucency/,
      priority: ['clothing', 'clothing_fit', 'clothing_material', 'garment_tension_map', 'styling', 'prop_geometry', 'near_field_geometry', 'material_identity', 'surface_finish', 'texture'],
      limit: 4
    },
    {
      title: '前景、中景、背景、远景',
      pattern: /scene|foreground|midground|background|far_|spatial_depth|environment|architecture_geometry|spatial_layout_map|layer_stack/,
      priority: ['foreground', 'near_field_geometry', 'subject_occupancy', 'midground', 'scene_background', 'scene', 'background', 'far_background', 'spatial_depth', 'layer_stack', 'spatial_layout_map'],
      limit: 5
    },
    {
      title: '光线与色彩',
      pattern: /lighting|light_|skin_exposure|color_system|temperature|tonal_map|exposure_map|exposure|dynamic_range|contrast|saturation|highlight|shadow/,
      priority: ['lighting_style', 'light_direction', 'light_quality', 'light_color', 'tonal_map', 'exposure_map', 'skin_exposure', 'color_system', 'temperature', 'dynamic_range'],
      limit: 5
    },
    {
      title: '镜头、成像与采集质感',
      pattern: /capture_signature|cinematic_signature|clarity_map|sharpness|grain|post_processing|surface_imaging|rendering|blur|compression|noise|bloom|imaging/,
      priority: ['capture_signature', 'cinematic_signature', 'clarity_map', 'sharpness', 'grain', 'post_processing', 'surface_imaging', 'rendering'],
      limit: 4
    },
    {
      title: '文字与版式',
      pattern: /typography|font|text_content|headline|poster_text|graphic_elements|information_hierarchy/,
      priority: ['text_content', 'headline', 'typography', 'font', 'information_hierarchy', 'graphic_elements'],
      limit: 3
    },
    {
      title: '生成边界',
      pattern: /negative|failure|generation_priority|dynamic_constraint/,
      priority: ['generation_priority', 'negative_constraints', 'dynamic_negative_constraints', 'failure_risks'],
      limit: 2
    }
  ]);

  function priorityIndex(group, key) {
    const index = group.priority.indexOf(key);
    return index >= 0 ? index : group.priority.length + 1;
  }

  function normalizeFailureDirective(value) {
    return cleanString(value)
      .replace(/^优先保持/u, '保持')
      .replace(/也容易把/gu, '避免把')
      .replace(/也容易/gu, '避免')
      .replace(/容易把/gu, '避免把')
      .replace(/容易/gu, '避免');
  }

  function generationAspectPhrase(aspectRatio) {
    const parsed = parseAspectRatio(aspectRatio);
    if (!parsed) return '';
    const ratio = parsed.width / parsed.height;
    const orientation = ratio > 1.04 ? '横向宽幅' : ratio < 0.96 ? '竖向画幅' : '方形画幅';
    if (Math.max(parsed.width, parsed.height) <= 64) return `${parsed.width}:${parsed.height}${orientation}`;
    const displayRatio = ratio >= 1 ? `${formatDecimal(ratio)}:1` : `1:${formatDecimal(1 / ratio)}`;
    return `${orientation}，比例约${displayRatio}，原图像素${parsed.width}×${parsed.height}`;
  }

  function transformAnalyticalClause(value, key = '') {
    let text = cleanString(value);
    if (!text || /可能|疑似|证据不足|无法确认|不能判定/.test(text)) return '';
    text = text
      .replace(/具体姓名和角色来源[^，。；]*/gu, '')
      .replace(/(?:身份|型号|品牌|作者|出处)(?:不可|无法)(?:确认|判断|辨认)[^，。；]*/gu, '')
      .replace(/(?:可能|疑似)(?:是|为)?/gu, '')
      .replace(/(?:不扩写为|不推断为|不要扩写为)\s*/gu, '避免增加')
      .replace(/(?:未观察到|未见|没有可确认的?|没有明确证据支持|无明确证据支持)\s*/gu, '避免增加')
      .replace(/(?:不能|无法|不可)(?:确认|判定|判断|确定|可靠辨认|补写)[^，。；]*/gu, '')
      .replace(/(?:缺少|没有|无)(?:直接)?(?:像素)?证据[^，。；]*/gu, '')
      .replace(/避免增加(?:明确|具体|可靠)的?/gu, '避免增加')
      .replace(/[，,]{2,}/g, '，')
      .replace(/[；;]{2,}/g, '；')
      .replace(/^[，,；;。\s]+|[，,；;\s]+$/g, '')
      .trim();
    if (/negative|failure|generation_priority|dynamic_constraint/.test(key)) text = normalizeFailureDirective(text);
    return text;
  }

  function sanitizeGenerationFact(value, key = '') {
    const source = stripAspectDeclarations(stripWatermarkClauses(value));
    const clauses = source.split(/(?<=[。；])/u)
      .map(clause => transformAnalyticalClause(clause.replace(/[。；]+$/g, ''), key))
      .filter(Boolean)
      .filter(clause => !/(不可确认|无法确认|不能判定|未观察到|没有明确证据|无法可靠辨认|证据不足)/u.test(clause));
    return clauses.join('；');
  }

  function factShingles(value) {
    const signal = cleanString(value).replace(/[，。；：！？、\s]/g, '');
    const output = new Set();
    for (let index = 0; index < signal.length - 1; index += 1) output.add(signal.slice(index, index + 2));
    return output;
  }

  function nearDuplicateFact(left, right) {
    const a = factShingles(left);
    const b = factShingles(right);
    if (!a.size || !b.size) return false;
    let overlap = 0;
    for (const token of a) if (b.has(token)) overlap += 1;
    return overlap / Math.min(a.size, b.size) >= 0.84;
  }

  function clipPromptFact(value, maxLength = 190) {
    const text = cleanString(value).replace(/\s+/g, ' ');
    if (text.length <= maxLength) return text.replace(/[。；]+$/g, '');
    const pieces = text.split(/(?<=[。；])/u);
    let output = '';
    for (const piece of pieces) {
      if (output && output.length + piece.length > maxLength) break;
      output += piece;
      if (output.length >= maxLength * 0.68) break;
    }
    if (!output) {
      const commas = text.split(/(?<=[，、])/u);
      for (const piece of commas) {
        if (output && output.length + piece.length > maxLength) break;
        output += piece;
      }
    }
    return (output || text.slice(0, maxLength)).replace(/[，、。；\s]+$/g, '');
  }

  function collectGenerationFacts(rows, group, options = {}) {
    const detail = cleanString(options.detail || 'standard');
    const usedKeys = options.usedKeys || new Set();
    const seenFacts = options.seenFacts || [];
    const maxLength = detail === 'precise' ? 190 : detail === 'concise' ? 92 : 145;
    const facts = [];
    const candidates = rows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => group.pattern.test(row.key))
      .sort((left, right) => priorityIndex(group, left.row.key) - priorityIndex(group, right.row.key) || left.index - right.index);
    for (const { row } of candidates) {
      if (usedKeys.has(row.key)) continue;
      const fact = clipPromptFact(sanitizeGenerationFact(row.value, row.key), maxLength);
      const signal = fact.replace(/[，。；：！？、\s]/g, '');
      if (!signal || seenFacts.some(existing => existing === signal || existing.includes(signal) || signal.includes(existing) || nearDuplicateFact(existing, signal))) continue;
      usedKeys.add(row.key);
      seenFacts.push(signal);
      facts.push(fact);
      if (facts.length >= group.limit) break;
    }
    return facts;
  }

  function pickPriorityFacts(rows, options = {}) {
    const keys = [
      'subject_count', 'focal_points', 'composition', 'subject_occupancy', 'near_field_geometry',
      'layer_stack', 'subject_visibility', 'silhouette_topology', 'pose', 'pose_identity',
      'contact_map', 'prop_geometry', 'lighting_style', 'light_direction', 'color_system'
    ];
    const rowMap = new Map(rows.map(row => [row.key, row]));
    const facts = [];
    const seen = [];
    for (const key of keys) {
      const row = rowMap.get(key);
      const fact = row ? clipPromptFact(sanitizeGenerationFact(row.value, row.key), 105) : '';
      const signal = fact.replace(/[，。；：！？、\s]/g, '');
      if (!signal || seen.some(existing => nearDuplicateFact(existing, signal))) continue;
      seen.push(signal);
      facts.push(fact);
      if (facts.length >= (options.detail === 'concise' ? 5 : 8)) break;
    }
    if (facts.length < 5) {
      for (const row of rows) {
        const fact = clipPromptFact(sanitizeGenerationFact(row.value, row.key), 90);
        const signal = fact.replace(/[，。；：！？、\s]/g, '');
        if (!signal || seen.some(existing => nearDuplicateFact(existing, signal))) continue;
        seen.push(signal);
        facts.push(fact);
        if (facts.length >= 5) break;
      }
    }
    return facts;
  }

  function buildDynamicGenerationBoundary(rows) {
    const boundaryGroup = GENERATION_PROMPT_GROUPS.find(group => group.title === '生成边界');
    const direct = collectGenerationFacts(rows, boundaryGroup, { detail: 'standard' });
    const facts = direct.map(value => normalizeFailureDirective(value));
    if (facts.length) return facts;
    const derived = [];
    const rowMap = new Map(rows.map(row => [row.key, row]));
    if (rowMap.has('subject_count')) derived.push('避免改变主体数量');
    if (rowMap.has('subject_occupancy') || rowMap.has('composition')) derived.push('避免移动主体位置或改变主体占画面比例');
    if (rowMap.has('layer_stack') || rowMap.has('subject_visibility')) derived.push('避免消除关键遮挡关系');
    if (rowMap.has('pose') || rowMap.has('contact_map')) derived.push('避免改变关键动作、支撑点和接触关系');
    if (rowMap.has('medium_identity') || rowMap.has('render_medium')) derived.push('避免改变画面媒介');
    return derived.slice(0, 5);
  }

  function renderGenerationSection(title, facts) {
    const content = facts.map(fact => cleanString(fact).replace(/[。；]+$/g, '')).filter(Boolean).join('；');
    return content ? `【${title}】\n${content}。` : '';
  }

  function compileGenerationPrompt(result, options = {}) {
    const source = result && typeof result === 'object' ? result : {};
    const rows = uniqueBreakdown(source.breakdown);
    const detail = cleanString(options.detail || 'standard');
    const precise = detail === 'precise';
    const budget = precise ? 1900 : detail === 'concise' ? 480 : 780;
    const aspect = generationAspectPhrase(options.aspectRatio || source.imageType?.aspectRatio || '');
    const groups = GENERATION_PROMPT_GROUPS.filter(group => precise || group.title !== '生成边界');
    const usedKeys = new Set();
    const seen = [];
    const relationTags = new Set();
    const plans = [];
    for (const group of groups) {
      const candidates = rows.filter(row => group.pattern.test(row.key) && !usedKeys.has(row.key))
        .sort((a, b) => priorityIndex(group, a.key) - priorityIndex(group, b.key));
      const facts = [];
      for (const row of candidates) {
        usedKeys.add(row.key);
        const value = sanitizeGenerationFact(row.value, row.key);
        for (const clause of value.split(/[，,；;。\n]+/u).map(part => part.trim()).filter(Boolean)) {
          if (/^(?:无其他接触点|身体悬空部分无支撑|无额外支撑)[。\s]*$/.test(clause)) continue;
          if (/严格保持上述|所有已描述|完整保留全部|不可确认|无法确认/.test(clause)) continue;
          if (clause === '真实相机记录' && source.imageType?.key === 'photographic_portrait') continue;
          const relationTag = /^(?:主体|人物)(?:居中|占据画面中央)/.test(clause) ? 'subject-center'
            : /^(?:双手|两手)(?:置于|放在|接触|抱头).*(?:脑后|后脑|颈部|抱头)|^(?:双手|两手)抱头$/.test(clause) ? 'hands-at-head' : '';
          if (relationTag && relationTags.has(relationTag)) continue;
          const signal = clause.replace(/[\s：:、（）()]/g, '');
          const guard = value => (value.match(/[左右上下前后]|\d+(?:\.\d+)?|不|无|避免|黑|白|红|蓝|绿|黄/g) || []).join('|');
          const sameControl = previous => guard(previous.signal) === guard(signal);
          if (!signal || seen.some(previous => sameControl(previous) && (previous.signal.includes(signal) || nearDuplicateFact(previous.signal, signal) && previous.signal.length >= signal.length))) continue;
          for (let index = seen.length - 1; index >= 0; index--) {
            const previous = seen[index];
            if (sameControl(previous) && signal.includes(previous.signal)) {
              previous.bucket.splice(previous.bucket.indexOf(previous.fact), 1);
              seen.splice(index, 1);
            }
          }
          // Retain every clause intact. Length limits select facts rather than cut words.
          seen.push({ signal, fact: clause, bucket: facts });
          if (relationTag) relationTags.add(relationTag);
          facts.push(clause);
        }
      }
      if (facts.length) plans.push({ title: group.title, facts, selected: [] });
    }
    if (plans.length < 3 && source.prompt) {
      const fallback = sanitizeGenerationFact(String(source.prompt).replace(/【[^】]+】/g, ''));
      const facts = [];
      let length = aspect.length;
      for (const fact of fallback.split(/[，,；;。\n]+/u).map(value => value.trim()).filter(Boolean)) {
        if (/严格保持上述|身体悬空部分无支撑|无其他接触点/.test(fact)) continue;
        if (facts.some(previous => previous.includes(fact) || nearDuplicateFact(previous, fact))) continue;
        if (length + fact.length + 1 > budget) continue;
        facts.push(fact);
        length += fact.length + 1;
      }
      if (facts.length) return normalizePromptPunctuation([aspect, ...facts].filter(Boolean).join('，') + '。');
    }
    // Allocate space across visual dimensions so a verbose face field cannot consume the scene budget.
    let remaining = budget - aspect.length - plans.length * (precise ? 20 : 3);
    const perGroup = Math.max(50, Math.floor(remaining / Math.max(1, plans.length)));
    for (const plan of plans) {
      let size = 0;
      for (const fact of plan.facts) {
        if (size + fact.length + 1 > perGroup) continue;
        plan.selected.push(fact);
        size += fact.length + 1;
      }
      remaining -= size;
    }
    for (const plan of plans) {
      for (const fact of plan.facts) {
        if (plan.selected.includes(fact) || fact.length + 1 > remaining) continue;
        plan.selected.push(fact);
        remaining -= fact.length + 1;
      }
      plan.selected.sort((a, b) => plan.facts.indexOf(a) - plan.facts.indexOf(b));
    }
    const sentences = plans.filter(plan => plan.selected.length).map(plan => ({
      title: plan.title,
      text: plan.selected.join('，') + '。'
    }));
    if (!sentences.length) {
      const fallback = sanitizeGenerationFact(source.prompt || '');
      return normalizePromptPunctuation([aspect, fallback].filter(Boolean).join('。'));
    }
    if (aspect) sentences[0].text = `${aspect}，${sentences[0].text}`;
    if (precise) return sentences.map(item => `【${item.title}】\n${item.text}`).join('\n\n');
    // Three readable paragraphs, with no repeated priority contract or generic negative list.
    const paragraphs = [[], [], []];
    for (const item of sentences) {
      const index = /服装|前景/.test(item.title) ? 1 : /光线|采集/.test(item.title) ? 2 : 0;
      paragraphs[index].push(item.text);
    }
    return normalizePromptPunctuation(paragraphs.filter(group => group.length).map(group => group.join('')).join('\n\n'));
  }

  function filterGenerationControlIds(ids, options = {}) {
    const selected = [...new Set((Array.isArray(ids) ? ids : []).map(cleanString).filter(Boolean))];
    if (options.faithful !== true) return selected;
    const prompt = cleanString(options.prompt);
    const imageTypeKey = cleanString(options.imageTypeKey);
    const evidenceText = `${prompt} ${cleanString(options.evidenceText)}`;
    const silhouette = silhouetteDominantEvidence(evidenceText);
    const photographic = imageTypeKey === 'photographic_portrait' || /(真实人像摄影|现实相机|手机拍摄|相机拍摄)/i.test(evidenceText);
    const filmEvidence = /(胶片|颗粒|褪色|扫描|旧照片|电影胶片)/i.test(evidenceText);
    const socialEvidence = /(社媒|社交平台|手机截图|屏幕截图|状态栏|短视频|网络图片)/i.test(evidenceText);
    const pearlEvidence = /(珍珠|珠光|柔润高光|缎光|水润|乳白反射)/i.test(evidenceText);
    const blocked = new Set(['experimental_camera_angle', 'experimental_action_expression']);
    if (!photographic || silhouette) blocked.add('delicate_real_skin_texture');
    if (!pearlEvidence || silhouette) blocked.add('pearl_soft_light_reflection');
    if (!filmEvidence) {
      blocked.add('delicate_film_grain');
      blocked.add('subtle_faded_film');
    }
    if (!socialEvidence) blocked.add('social_media_image_feel');
    if (silhouette) {
      blocked.add('clean_materials');
      blocked.add('clear_premium_finish');
    }
    return selected.filter(id => !blocked.has(id));
  }

  function assessQuality(result, options = {}) {
    const key = cleanString(result?.imageType?.key) || 'mixed_other';
    const contract = contractFor(key);
    const rows = uniqueBreakdown(result?.breakdown);
    const rowKeys = new Set(rows.map(item => item.key));
    const missingGroups = contract.groups.filter(group => !group.some(field => rowKeys.has(field)));
    const prompt = cleanString(result?.prompt);
    const evidenceText = `${rows.map(item => `${item.label} ${item.value}`).join(' ')} ${prompt}`;
    const physicalArtifactEvidence = /(实体模型|实体物件|产品实拍|产品摄影|静物摄影|收藏玩具|收藏模型|手办|可动模型|树脂模型|塑料模型|PVC|ABS|注塑|装配分件|拼接结构|桌面模型)/i.test(evidenceText);
    const articulationEvidence = /(可动|关节|球形关节|球关节|转轴关节|铰链关节|关节球|关节轴|肩关节|肘关节|髋关节|膝关节|踝关节|关节缝)/i.test(evidenceText);
    const captureEvidence = /(手机|前置镜头|手机前置|短视频|视频截帧|屏幕截图|手机截图|状态栏|社交平台|低码率|二次压缩|美颜|磨皮|肤理压平|低微对比|低清|低照度|压缩|噪点|颗粒|柔焦|直闪|随拍|生活照|网络图片|截图质感)/i.test(evidenceText);
    const complexActionEvidence = /(悬挂|绳索|吊带|安全带|攀爬|支撑|腾空|跳跃|倒挂|吊威亚|高难动作|桥式|后弯|倒立|瑜伽|体操|地板动作)/i.test(evidenceText);
    const perspectiveEvidence = /(低机位|仰拍|俯拍|广角|透视|近大远小)/i.test(evidenceText);
    const closePortraitEvidence = key === 'photographic_portrait' && /(近景|特写|自拍|手机前置|短视频截帧|视频截帧|面部|胸像|上半身)/i.test(evidenceText);
    const garmentEvidence = key === 'photographic_portrait' && /(贴身|紧身|针织|弹力|褶皱|张力|承托|绷紧|露肩|一字领|低领口|领口|衣领|抽绳|系带|荷叶边|裹身|前襟|褶裥|袖口)/i.test(evidenceText);
    const digitalRenderEvidence = /(三维|3D|CG|PBR|游戏角色|数字角色|数字渲染|离线渲染|皮肤着色器)/i.test(evidenceText);
    const digitalHumanEvidence = digitalRenderEvidence && /(人物|角色|女性|男性|头像|头肩|面部|脸|皮肤|眼球|头发)/i.test(evidenceText);
    const silhouetteEvidence = silhouetteDominantEvidence(evidenceText);
    const architectureEvidence = key === 'space_landscape' && /(建筑|庄园|宫殿|城堡|楼体|立面|圆顶|屋顶|窗列|拱窗|柱廊|塔楼)/i.test(evidenceText);
    const asymmetricEvidence = /(非对称|单侧|左侧肩甲|右侧肩甲|左侧武器|右侧武器|画面左侧.*(?:护甲|武器|肩甲)|画面右侧.*(?:护甲|武器|刀剑))/i.test(evidenceText);
    const rotatedFrameEvidence = /(顺时针|逆时针|九十度|90\s*度|180\s*度|正交旋转|整张(?:照片|画面).*旋转|侧置观看|侧置画面|重力参照)/i.test(evidenceText);
    const keyPropEvidence = key === 'photographic_portrait' && /(伞|折扇|团扇|枪|武器|头盔|面罩|花束|乐器|手持物|道具|握持|抓握|手持相机|手持手机)/i.test(evidenceText);
    const nearFieldEvidence = key === 'photographic_portrait' && /(前景|贴近镜头|伸向镜头|近大远小|显著放大|从画面.*边进入|广角夸张|极端透视)/i.test(evidenceText);
    const cinematicEvidence = key === 'photographic_portrait' && /(电影剧照|电影摄影|叙事镜头|越肩|过肩|双人对话|场面调度|银幕宽幅|电影调色|高光滚降|胶片颗粒)/i.test(evidenceText);
    const requireGroups = groups => {
      for (const group of groups) {
        if (!group.some(field => rowKeys.has(field)) && !missingGroups.some(item => item.some(field => group.includes(field)))) missingGroups.push(group);
      }
    };
    if (physicalArtifactEvidence) {
      for (const group of [['physical_medium'], ['scale_cues'], ['manufacturing_evidence']]) {
        if (!group.some(field => rowKeys.has(field)) && !missingGroups.some(item => item[0] === group[0])) missingGroups.push(group);
      }
    }
    if (articulationEvidence && !rowKeys.has('articulation_system')) missingGroups.push(['articulation_system']);
    if (captureEvidence) requireGroups([['capture_signature'], ['clarity_map'], ['exposure_map']]);
    if (complexActionEvidence) requireGroups([['subject_occupancy'], ['pose_identity'], ['spatial_skeleton'], ['perspective_strength'], ['support_mechanics'], ['contact_map']]);
    if (perspectiveEvidence) requireGroups([['subject_occupancy'], ['perspective_strength']]);
    if (closePortraitEvidence) requireGroups([['subject_occupancy'], ['face_geometry'], ['facial_maturity'], ['body_silhouette'], ['skin_tone'], ['skin_exposure'], ['skin_rendering']]);
    if (garmentEvidence) requireGroups([['clothing'], ['clothing_fit'], ['clothing_material'], ['garment_tension_map']]);
    if (digitalRenderEvidence) requireGroups([['render_medium'], ['render_signature'], ['asset_presentation'], ['stylization_geometry'], ['exposure_map']]);
    if (digitalHumanEvidence && !silhouetteEvidence) requireGroups([['skin_shader']]);
    if (silhouetteEvidence) requireGroups([['subject_visibility'], ['focal_points'], ['silhouette_topology'], ['layer_stack'], ['tonal_map', 'exposure_map']]);
    if (digitalRenderEvidence && asymmetricEvidence) requireGroups([['asymmetry_map']]);
    if (architectureEvidence) requireGroups([['architecture_geometry'], ['spatial_layout_map'], ['subject_occupancy'], ['tonal_map', 'exposure_map']]);
    if (rotatedFrameEvidence) requireGroups([['frame_rotation'], ['gravity_reference']]);
    if (key === 'photographic_portrait') requireGroups([
      ['medium_identity'], ['camera_subject_geometry'], ['identity_anchors'], ['gaze_geometry'],
      ['subject_occupancy'], ['body_silhouette'], ['skin_tone'], ['skin_exposure'], ['skin_rendering'],
      ['clothing'], ['clothing_fit'], ['clothing_material'], ['garment_tension_map'], ['color_system']
    ]);
    if (keyPropEvidence) requireGroups([['prop_geometry'], ['contact_map']]);
    if (nearFieldEvidence) requireGroups([['near_field_geometry']]);
    if (cinematicEvidence) requireGroups([['cinematic_staging'], ['cinematic_signature']]);
    const chineseCount = (prompt.match(/[\u3400-\u9fff]/g) || []).length;
    const reasons = [];
    if (rows.length < contract.minimumRows) reasons.push(`拆解仅 ${rows.length} 项，${contract.label}建议至少 ${contract.minimumRows} 项`);
    if (missingGroups.length) reasons.push(`缺少 ${missingGroups.map(group => group.join('/')).join('、')}`);
    if (chineseCount < 100) reasons.push('完整提示词信息密度不足');
    if (options.aspectRatio && !prompt.includes(options.aspectRatio)) reasons.push('完整提示词未锁定真实画幅');
    return {
      pass: reasons.length === 0,
      score: Math.max(0, 100 - reasons.length * 8 - missingGroups.length * 2),
      reasons,
      missingGroups,
      rowCount: rows.length
    };
  }

  function buildFusionDirectives(options = {}) {
    const variantEnabled = options.variantEnabled === true;
    const portraitFidelity = options.portraitFidelity === true;
    return [
      '【F·BASE 双方法融合规则】先执行通用视觉取证，再执行图片类型专用编译。所有结论都要能回指到当前图片证据。',
      '【Agent 式证据工作台】在输出 JSON 前，先在内部完成六个相互独立的证据账本：媒介与采集方式；画布与相机几何；主体身份锚点；姿态、受力与接触；关键道具与近场拓扑；光线、曝光与后期。每个账本只记录像素可见事实、空间关系和证据强度。不要向用户展示内部推演过程，只输出胜出结论。',
      '【候选假设与反证】对容易混淆的观察先建立最多三个候选解释，再主动寻找反证。重点比较现实摄影、数字渲染与混合合成；第三人称高机位、自拍与固定机位；站立、跪坐、悬挂与支撑；手掌、折扇、裙摆与其他近场形状；直视镜头、脸朝镜头但虹膜侧偏、完全侧视。只有同时解释轮廓、遮挡、接触、透视和成像签名的候选才能进入 breakdown。',
      '【证据置信分层】直接可见的轮廓、位置、颜色、接触和虹膜位置属于强证据；由连续透视、材质反射和阴影共同支持的结论属于中证据；身份名称、具体焦段、品牌、作者、软件和被遮挡结构属于弱证据。弱证据不得进入生成锚点，中证据必须使用窄描述，强证据优先写入提示词前半段。',
      '【先观察后编译】第一阶段先完成事实账本、类型路由和锚点排序，再生成临时 prompt。第二阶段必须重新查看原图，独立验证媒介、相机几何、人物身份、视线、动作接触、道具拓扑和成像签名；初稿不具备证据权威，任何冲突都按像素证据重写。两阶段共用当前图片，最终仍返回既有 imageType、breakdown、prompt、variantPrompt 结构。',
      '通用取证分三层：事实层只记录可见内容；生成层把事实翻译为模型可执行控制；变量层区分固定锚点、可变因素和偶发元素。状态栏、来源水印和平台界面只作为截图、视频截帧或社交平台压缩的采集链证据，不进入生成画面。',
      '输出前完成关键约束审计：prompt 优先保留决定画面的主体、构图、动作、光色和必要细节；其余取证细节保留在 breakdown，按任务需要选用。重复事实合并一次，删除无关装饰和泛化质量词。',
      '【形体与材质分离】先记录轮廓与连接拓扑，再判断实体材质，最后记录表面状态。形似骨、壳、布、皮膜或翅翼只属于造型类比，不能直接升级成真实骨骼、皮肤、翼膜、腐尸或亡灵题材。题材语义不能反向覆盖可见材质证据。',
      '【实物媒介优先门控】先判断画面记录的是现实物体、活体、插画还是数字渲染，再判断物体描绘的题材。桌面承载、接触投影、可比较纹理尺度、球形或转轴关节、装配缝、分件边界、注塑或涂装表面等证据共同指向实物模型时，主类型使用 product_still；具有明确广告陈列与品牌商业布光时才使用 commercial_product。主体必须写成实体可动模型、收藏玩具或手办产品，不能写成活体生物或只有题材身份的概念雕塑。',
      '【制造与尺度合同】实物产品必须独立输出 physical_medium:实物媒介、scale_cues:尺度线索、manufacturing_evidence:制造与装配证据。出现可见关节时再输出 articulation_system:可动关节系统，逐项写肩、肘、腕、髋、膝、踝等可见位置的球形关节、轴关节、缝隙、分件连接与活动方向。尺度只根据桌面、木纹、接触影、支撑面和景深等可见参照描述为小比例桌面物件，不虚构厘米数。制造证据优先写标准化分件、关节球、装配缝、均匀壁厚、喷涂边界和塑料或树脂反光。',
      '【采集成像合同】照片出现手机前置、手机视频、短视频截帧、屏幕截图、状态栏、社交平台、低码率、二次压缩、美颜柔化、低照度、直闪、柔焦、噪点或低清证据时，独立输出 capture_signature:采集成像签名、clarity_map:清晰度地图、exposure_map:曝光分布。每项标注可见强度为轻、中或强，写清自动白平衡、高光、暗部、清晰区、柔化区、压缩痕迹和色阶断层所在区域。prompt 开头在摄影媒介后立即写入这三项，保留原图曝光不均、美颜降噪、低微对比、边缘柔化、肤理压平和压缩程度，禁止升级成暖调精修、锐利毛孔、均匀棚光或干净商业美妆肖像。状态栏与平台界面只证明采集链，不进入生成画面。',
      '【电影场面调度合同】图片具有电影剧照、双人对话、越肩镜头或银幕宽幅证据时，独立输出 cinematic_staging:电影场面调度。按画面坐标记录主角与前景人物的占位、前景肩背遮挡面积、视线高度、人物间距、视线方向、对话轴线、道路或建筑引导线、头顶留白和背景叙事信息。越肩关系必须保留前景人物的局部遮挡和主角偏轴位置，禁止改成居中单人英雄肖像或普通并排合影。',
      '【电影成像签名合同】具有电影剧照证据时，独立输出 cinematic_signature:电影成像签名。分别记录低饱和调色、肤色与环境分离、高光滚降、暗部底线、局部微对比、景深过渡、镜头边缘衰减和可见颗粒或压缩强度。电影感必须来自镜头调度、层次和影调结构，禁止仅靠全局压暗、黑角、青橙滤镜或过度浅景深伪造；同时避免干净锐利的商业数码人像质感。',
      '【摄影保真四核合同】真实人像摄影必须独立输出 medium_identity:媒介身份、camera_subject_geometry:相机与主体几何、identity_anchors:人物身份锚点、gaze_geometry:视线几何。媒介身份先判断现实相机记录、数字渲染或混合合成，并写出直接证据；皮肤平滑、美颜、低清、夸张构图或疑似 AI 外观不能单独证明数字渲染。相机与主体几何分别写机位高度、俯仰角、拍摄距离、主体朝向、身体纵向缩短、近大远小与第三人称或自拍证据；高机位照片不能自动写成自拍，只有可见持机手臂、手机反射或明确自拍构造时才能命名自拍。身份锚点只记录可见性别呈现、年龄阶段、发色发型、脸部比例、肤色、体态和高识别配饰，不猜姓名。视线几何必须把脸部朝向、虹膜在眼裂内的位置、画面坐标方向和目标关系分开，禁止把侧向抬眼改成直视镜头。',
      '【关键道具与近场几何合同】画面出现伞、扇、枪、头盔、面罩、武器、花束、乐器或其他高识别道具时，独立输出 prop_geometry:关键道具几何，写形状拓扑、画面包围区域、朝向、进入边缘、连接点、遮挡层级和与手部身体的关系。道具或肢体贴近镜头、显著放大或跨越前景时再输出 near_field_geometry:近场几何，写其相对面部的表观尺度、从哪条画面边缘进入、是否跨越中线、最近点和清晰度。圆伞的放射伞骨、折扇的扇骨与扇面、枪械的枪管与握把都属于第一优先拓扑，不能改写为裙摆、飘带、普通布料或无关装饰。',
      '【确定性明暗与色卡边界】本地像素证据中的全局平均明度、暗部比例、高光比例和九宫格明暗位置具有高优先级。模型描述必须与这些数值同向，不能仅凭题材词把灰暗图提亮或把明亮图压暗。全局色卡只约束天空、背景、服装、建筑、地面等大面积区域的面积关系，不能直接推导人物肤色、嘴唇、眼睛或局部材质；肤色和材质颜色分别从对应可见区域取证。',
      '【高反差剪影合同】主体内部大面积处于近黑、五官和服装小件缺少可靠证据时，独立输出 subject_visibility:主体可见性、focal_points:核心视觉焦点、silhouette_topology:轮廓与流动拓扑、layer_stack:图层遮挡顺序、tonal_map:明暗区域地图。核心视觉焦点必须写清高反差光形的类别、圆度或边界、中心位置、画布占比以及与主体的重叠关系；能够辨认的月盘、窗洞、日轮或灯幕要使用对应名称，不能降级成泛化光源。轮廓拓扑按起点、方向、终点和占据区域记录发丝、衣摆、飘带与肢体的主流动线。主体内部没有证据时统一保持近黑，不补写性别、五官、皮肤着色、护甲纹样、胸前薄纱、腰部金属小件和被遮挡服装层。下方暗带缺少连续镜像与波纹证据时只写暗色平台或前景横带，不命名为水面。',
      '【画布与重力分离】真实摄影必须独立输出 frame_rotation:画面旋转状态，先判断最终像素画布的横竖与比例，再判断场景内容相对画布是 0 度、顺时针 90 度、逆时针 90 度、180 度或自由倾斜。出现正交旋转、侧置观看、地面沿画面侧边延伸或人物重力方向与画布竖直方向不一致时，再输出 gravity_reference:重力参照，写清现实地面映射到画面哪条边、真实向上方向和观看时的侧置关系。prompt 在画幅后立即锁定整张场景的旋转方向与角度，随后再写人物动作，防止模型把旋转画布改造成常规直立构图。',
      '【动作空间合同】检测到悬挂、绳索、吊带、支撑、腾空、攀爬、桥式、后弯、倒立或高难姿态时，独立输出 subject_occupancy:主体占位、pose_identity:动作类别、spatial_skeleton:空间骨架、perspective_strength:透视强度、support_mechanics:支撑与受力、contact_map:支撑接触图。主体占位同时写包围区域与主要负空间方向和大致面积；动作类别使用可见的标准动作关系并说明变体；空间骨架按画面坐标写头、躯干、骨盆、双手、双膝、双脚的相对位置与遮挡顺序；接触图逐一记录每只可见手脚是承重接触、轻触、抬起、悬空、遮挡或出框，以及接触面的画面位置；支撑与受力写锚点、重心和承重肢体。禁止把四点支撑改成三点支撑，禁止凭空抬起原图中承重的手脚。',
      '【低机位近景合同】面部可见的近景、自拍、低机位或广角人像独立输出 face_geometry:面部几何、facial_maturity:面部成熟度、subject_occupancy:主体占位、perspective_strength:透视强度。面部几何覆盖脸长、上下庭、下颌、下巴、眼裂、虹膜、鼻部和唇形；成熟度只记录可见的软组织饱满度、骨点锐利度、眼周与妆面线索。贴身、针织、弹力或明显褶皱服装再输出 garment_tension_map:服装张力与褶皱分布，标明褶皱区域、方向、密度、深度和保持平整的连续区域，防止全衣褶皱和身形平均化。',
      '【皮肤三层合同】真实人像独立输出 skin_tone:皮肤固有色与冷暖、skin_exposure:皮肤局部曝光与亮度关系、skin_rendering:皮肤成像与后期质感。肤色只从可见面部、颈部和肢体取证，并写清它相对背景与服装的明度和饱和度；曝光层记录额头、鼻梁、双颊、颈部和肢体的亮暗落点；成像层记录磨皮、美颜柔化、微对比、毛孔、噪点、锐度和反射。原图存在冷白提亮、低微对比或明显美颜时必须正向保留，禁止用自然、真实、半哑光等宽泛词将其改写成暖黄真实皮肤。',
      '【可见身形与服装拓扑合同】真实人像独立输出 subject_occupancy:主体占位、body_silhouette:可见身形轮廓、clothing:服装结构、clothing_fit:服装贴合、clothing_material:服装材质、garment_tension_map:服装张力与褶皱分布。按画面坐标记录头部与可见上半身的表观尺度、肩宽与头部比例、胸廓和服装共同形成的可见轮廓、躯干裁切与手臂边界；服装逐项记录领口宽度和高度、肩部覆盖边界、袖口位置与长度、前襟、抽绳或系带、褶皱走向、面料厚薄弹性、贴合与承托结构。只描述图片可见形体，不推断被遮挡解剖。',
      '【区域颜色校准合同】真实人像必须独立输出 color_system:区域颜色系统，并将皮肤、服装、背景与小面积配饰分区校准。每一区域记录主色、相对明度、冷暖和饱和度；服装颜色以面料主体区域为准，避开皮肤反光、背景溢色、状态栏、平台界面和压缩色边。全局色卡负责面积关系，skin_tone 负责皮肤固有色，clothing 与 color_system 共同锁定服装底色，任何一层都不能覆盖另一层。',
      '【数字角色媒介合同】出现三维、数字角色、游戏美术、离线渲染或 PBR 证据时，独立输出 render_medium:数字渲染媒介、render_signature:渲染签名、asset_presentation:资产展示方式、stylization_geometry:风格化几何、exposure_map:曝光分布。数字人物仅在皮肤、眼球和脸部表面清楚可见时输出 skin_shader:数字皮肤着色，并在 prompt 中锁定数字雕刻几何、数字皮肤着色器、受控次表面散射、环境遮蔽、材质分层与发丝渲染。剪影人物跳过皮肤着色和隐藏表面合同，改用高反差剪影合同。高保真、照片级、真实感等词只修饰渲染精度，不能改变数字媒介。出现单侧护甲、武器、绑带和纹身时再输出 asymmetry_map:非对称装备结构，逐项写画面左右侧、连接位置、轮廓范围、材质和遮挡层级。',
      '【建筑相对几何合同】空间风景出现庄园、宫殿、城堡、楼体或清晰立面时，独立输出 architecture_geometry:建筑相对几何、spatial_layout_map:空间布局地图、subject_occupancy:主体占位、tonal_map:明暗区域地图。建筑相对几何使用画布百分区间记录建筑包围框、总宽高比、屋脊高度、中央体量相对整栋宽度和高度、两翼长度与窗列节奏；空间布局记录草坪、道路、人物、建筑、树冠和天空的边界位置；明暗地图记录建筑受光面、草坪、树林和天空各自的亮度层级。圆顶、塔楼、宫殿等语义词不得扩大中央体量或改写翼部结构。',
      '【非人物造型保真】雕塑、器物、概念生物和混合视觉必须独立输出 silhouette_topology:轮廓与拓扑、material_identity:材质本体、surface_finish:表面状态、wear_distribution:损伤分布。轮廓与拓扑写单侧或双侧、数量、起点、走向、连接点、终点、厚薄变化与负空间；材料本体写基材；表面状态写粗糙度、光泽、半透明、孔隙、边缘反应与高光形态；损伤分布写损伤尺度、密度和所在区域。',
      '【局部纹理限域】局部孔洞、裂口、毛糙边缘、暗色内腔和磨损不能扩写成全身粗糙、整体腐朽或全局碎裂。先判断连续平滑表面与受损区域的面积关系，再把平滑区、过渡区和损伤区分别写清。形似翅翼的单片壳体只有在可见翼骨、连续膜面和明确展开连接同时成立时才命名为翅翼；证据不足时写成单侧弧形薄壳、肩甲或外覆片。',
      '【材质执行合同】完整提示词对非人物主体先写成像媒介，随后立即写材质本体、表面状态、损伤限域和光线反应，再写轮廓拓扑与题材身份。材质描述至少覆盖基材、粗糙度或光泽、厚薄与边缘、透光或反射、缺陷尺度与分布，以及主光如何呈现这些表面。避免用黑暗、古老、诡异、腐朽等题材词替代材质描述。',
      '【可动模型提示词顺序】检测到可动关节与装配分件时，prompt 开头依次锁定真实产品摄影、小比例桌面模型、制造材质、可见关节与分件、表面涂装和尺度参照，随后再写角色造型、姿态、背景与灯光。末尾加入当前图片支持的防漂移约束，重点拦截真人或活体尺度、连续有机解剖、无关节整体雕塑、数字概念渲染、粗糙骨质覆盖平滑喷涂表面，以及片状前臂被扩写为巨型翅翼。',
      '真实人像摄影追加写真取证：先判断照片成立点与固定锚点；镜头角度和构图分栏；场景只写空间，饰品与手持物归入配饰或道具；动作必须写支撑点、方向、手部任务与接触关系；光线按来源、方向、落点、结果写清。',
      '真实人像皮肤同时描述纹理和反射。无汗湿、水光肌或雨水证据时使用自然半哑光或克制缎光，T 区仅保留窄高光，脸颊保持柔和漫反射；水润唇和湿润眼妆只作用在对应五官。近景直闪需要限制额头和双颊的大面积连续湿亮。',
      '真实人像提示词顺序：媒介身份与成像签名；画幅；相机与主体几何；关键道具与近场几何；人物身份锚点、五官、肤色、视线与微表情；动作、手部接触、遮挡与身体朝向；发型配饰大轮廓；服装版型材质；场景空间；光源落点与色彩；锐度层级与皮肤质感；当前图片失败防线。',
      portraitFidelity
        ? '【人物保真模式】仅对真实人像摄影生效。近景、自拍和美妆人像必须独立记录脸型与上下庭比例、下颌和下巴轮廓、眼裂形状与虹膜占比、鼻部长度宽度、唇形厚薄、眉眼妆容和自拍透视。身形轮廓必须记录画面可见的肩宽与头部比例、胸腰轮廓、躯干长度、上臂粗细、服装贴合与承托结构；机位与构图必须记录俯拍造成的近大远小、纵向缩短、身体轴线、主体占比和边缘裁切。只使用图片可见证据，不补写身份或被遮挡身体。完整提示词先写面部与身形几何锚点，再写服装与背景。负向约束要防止脸型变长、眼睛缩小、鼻部放大、下颌变宽、肩胸腰比例平均化、躯干无故拉长、服装贴合度改变、妆容减弱和模板化商业人像脸；原图可见的幼态、圆脸、短下巴、大眼、美颜几何与身形特征必须保留。'
        : '',
      '动漫插画优先锁定脸部风格、线稿、上色、阴影、笔触、表面层与载体层；海报优先锁定主体可见性、清晰度与遮挡、版式结构地图、阅读动线、视觉权重、图层顺序和文字功能；产品、静物、雕塑、概念生物、空间和界面只使用各自 profile 的证据字段。',
      variantEnabled
        ? '同风格变体只逐字锁定整体风格词链与成像机制词链。人物细节、妆发、服装、场景、道具、机位、构图、动作、表情、视线和现场光线可以在同一审美体系内重新设计，变体必须形成明显不同的成片并保持同系列识别。'
        : '变体功能关闭，variantPrompt 保持空字符串。'
    ].join('\n');
  }

  function buildReviewPrompt(options = {}) {
    const key = cleanString(options.imageTypeKey) || 'mixed_other';
    const contract = contractFor(key);
    const ratio = cleanString(options.aspectRatio) || '由图片证据判断';
    const sourceDimensions = Number(options.sourceWidth) > 0 && Number(options.sourceHeight) > 0
      ? `${Math.round(Number(options.sourceWidth))}×${Math.round(Number(options.sourceHeight))}`
      : '未提供';
    const palette = Array.isArray(options.palette) && options.palette.length
      ? options.palette.map(item => `${item.hex} ${item.role || '参考色'} ${item.ratio || 0}%`).join('；')
      : '未提供确定性色卡';
    const tonalEvidence = options.tonalEvidence && typeof options.tonalEvidence === 'object'
      ? `平均明度 ${options.tonalEvidence.meanLightness ?? '未知'}，明度离散 ${options.tonalEvidence.lightnessDeviation ?? '未知'}，平均色度 ${options.tonalEvidence.meanChroma ?? '未知'}，暗部比例 ${options.tonalEvidence.darkRatio ?? '未知'}，高光比例 ${options.tonalEvidence.highlightRatio ?? '未知'}，最亮区域 ${options.tonalEvidence.brightestRegion || '未知'}，最暗区域 ${options.tonalEvidence.darkestRegion || '未知'}，九宫格 ${Array.isArray(options.tonalEvidence.spatialGrid) ? options.tonalEvidence.spatialGrid.map(item => `${item.region}:${item.hex}/${item.lightness}`).join('；') : '未提供'}`
      : '未提供确定性明暗证据';
    const variantEnabled = options.variantEnabled === true;
    return [
      '你是 F·BASE 第二阶段视觉取证审校器与生图提示词编译器。重新查看参考图，校正初稿并返回合法 JSON，不要 Markdown，不要解释。',
      '初稿只作为待审材料，不携带证据权威。先遮蔽初稿结论并独立观察图片，再逐项比较。图片证据的优先级最高。删除臆测、矛盾、重复和无证据事实，补齐真正影响复现的遗漏控制。',
      '在内部建立冲突表，至少检查“初稿结论、图片支持、图片反证、最终裁决”四项。只把最终裁决写入 breakdown 与 prompt，不输出冲突表或推演文字。',
      '审校顺序固定为：媒介身份；画布与相机几何；主体身份锚点；采集质感；主体占位与可见身形；脸部视线；服装拓扑与张力；动作受力与接触；关键道具与近场拓扑；皮肤、服装和背景分区颜色；光线曝光与后期；提示词字段覆盖。前一层存在硬冲突时，先修正再处理后一层。',
      '先完成五项逐像素复核：媒介身份；相机与主体几何；脸部朝向与虹膜方向；动作支撑和接触；关键道具拓扑与近场尺度。逐项对照初稿，发现站立与跪坐、直视与侧向抬眼、圆伞与普通背景、折扇与裙摆、现实电影摄影与数字角色等冲突时，以图片为准改写 breakdown 和 prompt。',
      `当前主类型预判为 ${key}，对应 ${contract.label}。如果图片证据明确反对，可改为八类枚举中的正确类型。`,
      `本地读取的原图像素尺寸为 ${sourceDimensions}，实测画幅为 ${ratio}。图像类型和 prompt 必须使用这一比例，全篇不能出现其他冲突比例，也不能依据主体姿态猜测画幅。`,
      `本地确定性色卡：${palette}。色卡仅校验色彩关系，不要输出 palette 字段。`,
      `本地确定性明暗证据：${tonalEvidence}。描述的曝光、影调、冷暖与区域亮暗必须和这些数值同向。`,
      buildFusionDirectives({ variantEnabled, portraitFidelity: options.portraitFidelity === true }),
      `当前类型建议至少 ${contract.minimumRows} 个有证据拆解字段。重点覆盖：${contract.groups.map(group => group.join('/')).join('；')}。无证据字段可以省略，关键生成系统不能整体缺席。`,
      ['commercial_product', 'product_still'].includes(key)
        ? '当前类型执行实物媒介与形体材质强审校：先核对 physical_medium、scale_cues、manufacturing_evidence；出现关节时必须补 articulation_system。再逐项核对 silhouette_topology、material_identity、surface_finish、wear_distribution。任何翼、角、骨、壳、布、皮膜、腐朽或破损词都要回到图片验证数量、连接拓扑、表面范围和受损分布；删除从题材气质推导出的材质与器官。图片出现关节球、转轴、装配缝、标准化分件和桌面尺度时，改用 product_still 并把 prompt 开头锁定为小比例实体可动模型产品摄影。'
        : '',
      key === 'mixed_other'
        ? '当前类型执行混合视觉证据审校：先确认主导媒介，再核对 focal_points、subject_visibility、silhouette_topology、layer_stack、tonal_map 与 exposure_map。高反差剪影画面优先保留大光形、遮挡、流动线、主体占位和前中后景层级；删除性别、脸部、隐藏服装、材质小件、水面与建筑等缺少直接像素证据的推测。仅在关节球、装配缝、桌面尺度与制造表面共同出现时切换实体模型审校。'
        : '',
      '生图方法：先说明目标画面及用途，再写主体、构图、可见细节和必要约束。简单画面使用短段，复杂布局才分段标注；不依赖特殊权重语法或反复强调。相机参数只表达视觉效果，不能承诺物理精确模拟。',
      '修改方法：用户明确指定的变化优先于参考图的对应属性；保留未要求改变的关键身份、空间关系和光线。输出可独立使用的完整提示词，改动与保留要求各写一次，不加入互相冲突的旧属性。只有实际附带图片时才按编号说明参考图角色，纯文本生图不能声称已传入参考图或保证身份一致。',
      '画面文字：需要呈现的原文使用引号，说明位置、层级和字形；没有文字需求时不补写文字。仅保留与任务直接相关的排除要求。连续修改建议每次处理一个明确问题，逐次检查结果，不能承诺像素级不变。',
      'prompt 使用可直接复制的简体中文自然语言，默认按一至三个短段组织，详细模式才逐项展开。固定顺序为画幅与媒介、相机与构图、主体与占位、动作接触、服装道具、场景光色、成像质感、失败防线。每个生成事实只出现一次，禁止把 breakdown 全量拼接成前置合同。摄影技术英文词改成准确中文表达，数字、比例和 HEX 色值可以保留。',
      'breakdown 保留完整取证信息，prompt 只写模型可执行的确定事实合同。无法确认、不能判定、未观察到、证据不足、具体身份未知等审校文字只能留在 breakdown，不能进入 prompt。可见遮挡可改写为直接事实，例如“腿脚被裙摆遮挡”。失败风险统一改写成简短的“避免……”指令。',
      '当实测画幅由高位像素整数构成时，prompt 使用横向宽幅、竖向画幅或方形画幅，加约数比例和原图像素尺寸，例如“横向宽幅，比例约1.91:1，原图像素2048×1071”。禁止把 2048:1071 直接当作常用宽高比反复书写。构图、主体占位、核心光形、主轮廓流向、关键接触和区域光色优先，分析证据、推测过程与同义复述全部删除。',
      '标点规则固定为完整句使用句号，并列短项才使用分号。禁止句号后紧接分号、连续句号、连续分号、空段和同义句重复。每一段先表达一个生成目标，再补充该目标的限制条件。',
      variantEnabled
        ? 'variantPrompt 使用相同段落顺序和标点规则，逐字保留主 prompt 的整体风格词链与成像机制词链，并重新设计观看关系和人物事件。'
        : 'variantPrompt 返回空字符串。',
      '返回结构：{"imageType":{"key":"photographic_portrait","label":"摄影人像","confidence":0.9,"reason":"..."},"breakdown":[{"key":"英文键","label":"中文栏名","value":"有证据的具体控制"}],"prompt":"...","variantPrompt":"..."}'
    ].join('\n');
  }

  return {
    PROFILE_CONTRACTS,
    SUPPORTED_RATIOS,
    assessQuality,
    buildFusionDirectives,
    buildReviewPrompt,
    contractFor,
    compileGenerationPrompt,
    aspectContract,
    enforceAspectRatio,
    filterGenerationControlIds,
    finalizeResult,
    mergeResults,
    normalizePromptPunctuation,
    sanitizeGenerationFact,
    stripWatermarkClauses,
    cleanAtomicTerm,
    isJunkAtomicLabel
  };
});
