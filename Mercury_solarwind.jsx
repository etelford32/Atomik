import React, { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

const MercurySolarWindSimulation = () => {
  const mountRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showMagnetosphere, setShowMagnetosphere] = useState(true);
  const [showFieldLines, setShowFieldLines] = useState(true);
  const [showSputtering, setShowSputtering] = useState(true);
  const [solarWindSpeed, setSolarWindSpeed] = useState(400);
  const [isCME, setIsCME] = useState(false);
  const [cameraMode, setCameraMode] = useState('orbit');
  const [windowPositions, setWindowPositions] = useState({
    controls: { x: 15, y: 15 },
    camera: { x: 15, y: 280 },
    stats: { x: window.innerWidth - 215, y: 15 },
    legend: { x: 15, y: window.innerHeight - 135 }
  });
  const [stats, setStats] = useState({
    particlesHitting: 0,
    sputteredAtoms: 0,
    reconnectionRate: 0.15
  });

  useEffect(() => {
    if (!mountRef.current) return;

    let animationId;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000510);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(30, 25, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    const SUN_RADIUS = 8;
    const MERCURY_RADIUS = 2.439;
    const SUN_MERCURY_DISTANCE = 80;
    const BOW_SHOCK_STANDOFF = 1.7 * MERCURY_RADIUS;
    const MAGNETOPAUSE_STANDOFF = 1.45 * MERCURY_RADIUS;

    // Sun
    const sunGeometry = new THREE.SphereGeometry(SUN_RADIUS, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffbb00
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(-SUN_MERCURY_DISTANCE, 0, 0);
    scene.add(sun);

    // Sun glow
    const glowGeometry = new THREE.SphereGeometry(SUN_RADIUS * 1.5, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff8800,
      transparent: true,
      opacity: 0.2,
      side: THREE.BackSide
    });
    const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    sun.add(sunGlow);

    // Mercury
    const mercuryGeometry = new THREE.SphereGeometry(MERCURY_RADIUS, 32, 32);
    const mercuryMaterial = new THREE.MeshPhongMaterial({
      color: 0x8c8c8c,
      shininess: 5
    });
    const mercury = new THREE.Mesh(mercuryGeometry, mercuryMaterial);
    scene.add(mercury);

    // Magnetosphere boundaries
    const magnetosphereGroup = new THREE.Group();
    scene.add(magnetosphereGroup);

    const bowShockGeometry = new THREE.SphereGeometry(BOW_SHOCK_STANDOFF, 24, 24, 0, Math.PI);
    const bowShockMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.2,
      wireframe: true,
      side: THREE.DoubleSide
    });
    const bowShock = new THREE.Mesh(bowShockGeometry, bowShockMaterial);
    bowShock.rotation.y = Math.PI / 2;
    magnetosphereGroup.add(bowShock);

    const magnetopauseGeometry = new THREE.SphereGeometry(MAGNETOPAUSE_STANDOFF, 24, 24, 0, Math.PI);
    const magnetopauseMaterial = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      transparent: true,
      opacity: 0.25,
      wireframe: true,
      side: THREE.DoubleSide
    });
    const magnetopause = new THREE.Mesh(magnetopauseGeometry, magnetopauseMaterial);
    magnetopause.rotation.y = Math.PI / 2;
    magnetosphereGroup.add(magnetopause);

    // Field lines
    const fieldLinesGroup = new THREE.Group();
    magnetosphereGroup.add(fieldLinesGroup);

    for (let i = 0; i < 6; i++) {
      const phi = (i / 6) * Math.PI * 2;
      const points = [];
      for (let j = 0; j < 40; j++) {
        const t = j / 40;
        const r = MERCURY_RADIUS * (1 + 2 * t * t);
        const theta = 0.4 + t * (Math.PI - 0.8);
        points.push(new THREE.Vector3(
          r * Math.sin(theta) * Math.cos(phi),
          r * Math.cos(theta),
          r * Math.sin(theta) * Math.sin(phi)
        ));
      }
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x4444ff,
        transparent: true,
        opacity: 0.4
      });
      fieldLinesGroup.add(new THREE.Line(lineGeometry, lineMaterial));
    }

    // Solar wind particles
    const particleCount = 3000;
    const particles = [];
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = Math.random() * Math.PI * 2;
      const radius = SUN_RADIUS * 1.5;
      
      particles.push({
        x: -SUN_MERCURY_DISTANCE + radius * Math.cos(angle1) * Math.sin(angle2),
        y: radius * Math.sin(angle1) * Math.sin(angle2),
        z: radius * Math.cos(angle2),
        vx: 0.4,
        age: Math.random() * 100
      });

      const color = Math.random() < 0.95 ? new THREE.Color(0x00aaff) : new THREE.Color(0xff6600);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // Cusp glows
    const cuspGeometry = new THREE.SphereGeometry(MERCURY_RADIUS * 0.2, 16, 16);
    const cuspMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffaa,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const northCusp = new THREE.Mesh(cuspGeometry, cuspMaterial);
    northCusp.position.set(MERCURY_RADIUS * 0.8, MERCURY_RADIUS * 0.8, 0);
    const southCusp = new THREE.Mesh(cuspGeometry, cuspMaterial.clone());
    southCusp.position.set(MERCURY_RADIUS * 0.8, -MERCURY_RADIUS * 0.8, 0);
    mercury.add(northCusp);
    mercury.add(southCusp);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x444466, 0.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffee, 1.5);
    sunLight.position.set(-SUN_MERCURY_DISTANCE, 0, 0);
    scene.add(sunLight);

    const pointLight = new THREE.PointLight(0xffaa00, 2, SUN_MERCURY_DISTANCE * 2);
    pointLight.position.set(-SUN_MERCURY_DISTANCE, 0, 0);
    scene.add(pointLight);

    // Stars
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(1000 * 3);
    for (let i = 0; i < 1000; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 500;
      starPositions[i * 3 + 1] = (Math.random() - 0.5) * 500;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 500;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Animation
    let frameCount = 0;
    let hitCount = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      if (!isPaused) {
        frameCount++;

        // Update particles
        const posArray = particleGeometry.attributes.position.array;
        const speedMult = (isCME ? 2.5 : 1) * (solarWindSpeed / 400);

        for (let i = 0; i < particleCount; i++) {
          const p = particles[i];
          p.x += p.vx * speedMult * 0.15;
          p.age++;

          const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z);

          // Deflection
          if (dist < BOW_SHOCK_STANDOFF && dist > MAGNETOPAUSE_STANDOFF) {
            const deflection = 0.1;
            p.y += (p.y / dist) * deflection;
            p.z += (p.z / dist) * deflection;
          }

          // Reset at surface or past Mercury
          if (dist < MERCURY_RADIUS * 1.2 || p.x > 30 || p.age > 400) {
            const a1 = Math.random() * Math.PI * 2;
            const a2 = Math.random() * Math.PI * 2;
            const r = SUN_RADIUS * 1.5;
            p.x = -SUN_MERCURY_DISTANCE + r * Math.cos(a1) * Math.sin(a2);
            p.y = r * Math.sin(a1) * Math.sin(a2);
            p.z = r * Math.cos(a2);
            p.age = 0;
            if (dist < MERCURY_RADIUS * 1.2) hitCount++;
          }

          posArray[i * 3] = p.x;
          posArray[i * 3 + 1] = p.y;
          posArray[i * 3 + 2] = p.z;
        }

        particleGeometry.attributes.position.needsUpdate = true;

        // Animate glows
        northCusp.material.opacity = 0.4 + Math.sin(frameCount * 0.1) * 0.2;
        southCusp.material.opacity = 0.4 + Math.cos(frameCount * 0.1) * 0.2;

        mercury.rotation.y += 0.002;

        // Camera control
        const time = Date.now() * 0.00005;
        
        switch(cameraMode) {
          case 'orbit':
            camera.position.x = -20 + Math.cos(time) * 40;
            camera.position.y = 20 + Math.sin(time * 0.7) * 10;
            camera.position.z = Math.sin(time) * 40;
            camera.lookAt(-20, 0, 0);
            break;
          case 'side':
            camera.position.set(0, 0, 50);
            camera.lookAt(-20, 0, 0);
            break;
          case 'top':
            camera.position.set(-30, 60, 0);
            camera.lookAt(-30, 0, 0);
            break;
          case 'sun':
            camera.position.set(-SUN_MERCURY_DISTANCE + 20, 10, 0);
            camera.lookAt(0, 0, 0);
            break;
          case 'mercury':
            camera.position.x = 15 * Math.cos(time * 2);
            camera.position.y = 8;
            camera.position.z = 15 * Math.sin(time * 2);
            camera.lookAt(0, 0, 0);
            break;
        }

        if (frameCount % 30 === 0) {
          setStats({
            particlesHitting: hitCount * 100,
            sputteredAtoms: hitCount * 2,
            reconnectionRate: 0.15 + (isCME ? 0.1 : 0) + Math.random() * 0.05
          });
          hitCount = 0;
        }
      }

      // Update visibility
      magnetosphereGroup.visible = showMagnetosphere;
      fieldLinesGroup.visible = showFieldLines;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isPaused, showMagnetosphere, showFieldLines, showSputtering, solarWindSpeed, isCME, cameraMode]);

  const buttonStyle = (active) => ({
    background: active ? 'rgba(0, 255, 255, 0.2)' : 'rgba(50, 50, 50, 0.3)',
    border: active ? '1px solid #00ffff' : '1px solid #444',
    color: active ? '#00ffff' : '#888',
    padding: '4px 8px',
    cursor: 'pointer',
    borderRadius: '2px',
    fontSize: '9px',
    fontWeight: 'bold',
    width: '100%',
    marginBottom: '3px'
  });

  const panelStyle = {
    position: 'absolute',
    background: 'rgba(0, 8, 16, 0.92)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(0, 255, 255, 0.25)',
    borderRadius: '3px',
    padding: '8px',
    fontSize: '9px',
    color: '#aaffff',
    zIndex: 1000
  };

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0, 
      overflow: 'hidden',
      background: '#000510',
      fontFamily: '"Courier New", monospace'
    }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Controls */}
      <div style={{ ...panelStyle, left: '15px', top: '15px', width: '170px' }}>
        <div style={{ color: '#00ffff', fontWeight: 'bold', marginBottom: '6px', fontSize: '10px' }}>
          CONTROLS
        </div>
        
        <button onClick={() => setIsPaused(!isPaused)} style={buttonStyle(isPaused)}>
          {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
        </button>

        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '3px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showMagnetosphere}
            onChange={(e) => setShowMagnetosphere(e.target.checked)}
            style={{ marginRight: '6px' }}
          />
          Magnetosphere
        </label>

        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '3px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={showFieldLines}
            onChange={(e) => setShowFieldLines(e.target.checked)}
            style={{ marginRight: '6px' }}
          />
          Field Lines
        </label>

        <div style={{ marginTop: '6px', marginBottom: '4px', borderTop: '1px solid rgba(0,255,255,0.2)', paddingTop: '6px' }}>
          <label style={{ fontSize: '8px', display: 'block', marginBottom: '2px' }}>
            Speed: {solarWindSpeed} km/s
          </label>
          <input
            type="range"
            min="250"
            max="750"
            value={solarWindSpeed}
            onChange={(e) => setSolarWindSpeed(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <button onClick={() => setIsCME(!isCME)} style={{
          ...buttonStyle(isCME),
          background: isCME ? 'rgba(255, 50, 50, 0.3)' : 'rgba(100, 100, 100, 0.2)',
          border: isCME ? '1px solid #ff3232' : '1px solid #666',
          color: isCME ? '#ff3232' : '#999'
        }}>
          {isCME ? '⚡ CME ACTIVE' : 'Trigger CME'}
        </button>
      </div>

      {/* Camera */}
      <div style={{ ...panelStyle, left: '15px', top: '280px', width: '170px' }}>
        <div style={{ color: '#00ffff', fontWeight: 'bold', marginBottom: '6px', fontSize: '10px' }}>
          CAMERA
        </div>
        {['orbit', 'side', 'top', 'sun', 'mercury'].map(mode => (
          <button
            key={mode}
            onClick={() => setCameraMode(mode)}
            style={{
              ...buttonStyle(cameraMode === mode),
              textTransform: 'uppercase'
            }}
          >
            {mode}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div style={{ ...panelStyle, right: '15px', top: '15px', width: '180px' }}>
        <div style={{ color: '#00ffff', fontWeight: 'bold', marginBottom: '6px', fontSize: '10px' }}>
          LIVE DATA
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Ion Flux:</span>
          <span style={{ color: '#00ffaa' }}>{stats.particlesHitting.toExponential(1)}/s</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Sputtered:</span>
          <span style={{ color: '#ffaa00' }}>{stats.sputteredAtoms}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Reconnect:</span>
          <span style={{ color: '#ff00ff' }}>{(stats.reconnectionRate * 100).toFixed(1)}%</span>
        </div>
      </div>

      {/* Legend */}
      <div style={{ ...panelStyle, left: '15px', bottom: '15px', width: '150px', lineHeight: '1.5' }}>
        <div style={{ color: '#00ffff', fontWeight: 'bold', marginBottom: '4px', fontSize: '10px' }}>
          PARTICLES
        </div>
        <div><span style={{ color: '#00aaff' }}>●</span> Protons (H⁺)</div>
        <div><span style={{ color: '#ff6600' }}>●</span> Alpha (He²⁺)</div>
        <div><span style={{ color: '#00ffaa' }}>●</span> Cusp Glow</div>
      </div>
    </div>
  );
};

export default MercurySolarWindSimulation;
