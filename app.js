/* ==========================================================================
   PROYECTO IA - VISIÓN ROBÓTICA PARA FRUTILLAS "FESTIVAL"
   Interactive Camera Simulator, Vision Pipeline & Agronomic Telemetry
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // ================= STATE & CONFIG =================
  const state = {
    viewMode: 'all',          // 'all', 'rgb', 'seg', 'depth', 'cielab'
    lighting: 'diffuse',      // 'diffuse', 'direct', 'shade', 'night'
    confidenceThreshold: 0.70, // 0.30 - 0.95
    selectedId: 1,
    isHarvesting: false,
    strawberries: [
      {
        id: 1,
        code: '#ID-01',
        x: 390,
        y: 280,
        width: 72,
        height: 98,
        stage: 4,
        stageName: 'Maduro Comercial Óptimo',
        cultivar: 'Florida Festival',
        varietyTraits: 'Forma cónica homogénea, color carmesí uniforme brillante, cáliz adherido y erecto.',
        confidence: 0.968,
        redSurfaceRatio: 92,
        brix: 8.9,
        firmness: 2.1,
        depthZ: 24.6, // cm
        pose: { x: '+14.2', y: '-08.4', z: '24.6', yaw: '-12°', cutOffsetMm: 14 },
        decision: 'COSECHAR',
        decisionColor: 'emerald',
        robotCommand: 'Aproximación por cuadrante lateral superior. Corte por cizalla a 14 mm sobre el cáliz. Sin compresión de fruto.',
        harvested: false
      },
      {
        id: 2,
        code: '#ID-02',
        x: 210,
        y: 250,
        width: 62,
        height: 84,
        stage: 3,
        stageName: 'Pintón / Transición',
        cultivar: 'Florida Festival',
        varietyTraits: 'Viraje rosado apical característico. Sólidos solubles en ascenso acelerado.',
        confidence: 0.942,
        redSurfaceRatio: 48,
        brix: 6.7,
        firmness: 2.4,
        depthZ: 28.2,
        pose: { x: '-11.5', y: '-04.2', z: '28.2', yaw: '+08°', cutOffsetMm: 15 },
        decision: 'PLANIFICAR (+36h)',
        decisionColor: 'pink',
        robotCommand: 'Registrar en base de datos fenológica. Proyectar cosecha en siguiente pasada de ciclo de 36 horas.',
        harvested: false
      },
      {
        id: 3,
        code: '#ID-03',
        x: 580,
        y: 240,
        width: 54,
        height: 72,
        stage: 1,
        stageName: 'Verde / Inmaduro',
        cultivar: 'Florida Festival',
        varietyTraits: 'Fase de multiplicación celular. Clorofila dominante, sin síntesis de antocianinas.',
        confidence: 0.975,
        redSurfaceRatio: 4,
        brix: 4.1,
        firmness: 3.4,
        depthZ: 32.1,
        pose: { x: '+32.0', y: '-02.1', z: '32.1', yaw: '0°', cutOffsetMm: 12 },
        decision: 'OMITIR / REPOSO',
        decisionColor: 'slate',
        robotCommand: 'Omitir acción mecánica. Incorporar coordenadas al mapa de aforo y rendimiento agronómico.',
        harvested: false
      },
      {
        id: 4,
        code: '#ID-04',
        x: 480,
        y: 350,
        width: 58,
        height: 78,
        stage: 2,
        stageName: 'Blanco / Quiebre',
        cultivar: 'Florida Festival',
        varietyTraits: 'Degradación de clorofila. Textura elástica, color crema con destellos rosados basales.',
        confidence: 0.914,
        redSurfaceRatio: 18,
        brix: 5.3,
        firmness: 2.9,
        depthZ: 26.5,
        pose: { x: '+22.4', y: '+09.1', z: '26.5', yaw: '+15°', cutOffsetMm: 13 },
        decision: 'MONITOREO (+72h)',
        decisionColor: 'yellow',
        robotCommand: 'Estado de quiebre de color. Próxima revisión de madurez estimada en 72 horas.',
        harvested: false
      },
      {
        id: 5,
        code: '#ID-05',
        x: 120,
        y: 330,
        width: 66,
        height: 90,
        stage: 5,
        stageName: 'Sobremaduro / Senescente',
        cultivar: 'Florida Festival',
        varietyTraits: 'Color púrpura opaco oscuro. Pérdida crítica de firmeza, propenso a desgarro o daño por hongos.',
        confidence: 0.887,
        redSurfaceRatio: 99,
        brix: 9.4,
        firmness: 1.2,
        depthZ: 30.4,
        pose: { x: '-24.8', y: '+06.8', z: '30.4', yaw: '-05°', cutOffsetMm: 15 },
        decision: 'DESCARTE / INDUSTRIA',
        decisionColor: 'purple',
        robotCommand: 'No apto para empaque fresco ni exportación. Marcar para retiro fitosanitario o uso agroindustrial.',
        harvested: false
      }
    ]
  };

  // ================= CANVAS & VIEWPORT SETUP =================
  const canvas = document.getElementById('visionCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio || 800;
    canvas.height = rect.height * window.devicePixelRatio || 500;
    renderCanvas();
  }

  window.addEventListener('resize', resizeCanvas);

  // ================= DRAWING LOGIC =================
  function renderCanvas() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Coordinate scaling based on default 800x500 design space
    const scaleX = w / 800;
    const scaleY = h / 500;

    // 1. Draw Field Background (Mulch film, foliage, soil)
    drawBackground(ctx, w, h);

    // 2. Draw Foliage Vines & Leaves
    drawFoliage(ctx, scaleX, scaleY);

    // 3. Draw Strawberries
    state.strawberries.forEach(berry => {
      // Filter out low confidence detections
      if (berry.confidence < state.confidenceThreshold) return;

      const bx = berry.x * scaleX;
      const by = berry.y * scaleY;
      const bw = berry.width * scaleX;
      const bh = berry.height * scaleY;
      const isSelected = berry.id === state.selectedId;

      drawStrawberry(ctx, berry, bx, by, bw, bh, isSelected);

      // Overlays according to mode
      if (state.viewMode === 'all' || state.viewMode === 'seg') {
        drawSegmentationMask(ctx, berry, bx, by, bw, bh, isSelected);
      }
      if (state.viewMode === 'all') {
        drawBoundingBox(ctx, berry, bx, by, bw, bh, isSelected);
        drawPeduncleCutPose(ctx, berry, bx, by, bw, bh);
      }
    });

    // 4. Special Modes Post-Processing (Depth Map or CIELAB filter)
    if (state.viewMode === 'depth') {
      applyDepthShaderOverlay(ctx, w, h);
    } else if (state.viewMode === 'cielab') {
      applyCielabShaderOverlay(ctx, w, h);
    }

    // 5. Lighting Simulation Filter
    applyLightingFilter(ctx, w, h);

    ctx.restore();
  }

  // Draw natural agricultural background
  function drawBackground(ctx, w, h) {
    // Soil / dark furrow
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a100b');
    grad.addColorStop(0.4, '#101511');
    grad.addColorStop(1, '#080c09');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Black plastic mulch texture on the raised bed
    ctx.fillStyle = '#14181a';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.45);
    ctx.quadraticCurveTo(w * 0.5, h * 0.48, w, h * 0.45);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    // Subtle mulch wrinkles/creases
    ctx.strokeStyle = '#22282c';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.6);
    ctx.lineTo(w * 0.4, h * 0.65);
    ctx.moveTo(w * 0.5, h * 0.7);
    ctx.lineTo(w * 0.85, h * 0.68);
    ctx.stroke();
  }

  // Draw strawberry plant leaves (Trifoliate leaves)
  function drawFoliage(ctx, sx, sy) {
    ctx.save();
    const leaves = [
      { x: 180, y: 140, r: 90, ang: -0.3, col: '#1b4a24' },
      { x: 290, y: 110, r: 110, ang: 0.1, col: '#225e2e' },
      { x: 420, y: 130, r: 120, ang: -0.15, col: '#1e5229' },
      { x: 540, y: 150, r: 95, ang: 0.4, col: '#163d1e' },
      { x: 340, y: 220, r: 80, ang: 0.8, col: '#2a7339' },
      { x: 670, y: 200, r: 100, ang: -0.5, col: '#1b4a24' },
      { x: 80, y: 210, r: 85, ang: 0.6, col: '#1e5229' }
    ];

    leaves.forEach(leaf => {
      ctx.save();
      ctx.translate(leaf.x * sx, leaf.y * sy);
      ctx.rotate(leaf.ang);
      ctx.fillStyle = leaf.col;
      ctx.beginPath();
      // Serrated strawberry leaf shape
      ctx.ellipse(0, 0, (leaf.r * sx) / 1.4, leaf.r * sy, 0, 0, Math.PI * 2);
      ctx.fill();

      // Leaf veins
      ctx.strokeStyle = 'rgba(74, 222, 128, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, (-leaf.r * sy) * 0.8);
      ctx.lineTo(0, (leaf.r * sy) * 0.8);
      ctx.stroke();
      ctx.restore();
    });
    ctx.restore();
  }

  // Draw realistic Festival strawberry
  function drawStrawberry(ctx, berry, bx, by, bw, bh, isSelected) {
    if (berry.harvested) {
      // Draw cut stem remainder
      ctx.strokeStyle = '#4d7c0f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx, by - bh * 0.4);
      ctx.lineTo(bx - 10, by - bh * 0.6);
      ctx.stroke();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 12px monospace';
      ctx.fillText('[COSECHADO EXITOSAMENTE]', bx - 80, by);
      return;
    }

    ctx.save();

    // 1. Peduncle / Tallo
    ctx.strokeStyle = '#65a30d';
    ctx.lineWidth = Math.max(3, bw * 0.08);
    ctx.beginPath();
    ctx.moveTo(bx + bw * 0.05, by - bh * 0.55);
    ctx.quadraticCurveTo(bx + bw * 0.12, by - bh * 0.2, bx, by - bh * 0.05);
    ctx.stroke();

    // 2. Fruit Body (Festival Conical shape)
    const topW = bw * 0.48;
    const botY = by + bh * 0.48;

    ctx.beginPath();
    ctx.moveTo(bx - topW, by - bh * 0.05);
    // Left curve towards conic tip
    ctx.bezierCurveTo(
      bx - topW * 1.05, by + bh * 0.22,
      bx - topW * 0.6, by + bh * 0.42,
      bx, botY
    );
    // Right curve towards conic tip
    ctx.bezierCurveTo(
      bx + topW * 0.6, by + bh * 0.42,
      bx + topW * 1.05, by + bh * 0.22,
      bx + topW, by - bh * 0.05
    );
    ctx.closePath();

    // Color gradient according to ripening stage
    const fruitGrad = ctx.createLinearGradient(bx, by - bh * 0.1, bx, botY);
    if (berry.stage === 1) { // Green
      fruitGrad.addColorStop(0, '#4d7c0f');
      fruitGrad.addColorStop(0.7, '#65a30d');
      fruitGrad.addColorStop(1, '#84cc16');
    } else if (berry.stage === 2) { // Breaker / White
      fruitGrad.addColorStop(0, '#fef08a');
      fruitGrad.addColorStop(0.5, '#fef9c3');
      fruitGrad.addColorStop(0.85, '#fca5a5');
      fruitGrad.addColorStop(1, '#f43f5e');
    } else if (berry.stage === 3) { // Turning / Pink
      fruitGrad.addColorStop(0, '#fed7aa');
      fruitGrad.addColorStop(0.3, '#f472b6');
      fruitGrad.addColorStop(0.7, '#fb7185');
      fruitGrad.addColorStop(1, '#e11d48');
    } else if (berry.stage === 4) { // Optimal Ripe (Festival Crimson)
      fruitGrad.addColorStop(0, '#be123c');
      fruitGrad.addColorStop(0.35, '#e11d48');
      fruitGrad.addColorStop(0.8, '#dc2626');
      fruitGrad.addColorStop(1, '#9f1239');
    } else { // Overripe
      fruitGrad.addColorStop(0, '#881337');
      fruitGrad.addColorStop(0.5, '#701a75');
      fruitGrad.addColorStop(1, '#4c0519');
    }

    ctx.fillStyle = fruitGrad;
    ctx.fill();

    // Specular highlight on Festival's glossy cuticle
    if (state.lighting === 'direct') {
      const glint = ctx.createRadialGradient(bx - topW * 0.3, by + bh * 0.1, 2, bx - topW * 0.3, by + bh * 0.1, bw * 0.3);
      glint.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      glint.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = glint;
      ctx.fill();
    }

    // 3. Achenes / Seed dots
    ctx.fillStyle = berry.stage === 1 ? '#a3e635' : (berry.stage === 5 ? '#3f0f1d' : '#fef08a');
    const seeds = [
      [-0.25, 0.05], [0.1, 0.08], [0.3, 0.06],
      [-0.15, 0.2], [0.15, 0.22], [-0.3, 0.25],
      [0.0, 0.32], [0.25, 0.33], [-0.18, 0.38],
      [0.08, 0.42]
    ];
    seeds.forEach(([ox, oy]) => {
      ctx.beginPath();
      ctx.arc(bx + ox * bw, by + oy * bh, Math.max(1.2, bw * 0.02), 0, Math.PI * 2);
      ctx.fill();
    });

    // 4. Calyx / Sépalos (Festival prominent green calyx)
    ctx.fillStyle = '#3f6212';
    ctx.beginPath();
    ctx.moveTo(bx - topW * 0.8, by - bh * 0.02);
    ctx.lineTo(bx - topW * 1.2, by - bh * 0.2);
    ctx.lineTo(bx - topW * 0.4, by - bh * 0.06);
    ctx.lineTo(bx, by - bh * 0.25);
    ctx.lineTo(bx + topW * 0.4, by - bh * 0.06);
    ctx.lineTo(bx + topW * 1.2, by - bh * 0.2);
    ctx.lineTo(bx + topW * 0.8, by - bh * 0.02);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  // Draw YOLO Instance Segmentation polygon mask
  function drawSegmentationMask(ctx, berry, bx, by, bw, bh, isSelected) {
    if (berry.harvested) return;
    ctx.save();
    const topW = bw * 0.52;
    const botY = by + bh * 0.5;

    ctx.beginPath();
    ctx.moveTo(bx - topW, by - bh * 0.08);
    ctx.bezierCurveTo(
      bx - topW * 1.1, by + bh * 0.24,
      bx - topW * 0.65, by + bh * 0.44,
      bx, botY
    );
    ctx.bezierCurveTo(
      bx + topW * 0.65, by + bh * 0.44,
      bx + topW * 1.1, by + bh * 0.24,
      bx + topW, by - bh * 0.08
    );
    ctx.closePath();

    let strokeCol = '#10b981';
    let fillCol = 'rgba(16, 185, 129, 0.25)';
    if (berry.stage === 4) {
      strokeCol = '#f43f5e';
      fillCol = 'rgba(244, 63, 94, 0.28)';
    } else if (berry.stage === 3) {
      strokeCol = '#f59e0b';
      fillCol = 'rgba(245, 158, 11, 0.25)';
    } else if (berry.stage === 1) {
      strokeCol = '#84cc16';
      fillCol = 'rgba(132, 204, 22, 0.2)';
    }

    ctx.fillStyle = fillCol;
    ctx.fill();
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = isSelected ? 3 : 1.5;
    ctx.stroke();
    ctx.restore();
  }

  // Draw YOLO Bounding Box and label
  function drawBoundingBox(ctx, berry, bx, by, bw, bh, isSelected) {
    if (berry.harvested) return;
    ctx.save();
    const pad = 12;
    const boxX = bx - bw * 0.6 - pad;
    const boxY = by - bh * 0.25 - pad;
    const boxW = bw * 1.2 + pad * 2;
    const boxH = bh * 0.8 + pad * 2;

    let col = '#10b981';
    if (berry.stage === 4) col = '#f43f5e';
    if (berry.stage === 3) col = '#f59e0b';
    if (berry.stage === 1) col = '#64748b';

    ctx.strokeStyle = col;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;
    ctx.setLineDash([5, 3]);
    ctx.strokeRect(boxX, boxY, boxW, boxH);
    ctx.setLineDash([]);

    // Corner brackets
    const cLen = 10;
    ctx.lineWidth = 3;
    ctx.strokeStyle = col;
    // Top Left
    ctx.beginPath();
    ctx.moveTo(boxX, boxY + cLen); ctx.lineTo(boxX, boxY); ctx.lineTo(boxX + cLen, boxY);
    // Top Right
    ctx.moveTo(boxX + boxW - cLen, boxY); ctx.lineTo(boxX + boxW, boxY); ctx.lineTo(boxX + boxW, boxY + cLen);
    // Bottom Left
    ctx.moveTo(boxX, boxY + boxH - cLen); ctx.lineTo(boxX, boxY + boxH); ctx.lineTo(boxX + cLen, boxY + boxH);
    // Bottom Right
    ctx.moveTo(boxX + boxW - cLen, boxY + boxH); ctx.lineTo(boxX + boxW, boxY + boxH); ctx.lineTo(boxX + boxW, boxY + boxH - cLen);
    ctx.stroke();

    // Label tag
    const tagText = `${berry.code} ${berry.stageName.split(' ')[0].toUpperCase()} ${(berry.confidence * 100).toFixed(1)}%`;
    ctx.font = 'bold 11px monospace';
    const txtMetrics = ctx.measureText(tagText);
    const tagW = txtMetrics.width + 12;
    const tagH = 18;

    ctx.fillStyle = col;
    ctx.fillRect(boxX, boxY - tagH, tagW, tagH);

    ctx.fillStyle = '#000000';
    ctx.fillText(tagText, boxX + 6, boxY - 5);

    ctx.restore();
  }

  // Draw 3D Peduncle cutting point crosshairs for robot gripper
  function drawPeduncleCutPose(ctx, berry, bx, by, bw, bh) {
    if (berry.harvested || berry.stage !== 4) return; // Only highlight cut pose on harvestable fruit
    ctx.save();
    const cutX = bx + bw * 0.08;
    const cutY = by - bh * 0.42;

    // Crosshair circle
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cutX, cutY, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#e11d48';
    ctx.beginPath();
    ctx.arc(cutX, cutY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Cross lines
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cutX - 16, cutY); ctx.lineTo(cutX + 16, cutY);
    ctx.moveTo(cutX, cutY - 16); ctx.lineTo(cutX, cutY + 16);
    ctx.stroke();

    // Pose 3D Callout
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.fillRect(cutX + 16, cutY - 22, 110, 36);
    ctx.strokeStyle = '#e11d48';
    ctx.lineWidth = 1;
    ctx.strokeRect(cutX + 16, cutY - 22, 110, 36);

    ctx.fillStyle = '#10b981';
    ctx.font = '10px monospace';
    ctx.fillText('TARGET CUT 3D', cutX + 22, cutY - 10);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`Z: ${berry.depthZ}cm Yaw: -12°`, cutX + 22, cutY + 6);

    ctx.restore();
  }

  // Depth Shader Effect
  function applyDepthShaderOverlay(ctx, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'color';
    const depthGrad = ctx.createLinearGradient(0, 0, w, h);
    depthGrad.addColorStop(0, 'rgba(59, 130, 246, 0.7)');   // Far (Blue)
    depthGrad.addColorStop(0.5, 'rgba(16, 185, 129, 0.6)'); // Mid (Green)
    depthGrad.addColorStop(1, 'rgba(239, 68, 68, 0.7)');    // Near (Red)
    ctx.fillStyle = depthGrad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // CIELAB Anthocyanin Index Shader Effect
  function applyCielabShaderOverlay(ctx, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'hue';
    ctx.fillStyle = 'rgba(217, 70, 239, 0.4)';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Lighting Filter Simulator
  function applyLightingFilter(ctx, w, h) {
    ctx.save();
    if (state.lighting === 'direct') {
      // Strong midday sun
      ctx.fillStyle = 'rgba(255, 240, 200, 0.12)';
      ctx.fillRect(0, 0, w, h);
    } else if (state.lighting === 'shade') {
      // Deep canopy shadow
      ctx.fillStyle = 'rgba(10, 20, 30, 0.28)';
      ctx.fillRect(0, 0, w, h);
    } else if (state.lighting === 'night') {
      // Night with Active Cross-Polarized LED Ring (Vignette + Center Glow)
      const ringGlow = ctx.createRadialGradient(w * 0.5, h * 0.5, 50, w * 0.5, h * 0.5, w * 0.6);
      ringGlow.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      ringGlow.addColorStop(0.7, 'rgba(0, 0, 0, 0.5)');
      ringGlow.addColorStop(1, 'rgba(0, 0, 0, 0.85)');
      ctx.fillStyle = ringGlow;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  // ================= INTERACTIVE CLICK SELECTION =================
  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) * (canvas.width / rect.width);
    const clickY = (e.clientY - rect.top) * (canvas.height / rect.height);
    const scaleX = canvas.width / 800;
    const scaleY = canvas.height / 500;

    let clicked = null;
    state.strawberries.forEach(berry => {
      const bx = berry.x * scaleX;
      const by = berry.y * scaleY;
      const dist = Math.hypot(clickX - bx, clickY - by);
      if (dist < 45 * scaleX) {
        clicked = berry;
      }
    });

    if (clicked) {
      selectStrawberry(clicked.id);
    }
  });

  function selectStrawberry(id) {
    state.selectedId = id;
    renderCanvas();
    updateInspectorCard();
    updateFruitListUI();
  }

  function updateInspectorCard() {
    const berry = state.strawberries.find(b => b.id === state.selectedId);
    if (!berry) return;

    document.getElementById('targetIdBadge').textContent = berry.code;
    document.getElementById('targetStageName').textContent = berry.stageName;
    
    // Stage colors
    const colors = {
      1: '#84cc16',
      2: '#facc15',
      3: '#f472b6',
      4: '#10b981',
      5: '#a855f7'
    };
    document.getElementById('targetStageName').style.color = colors[berry.stage];

    const decBadge = document.getElementById('targetDecisionBadge');
    decBadge.textContent = berry.decision;
    if (berry.stage === 4) {
      decBadge.className = 'text-xs font-bold font-mono px-2.5 py-1 rounded bg-emerald-500 text-black shadow-lg shadow-emerald-500/30';
    } else if (berry.stage === 3) {
      decBadge.className = 'text-xs font-bold font-mono px-2.5 py-1 rounded bg-amber-500 text-black';
    } else {
      decBadge.className = 'text-xs font-bold font-mono px-2.5 py-1 rounded bg-slate-700 text-white';
    }

    document.getElementById('targetRedRatio').textContent = `${berry.redSurfaceRatio}%`;
    document.getElementById('targetRedBar').style.width = `${berry.redSurfaceRatio}%`;
    document.getElementById('targetBrix').textContent = `${berry.brix} °Bx`;
    document.getElementById('targetFirmness').textContent = `${berry.firmness} kg/cm²`;
    document.getElementById('targetPose3D').textContent = `X: ${berry.pose.x} cm | Y: ${berry.pose.y} cm | Z: ${berry.pose.z} cm | Yaw: ${berry.pose.yaw}`;
    document.getElementById('targetRobotCommand').textContent = berry.robotCommand;

    const btnHarvest = document.getElementById('btnSimHarvest');
    if (berry.stage === 4 && !berry.harvested) {
      btnHarvest.disabled = false;
      btnHarvest.innerHTML = '<i data-lucide="scissors" class="w-4 h-4"></i> Simular Corte Robótico de este Fruto';
      btnHarvest.className = 'w-full btn-primary justify-center text-xs';
    } else if (berry.harvested) {
      btnHarvest.disabled = true;
      btnHarvest.textContent = 'Fruto Ya Cosechado';
      btnHarvest.className = 'w-full btn-secondary justify-center text-xs opacity-50 cursor-not-allowed';
    } else {
      btnHarvest.disabled = true;
      btnHarvest.textContent = 'Corte No Recomendado (No está maduro)';
      btnHarvest.className = 'w-full btn-secondary justify-center text-xs opacity-50 cursor-not-allowed';
    }
    if (window.lucide) lucide.createIcons();
  }

  // ================= FRUIT LIST UI GENERATOR =================
  function updateFruitListUI() {
    const listContainer = document.getElementById('strawberryList');
    if (!listContainer) return;
    listContainer.innerHTML = '';

    state.strawberries.forEach(berry => {
      const isSelected = berry.id === state.selectedId;
      const item = document.createElement('div');
      item.className = `p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between text-xs ${
        isSelected ? 'bg-rose-500/15 border-rose-500/40 text-white' : 'bg-white/[0.02] border-white/5 text-slate-300 hover:bg-white/5'
      }`;
      item.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="font-mono font-bold ${berry.stage === 4 ? 'text-rose-400' : 'text-slate-400'}">${berry.code}</span>
          <span>${berry.stageName.split('/')[0]}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="font-mono text-[11px] text-slate-400">${berry.brix}°Bx</span>
          <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
            berry.stage === 4 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/10 text-slate-300'
          }">${berry.decision.split(' ')[0]}</span>
        </div>
      `;
      item.addEventListener('click', () => selectStrawberry(berry.id));
      listContainer.appendChild(item);
    });
  }

  // ================= UI CONTROLS WIRING =================
  // Mode Tabs
  document.querySelectorAll('.view-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-tab-btn').forEach(b => {
        b.classList.remove('active', 'bg-rose-500', 'text-white');
        b.classList.add('bg-white/5', 'text-slate-300');
      });
      btn.classList.add('active', 'bg-rose-500', 'text-white');
      btn.classList.remove('bg-white/5', 'text-slate-300');
      state.viewMode = btn.dataset.mode;
      renderCanvas();
    });
  });

  // Lighting buttons
  document.querySelectorAll('.light-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.light-btn').forEach(b => {
        b.classList.remove('active', 'bg-rose-500', 'text-white');
        b.classList.add('bg-white/5', 'text-slate-300');
      });
      btn.classList.add('active', 'bg-rose-500', 'text-white');
      btn.classList.remove('bg-white/5', 'text-slate-300');
      state.lighting = btn.dataset.light;
      
      const labels = {
        diffuse: 'Luz Difusa',
        direct: 'Sol Cenital Directo',
        shade: 'Sombra de Follaje',
        night: 'Noche + Ring LED Polarizado'
      };
      document.getElementById('lightingLabel').textContent = labels[state.lighting];
      document.getElementById('hudLightingText').textContent = labels[state.lighting];
      renderCanvas();
    });
  });

  // Confidence Slider
  const confSlider = document.getElementById('confSlider');
  if (confSlider) {
    confSlider.addEventListener('input', (e) => {
      state.confidenceThreshold = parseInt(e.target.value, 10) / 100;
      document.getElementById('confValueLabel').textContent = `${e.target.value}%`;
      renderCanvas();
    });
  }

  // Simulate Harvest Cut Action
  const btnSimHarvest = document.getElementById('btnSimHarvest');
  if (btnSimHarvest) {
    btnSimHarvest.addEventListener('click', () => {
      const berry = state.strawberries.find(b => b.id === state.selectedId);
      if (berry && berry.stage === 4) {
        berry.harvested = true;
        renderCanvas();
        updateInspectorCard();
        updateFruitListUI();

        // Toast feedback
        const hud = document.getElementById('hudStatusText');
        if (hud) {
          hud.textContent = '¡EFECTOR FINAL ACCIONADO! CORTE EXITOSO DE ' + berry.code;
          setTimeout(() => {
            hud.textContent = '4 INSTANCIAS DETECTADAS • COSECHA COMPLETADA';
          }, 3500);
        }
      }
    });
  }

  // Stage cards click trigger
  document.querySelectorAll('.stage-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.stage-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const stageNum = parseInt(card.dataset.stage, 10);
      const match = state.strawberries.find(b => b.stage === stageNum);
      if (match) {
        selectStrawberry(match.id);
      }
    });
  });

  // ================= CHARTS INITIALIZATION (CHART.JS) =================
  function initCharts() {
    // 1. Maturity Distribution Chart
    const ctxMaturity = document.getElementById('maturityChart');
    if (ctxMaturity) {
      new Chart(ctxMaturity, {
        type: 'bar',
        data: {
          labels: ['1. Verde (<10%)', '2. Blanco (10-25%)', '3. Pintón (25-75%)', '4. Maduro Festival', '5. Sobremaduro'],
          datasets: [{
            label: 'Cantidad de Frutos Detectados',
            data: [3420, 2810, 4150, 3180, 690],
            backgroundColor: [
              'rgba(132, 204, 22, 0.7)',
              'rgba(250, 204, 21, 0.7)',
              'rgba(244, 114, 182, 0.7)',
              'rgba(225, 29, 72, 0.85)',
              'rgba(168, 85, 247, 0.7)'
            ],
            borderColor: [
              '#84cc16',
              '#facc15',
              '#f472b6',
              '#e11d48',
              '#a855f7'
            ],
            borderWidth: 1.5,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#111827',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1,
              titleFont: { family: 'Inter', weight: 'bold' }
            }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { color: 'rgba(255, 255, 255, 0.04)' }
            },
            y: {
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { color: 'rgba(255, 255, 255, 0.04)' }
            }
          }
        }
      });
    }

    // 2. 72h Harvest Forecast Area Chart
    const ctxProjection = document.getElementById('projectionChart');
    if (ctxProjection) {
      new Chart(ctxProjection, {
        type: 'line',
        data: {
          labels: ['Hoy (0h)', '+12h', '+24h', '+36h', '+48h', '+60h', '+72h'],
          datasets: [{
            label: 'Volumen Estimado Cosecha (kg/ha)',
            data: [420, 580, 890, 1420, 1180, 850, 610],
            borderColor: '#e11d48',
            backgroundColor: 'rgba(225, 29, 72, 0.15)',
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#fb7185',
            pointBorderColor: '#fff',
            pointRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#111827',
              borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1
            }
          },
          scales: {
            x: {
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { color: 'rgba(255, 255, 255, 0.04)' }
            },
            y: {
              ticks: { color: '#94a3b8', font: { size: 10 } },
              grid: { color: 'rgba(255, 255, 255, 0.04)' }
            }
          }
        }
      });
    }
  }

  // ================= INITIAL RUN =================
  resizeCanvas();
  updateInspectorCard();
  updateFruitListUI();
  initCharts();
});
