import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original scene: a compact visual explanation of data → model → application.
export async function createWorkbench(host, {isRunning = () => true} = {}) {
  const canvas = host.querySelector('canvas');
  const scene = new THREE.Scene();
  const renderer = new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.5));
  renderer.setClearColor(0xfafbfe,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const camera=new THREE.OrthographicCamera(-4.4,4.4,3.05,-3.05,.1,50);
  camera.position.set(7,6.4,10);camera.lookAt(0,.65,0);
  const world=new THREE.Group();scene.add(world);
  const resources=[];
  const material=(color,roughness=.38,metalness=.08)=>{
    const m=new THREE.MeshStandardMaterial({color,roughness,metalness});resources.push(m);return m;
  };
  const white=material('#f4f8fc'),edge=material('#c7d7e1',.27,.28),ink=material('#183d52',.32,.16);
  const teal=material('#078ba4',.25,.22),pale=material('#b3e1e9',.28,.12),ice=material('#deedf2');
  const glow=material('#41d4d9',.25,.1);glow.emissive.set('#15969e');glow.emissiveIntensity=.32;
  const dark=material('#0d2635',.44,.1);
  const geometries=new Map();
  const breathe=()=>new Promise(resolve=>setTimeout(resolve,0));
  const box=(parent,w,h,d,m,x=0,y=0,z=0,r=.07)=>{
    const shape=[w,h,d,r].join('/');let g=geometries.get(shape);
    if(!g){g=new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3));geometries.set(shape,g);resources.push(g);}
    const mesh=new THREE.Mesh(g,m);mesh.userData.batch=true;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  };
  const texture=(w,h,paint)=>{
    const c=document.createElement('canvas');c.width=w;c.height=h;paint(c.getContext('2d'),w,h);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;resources.push(t);return t;
  };
  const label=(parent,text,w,h,x,y,z,color='#23536a',bg='#eff8fb',size=58)=>{
    const tex=texture(512,256,(c,W,H)=>{c.fillStyle=bg;c.fillRect(0,0,W,H);c.fillStyle=color;c.font=`600 ${size}px sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText(text,W/2,H/2);});
    const m=new THREE.MeshBasicMaterial({map:tex});resources.push(m);
    const g=new THREE.PlaneGeometry(w,h);resources.push(g);const p=new THREE.Mesh(g,m);p.position.set(x,y,z);parent.add(p);return p;
  };
  const env=texture(512,256,(c,w,h)=>{
    const gradient=c.createLinearGradient(0,0,0,h);gradient.addColorStop(0,'#b5cddf');gradient.addColorStop(.43,'#ffffff');gradient.addColorStop(.55,'#e7f4fa');gradient.addColorStop(1,'#a3b8c6');c.fillStyle=gradient;c.fillRect(0,0,w,h);
    c.fillStyle='#ffffff';c.fillRect(30,30,100,95);c.fillRect(300,45,80,120);
  });
  env.mapping=THREE.EquirectangularReflectionMapping;scene.environment=env;scene.environmentIntensity=.6;
  scene.add(new THREE.HemisphereLight(0xf0f8ff,0x849bac,1.25));
  const key=new THREE.DirectionalLight(0xffffff,2.3);key.position.set(-3,8,5);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.5,far:22});key.shadow.normalBias=.035;key.shadow.bias=-.0002;scene.add(key);
  const fill=new THREE.DirectionalLight(0xb6eaff,.7);fill.position.set(5,3,-4);scene.add(fill);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(25,25),new THREE.ShadowMaterial({color:0x4c6b82,opacity:.12}));floor.rotation.x=-Math.PI/2;floor.position.y=-.48;floor.receiveShadow=true;scene.add(floor);resources.push(floor.geometry,floor.material);
  box(world,6.7,.30,3.4,white,0,-.22,0,.14);
  box(world,6.48,.06,3.18,ice,0,-.395,0,.025);
  // Three stations share the same base, camera and lighting.
  const stations=[new THREE.Group(),new THREE.Group(),new THREE.Group()];stations.forEach(s=>world.add(s));
  stations[0].position.set(-2.08,0,.12);stations[1].position.set(0,0,-.12);stations[2].position.set(2.05,0,-.18);
  const softShadow=texture(128,128,(c,w,h)=>{const g=c.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);g.addColorStop(0,'rgba(33,75,97,.25)');g.addColorStop(.4,'rgba(33,75,97,.1)');g.addColorStop(1,'rgba(33,75,97,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
  stations.forEach(s=>{const m=new THREE.MeshBasicMaterial({map:softShadow,transparent:true,depthWrite:false});resources.push(m);const g=new THREE.PlaneGeometry(2.1,1.8);resources.push(g);const p=new THREE.Mesh(g,m);p.rotation.x=-Math.PI/2;p.position.y=-.063;s.add(p);});
  await breathe();
  const data=stations[0];box(data,1.28,.10,1.3,edge,0,.04,0);
  const trays=[];
  for(let i=0;i<4;i++){
    const tray=new THREE.Group();data.add(tray);tray.position.set((i-1.5)*.055,.22+i*.24,0);tray.rotation.y=-.055+i*.035;
    box(tray,1.14,.14,1.12,i===3?teal:white,0,0,0,.06);
    box(tray,.14,.035,.13,i===3?glow:teal,-.34,.085,.28,.02);
    box(tray,.49,.015,.045,i===3?pale:edge,.06,.085,.28,.007);
    box(tray,.76,.015,.045,i===3?pale:edge,0,.085,.04,.007);
    box(tray,.55,.015,.045,i===3?pale:edge,-.105,.085,-.14,.007);
    trays.push(tray);
  }
  // Raised compute module with visible pins and stacked cooling plates.
  await breathe();
  const model=stations[1];box(model,1.5,.12,1.5,ink,0,.06,0);
  box(model,1.28,.10,1.28,teal,0,.19,0);
  for(let i=0;i<7;i++){
    const n=(i-3)*.17;
    box(model,.065,.055,.20,edge,n,.07,.78,.01);box(model,.065,.055,.20,edge,n,.07,-.78,.01);
    box(model,.20,.055,.065,edge,.78,.07,n,.01);box(model,.20,.055,.065,edge,-.78,.07,n,.01);
  }
  const core=new THREE.Group();model.add(core);core.position.y=.63;
  box(core,.98,.70,.98,white,0,0,0,.12);
  box(core,1.015,.045,1.015,glow,0,-.10,0,.018);
  const coreLabel=label(core,'ML',.70,.36,0,.10,.499,'#107e97','#f4f8fc',110);
  const coreTop=label(core,'MODEL',.61,.31,0,.357,0,'#4d7b8d','#f4f8fc',56);coreTop.rotation.x=-Math.PI/2;
  // Output screen: conceptual curves, with no invented performance claims.
  await breathe();
  const output=stations[2];box(output,1.05,.10,.77,edge,0,.03,.15);
  box(output,.17,.69,.16,edge,0,.43,-.08);
  const monitor=new THREE.Group();monitor.position.set(0,1.20,-.10);monitor.rotation.y=-.08;output.add(monitor);
  box(monitor,1.64,1.18,.16,white,0,0,0,.10);box(monitor,1.49,1.02,.022,dark,0,.025,.089,.07);
  const screen=texture(768,480,(c,w,h)=>{
    c.fillStyle='#102c3c';c.fillRect(0,0,w,h);c.fillStyle='#96bbc9';c.font='20px monospace';c.fillText('MODEL / OUTPUT',40,47);
    c.fillStyle='#2bd0c9';c.beginPath();c.arc(714,40,5,0,Math.PI*2);c.fill();
    c.strokeStyle='#254855';c.lineWidth=1;for(let y=100;y<430;y+=66){c.beginPath();c.moveTo(40,y);c.lineTo(730,y);c.stroke();}
    c.strokeStyle='#48d5cc';c.lineWidth=6;c.lineJoin='round';c.beginPath();[[42,353],[126,320],[198,335],[278,233],[359,249],[432,187],[508,212],[585,127],[649,155],[730,90]].forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
    c.strokeStyle='#84a9ca';c.setLineDash([8,10]);c.lineWidth=3;c.beginPath();c.moveTo(42,375);c.bezierCurveTo(256,339,426,177,730,123);c.stroke();c.setLineDash([]);
    c.fillStyle='#9dc6d1';c.font='17px monospace';c.fillText('DATA  /  LEARNING  /  APPLICATION',40,448);
  });
  const screenMat=new THREE.MeshBasicMaterial({map:screen});resources.push(screenMat);
  const screenGeo=new THREE.PlaneGeometry(1.42,.91);resources.push(screenGeo);
  const screenMesh=new THREE.Mesh(screenGeo,screenMat);screenMesh.position.set(0,.027,.104);monitor.add(screenMesh);
  // Keyboard keys and trackpad give the scene a recognisable working scale.
  box(output,1.30,.07,.46,white,0,.06,.83,.055);
  for(let row=0;row<3;row++)for(let col=0;col<9;col++)box(output,.102,.012,.078,col===8?teal:edge,(col-4)*.12,.106,.70+row*.11,.014);
  const cables=[];
  for(const [x1,x2] of [[-1.38,-.83],[.83,1.42]]){
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(x1,.02,.15),new THREE.Vector3((x1+x2)/2,.02,.38),new THREE.Vector3(x2,.02,.15)]);
    const g=new THREE.TubeGeometry(curve,24,.023,6,false);resources.push(g);const path=new THREE.Mesh(g,pale);world.add(path);cables.push(curve);
  }
  const packets=cables.map(curve=>{const p=box(world,.10,.07,.10,glow,0,.065,0,.025);return {p,curve};});
  const lamps=stations.map((s,i)=>{const l=box(s,.33,.025,.025,glow,0,.16,i===2?.48:.68,.009);return l;});
  await breathe();
  // Merge repeated keys, pins and panels by material, keeping moving parts separate.
  const dynamic=new Set([...lamps,...packets.map(({p})=>p)]);
  const groups=[];world.traverse(o=>{if(o.isGroup)groups.push(o);});
  for(const group of groups){
    const batches=new Map();
    for(const mesh of group.children){if(!mesh.userData.batch||dynamic.has(mesh))continue;const list=batches.get(mesh.material)||[];list.push(mesh);batches.set(mesh.material,list);}
    for(const [mat,meshes] of batches){if(meshes.length<2)continue;const parts=meshes.map(mesh=>{mesh.updateMatrix();return mesh.geometry.clone().applyMatrix4(mesh.matrix);});const geometry=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!geometry)continue;resources.push(geometry);const merged=new THREE.Mesh(geometry,mat);merged.castShadow=true;merged.receiveShadow=true;group.add(merged);meshes.forEach(mesh=>group.remove(mesh));}
    await breathe();
  }
  let frame=0,last=0,time=0,inView=true,lost=false,disposed=false,compiled=false,selected=0;
  const focus=[0,0,0];
  let pointerX=0,pointerY=0,targetX=0,targetY=0;
  const fine=matchMedia('(hover:hover) and (pointer:fine)');
  const controls=[...host.querySelectorAll('[data-workbench-stage]')];
  const copy=host.querySelector('.workbench-description');
  const descriptions=['Veriyi hazırlamak ve anlamlandırmak.','Öğrenen modeller kurmak ve sınamak.','Sonuçları kullanılabilir bir arayüze taşımak.'];
  const setStage=index=>{
    selected=index;controls.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    if(copy)copy.textContent=descriptions[index];
    if(!isRunning()){render();}
  };
  controls.forEach((button,i)=>button.addEventListener('click',()=>setStage(i)));
  const render=()=>{
    if(disposed||lost||!compiled)return;
    world.rotation.y=pointerX*.11;world.rotation.x=pointerY*.045;
    for(let i=0;i<trays.length;i++)trays[i].position.y=.22+i*.24+Math.sin(time*.8+i*.5)*.012;
    core.position.y=.63+Math.sin(time*.7)*.027;
    stations.forEach((station,i)=>station.position.y=focus[i]*.13);
    trays.forEach((tray,i)=>tray.rotation.y=-.055+i*.035+focus[0]*(i-1.5)*.05);
    glow.emissiveIntensity=.25+Math.sin(time*1.1)*.12;
    packets.forEach(({p,curve},i)=>{const u=(time*.18+i*.5)%1;p.position.copy(curve.getPointAt(u));p.position.y+=.035;p.scale.setScalar(.6+Math.sin(u*Math.PI)*.4);});
    lamps.forEach((lamp,i)=>lamp.material=i===selected?glow:pale);
    renderer.render(scene,camera);
  };
  const tick=now=>{
    frame=0;if(!compiled||!inView||document.hidden||!isRunning()||lost||disposed){last=0;return;}
    if(last&&now-last<32){frame=requestAnimationFrame(tick);return;}
    const dt=last?Math.min((now-last)/1000,.07):0;last=now;time+=dt;
    const blend=1-Math.exp(-dt*3);pointerX+=(targetX-pointerX)*blend;pointerY+=(targetY-pointerY)*blend;
    focus.forEach((value,i)=>focus[i]+=((selected===i?1:0)-value)*blend);
    render();frame=requestAnimationFrame(tick);
  };
  const sync=()=>{if(compiled&&!disposed&&!lost&&inView&&!document.hidden&&isRunning()){if(!frame)frame=requestAnimationFrame(tick);}else{cancelAnimationFrame(frame);frame=0;last=0;}};
  const resize=()=>{const rect=canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;renderer.setSize(rect.width,rect.height,false);const aspect=rect.width/rect.height;camera.left=-3.05*aspect;camera.right=3.05*aspect;camera.updateProjectionMatrix();render();};
  const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;sync();});observer.observe(host);
  const ro=new ResizeObserver(resize);ro.observe(canvas);
  host.addEventListener('pointermove',event=>{if(!fine.matches||!isRunning())return;const r=canvas.getBoundingClientRect();targetX=Math.max(-1,Math.min(1,(event.clientX-r.left)/r.width*2-1));targetY=Math.max(-1,Math.min(1,(event.clientY-r.top)/r.height*2-1));},{passive:true});
  host.addEventListener('pointerleave',()=>{targetX=targetY=0;},{passive:true});
  document.addEventListener('visibilitychange',sync);
  document.addEventListener('portfolio:motion',sync);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;delete host.dataset.ready;sync();});
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);frame=0;last=0;});
  window.addEventListener('pageshow',sync);
  // Compile before revealing the canvas so the poster and first 3D frame coincide.
  resize();await renderer.compileAsync(scene,camera);compiled=true;render();setStage(0);
  host.dataset.ready='true';sync();
  return {render,renderer,setStage,dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();ro.disconnect();resources.forEach(r=>r.dispose());renderer.dispose();}};
}
