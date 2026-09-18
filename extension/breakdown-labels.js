(function initializeFinnBreakdownLabels(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FinnBreakdownLabels = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createFinnBreakdownLabels() {
  'use strict';

  const LABELS = Object.freeze({
    image_type: '图像类型', aspect_ratio: '画幅与载体', visual_goal: '视觉目标', medium_identity: '媒介身份', style_reference: '核心风格合约',
    style_filter: '风格与滤镜', medium: '媒介语言', era: '年代气质', mood: '整体氛围', narrative: '叙事情境',
    composition: '构图方式', framing: '景别与取景', camera_angle: '机位角度', lens: '镜头语言', focal_length: '焦段倾向',
    depth_of_field: '景深关系', perspective: '透视关系', subject: '主体身份', subject_count: '主体数量',
    subject_scale: '主体画面占比', placement: '主体位置', pose: '动作姿态', gesture: '手势与肢体', gaze: '视线方向',
    expression: '表情状态', micro_expression: '微表情与情绪', face_archetype: '脸部风格锁定', face_shape: '脸型与面部线条',
    eye_design: '眼型与瞳孔', brow_expression: '眉形与眼神压力', mouth_lip_style: '嘴部与唇色', skin_tone: '皮肤固有色',
    skin_exposure: '皮肤局部曝光', skin_lighting: '皮肤受光关系', skin_rendering: '皮肤成像处理', skin_shader: '数字皮肤着色',
    body_silhouette: '身形轮廓', hair_style: '发型结构', hair_texture: '发丝质感', clothing: '服装款式',
    clothing_fit: '服装贴合度', clothing_material: '服装材质', accessories: '配饰', props: '道具', scene: '场景设定',
    background: '背景结构', foreground: '前景层', midground: '中景层', environment: '环境氛围', architecture: '建筑与空间',
    surface: '台面与承载面', spatial_depth: '空间层次', lighting_style: '整体布光', key_light: '主光', fill_light: '补光',
    rim_light: '轮廓光', light_direction: '光源方向', light_quality: '光质', contrast: '明暗反差', exposure: '曝光倾向',
    dynamic_range: '动态范围', color_system: '色彩系统', dominant_colors: '主色关系', accent_color: '强调色',
    saturation: '饱和度', temperature: '冷暖倾向', tonal_range: '影调范围', material: '主体材质', texture: '表面纹理',
    detail_density: '细节密度', rendering: '渲染方式', post_processing: '后期处理', grain: '颗粒与噪点', sharpness: '锐度',
    blur: '虚化与柔焦', clarity_occlusion: '清晰度与遮挡', visual_weight: '视觉权重', layout_map: '版式结构地图',
    hierarchy: '版式层级', typography: '字体与文字', graphic_elements: '图形元素功能', negative_space: '留白关系',
    rhythm: '构图节奏', generation_priority: '生成优先级', failure_risks: '失败风险', negative_constraints: '负向约束',
    quality_target: '质量目标', brand_mood: '品牌气质', selling_point: '卖点表达', usage_context: '使用场景',
    focal_points: '局部视觉焦点', subject_visibility: '主体可见性', layer_stack: '图层堆叠',
    information_hierarchy: '信息层级', component_style: '组件风格', known_character: '知名角色判断',
    subject_identity: '主体身份', frame_carrier: '画幅与载体', core_style_contract: '核心风格合约',
    pose_expression: '动作与姿态', skin_tone_color: '肤色与肤调', skin_hair_highlight: '皮肤与头发高光',
    composition_space: '构图与空间', scene_background: '场景与背景', light_color: '光线与色彩',
    surface_imaging: '表面与成像', dynamic_negative_constraints: '动态负向约束', styling: '发型/妆容/配饰',
    artist_language: '画师与绘画语言', linework: '线稿特征', coloring: '上色方式', shadow_style: '阴影方式',
    highlight_style: '高光方式', skin_detail: '皮肤细节', hair_highlight: '头发高光', product_subject: '产品主体',
    product_structure: '产品结构', silhouette_topology: '轮廓与拓扑', material_identity: '材质本体',
    product_finish: '产品表面工艺', surface_finish: '表面状态', wear_distribution: '损伤分布',
    physical_medium: '实物媒介', scale_cues: '尺度线索', manufacturing_evidence: '制造与装配证据',
    articulation_system: '可动关节系统', capture_signature: '采集成像签名', cinematic_staging: '电影场面调度', cinematic_signature: '电影成像签名', clarity_map: '清晰度地图',
    exposure_map: '曝光分布', subject_occupancy: '主体占位', spatial_skeleton: '空间骨架',
    perspective_strength: '透视强度', camera_subject_geometry: '相机与主体几何', near_field_geometry: '近场几何', prop_geometry: '关键道具几何', support_mechanics: '支撑与受力', face_geometry: '面部几何',
    identity_anchors: '人物身份锚点', gaze_geometry: '视线几何',
    facial_maturity: '面部成熟度', face_reference_assets: '脸部参考资产', garment_tension_map: '服装张力与褶皱分布',
    render_medium: '数字渲染媒介', render_signature: '渲染签名', asset_presentation: '资产展示方式',
    stylization_geometry: '风格化几何', architecture_geometry: '建筑相对几何', spatial_layout_map: '空间布局地图', tonal_map: '明暗区域地图',
    asymmetry_map: '非对称装备结构',
    frame_rotation: '画面旋转状态', gravity_reference: '重力参照', pose_identity: '动作类别', contact_map: '支撑接触图',
    set_props: '布景与陈设', lighting_render: '布光与渲染', postproduction_quality: '后期完成度',
    arrangement: '摆放关系', materials_details: '材质细节', layout_system: '布局系统'
  });

  const AXIS_RULES = Object.freeze([
    ['成像', /^(image_type|visual_goal|style_|core_style|medium|medium_identity|physical_medium|capture_signature|cinematic_signature|clarity_map|render_medium|render_signature|asset_presentation|skin_rendering|skin_shader|era|mood|narrative|artist_|linework|coloring|shadow_style|highlight_style|rendering|post_processing|grain|sharpness|blur|surface_imaging|quality_target|postproduction_quality)/],
    ['光线', /^(lighting_|key_light|fill_light|rim_light|light_|contrast|exposure|exposure_map|skin_exposure|skin_lighting|tonal_map|dynamic_range|color_|dominant_colors|accent_color|saturation|temperature|tonal_range)/],
    ['镜头', /^(frame_rotation|gravity_reference|cinematic_staging|framing|camera_angle|lens|focal_length|depth_of_field|perspective|perspective_strength|camera_subject_geometry|near_field_geometry)/],
    ['构图', /^(aspect_ratio|frame_carrier|composition|silhouette_topology|stylization_geometry|architecture_geometry|spatial_layout_map|asymmetry_map|scale_cues|subject_count|subject_scale|subject_occupancy|placement|spatial_depth|spatial_skeleton|focal_points|subject_visibility|clarity_occlusion|visual_weight|layout_map|hierarchy|typography|graphic_elements|negative_space|rhythm|layer_stack|information_hierarchy|component_style|layout_system)/],
    ['头部', /^(hair_style|hair_texture|hair_highlight|skin_hair_highlight|face_archetype|face_shape|face_geometry|facial_maturity|face_reference_assets|face_negative_constraints|eye_design|brow_expression|mouth_lip_style|expression|micro_expression|skin_tone|skin_detail)/],
    ['视线与情绪', /^(gaze|gaze_geometry|identity_anchors|known_character)/],
    ['动作', /^(pose|pose_identity|gesture|body_silhouette|spatial_skeleton|support_mechanics|contact_map)/],
    ['配饰与服装', /^(clothing|clothing_fit|clothing_material|garment_tension_map|styling|accessories|product_subject|product_structure|articulation_system|manufacturing_evidence|product_finish|material|material_identity|surface_finish|wear_distribution|texture|detail_density|materials_details)/],
    ['场景与道具', /^(subject|props|prop_geometry|scene|background|foreground|midground|environment|architecture|surface|set_props|arrangement|brand_mood|selling_point|usage_context|generation_priority|failure_risks|negative_constraints|dynamic_negative_constraints)/]
  ]);

  function humanizeKey(key) {
    return String(key || '').trim().replace(/[_-]+/g, ' ').replace(/\b[a-z]/g, value => value.toUpperCase()) || '视觉细节';
  }

  function getLabel(key, explicitLabel = '') {
    const normalized = String(key || '').trim().toLowerCase();
    return LABELS[normalized] || String(explicitLabel || '').trim() || humanizeKey(normalized);
  }

  function getAxis(key) {
    const normalized = String(key || '').trim().toLowerCase();
    return AXIS_RULES.find(([, pattern]) => pattern.test(normalized))?.[0] || '成像';
  }

  function splitValue(value) {
    return splitValueParts(value).filter(item => item.type === 'keyword').map(item => item.text);
  }

  function splitValueParts(value) {
    const tokens = String(value || '').split(/([，,、；;。.!！?？\n]+|\s+(?:and|with)\s+)/i);
    let keywordIndex = 0;
    return tokens.map(token => {
      if (!token) return null;
      if (/^(?:[，,、；;。.!！?？\n]+|\s+(?:and|with)\s+)$/i.test(token)) return { type: 'text', text: token };
      const text = token.replace(/\s+/g, ' ').trim();
      if (text.length < 2 || text.length > 80) return { type: 'text', text: token };
      return { type: 'keyword', text, index: keywordIndex++ };
    }).filter(Boolean);
  }

  function normalizeBreakdown(value) {
    const rows = Array.isArray(value)
      ? value
      : (value && typeof value === 'object' ? Object.entries(value).map(([key, item]) => ({ key, value: item })) : []);
    return rows.map((item, index) => {
      if (typeof item === 'string') item = { key: `detail_${index + 1}`, value: item };
      if (!item || typeof item !== 'object') return null;
      const key = String(item.key || item.id || `detail_${index + 1}`).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
      const nested = item.value && typeof item.value === 'object' ? item.value.value : item.value;
      const text = Array.isArray(nested) ? nested.join('，') : String(nested || item.description || item.content || '').trim();
      if (!text) return null;
      return { key, label: getLabel(key, item.label), value: text };
    }).filter(Boolean).slice(0, 120);
  }

  return { LABELS, getLabel, getAxis, splitValue, splitValueParts, normalizeBreakdown };
});
